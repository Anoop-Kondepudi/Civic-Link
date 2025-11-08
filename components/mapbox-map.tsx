"use client";

import { useState } from "react";
import Map, { Marker, NavigationControl, ScaleControl, GeolocateControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import crimeData from "@/docs/crime.json";
import constructionData from "@/docs/construction.json";

const MAPBOX_TOKEN = "pk.eyJ1IjoiemVsZG9tIiwiYSI6ImNtaHF2czcyeDEyaGcya3B6d3ZvY2hleDkifQ.2BQHylALQUj9cNYDuHijOQ";

type Report = {
  id: string;
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
  onReportSelect: (report: Report) => void;
}

export function MapboxMap({ onReportSelect }: MapboxMapProps) {
  const [viewState, setViewState] = useState({
    longitude: -96.80,
    latitude: 32.78,
    zoom: 11
  });

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border shadow-lg">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Crime Markers - Red */}
        {crimeData.reports.map((report: Report) => (
          <Marker
            key={report.id}
            longitude={report.location.lng}
            latitude={report.location.lat}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onReportSelect(report);
            }}
          >
            <div
              className="cursor-pointer hover:scale-110 transition-transform"
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: "#ef4444",
                border: "2px solid #ffffff",
                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
              }}
            />
          </Marker>
        ))}

        {/* Construction Markers - Orange */}
        {constructionData.reports.map((report: Report) => (
          <Marker
            key={report.id}
            longitude={report.location.lng}
            latitude={report.location.lat}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onReportSelect(report);
            }}
          >
            <div
              className="cursor-pointer hover:scale-110 transition-transform"
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: "#f97316",
                border: "2px solid #ffffff",
                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
              }}
            />
          </Marker>
        ))}

        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />
        <ScaleControl />
      </Map>
    </div>
  );
}
