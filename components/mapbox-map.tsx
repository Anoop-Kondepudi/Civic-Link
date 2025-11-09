"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import Map, { Marker, NavigationControl, ScaleControl, GeolocateControl, MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import Supercluster from "supercluster";
import issueData from "@/docs/issue.json";
import ideaData from "@/docs/idea.json";
import civilianEventData from "@/docs/civilian-event.json";
import governmentEventData from "@/docs/government-event.json";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ClusterMarker } from "@/components/cluster-marker";
import { MapFilterLegend } from "@/components/map-filter-legend";
import { Announcement } from "@/components/announcements-dropdown";
import {
  reportsToGeoJSON,
  reduceClusterProperties,
  CATEGORY_COLORS
} from "@/lib/cluster-utils";
import {
  ReportWithType,
  PointFeature,
  ClusterFeature,
  ClusterProperties,
  CategoryFilterState,
  ReportType
} from "@/types/cluster";

const MAPBOX_TOKEN = "pk.eyJ1IjoiemVsZG9tIiwiYSI6ImNtaHF2czcyeDEyaGcya3B6d3ZvY2hleDkifQ.2BQHylALQUj9cNYDuHijOQ";

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

interface MapboxMapProps {
  onReportSelect: (report: Report, markerPosition?: { x: number; y: number }) => void;
  showPopup?: boolean;
  onMapClick?: (location: { lat: number; lng: number; x: number; y: number }) => void;
  announcements?: Announcement[];
}

export function MapboxMap({ onReportSelect, showPopup = false, onMapClick, announcements = [] }: MapboxMapProps) {
  const [viewState, setViewState] = useState({
    longitude: -96.80,
    latitude: 32.78,
    zoom: 11
  });

  const [popupInfo, setPopupInfo] = useState<Report | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [isPopupClosing, setIsPopupClosing] = useState(false);
  const mapRef = useRef<MapRef>(null);

  // Category filter state - all enabled by default
  const [categoryFilters, setCategoryFilters] = useState<CategoryFilterState>({
    issue: true,
    idea: true,
    "civilian-event": true,
    "government-event": true,
  });

  const handleFilterChange = useCallback((category: ReportType, enabled: boolean) => {
    setCategoryFilters((prev) => ({
      ...prev,
      [category]: enabled,
    }));
  }, []);

  // Consolidate all reports into a single array with type tags and apply filters
  const allReports = useMemo<ReportWithType[]>(() => {
    const reports = [
      ...issueData.reports.map(r => ({ ...r, type: "issue" as const })),
      ...ideaData.reports.map(r => ({ ...r, type: "idea" as const })),
      ...civilianEventData.reports.map(r => ({ ...r, type: "civilian-event" as const })),
      ...governmentEventData.reports.map(r => ({ ...r, type: "government-event" as const })),
    ];

    // Filter based on enabled categories
    return reports.filter(report => categoryFilters[report.type]);
  }, [categoryFilters]);

  // Calculate category counts for the legend
  const categoryCounts = useMemo(() => {
    return {
      issue: issueData.reports.length,
      idea: ideaData.reports.length,
      "civilian-event": civilianEventData.reports.length,
      "government-event": governmentEventData.reports.length,
    };
  }, []);

  // Initialize Supercluster
  const supercluster = useMemo(() => {
    const cluster = new Supercluster({
      radius: 40,
      maxZoom: 13,
      minZoom: 0,
      minPoints: 3,
      reduce: reduceClusterProperties,
    });

    // Convert reports to GeoJSON and ensure each has categoryCounts initialized
    const points = reportsToGeoJSON(allReports).map(point => ({
      ...point,
      properties: {
        ...point.properties,
        categoryCounts: {
          issue: point.properties.report.type === "issue" ? 1 : 0,
          idea: point.properties.report.type === "idea" ? 1 : 0,
          "civilian-event": point.properties.report.type === "civilian-event" ? 1 : 0,
          "government-event": point.properties.report.type === "government-event" ? 1 : 0,
        }
      }
    }));

    cluster.load(points);
    return cluster;
  }, [allReports]);

  // Get clusters for current viewport
  const clusters = useMemo(() => {
    if (!mapRef.current) return [];

    const map = mapRef.current.getMap();
    const bounds = map.getBounds();

    if (!bounds) return [];

    return supercluster.getClusters(
      [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      Math.floor(viewState.zoom)
    );
  }, [supercluster, viewState.zoom, viewState.latitude, viewState.longitude]);

  const closePopup = useCallback(() => {
    setIsPopupClosing(true);
    setTimeout(() => {
      setPopupInfo(null);
      setPopupPosition(null);
      setIsPopupClosing(false);
    }, 200); // Match the animation duration
  }, []);

  const getMarkerScreenPosition = useCallback((lat: number, lng: number): { x: number; y: number } | undefined => {
    if (!mapRef.current) return undefined;

    try {
      const map = mapRef.current.getMap();
      const point = map.project([lng, lat]);

      // Get the map container's position on the page
      const mapContainer = mapRef.current.getContainer();
      const rect = mapContainer.getBoundingClientRect();

      return {
        x: rect.left + point.x,
        y: rect.top + point.y,
      };
    } catch (error) {
      console.error("Error calculating marker position:", error);
      return undefined;
    }
  }, []);

  const handleMarkerClick = (report: Report) => {
    const markerPosition = getMarkerScreenPosition(report.location.lat, report.location.lng);

    if (showPopup) {
      // Toggle: if clicking same marker, close it; otherwise show new one
      if (popupInfo?.id === report.id) {
        closePopup();
      } else {
        // If another popup is open, close it first
        if (popupInfo) {
          closePopup();
          setTimeout(() => {
            setPopupInfo(report);
            setPopupPosition(markerPosition || null);
          }, 200);
        } else {
          setPopupInfo(report);
          setPopupPosition(markerPosition || null);
        }
      }
    } else {
      onReportSelect(report, markerPosition);
    }
  };

  const handleClusterClick = useCallback((clusterId: number, longitude: number, latitude: number) => {
    if (!mapRef.current) return;

    const map = mapRef.current.getMap();
    const expansionZoom = Math.min(
      supercluster.getClusterExpansionZoom(clusterId),
      20
    );

    map.flyTo({
      center: [longitude, latitude],
      zoom: expansionZoom,
      duration: 500,
    });
  }, [supercluster]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border shadow-lg relative">
      {/* Category Filter Legend */}
      <div className="absolute top-4 left-4 z-10">
        <MapFilterLegend
          filters={categoryFilters}
          onFilterChange={handleFilterChange}
          categoryCounts={categoryCounts}
        />
      </div>

      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={(event) => {
          console.log("🎯 Map onClick fired!", event);
          if (onMapClick && mapRef.current) {
            console.log("✅ onMapClick exists, processing...");
            const { lng, lat } = event.lngLat;
            const map = mapRef.current.getMap();
            const point = map.project([lng, lat]);
            const mapContainer = mapRef.current.getContainer();
            const rect = mapContainer.getBoundingClientRect();

            const locationData = {
              lat,
              lng,
              x: rect.left + point.x,
              y: rect.top + point.y,
            };
            console.log("📍 Calling onMapClick with:", locationData);
            onMapClick(locationData);
          } else {
            console.log("❌ onMapClick not available:", { onMapClick, hasMapRef: !!mapRef.current });
          }
        }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Render clusters and individual markers */}
        {clusters.map((cluster) => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          const properties = cluster.properties;

          // Only render as cluster if it has multiple points (point_count > 1)
          // This prevents single points from showing as clusters with "1"
          const isActualCluster = properties.cluster && properties.point_count && properties.point_count > 1;

          if (isActualCluster) {
            // Render cluster marker with pie chart
            return (
              <Marker
                key={`cluster-${cluster.id}`}
                longitude={longitude}
                latitude={latitude}
              >
                <ClusterMarker
                  pointCount={properties.point_count!}
                  categoryCounts={properties.categoryCounts}
                  onClick={() => handleClusterClick(cluster.id as number, longitude, latitude)}
                />
              </Marker>
            );
          } else {
            // Render individual marker (includes both non-clusters and edge case clusters with 1 point)
            const report = (properties as any).report as ReportWithType;
            return (
              <Marker
                key={report.id}
                longitude={longitude}
                latitude={latitude}
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  handleMarkerClick(report);
                }}
              >
                <div
                  className="cursor-pointer hover:scale-110 transition-transform"
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: CATEGORY_COLORS[report.type],
                    border: "2px solid #ffffff",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  }}
                />
              </Marker>
            );
          }
        })}

        {/* Render announcement markers */}
        {announcements.map((announcement) => (
          <Marker
            key={announcement.id}
            longitude={announcement.location.lng}
            latitude={announcement.location.lat}
          >
            <div
              className="cursor-pointer hover:scale-110 transition-transform"
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "#10b981", // green for announcements
                border: "3px solid #ffffff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
              }}
            />
          </Marker>
        ))}

        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />
        <ScaleControl />
      </Map>

      {/* Custom Styled Popup with Animation */}
      {showPopup && popupInfo && popupPosition && (() => {
        // Calculate smart positioning for popup preview
        const popupWidth = 240; // min-w-[200px] + padding
        const popupHeight = 120; // approximate height
        const spacing = 15;
        const markerSize = 20;

        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;

        // Determine vertical position (prefer above)
        const spaceAbove = popupPosition.y - spacing - markerSize / 2;
        const spaceBelow = viewportHeight - popupPosition.y - spacing - markerSize / 2;
        const showAbove = spaceAbove >= popupHeight || spaceAbove > spaceBelow;

        let top: number;
        let tailPosition: 'top' | 'bottom';

        if (showAbove) {
          top = popupPosition.y - spacing - markerSize / 2;
          tailPosition = 'bottom';
        } else {
          top = popupPosition.y + spacing + markerSize / 2;
          tailPosition = 'top';
        }

        // Calculate horizontal position
        let left = popupPosition.x;
        const halfWidth = popupWidth / 2;
        const padding = 16;

        if (left - halfWidth < padding) {
          left = halfWidth + padding;
        }
        if (left + halfWidth > viewportWidth - padding) {
          left = viewportWidth - halfWidth - padding;
        }

        const tailOffset = popupPosition.x - left;

        return (
          <div
            className={`fixed z-10 pointer-events-none ${
              isPopupClosing ? 'animate-fade-scale-out-fast' : 'animate-fade-scale-fast'
            }`}
            style={{
              left: `${left}px`,
              top: showAbove ? `${top}px` : undefined,
              bottom: showAbove ? undefined : `${viewportHeight - top}px`,
              transform: showAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            }}
          >
            <Card className="shadow-lg border-border min-w-[200px] pointer-events-auto relative">
              {/* Rounded Tail for popup */}
              <div
                className={`absolute ${
                  tailPosition === 'bottom'
                    ? '-bottom-2 rounded-bl-full'
                    : '-top-2 rounded-tl-full'
                } bg-card border-l border-b w-4 h-4`}
                style={{
                  left: `calc(50% + ${tailOffset}px - 8px)`,
                  clipPath: tailPosition === 'bottom'
                    ? 'polygon(0 0, 100% 0, 0 100%)'
                    : 'polygon(0 100%, 100% 100%, 0 0)',
                  transform: tailPosition === 'bottom'
                    ? 'rotate(-45deg)'
                    : 'rotate(135deg)',
                }}
              />
              <CardContent className="p-4 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={closePopup}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="pr-6">
                  <p className="text-sm text-muted-foreground mb-3">
                    {popupInfo.type === "issue" ? "Issue Report" :
                     popupInfo.type === "idea" ? "Idea" :
                     popupInfo.type === "civilian-event" ? "Civilian Event" :
                     "Government Event"}
                  </p>
                  <Button
                    onClick={() => {
                      const markerPosition = getMarkerScreenPosition(popupInfo.location.lat, popupInfo.location.lng);
                      onReportSelect(popupInfo, markerPosition);
                      closePopup();
                    }}
                    className="w-full"
                  >
                    View Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}
    </div>
  );
}
