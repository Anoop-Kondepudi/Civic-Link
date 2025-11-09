// components/announcements-dropdown.tsx
"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

export type Announcement = {
    id: string;
    title: string;
    description: string;
    location: {
        lat: number;
        lng: number;
    };
    startTime: string;
    endTime: string;
};

interface Props {
    announcements: Announcement[];
    onToggle: (show: boolean) => void;
}

export function AnnouncementsDropdown({ announcements, onToggle }: Props) {
    const [open, setOpen] = useState(false);

    const handleToggle = () => {
        setOpen(!open);
        onToggle(!open);
    };

    return (
        <div className="relative">
            <Button onClick={handleToggle}>Announcements</Button>

            {open && (
                <Card className="absolute right-0 mt-2 w-72 p-2 z-50 shadow-lg">
                    {announcements.map((ann, idx) => (
                        <div key={ann.id} className="mb-2">
                            <div className="flex justify-between items-center">
                                <Badge variant="secondary">{ann.title}</Badge>
                                <span className="text-xs text-muted-foreground">
                  {new Date(ann.startTime).toLocaleDateString()}
                </span>
                            </div>
                            <p className="text-sm mt-1">{ann.description}</p>
                            {idx < announcements.length - 1 && <Separator className="my-2" />}
                        </div>
                    ))}
                </Card>
            )}
        </div>
    );
}
