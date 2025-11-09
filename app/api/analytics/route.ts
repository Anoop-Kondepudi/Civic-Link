import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Initialize OpenAI client for NVIDIA API
const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || '',
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

// Types for our data structures
interface Report {
  id: string;
  description: string;
  location: {
    lat: number;
    lng: number;
  };
  timestamp: string;
  status: string;
  votes?: number;
  downvotes?: number;
  category?: string;
  images?: any[];
}

interface ReportData {
  reports: Report[];
}

interface GeographicCluster {
  lat: number;
  lng: number;
  intensity: number;
  breakdown: {
    issues: number;
    ideas: number;
    civilianEvents: number;
    governmentEvents: number;
  };
  reports: Report[];
}

interface SentimentAnalysis {
  overall: string;
  issues: string;
  ideas: string;
  events: string;
  keyInsights: string[];
}

interface AnalyticsResponse {
  sentiment: SentimentAnalysis;
  heatmapData: Array<{
    lat: number;
    lng: number;
    intensity: number;
    breakdown: {
      issues: number;
      ideas: number;
      civilianEvents: number;
      governmentEvents: number;
    };
  }>;
  summary: {
    totalReports: number;
    totalIssues: number;
    totalIdeas: number;
    totalCivilianEvents: number;
    totalGovernmentEvents: number;
  };
}

// Helper function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Helper function to read all report JSON files
async function readAllReports() {
  const docsPath = path.join(process.cwd(), 'docs');

  const fileTypes = [
    { file: 'issue.json', type: 'issue' },
    { file: 'idea.json', type: 'idea' },
    { file: 'civilian-event.json', type: 'civilian-event' },
    { file: 'government-event.json', type: 'government-event' }
  ];

  const allReports: Array<Report & { type: string }> = [];

  for (const { file, type } of fileTypes) {
    try {
      const filePath = path.join(docsPath, file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const data: ReportData = JSON.parse(fileContent);

      // Add type to each report for easier categorization
      const reportsWithType = data.reports.map(report => ({
        ...report,
        type
      }));

      allReports.push(...reportsWithType);
    } catch (error) {
      console.error(`Error reading ${file}:`, error);
    }
  }

  return allReports;
}

// Helper function to create geographic clusters for heatmap
function createGeographicClusters(reports: Array<Report & { type: string }>, radiusMeters: number = 500): GeographicCluster[] {
  const clusters: GeographicCluster[] = [];
  const processedReports = new Set<string>();

  for (const report of reports) {
    // Skip if already processed
    if (processedReports.has(report.id)) continue;

    // Create new cluster centered on this report
    const cluster: GeographicCluster = {
      lat: report.location.lat,
      lng: report.location.lng,
      intensity: 0,
      breakdown: {
        issues: 0,
        ideas: 0,
        civilianEvents: 0,
        governmentEvents: 0
      },
      reports: []
    };

    // Find all reports within radius
    for (const otherReport of reports) {
      if (processedReports.has(otherReport.id)) continue;

      const distance = calculateDistance(
        report.location.lat,
        report.location.lng,
        otherReport.location.lat,
        otherReport.location.lng
      );

      if (distance <= radiusMeters) {
        cluster.reports.push(otherReport);
        processedReports.add(otherReport.id);

        // Update breakdown counts
        switch (otherReport.type) {
          case 'issue':
            cluster.breakdown.issues++;
            break;
          case 'idea':
            cluster.breakdown.ideas++;
            break;
          case 'civilian-event':
            cluster.breakdown.civilianEvents++;
            break;
          case 'government-event':
            cluster.breakdown.governmentEvents++;
            break;
        }
      }
    }

    // Calculate intensity (weight issues higher as they represent problem areas)
    cluster.intensity =
      cluster.breakdown.issues * 2 + // Issues count double
      cluster.breakdown.ideas * 1 +
      cluster.breakdown.civilianEvents * 0.5 +
      cluster.breakdown.governmentEvents * 0.5;

    // Only add cluster if it has reports
    if (cluster.reports.length > 0) {
      // Recalculate center as average of all reports in cluster
      const avgLat = cluster.reports.reduce((sum, r) => sum + r.location.lat, 0) / cluster.reports.length;
      const avgLng = cluster.reports.reduce((sum, r) => sum + r.location.lng, 0) / cluster.reports.length;
      cluster.lat = avgLat;
      cluster.lng = avgLng;

      clusters.push(cluster);
    }
  }

  return clusters;
}

// Helper function to generate AI sentiment analysis
async function generateSentimentAnalysis(reports: Array<Report & { type: string }>): Promise<SentimentAnalysis> {
  try {
    // Prepare data summary for AI
    const issueReports = reports.filter(r => r.type === 'issue');
    const ideaReports = reports.filter(r => r.type === 'idea');
    const civilianEventReports = reports.filter(r => r.type === 'civilian-event');
    const governmentEventReports = reports.filter(r => r.type === 'government-event');

    // Get top issues by votes
    const topIssues = issueReports
      .sort((a, b) => (b.votes || 0) - (a.votes || 0))
      .slice(0, 5)
      .map(r => r.description.substring(0, 100));

    // Get category breakdown for issues
    const categoryCount: Record<string, number> = {};
    issueReports.forEach(issue => {
      if (issue.category) {
        categoryCount[issue.category] = (categoryCount[issue.category] || 0) + 1;
      }
    });

    // Prepare prompt for AI
    const dataContext = `
CIVIC DATA SUMMARY:
Total Reports: ${reports.length}
- Issues: ${issueReports.length} (Problems/Concerns)
- Ideas: ${ideaReports.length} (Improvement Suggestions)
- Civilian Events: ${civilianEventReports.length} (Community Activities)
- Government Events: ${governmentEventReports.length} (Official Events)

TOP ISSUES BY COMMUNITY VOTES:
${topIssues.map((desc, i) => `${i + 1}. ${desc}`).join('\n')}

ISSUE CATEGORIES:
${Object.entries(categoryCount).map(([cat, count]) => `- ${cat}: ${count}`).join('\n')}

AVERAGE ENGAGEMENT:
- Average votes per issue: ${(issueReports.reduce((sum, r) => sum + (r.votes || 0), 0) / issueReports.length).toFixed(1)}
- Average votes per idea: ${(ideaReports.reduce((sum, r) => sum + (r.votes || 0), 0) / ideaReports.length).toFixed(1)}
`;

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "You are a civic analytics expert. Analyze city health and community engagement data. Provide clear, actionable insights about the city's wellbeing, citizen engagement, and areas needing attention. Be professional, balanced, and data-driven."
      },
      {
        role: "user",
        content: `Analyze this civic data and provide a comprehensive sentiment analysis:

${dataContext}

Please provide:
1. OVERALL CITY SENTIMENT (2-3 sentences): Overall assessment of city health and civic engagement
2. ISSUES ANALYSIS (2-3 sentences): What the reported problems indicate about city infrastructure and services
3. IDEAS ANALYSIS (2-3 sentences): What improvement suggestions reveal about community engagement and innovation
4. EVENTS ANALYSIS (2-3 sentences): What community and government events show about civic participation
5. KEY INSIGHTS (3-5 bullet points): Most important takeaways and recommendations

Format your response as a JSON object with keys: overall, issues, ideas, events, keyInsights (array)`
      }
    ];

    console.log('🤖 Generating AI sentiment analysis...');

    const completion = await openai.chat.completions.create({
      model: "nvidia/nemotron-nano-12b-v2-vl",
      messages: messages,
      max_tokens: 1000,
      temperature: 0.5,
      stream: false
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || '';
    console.log('📊 AI Response:', responseText);

    // Try to parse as JSON first
    try {
      // Extract JSON from response (in case it's wrapped in markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          overall: parsed.overall || 'Analysis unavailable',
          issues: parsed.issues || 'Analysis unavailable',
          ideas: parsed.ideas || 'Analysis unavailable',
          events: parsed.events || 'Analysis unavailable',
          keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : []
        };
      }
    } catch (parseError) {
      console.log('JSON parsing failed, using text-based extraction');
    }

    // Fallback: Parse text-based response
    return {
      overall: `The city has ${reports.length} total civic reports showing active community engagement. ${issueReports.length} issues and ${ideaReports.length} ideas indicate strong citizen participation in civic improvement.`,
      issues: `${issueReports.length} reported issues focus primarily on ${Object.keys(categoryCount)[0] || 'various'} concerns. Top issues have received significant community votes, indicating priority areas for attention.`,
      ideas: `${ideaReports.length} community ideas demonstrate active citizen engagement in proposing solutions and improvements. This reflects a community invested in positive change.`,
      events: `${civilianEventReports.length + governmentEventReports.length} total events show healthy civic participation, with a ${civilianEventReports.length > governmentEventReports.length ? 'strong grassroots' : 'balanced'} community presence.`,
      keyInsights: [
        `${issueReports.length} issues require attention, with ${Object.keys(categoryCount)[0] || 'infrastructure'} being most reported`,
        `Community engagement is ${ideaReports.length > issueReports.length / 2 ? 'high' : 'moderate'} with ${ideaReports.length} improvement ideas submitted`,
        `${civilianEventReports.length} civilian-led events show strong grassroots organization`,
        `Average engagement of ${(issueReports.reduce((sum, r) => sum + (r.votes || 0), 0) / issueReports.length).toFixed(1)} votes per issue indicates active community participation`
      ]
    };

  } catch (error) {
    console.error('Error generating sentiment analysis:', error);

    // Return fallback analysis
    const issueCount = reports.filter(r => r.type === 'issue').length;
    const ideaCount = reports.filter(r => r.type === 'idea').length;
    const eventCount = reports.filter(r => r.type === 'civilian-event' || r.type === 'government-event').length;

    return {
      overall: `The city has ${reports.length} total civic reports indicating active community engagement across issues, ideas, and events.`,
      issues: `${issueCount} issues have been reported, indicating areas requiring civic attention and infrastructure improvements.`,
      ideas: `${ideaCount} community ideas have been submitted, showing citizens are actively engaged in proposing solutions and improvements.`,
      events: `${eventCount} events demonstrate civic participation and community organizing efforts throughout the city.`,
      keyInsights: [
        `${issueCount} total issues reported`,
        `${ideaCount} improvement ideas submitted by community`,
        `${eventCount} civic events organized`,
        `Active community participation evident across all report types`
      ]
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📈 Analytics endpoint called - starting analysis...');

    // Read all reports from JSON files
    const allReports = await readAllReports();
    console.log(`📊 Loaded ${allReports.length} total reports`);

    if (allReports.length === 0) {
      return NextResponse.json({
        sentiment: {
          overall: 'No data available for analysis.',
          issues: 'No issues reported.',
          ideas: 'No ideas submitted.',
          events: 'No events recorded.',
          keyInsights: []
        },
        heatmapData: [],
        summary: {
          totalReports: 0,
          totalIssues: 0,
          totalIdeas: 0,
          totalCivilianEvents: 0,
          totalGovernmentEvents: 0
        }
      });
    }

    // Generate geographic clusters for heatmap
    console.log('🗺️  Creating geographic clusters...');
    const clusters = createGeographicClusters(allReports, 500); // 500m radius
    console.log(`✅ Created ${clusters.length} clusters`);

    // Generate AI sentiment analysis
    console.log('🤖 Generating AI sentiment analysis...');
    const sentiment = await generateSentimentAnalysis(allReports);
    console.log('✅ Sentiment analysis complete');

    // Prepare heatmap data (strip out the reports array to keep response small)
    const heatmapData = clusters.map(cluster => ({
      lat: cluster.lat,
      lng: cluster.lng,
      intensity: cluster.intensity,
      breakdown: cluster.breakdown
    }));

    // Calculate summary statistics
    const summary = {
      totalReports: allReports.length,
      totalIssues: allReports.filter(r => r.type === 'issue').length,
      totalIdeas: allReports.filter(r => r.type === 'idea').length,
      totalCivilianEvents: allReports.filter(r => r.type === 'civilian-event').length,
      totalGovernmentEvents: allReports.filter(r => r.type === 'government-event').length
    };

    const response: AnalyticsResponse = {
      sentiment,
      heatmapData,
      summary
    };

    console.log('✅ Analytics generated successfully');
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error generating analytics:', error);
    return NextResponse.json(
      { error: 'Failed to generate analytics' },
      { status: 500 }
    );
  }
}
