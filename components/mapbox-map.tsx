"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Map, { Marker, NavigationControl, ScaleControl, GeolocateControl, MapRef, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import Supercluster from "supercluster";
import issueData from "@/docs/issue.json";
import ideaData from "@/docs/idea.json";
import civilianEventData from "@/docs/civilian-event.json";
import governmentEventData from "@/docs/government-event.json";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ThumbsUp, ThumbsDown, Layers } from "lucide-react";
import { ClusterMarker } from "@/components/cluster-marker";
import { MapFilterLegend } from "@/components/map-filter-legend";
import { MarkerHoverCard } from "@/components/marker-hover-card";
import { Announcement } from "@/components/announcements-dropdown";
import {
  reportsToGeoJSON,
  reduceClusterProperties,
  CATEGORY_COLORS
} from "@/lib/cluster-utils";
import {
  ReportWithType,
  CategoryFilterState,
  ReportType
} from "@/types/cluster";

const MAPBOX_TOKEN = "pk.eyJ1IjoiemVsZG9tIiwiYSI6ImNtaHF2czcyeDEyaGcya3B6d3ZvY2hleDkifQ.2BQHylALQUj9cNYDuHijOQ";

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
  downvotes?: number;
  title?: string;
};

export interface HeatmapPoint {
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

interface MapboxMapProps {
  onReportSelect: (report: Report, markerPosition?: { x: number; y: number }) => void;
  showPopup?: boolean;
  onMapClick?: (location: { lat: number; lng: number; x: number; y: number }) => void;
  announcements?: Announcement[];
  heatmapData?: HeatmapPoint[];
  initialShowHeatmap?: boolean;
  showFilters?: boolean;
}

export function MapboxMap({
  onReportSelect,
  showPopup = false,
  onMapClick,
  announcements = [],
  heatmapData = [],
  initialShowHeatmap = false,
  showFilters = true
}: MapboxMapProps) {
  const [viewState, setViewState] = useState({
    longitude: -96.80,
    latitude: 32.78,
    zoom: 11
  });

  const [popupInfo, setPopupInfo] = useState<Report | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [isPopupClosing, setIsPopupClosing] = useState(false);
  const [hoveredMarker, setHoveredMarker] = useState<{ report: Report; reportType: string } | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, 'like' | 'dislike'>>({});
  const [showHeatmap, setShowHeatmap] = useState(initialShowHeatmap);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<MapRef>(null);

  // Category filter state - all enabled by default
  const [categoryFilters, setCategoryFilters] = useState<CategoryFilterState>({
    issue: true,
    idea: true,
    "civilian-event": true,
    "government-event": true,
  });

  // Load votes from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedVotes = localStorage.getItem('civic-link-votes');
      if (savedVotes) {
        try {
          setUserVotes(JSON.parse(savedVotes));
        } catch (e) {
          console.error('Error loading votes from localStorage:', e);
        }
      }
    }
  }, []);

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

  // Convert heatmap data to GeoJSON format for Mapbox
  const heatmapGeoJSON = useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) {
      return {
        type: 'FeatureCollection' as const,
        features: []
      };
    }

    return {
      type: 'FeatureCollection' as const,
      features: heatmapData.map((point, index) => ({
        type: 'Feature' as const,
        id: index,
        geometry: {
          type: 'Point' as const,
          coordinates: [point.lng, point.lat]
        },
        properties: {
          intensity: point.intensity,
          issues: point.breakdown.issues,
          ideas: point.breakdown.ideas,
          civilianEvents: point.breakdown.civilianEvents,
          governmentEvents: point.breakdown.governmentEvents
        }
      }))
    };
  }, [heatmapData]);

  const closePopup = useCallback(() => {
    setIsPopupClosing(true);
    setTimeout(() => {
      setPopupInfo(null);
      setPopupPosition(null);
      setIsPopupClosing(false);
    }, 200);
  }, []);

  const getMarkerScreenPosition = useCallback((lat: number, lng: number): { x: number; y: number } | undefined => {
    if (!mapRef.current) return undefined;

    try {
      const map = mapRef.current.getMap();
      const point = map.project([lng, lat]);

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
      if (popupInfo?.id === report.id) {
        closePopup();
      } else {
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

  const handleMarkerHover = (report: Report, reportType: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    const markerPosition = getMarkerScreenPosition(report.location.lat, report.location.lng);
    if (markerPosition) {
      setHoveredMarker({ report, reportType });
      setHoverPosition(markerPosition);
    }
  };

  const handleMarkerLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredMarker(null);
      setHoverPosition(null);
    }, 300);
  };

  const cancelHoverClose = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleHoverCardClose = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredMarker(null);
    setHoverPosition(null);
  };

  const handleLike = async () => {
    if (!hoveredMarker) return;

    const reportId = hoveredMarker.report.id;
    const currentVote = userVotes[reportId];

    if (currentVote === 'like') {
      handleHoverCardClose();
      return;
    }

    const newVotes = { ...userVotes, [reportId]: 'like' as const };
    setUserVotes(newVotes);
    localStorage.setItem('civic-link-votes', JSON.stringify(newVotes));

    handleHoverCardClose();

    try {
      const response = await fetch(`/api/reports/${reportId}/vote`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Vote successful! New vote count:", data.votes);
      } else {
        console.error("Vote failed, reverting...");
        const revertedVotes = { ...userVotes };
        delete revertedVotes[reportId];
        setUserVotes(revertedVotes);
        localStorage.setItem('civic-link-votes', JSON.stringify(revertedVotes));
      }
    } catch (error) {
      console.error("Error voting:", error);
      const revertedVotes = { ...userVotes };
      delete revertedVotes[reportId];
      setUserVotes(revertedVotes);
      localStorage.setItem('civic-link-votes', JSON.stringify(revertedVotes));
    }
  };

  const handleDislike = async () => {
    if (!hoveredMarker) return;

    const reportId = hoveredMarker.report.id;
    const currentVote = userVotes[reportId];

    if (currentVote === 'dislike') {
      handleHoverCardClose();
      return;
    }

    const newVotes = { ...userVotes, [reportId]: 'dislike' as const };
    setUserVotes(newVotes);
    localStorage.setItem('civic-link-votes', JSON.stringify(newVotes));

    handleHoverCardClose();

    try {
      const response = await fetch(`/api/reports/${reportId}/downvote`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Downvote successful! New downvote count:", data.downvotes);
      } else {
        console.error("Downvote failed, reverting...");
        const revertedVotes = { ...userVotes };
        delete revertedVotes[reportId];
        setUserVotes(revertedVotes);
        localStorage.setItem('civic-link-votes', JSON.stringify(revertedVotes));
      }
    } catch (error) {
      console.error("Error downvoting:", error);
      const revertedVotes = { ...userVotes };
      delete revertedVotes[reportId];
      setUserVotes(revertedVotes);
      localStorage.setItem('civic-link-votes', JSON.stringify(revertedVotes));
    }
  };

  const generateTitle = (description: string): string => {
    const firstSentence = description.split('.')[0];
    return firstSentence.length > 50 ? firstSentence.substring(0, 50) + '...' : firstSentence;
  };

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border shadow-lg relative">
      {/* Category Filter Legend */}
      {showFilters && (
        <div className="absolute top-4 left-4 z-10">
          <MapFilterLegend
            filters={categoryFilters}
            onFilterChange={handleFilterChange}
            categoryCounts={categoryCounts}
          />
        </div>
      )}

      {/* Heatmap Toggle Button */}
      {heatmapData && heatmapData.length > 0 && (
        <div className="absolute top-4 right-14 z-10">
          <Button
            onClick={() => setShowHeatmap(!showHeatmap)}
            variant={showHeatmap ? "default" : "secondary"}
            size="sm"
            className="shadow-lg"
          >
            <Layers className="h-4 w-4 mr-2" />
            {showHeatmap ? "Markers" : "Heatmap"}
          </Button>
        </div>
      )}

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
        {/* Heatmap Layer */}
        {showHeatmap && heatmapGeoJSON.features.length > 0 && (
          <Source
            id="heatmap-source"
            type="geojson"
            data={heatmapGeoJSON}
          >
            <Layer
              id="heatmap-layer"
              type="heatmap"
              paint={{
                // Heatmap weight based on intensity property
                'heatmap-weight': [
                  'interpolate',
                  ['linear'],
                  ['get', 'intensity'],
                  0, 0,
                  20, 1
                ],
                // Color ramp for heatmap (blue -> cyan -> yellow -> orange -> red)
                'heatmap-color': [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  0, 'rgba(33,102,172,0)',      // transparent blue
                  0.2, 'rgb(103,169,207)',       // light blue
                  0.4, 'rgb(209,229,240)',       // cyan
                  0.6, 'rgb(253,219,199)',       // light orange
                  0.8, 'rgb(239,138,98)',        // orange
                  1, 'rgb(178,24,43)'            // red
                ],
                // Adjust radius by zoom level (bigger as you zoom in)
                'heatmap-radius': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  0, 2,
                  9, 20,
                  14, 30
                ],
                // Heatmap intensity
                'heatmap-intensity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  0, 1,
                  9, 3
                ],
                // Opacity
                'heatmap-opacity': 0.8
              }}
            />
          </Source>
        )}

        {/* Render clusters and individual markers (hidden when heatmap is active) */}
        {!showHeatmap && clusters.map((cluster) => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          const properties = cluster.properties;

          const isActualCluster = properties.cluster && properties.point_count && properties.point_count > 1;

          if (isActualCluster) {
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
            const report = (properties as any).report as ReportWithType;
            const userVote = userVotes[report.id];
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
                <div className="relative">
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
                    onMouseEnter={() => handleMarkerHover(report, report.type)}
                    onMouseLeave={handleMarkerLeave}
                  />
                  {userVote && (
                    <div
                      className="absolute -top-3 -right-3 rounded-full flex items-center justify-center animate-in zoom-in duration-200"
                      style={{
                        width: "24px",
                        height: "24px",
                        backgroundColor: userVote === 'like' ? '#22c55e' : '#ef4444',
                        border: "2px solid #ffffff",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                      }}
                    >
                      {userVote === 'like' ? (
                        <ThumbsUp className="h-3.5 w-3.5 text-white fill-white" />
                      ) : (
                        <ThumbsDown className="h-3.5 w-3.5 text-white fill-white" />
                      )}
                    </div>
                  )}
                </div>
              </Marker>
            );
          }
        })}

        {/* Render announcement markers (hidden when heatmap is active) */}
        {!showHeatmap && announcements.filter(a => a.location).map((announcement) => (
          <Marker
            key={announcement.id}
            longitude={announcement.location!.lng}
            latitude={announcement.location!.lat}
          >
            <div
              className="cursor-pointer hover:scale-110 transition-transform"
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: "#f59e0b",
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
        const popupWidth = 240;
        const popupHeight = 120;
        const spacing = 15;
        const markerSize = 20;

        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;

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

      {/* Hover Card */}
      {hoveredMarker && hoverPosition && (
        <div
          onMouseEnter={cancelHoverClose}
          onMouseLeave={handleMarkerLeave}
        >
          <MarkerHoverCard
            title={hoveredMarker.report.title || generateTitle(hoveredMarker.report.description)}
            votes={hoveredMarker.report.votes || 0}
            reportType={hoveredMarker.reportType}
            onLike={handleLike}
            onDislike={handleDislike}
            onClose={handleHoverCardClose}
            position={hoverPosition}
            userVote={userVotes[hoveredMarker.report.id] || null}
          />
        </div>
      )}
    </div>
  );
}
