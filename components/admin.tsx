"use client";

import { Sidebar } from "@/components/sidebar";
import { MapboxMap } from "@/components/mapbox-map";
import { StatCards } from "@/components/stat-cards";
import { DataTable } from "@/components/data-table";
import { AnalyticsOverview } from "@/components/analytics-overview";
import { AnnouncementsManagement } from "@/components/announcements-management";
import { useState } from "react";

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

export default function AdminPage() {
  const [activeView, setActiveView] = useState("Dashboard");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const renderView = () => {
    switch (activeView) {
      case "Dashboard":
        return (
          <>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Real-time location analytics and insights
              </p>
            </div>

            {/* Stats Cards */}
            <StatCards />

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3 mt-6">
              {/* Map - Takes up 2 columns on large screens */}
              <div className="lg:col-span-2">
                <div className="h-[600px]">
                  <MapboxMap onReportSelect={setSelectedReport} />
                </div>
              </div>

              {/* Side Panel - Takes up 1 column on large screens */}
              <div className="space-y-6">
                <AnalyticsOverview selectedReport={selectedReport} />
              </div>
            </div>

            {/* Data Table */}
            <div className="mt-6">
              <DataTable />
            </div>
          </>
        );

      case "Map View":
        return (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">Map View</h1>
              <p className="text-muted-foreground mt-1">
                Interactive map of all citizen reports
              </p>
            </div>
            <div className="h-[calc(100vh-180px)]">
              <MapboxMap onReportSelect={setSelectedReport} />
            </div>
          </>
        );

      case "Announcements":
        return <AnnouncementsManagement />;

      case "View Analytics":
        return (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
              <p className="text-muted-foreground mt-1">
                Detailed insights and metrics
              </p>
            </div>
            <StatCards />
            <div className="mt-6">
              <AnalyticsOverview selectedReport={null} />
            </div>
          </>
        );

      case "Reports Trends":
        return (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">Report Trends</h1>
              <p className="text-muted-foreground mt-1">
                Track patterns and trends over time
              </p>
            </div>
            <DataTable />
          </>
        );

      case "User Engagement":
        return (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">User Engagement</h1>
              <p className="text-muted-foreground mt-1">
                Citizen participation and activity
              </p>
            </div>
            <StatCards />
          </>
        );

      case "Manage Users":
        return (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
              <p className="text-muted-foreground mt-1">
                Manage user permissions and access
              </p>
            </div>
            <p className="text-center text-muted-foreground mt-12">
              User management interface coming soon...
            </p>
          </>
        );

      case "Settings":
        return (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground mt-1">
                System configuration and preferences
              </p>
            </div>
            <p className="text-center text-muted-foreground mt-12">
              Settings interface coming soon...
            </p>
          </>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">View not found</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0">
        <Sidebar activeView={activeView} onNavigate={setActiveView} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="h-full p-6">
          {renderView()}
        </div>
      </main>
    </div>
  );
}
