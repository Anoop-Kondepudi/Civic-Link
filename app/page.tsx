"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { MapboxMap } from "@/components/mapbox-map";
import { StatCards } from "@/components/stat-cards";
import { DataTable } from "@/components/data-table";
import { AnalyticsOverview } from "@/components/analytics-overview";

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

export default function DashboardPage() {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="h-full p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Real-time location analytics and insights
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <StatCards />

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
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
          <DataTable />
        </div>
      </main>
    </div>
  );
}
