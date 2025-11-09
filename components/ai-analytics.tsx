"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, AlertCircle, Lightbulb, Users } from "lucide-react";
import { MapboxMap } from "@/components/mapbox-map";

interface SentimentAnalysis {
  overall: string;
  issues: string;
  ideas: string;
  events: string;
  keyInsights: string[];
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  breakdown: {
    issues: number;
    ideas: number;
    civilianEvents: number;
    governmentEvents: number;
  };
}

interface AnalyticsData {
  sentiment: SentimentAnalysis;
  heatmapData: HeatmapPoint[];
  summary: {
    totalReports: number;
    totalIssues: number;
    totalIdeas: number;
    totalCivilianEvents: number;
    totalGovernmentEvents: number;
  };
}

export function AIAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        const response = await fetch('/api/analytics');

        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }

        const data = await response.json();
        setAnalytics(data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Analyzing civic data with AI...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Analytics</CardTitle>
          <CardDescription>{error || 'Unable to load analytics data'}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Find top 5 hotspots by intensity
  const topHotspots = [...analytics.heatmapData]
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Main Layout: Map + AI Insights (Side-by-side) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Heatmap Map (60% width) */}
        <div className="lg:col-span-3 h-[600px]">
          <MapboxMap
            onReportSelect={() => {}}
            heatmapData={analytics?.heatmapData || []}
            initialShowHeatmap={false}
            showFilters={false}
          />
        </div>

        {/* Right: AI Sentiment Analysis (40% width) - Same height as map */}
        <div className="lg:col-span-2">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background h-[600px] overflow-auto">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI City Health Analysis</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Powered by NVIDIA AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall Sentiment */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">Overall</Badge>
                </div>
                <p className="text-xs leading-relaxed text-foreground/90">
                  {analytics.sentiment.overall}
                </p>
              </div>

              {/* Issues Analysis */}
              <div className="space-y-2 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  <Badge variant="destructive" className="text-xs">Issues</Badge>
                  <span className="text-xs text-muted-foreground">
                    ({analytics.summary.totalIssues})
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-foreground/90">
                  {analytics.sentiment.issues}
                </p>
              </div>

              {/* Ideas Analysis */}
              <div className="space-y-2 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-3.5 w-3.5 text-yellow-500" />
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                    Ideas
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ({analytics.summary.totalIdeas})
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-foreground/90">
                  {analytics.sentiment.ideas}
                </p>
              </div>

              {/* Events Analysis */}
              <div className="space-y-2 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-green-500" />
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                    Events
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ({analytics.summary.totalCivilianEvents + analytics.summary.totalGovernmentEvents})
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-foreground/90">
                  {analytics.sentiment.events}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Key Insights - Full Width Below Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Key Insights
          </CardTitle>
          <CardDescription>
            AI-generated recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {analytics.sentiment.keyInsights.map((insight, index) => (
              <li key={index} className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 flex-shrink-0">
                  {index + 1}
                </Badge>
                <p className="text-sm leading-relaxed">{insight}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Geographic Heatmap Data - Top Hotspots */}
      <Card>
        <CardHeader>
          <CardTitle>Geographic Analysis - Top Problem Areas</CardTitle>
          <CardDescription>
            Areas with highest concentration of reported issues (from {analytics.heatmapData.length} geographic clusters)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topHotspots.map((hotspot, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      #{index + 1}
                    </Badge>
                    <span className="text-sm font-medium">
                      {hotspot.lat.toFixed(4)}°N, {hotspot.lng.toFixed(4)}°W
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {hotspot.breakdown.issues > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {hotspot.breakdown.issues} Issues
                      </Badge>
                    )}
                    {hotspot.breakdown.ideas > 0 && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                        {hotspot.breakdown.ideas} Ideas
                      </Badge>
                    )}
                    {hotspot.breakdown.civilianEvents > 0 && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        {hotspot.breakdown.civilianEvents} Civilian Events
                      </Badge>
                    )}
                    {hotspot.breakdown.governmentEvents > 0 && (
                      <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                        {hotspot.breakdown.governmentEvents} Gov Events
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {hotspot.intensity.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Intensity
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Data Summary</CardTitle>
          <CardDescription>
            Overview of all civic reports analyzed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-3xl font-bold text-foreground">
                {analytics.summary.totalReports}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Total Reports
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-3xl font-bold text-red-600">
                {analytics.summary.totalIssues}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Issues
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-3xl font-bold text-blue-600">
                {analytics.summary.totalIdeas}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Ideas
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-3xl font-bold text-green-600">
                {analytics.summary.totalCivilianEvents}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Civilian Events
              </div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-3xl font-bold text-purple-600">
                {analytics.summary.totalGovernmentEvents}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Gov Events
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
