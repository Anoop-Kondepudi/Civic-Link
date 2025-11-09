"use client";

import { useState } from "react";
import { MapboxMap } from "@/components/mapbox-map";
import { ReportModal } from "@/components/report-modal";
import { MapClickPopup } from "@/components/map-click-popup";
import { CreateReportModal } from "@/components/create-report-modal";

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

// Helper function to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export default function UserPage() {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<{ x: number; y: number } | null>(null);

  // Create report state
  const [showMapClickPopup, setShowMapClickPopup] = useState(false);
  const [isMapClickPopupClosing, setIsMapClickPopupClosing] = useState(false);
  const [mapClickLocation, setMapClickLocation] = useState<{ lat: number; lng: number; x: number; y: number } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreateModalClosing, setIsCreateModalClosing] = useState(false);
  const [canClosePopup, setCanClosePopup] = useState(false);

  const handleReportSelect = (report: Report, position?: { x: number; y: number }) => {
    // Close any open create popups first
    if (showMapClickPopup) {
      closeMapClickPopup();
    }

    setSelectedReport(report);
    setMarkerPosition(position || null);
    setIsModalOpen(true);
    setIsModalClosing(false);
  };

  const handleCloseModal = () => {
    setIsModalClosing(true);
    // Small delay before clearing to allow exit animation
    setTimeout(() => {
      setIsModalOpen(false);
      setSelectedReport(null);
      setMarkerPosition(null);
      setIsModalClosing(false);
    }, 300);
  };

  const handleMapClick = (location: { lat: number; lng: number; x: number; y: number }) => {
    console.log("🗺️ Map clicked!", { location, isModalOpen, showCreateModal, showMapClickPopup });

    // Don't show if a modal is already open
    if (isModalOpen || showCreateModal) {
      console.log("❌ Blocked: Modal already open");
      return;
    }

    console.log("✅ Setting popup state...");
    setMapClickLocation(location);
    setShowMapClickPopup(true);
    setIsMapClickPopupClosing(false);
    setCanClosePopup(false);

    // Allow closing after a short delay to prevent immediate close from same click
    setTimeout(() => {
      console.log("🔓 Popup can now be closed");
      setCanClosePopup(true);
    }, 100);
  };

  const closeMapClickPopup = () => {
    if (!canClosePopup) {
      console.log("⏳ Close blocked - too soon after opening");
      return;
    }

    console.log("🚪 Closing popup...");
    setIsMapClickPopupClosing(true);
    setTimeout(() => {
      setShowMapClickPopup(false);
      setMapClickLocation(null);
      setIsMapClickPopupClosing(false);
      setCanClosePopup(false);
    }, 200);
  };

  const handleCreateReport = () => {
    // Force close the popup immediately
    console.log("📝 Create Report clicked - closing popup");
    setCanClosePopup(true); // Override delay
    setIsMapClickPopupClosing(true);
    setTimeout(() => {
      setShowMapClickPopup(false);
      // DON'T clear mapClickLocation here - we need it for the modal!
      setIsMapClickPopupClosing(false);
    }, 200);

    // Small delay to allow popup to close before opening modal
    setTimeout(() => {
      console.log("🎬 Opening CreateReportModal with location:", mapClickLocation);
      setShowCreateModal(true);
      setIsCreateModalClosing(false);
    }, 200);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalClosing(true);
    setTimeout(() => {
      setShowCreateModal(false);
      setMapClickLocation(null);
      setIsCreateModalClosing(false);
    }, 300);
  };

  const handleSubmitReport = async (report: {
    type: "issue" | "idea" | "civilian-event" | "government-event";
    description: string;
    location: {
      lat: number;
      lng: number;
    };
    images?: File[];
  }) => {
    console.log("📤 Starting background submission of report...");

    // Process submission in the background (non-blocking)
    (async () => {
      try {
        // Convert File objects to base64 for backend processing
        let processedImages;
        if (report.images && report.images.length > 0) {
        console.log("� Converting images to base64...");
        processedImages = await Promise.all(
          report.images.map(async (file) => {
            const base64 = await fileToBase64(file);
            return {
              base64: base64.split(',')[1], // Remove data:image/...;base64, prefix
              mimeType: file.type,
              name: file.name
            };
          })
        );
        console.log(`✅ Converted ${processedImages.length} images`);
      }

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...report,
          images: processedImages
        }),
      });

      const data = await response.json();

        if (response.ok) {
          console.log("✅ Report saved successfully:", data.report);
          
          // Show success toast
          const toastDiv = document.createElement('div');
          toastDiv.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
          toastDiv.textContent = '✅ Report submitted successfully!';
          document.body.appendChild(toastDiv);
          setTimeout(() => toastDiv.remove(), 3000);
          
          // Reload page after 3 seconds
          setTimeout(() => window.location.reload(), 3000);
        } else if (response.status === 409) {
          // Duplicate detected
          console.warn("⚠️ Duplicate report detected:", data.existingReport);
          
          // Show duplicate warning toast
          const toastDiv = document.createElement('div');
          toastDiv.className = 'fixed bottom-4 right-4 bg-yellow-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md';
          toastDiv.innerHTML = `
            <div class="font-bold mb-1">⚠️ Similar Report Exists</div>
            <div class="text-sm">${data.message}</div>
            <div class="text-xs mt-2">Distance: ${Math.round(data.existingReport.distance)}m away</div>
          `;
          document.body.appendChild(toastDiv);
          setTimeout(() => toastDiv.remove(), 5000);
      } else {
          console.error("❌ Failed to save report:", data.error);
          
          // Show error toast
          const toastDiv = document.createElement('div');
          toastDiv.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
          toastDiv.textContent = '❌ Failed to submit report';
          document.body.appendChild(toastDiv);
          setTimeout(() => toastDiv.remove(), 3000);
        }
      } catch (error) {
        console.error("❌ Error submitting report:", error);
        
        // Show error toast
        const toastDiv = document.createElement('div');
        toastDiv.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        toastDiv.textContent = '❌ Error submitting report';
        document.body.appendChild(toastDiv);
        setTimeout(() => toastDiv.remove(), 3000);
      }
    })();
  };


  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Civic Link</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View community reports in your area
          </p>
        </div>
      </header>

      {/* Map - Full screen below header */}
      <main className="flex-1 p-4">
        <div className="h-full w-full">
          <MapboxMap
            onReportSelect={handleReportSelect}
            showPopup={true}
            onMapClick={handleMapClick}
          />
        </div>
      </main>

      {/* Map Click Popup */}
      {(() => {
        console.log("🎨 Render check:", { showMapClickPopup, mapClickLocation });
        return showMapClickPopup && mapClickLocation ? (
          <MapClickPopup
            position={{ x: mapClickLocation.x, y: mapClickLocation.y }}
            onCreateReport={handleCreateReport}
            onClose={closeMapClickPopup}
            isClosing={isMapClickPopupClosing}
          />
        ) : null;
      })()}

      {/* Create Report Modal */}
      <CreateReportModal
        isOpen={showCreateModal}
        isClosing={isCreateModalClosing}
        onClose={handleCloseCreateModal}
        location={mapClickLocation ? { lat: mapClickLocation.lat, lng: mapClickLocation.lng } : null}
        onSubmit={handleSubmitReport}
      />

      {/* Report Modal */}
      <ReportModal
        report={selectedReport}
        isOpen={isModalOpen}
        isClosing={isModalClosing}
        onClose={handleCloseModal}
        markerPosition={markerPosition}
      />
    </div>
  );
}
