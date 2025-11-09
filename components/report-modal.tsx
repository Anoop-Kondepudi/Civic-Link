"use client";

import { X, MapPin, Clock, AlertCircle, Construction, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Report = {
  id: string;
  type?: string;
  description: string;
  location: {
    city: string;
    state: string;
    address: string;
    lat: number;
    lng: number;
  };
  timestamp: string;
  status: string;
};

interface ReportModalProps {
  report: Report | null;
  isOpen: boolean;
  isClosing?: boolean;
  onClose: () => void;
  markerPosition?: { x: number; y: number } | null;
}

export function ReportModal({ report, isOpen, isClosing = false, onClose, markerPosition }: ReportModalProps) {
  if (!isOpen || !report) return null;

  const isCrime = report.type === "crime";
  const accentColor = isCrime ? "text-red-500" : "text-orange-500";
  const bgColor = isCrime ? "bg-red-500/10" : "bg-orange-500/10";
  const borderColor = isCrime ? "border-red-500/20" : "border-orange-500/20";
  const ReportIcon = isCrime ? ShieldAlert : Construction;

  // Always use centered positioning for large modal
  const positionConfig = {
    position: "center" as const,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`bg-card border rounded-lg shadow-lg pointer-events-auto relative max-w-lg w-full ${
            isClosing ? 'animate-fade-scale-out' : 'animate-fade-scale'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 hover:bg-muted"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Report Type Header */}
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-16 h-16 ${bgColor} ${borderColor} border-2 rounded-xl`}>
                <ReportIcon className={`h-8 w-8 ${accentColor}`} />
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${accentColor}`}>
                  {isCrime ? "Crime Report" : "Construction Report"}
                </h2>
                <p className="text-sm text-muted-foreground">ID: {report.id}</p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-foreground/80 mb-2">
                Description
              </h3>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <p className="text-sm text-foreground">{report.description}</p>
              </div>
            </div>

            {/* Location */}
            <div>
              <h3 className="text-sm font-semibold text-foreground/80 mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </h3>
              <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-1">
                <p className="text-sm font-medium text-foreground">{report.location.address}</p>
                <p className="text-sm text-muted-foreground">
                  {report.location.city}, {report.location.state}
                </p>
                <p className="text-xs text-muted-foreground">
                  {report.location.lat.toFixed(4)}, {report.location.lng.toFixed(4)}
                </p>
              </div>
            </div>

            {/* Timestamp */}
            <div>
              <h3 className="text-sm font-semibold text-foreground/80 mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Reported
              </h3>
              <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {new Date(report.timestamp).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(report.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {/* Status */}
            <div>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/50">
                Status: {report.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
