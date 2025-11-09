"use client";

import { Map, LayoutDashboard, Settings, Users, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navigation = [
  { name: "Dashboard", icon: LayoutDashboard, current: true },
  { name: "Map View", icon: Map, current: false },
  { name: "Analytics", icon: BarChart3, current: false },
  { name: "Users", icon: Users, current: false },
  { name: "Settings", icon: Settings, current: false },
];

export function Sidebar() {
  return (
    <div className="flex h-full flex-col gap-4 bg-card border-r border-border p-4">
      <nav className="flex flex-1 flex-col gap-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.name}
              variant={item.current ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-3",
                item.current
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Button>
          );
        })}
      </nav>
      <Separator />
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs font-medium text-muted-foreground">
          MVP Dashboard v1.0
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Powered by Mapbox
        </p>
      </div>
    </div>
  );
}
