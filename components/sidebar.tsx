"use client";

import { 
  Map, 
  LayoutDashboard, 
  Settings, 
  Users, 
  BarChart3, 
  Bell, 
  Edit3, 
  Trash2, 
  FileText,
  TrendingUp,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

const navigation = [
  { 
    name: "Dashboard", 
    icon: LayoutDashboard, 
    current: true,
    description: "Overview & stats"
  },
  { 
    name: "Map View", 
    icon: Map, 
    current: false,
    description: "Interactive map"
  },
];

const announcementsMenu = [
  { 
    name: "Announcements", 
    icon: Bell, 
    current: false,
    description: "Create, view, edit & delete"
  },
];

const analyticsMenu = [
  { 
    name: "View Analytics", 
    icon: BarChart3, 
    current: false,
    description: "Detailed insights"
  },
  { 
    name: "Reports Trends", 
    icon: TrendingUp, 
    current: false,
    description: "Track patterns"
  },
  { 
    name: "User Engagement", 
    icon: MessageSquare, 
    current: false,
    description: "Citizen participation"
  },
];

const systemMenu = [
  { 
    name: "Manage Users", 
    icon: Users, 
    current: false,
    description: "User permissions"
  },
  { 
    name: "Settings", 
    icon: Settings, 
    current: false,
    description: "System config"
  },
];

type SidebarProps = {
  activeView: string;
  onNavigate: (view: string) => void;
};

export function Sidebar({ activeView, onNavigate }: SidebarProps) {

  const renderMenuItem = (item: any) => {
    const Icon = item.icon;
    const isActive = activeView === item.name;
    
    return (
      <Button
        key={item.name}
        variant={isActive ? "default" : "ghost"}
        className={cn(
          "w-full justify-start gap-3 h-auto py-2",
          isActive
            ? "bg-primary text-primary-foreground"
            : "hover:bg-accent"
        )}
        onClick={() => onNavigate(item.name)}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">{item.name}</span>
          {item.description && (
            <span className="text-xs opacity-70">{item.description}</span>
          )}
        </div>
      </Button>
    );
  };

  return (
    <div className="flex h-full flex-col gap-4 bg-card border-r border-border p-4 overflow-y-auto">
      {/* Main Navigation */}
      <div>
        <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Main
        </h3>
        <nav className="flex flex-col gap-1">
          {navigation.map(renderMenuItem)}
        </nav>
      </div>

      <Separator />

      {/* Announcements Section */}
      <div>
        <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Bell className="h-3 w-3" />
          Announcements
        </h3>
        <nav className="flex flex-col gap-1">
          {announcementsMenu.map(renderMenuItem)}
        </nav>
      </div>

      <Separator />

      {/* Analytics Section */}
      <div>
        <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="h-3 w-3" />
          Analytics
        </h3>
        <nav className="flex flex-col gap-1">
          {analyticsMenu.map(renderMenuItem)}
        </nav>
      </div>

      <Separator />

      {/* System Section */}
      <div>
        <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Settings className="h-3 w-3" />
          System
        </h3>
        <nav className="flex flex-col gap-1">
          {systemMenu.map(renderMenuItem)}
        </nav>
      </div>

      <div className="mt-auto">
        <Separator className="mb-4" />
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground">
            Civic Link Admin v1.0
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Powered by NVIDIA AI & Mapbox
          </p>
        </div>
      </div>
    </div>
  );
}
