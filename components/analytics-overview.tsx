"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Lightbulb, Users, Building2, MapPin, Clock, BarChart3 } from "lucide-react";

type Report = {
  id: string;
  type?: string;
  description: string;
  location: {
    city?: string;
    state?: string;
    address?: string;
    lat: number;
    lng: number;
  };
  timestamp: string;
  status: string;
  votes?: number;
  title?: string;
};

interface AnalyticsOverviewProps {
  selectedReport: Report | null;
}

export function AnalyticsOverview({ selectedReport }: AnalyticsOverviewProps) {
  const categoryConfig = {
    'issue': {
      accent: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      icon: ShieldAlert,
      title: 'Issue Report'
    },
    'idea': {
      accent: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      icon: Lightbulb,
      title: 'Idea'
    },
    'civilian-event': {
      accent: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      icon: Users,
      title: 'Civilian Event'
    },
    'government-event': {
      accent: 'text-purple-500',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      icon: Building2,
      title: 'Government Event'
    }
  };
  const config = categoryConfig[selectedReport?.type as keyof typeof categoryConfig] || categoryConfig['issue'];
  const reportType = config.title;
  const accentColor = config.accent;
  const bgColor = config.bg;
  const borderColor = config.border;
  const ReportIcon = config.icon;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Analytics Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedReport ? (
          // Placeholder when no report is selected
          <div className="h-[500px] flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/25">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">
                Click a marker on the map
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                to view report details
              </p>
            </div>
          </div>
        ) : (
          // Report details display
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Report Type Badge */}
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${bgColor} ${borderColor} border-2`}>
                <ReportIcon className={`h-8 w-8 ${accentColor}`} />
              </div>
              <div>
                <h3 className={`text-lg font-bold ${accentColor}`}>
                  {reportType}
                </h3>
                <p className="text-xs text-muted-foreground">
                  ID: {selectedReport.id}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground/80">
                Description
              </h4>
              <p className="text-sm leading-relaxed text-foreground bg-muted/50 p-4 rounded-lg border border-border">
                {selectedReport.description}
              </p>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </h4>
              <div className="text-sm text-foreground bg-muted/50 p-4 rounded-lg border border-border">
                <p className="font-medium">{selectedReport.location.address}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedReport.location.city}, {selectedReport.location.state}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedReport.location.lat.toFixed(4)}, {selectedReport.location.lng.toFixed(4)}
                </p>
              </div>
            </div>

            {/* Timestamp */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Reported
              </h4>
              <div className="text-sm text-foreground bg-muted/50 p-4 rounded-lg border border-border">
                <p className="font-medium">
                  {new Date(selectedReport.timestamp).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(selectedReport.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 pt-2">
              <div className="px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-500">
                  Status: {selectedReport.status.toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
