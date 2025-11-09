"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Map, { Marker, NavigationControl, ScaleControl, GeolocateControl, MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import issueData from "@/docs/issue.json";
import ideaData from "@/docs/idea.json";
import civilianEventData from "@/docs/civilian-event.json";
import governmentEventData from "@/docs/government-event.json";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ThumbsUp, ThumbsDown, Car, Heart, Leaf, Users, GraduationCap, Filter } from "lucide-react";
import { MarkerHoverCard } from "@/components/marker-hover-card";

const MAPBOX_TOKEN = "pk.eyJ1IjoiemVsZG9tIiwiYSI6ImNtaHF2czcyeDEyaGcya3B6d3ZvY2hleDkifQ.2BQHylALQUj9cNYDuHijOQ";

type Report = {
  id: string;
  type?: string;
  description: string;
  category?: string;
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

type Category = "Mobility(Transport)" | "Health" | "Environment" | "Social" | "Education";

interface MapboxMapProps {
  onReportSelect: (report: Report, markerPosition?: { x: number; y: number }) => void;
  showPopup?: boolean;
  onMapClick?: (location: { lat: number; lng: number; x: number; y: number }) => void;
}

export function MapboxMap({ onReportSelect, showPopup = false, onMapClick }: MapboxMapProps) {
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
  const [selectedCategories, setSelectedCategories] = useState<Set<Category>>(new Set(["Mobility(Transport)", "Health", "Environment", "Social", "Education"]));
  const [showFilterMenu, setShowFilterMenu] = useState(true);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<MapRef>(null);

  // Category styling configuration
  const categoryConfig: Record<Category, { color: string; icon: any; name: string }> = {
    "Mobility(Transport)": { color: "#3b82f6", icon: Car, name: "Infrastructure" }, // Blue
    "Health": { color: "#ef4444", icon: Heart, name: "Health" }, // Red
    "Environment": { color: "#10b981", icon: Leaf, name: "Environment" }, // Green
    "Social": { color: "#f59e0b", icon: Users, name: "Social" }, // Amber
    "Education": { color: "#8b5cf6", icon: GraduationCap, name: "Education" }, // Purple
  };

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

  const handleMarkerHover = (report: Report, reportType: string) => {
    // Clear any pending timeout
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
    // Delay closing to allow mouse to move to the hover card
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredMarker(null);
      setHoverPosition(null);
    }, 300);
  };

  const cancelHoverClose = () => {
    // Cancel the close timeout when mouse enters the hover card
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleHoverCardClose = () => {
    // Immediately close without timeout
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
    
    // If already liked, don't do anything
    if (currentVote === 'like') {
      handleHoverCardClose();
      return;
    }
    
    // Update UI immediately (optimistic update)
    const newVotes = { ...userVotes, [reportId]: 'like' as const };
    setUserVotes(newVotes);
    localStorage.setItem('civic-link-votes', JSON.stringify(newVotes));
    
    handleHoverCardClose();
    
    // Send API request in background
    try {
      const response = await fetch(`/api/reports/${reportId}/vote`, { 
        method: 'POST' 
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Vote successful! New vote count:", data.votes);
      } else {
        // Revert on failure
        console.error("Vote failed, reverting...");
        const revertedVotes = { ...userVotes };
        delete revertedVotes[reportId];
        setUserVotes(revertedVotes);
        localStorage.setItem('civic-link-votes', JSON.stringify(revertedVotes));
      }
    } catch (error) {
      console.error("Error voting:", error);
      // Revert on error
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
    
    // If already disliked, don't do anything
    if (currentVote === 'dislike') {
      handleHoverCardClose();
      return;
    }
    
    // Update UI immediately (optimistic update)
    const newVotes = { ...userVotes, [reportId]: 'dislike' as const };
    setUserVotes(newVotes);
    localStorage.setItem('civic-link-votes', JSON.stringify(newVotes));
    
    handleHoverCardClose();
    
    // Send API request in background
    try {
      const response = await fetch(`/api/reports/${reportId}/downvote`, { 
        method: 'POST' 
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Downvote successful! New downvote count:", data.downvotes);
      } else {
        // Revert on failure
        console.error("Downvote failed, reverting...");
        const revertedVotes = { ...userVotes };
        delete revertedVotes[reportId];
        setUserVotes(revertedVotes);
        localStorage.setItem('civic-link-votes', JSON.stringify(revertedVotes));
      }
    } catch (error) {
      console.error("Error downvoting:", error);
      // Revert on error
      const revertedVotes = { ...userVotes };
      delete revertedVotes[reportId];
      setUserVotes(revertedVotes);
      localStorage.setItem('civic-link-votes', JSON.stringify(revertedVotes));
    }
  };

  // Generate title from description (first 50 chars or until first period)
  const generateTitle = (description: string): string => {
    const firstSentence = description.split('.')[0];
    return firstSentence.length > 50 ? firstSentence.substring(0, 50) + '...' : firstSentence;
  };

  // Toggle category filter
  const toggleCategory = (category: Category) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Get category for an issue
  const getIssueCategory = (report: Report): Category => {
    return (report.category as Category) || "Environment";
  };

  // Check if issue should be displayed based on filter
  const shouldDisplayIssue = (report: Report): boolean => {
    const category = getIssueCategory(report);
    return selectedCategories.has(category);
  };

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border shadow-lg relative">
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
        {/* Issue Markers - Categorized by Color and Icon */}
        {issueData.reports.filter(shouldDisplayIssue).map((report: Report) => {
          const reportWithType = { ...report, type: "issue" };
          const userVote = userVotes[report.id];
          const category = getIssueCategory(report);
          const config = categoryConfig[category];
          const IconComponent = config.icon;
          
          return (
            <Marker
              key={report.id}
              longitude={report.location.lng}
              latitude={report.location.lat}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleMarkerClick(reportWithType);
              }}
            >
              <div className="relative">
                <div
                  className="cursor-pointer hover:scale-110 transition-transform flex items-center justify-center"
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: config.color,
                    border: "2px solid #ffffff",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                  }}
                  onMouseEnter={() => handleMarkerHover(reportWithType, "issue")}
                  onMouseLeave={handleMarkerLeave}
                >
                  <IconComponent className="h-4 w-4 text-white" />
                </div>
                {userVote && (
                  <div
                    className="absolute -top-2 -right-2 rounded-full flex items-center justify-center animate-in zoom-in duration-200"
                    style={{
                      width: "20px",
                      height: "20px",
                      backgroundColor: userVote === 'like' ? '#22c55e' : '#ef4444',
                      border: "2px solid #ffffff",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                    }}
                  >
                    {userVote === 'like' ? (
                      <ThumbsUp className="h-3 w-3 text-white fill-white" />
                    ) : (
                      <ThumbsDown className="h-3 w-3 text-white fill-white" />
                    )}
                  </div>
                )}
              </div>
            </Marker>
          );
        })}

        {/* Idea Markers - Blue 💡 - HIDDEN */}
        {false && ideaData.reports.map((report: Report) => {
          const reportWithType = { ...report, type: "idea" };
          const userVote = userVotes[report.id];
          return (
            <Marker
              key={report.id}
              longitude={report.location.lng}
              latitude={report.location.lat}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleMarkerClick(reportWithType);
              }}
            >
              <div className="relative">
                <div
                  className="cursor-pointer hover:scale-110 transition-transform"
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "#3b82f6",
                    border: "2px solid #ffffff",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  }}
                  onMouseEnter={() => handleMarkerHover(reportWithType, "idea")}
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
        })}

        {/* Civilian Event Markers - Green 👥 - HIDDEN */}
        {false && civilianEventData.reports.map((report: Report) => {
          const reportWithType = { ...report, type: "civilian-event" };
          const userVote = userVotes[report.id];
          return (
            <Marker
              key={report.id}
              longitude={report.location.lng}
              latitude={report.location.lat}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleMarkerClick(reportWithType);
              }}
            >
              <div className="relative">
                <div
                  className="cursor-pointer hover:scale-110 transition-transform"
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "#10b981",
                    border: "2px solid #ffffff",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  }}
                  onMouseEnter={() => handleMarkerHover(reportWithType, "civilian-event")}
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
        })}

        {/* Government Event Markers - Purple 🏛️ - HIDDEN */}
        {false && governmentEventData.reports.map((report: Report) => {
          const reportWithType = { ...report, type: "government-event" };
          const userVote = userVotes[report.id];
          return (
            <Marker
              key={report.id}
              longitude={report.location.lng}
              latitude={report.location.lat}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleMarkerClick(reportWithType);
              }}
            >
              <div className="relative">
                <div
                  className="cursor-pointer hover:scale-110 transition-transform"
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "#8b5cf6",
                    border: "2px solid #ffffff",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  }}
                  onMouseEnter={() => handleMarkerHover(reportWithType, "government-event")}
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
        })}

        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />
        <ScaleControl />
      </Map>

      {/* Category Filter Toggle Button - Positioned on Map */}
      <div className="absolute top-4 left-4 pointer-events-auto" style={{ zIndex: 1000 }}>
        <Button
          variant="default"
          size="icon"
          onClick={() => setShowFilterMenu(!showFilterMenu)}
          className="shadow-lg"
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Category Filter Menu - Positioned on Map */}
      {showFilterMenu && (
        <div className="absolute top-16 left-4 pointer-events-auto" style={{ zIndex: 1000 }}>
          <Card className="shadow-lg border-border">
            <CardContent className="p-4 space-y-2">
              <div className="font-semibold mb-3 text-sm">Filter by Category</div>
              {(Object.entries(categoryConfig) as [Category, typeof categoryConfig[Category]][]).map(([category, config]) => {
                const IconComponent = config.icon;
                const isSelected = selectedCategories.has(category);
                return (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`w-full flex items-center gap-2 p-2 rounded-md transition-all ${
                      isSelected 
                        ? 'bg-primary/10 border-2 border-primary' 
                        : 'bg-muted border-2 border-transparent opacity-50 hover:opacity-75'
                    }`}
                  >
                    <div
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: "24px",
                        height: "24px",
                        backgroundColor: config.color,
                        opacity: isSelected ? 1 : 0.5,
                      }}
                    >
                      <IconComponent className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className={`text-sm ${isSelected ? 'font-medium' : 'font-normal'}`}>
                      {config.name}
                    </span>
                  </button>
                );
              })}
              <div className="pt-2 mt-2 border-t border-border flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategories(new Set(Object.keys(categoryConfig) as Category[]))}
                  className="flex-1 text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategories(new Set())}
                  className="flex-1 text-xs"
                >
                  Clear All
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
