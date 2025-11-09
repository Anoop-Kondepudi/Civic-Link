import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import type { ChatCompletionContentPart, ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Initialize OpenAI client for NVIDIA API
const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || '',
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

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

// Helper function to check for nearby duplicate reports
function checkForNearbyDuplicates(
  reports: any[],
  lat: number,
  lng: number,
  radiusMeters: number = 100
): any | null {
  for (const report of reports) {
    const distance = calculateDistance(lat, lng, report.location.lat, report.location.lng);
    if (distance <= radiusMeters) {
      return report; // Found a duplicate within radius
    }
  }
  return null;
}

// Helper function to categorize issue using AI
async function categorizeIssue(description: string): Promise<string> {
  try {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "You are a civic issue categorization assistant. Categorize issues into EXACTLY ONE of these categories: Infrastructure, Health, Environment, Social, Education. Respond with ONLY the category name, nothing else."
      },
      {
        role: "user",
        content: `Categorize this civic issue into one of these categories: Infrastructure, Health, Environment, Social, Education.\n\nIssue: "${description}"\n\nRespond with ONLY the category name.`
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "nvidia/nemotron-nano-12b-v2-vl",
      messages: messages,
      max_tokens: 50,
      temperature: 0.3,
      stream: false
    });

    const category = completion.choices[0]?.message?.content?.trim() || 'Environment';
    
    // Validate and normalize the category
    const validCategories = ['Infrastructure', 'Health', 'Environment', 'Social', 'Education'];
    const normalizedCategory = validCategories.find(cat => 
      category.toLowerCase().includes(cat.toLowerCase())
    );
    
    return normalizedCategory || 'Environment'; // Default to Environment if unclear
  } catch (error) {
    console.error('Error categorizing issue:', error);
    return 'Environment'; // Default category on error
  }
}

// Helper function to enhance user-provided description with AI
async function enhanceDescription(description: string, reportType: string): Promise<string> {
  try {
    const typeContext = {
      'issue': 'a civic issue or problem',
      'idea': 'a civic improvement proposal or idea',
      'civilian-event': 'a community event (like food donation or cleanup)',
      'government-event': 'a government-organized event'
    }[reportType] || 'a civic report';

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "You are a civic reporting assistant. Improve and clarify user descriptions while keeping them factual and concise. Make the description clear, professional, and actionable."
      },
      {
        role: "user",
        content: `This is ${typeContext}. Improve this description to be clear and professional:\n\n"${description}"\n\nProvide only the improved description, nothing else.`
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "nvidia/nemotron-nano-12b-v2-vl",
      messages: messages,
      max_tokens: 300,
      temperature: 0.7,
      stream: false
    });

    return completion.choices[0]?.message?.content?.trim() || description;
  } catch (error) {
    console.error('Error enhancing description:', error);
    return description; // Return original if enhancement fails
  }
}

// Helper function to generate description from image using NVIDIA's VLM
async function generateDescriptionFromImage(imageBase64: string, imageType: string, reportType: string): Promise<string> {
  try {
    const typeContext = {
      'issue': 'Focus on identifying problems, safety concerns, or infrastructure issues.',
      'idea': 'Focus on improvement opportunities and suggestions.',
      'civilian-event': 'Focus on community events like donations, cleanups, or gatherings.',
      'government-event': 'Focus on official government activities or public services.'
    }[reportType] || 'Be specific and factual.';

    const content: ChatCompletionContentPart[] = [
      { 
        type: "text" as const, 
        text: `Describe this image in detail for a civic report. ${typeContext} Provide a clear, professional description.`
      },
      {
        type: "image_url" as const,
        image_url: {
          url: `data:${imageType};base64,${imageBase64}`
        }
      }
    ];

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "/think"
      },
      {
        role: "user",
        content: content
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "nvidia/nemotron-nano-12b-v2-vl",
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
      stream: false
    });

    return completion.choices[0]?.message?.content || "Image description unavailable.";
  } catch (error) {
    console.error('Error generating image description:', error);
    return "Unable to generate description from image.";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, description, location, images } = body;

    // Validate input
    if (!type || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: type and location are required' },
        { status: 400 }
      );
    }

    // Must have either description or images
    if (!description && (!images || images.length === 0)) {
      return NextResponse.json(
        { error: 'Must provide either a description or at least one image' },
        { status: 400 }
      );
    }

    const validTypes = ['issue', 'idea', 'civilian-event', 'government-event'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid report type. Must be "issue", "idea", "civilian-event", or "government-event"' },
        { status: 400 }
      );
    }

    // Process description: enhance if provided, generate from image if not
    let finalDescription = description;
    let category: string | undefined = undefined;
    
    if (!finalDescription && images && images.length > 0) {
      // No description provided - generate from image
      console.log('📸 No description provided. Generating from image...');
      
      const firstImage = images[0];
      const imageType = firstImage.mimeType || 'image/jpeg';
      const imageData = firstImage.base64 || firstImage.data;
      
      finalDescription = await generateDescriptionFromImage(imageData, imageType, type);
      console.log('✨ Generated description:', finalDescription);
    } else if (finalDescription) {
      // Description provided - enhance it with AI
      console.log('✏️ Enhancing user-provided description...');
      finalDescription = await enhanceDescription(finalDescription, type);
      console.log('✨ Enhanced description:', finalDescription);
    }

    // Categorize issues using AI
    if (type === 'issue') {
      console.log('🔖 Categorizing issue...');
      category = await categorizeIssue(finalDescription);
      console.log('✅ Category:', category);
    }

    // Determine which JSON file to update
    const fileName = `${type}.json`;
    const filePath = path.join(process.cwd(), 'docs', fileName);

    // Read existing data
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    // Check for nearby duplicates (within 100 meters)
    const nearbyReport = checkForNearbyDuplicates(data.reports, location.lat, location.lng, 100);
    if (nearbyReport) {
      return NextResponse.json(
        { 
          error: 'Similar report exists nearby',
          message: 'A similar report already exists within 100 meters of this location. Please vote on the existing report instead.',
          existingReport: {
            id: nearbyReport.id,
            description: nearbyReport.description,
            votes: nearbyReport.votes || 0,
            distance: calculateDistance(location.lat, location.lng, nearbyReport.location.lat, nearbyReport.location.lng)
          }
        },
        { status: 409 } // Conflict status
      );
    }

    // Generate new ID
    const prefixMap: Record<string, string> = {
      'issue': 'issue',
      'idea': 'idea',
      'civilian-event': 'civ-event',
      'government-event': 'gov-event'
    };
    const prefix = prefixMap[type];
    const existingIds = data.reports.map((r: any) => {
      const match = r.id.match(new RegExp(`${prefix}-(\\d+)`));
      return match ? parseInt(match[1]) : 0;
    });
    const nextId = Math.max(...existingIds, 0) + 1;
    const newId = `${prefix}-${String(nextId).padStart(3, '0')}`;

    // Generate title from description (first sentence or 50 chars)
    const generateTitle = (desc: string): string => {
      const firstSentence = desc.split('.')[0];
      return firstSentence.length > 50 ? firstSentence.substring(0, 50) + '...' : firstSentence;
    };

    // Create new report
    const newReport = {
      id: newId,
      description: finalDescription,
      title: generateTitle(finalDescription),
      votes: 0,
      downvotes: 0,
      location: {
        lat: location.lat,
        lng: location.lng,
      },
      timestamp: new Date().toISOString(),
      status: 'open',
      // Add category for issues
      ...(type === 'issue' && category && { category }),
      // Include images if provided
      ...(images && images.length > 0 && { 
        images: images.map((img: any) => ({
          mimeType: img.mimeType || 'image/jpeg',
          base64: img.base64 || img.data
        }))
      }),
    };

    // Add to beginning of reports array (most recent first)
    data.reports.unshift(newReport);

    // Write back to file with pretty formatting
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`✅ New ${type} report created:`, newId);

    return NextResponse.json({
      success: true,
      report: newReport
    });

  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    );
  }
}
