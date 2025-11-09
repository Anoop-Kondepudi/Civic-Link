"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Plus, 
  Edit3, 
  Trash2, 
  Download, 
  FileText,
  Loader2,
  X
} from "lucide-react";
import { AddAnnouncementModal } from "@/components/add-announcement-modal";

type Announcement = {
  id: string;
  title: string;
  summary: string;
  reportType: string;
  relatedReportId: string | null;
  pdfFileName: string;
  pdfUrl: string;
  createdAt: string;
  status: string;
};

export function AnnouncementsManagement() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch("/api/announcements");
      const data = await response.json();
      console.log("Fetched announcements:", data);
      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/announcements?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh the list after successful delete
        fetchAnnouncements();
        setIsDeleteConfirmOpen(false);
        setAnnouncementToDelete(null);
      } else {
        console.error("Failed to delete announcement");
      }
    } catch (error) {
      console.error("Error deleting announcement:", error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "issue":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "idea":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "event":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Announcements Management
          </h2>
          <p className="text-muted-foreground mt-1">
            Create, edit, and manage government announcements
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Announcement
        </Button>
      </div>

      {/* Announcements Grid */}
      {announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Announcements Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first government announcement to notify citizens
            </p>
            <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create First Announcement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {announcements.map((announcement) => (
            <Card 
              key={announcement.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer" 
              onClick={() => {
                console.log("Clicking announcement:", announcement);
                setSelectedAnnouncement(announcement);
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Badge className={getTypeColor(announcement.reportType)}>
                    {announcement.reportType.toUpperCase()}
                  </Badge>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelectedAnnouncement(announcement)}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnnouncementToDelete(announcement.id);
                        setIsDeleteConfirmOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">{announcement.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                  {announcement.summary}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDate(announcement.createdAt)}</span>
                  <a
                    href={announcement.pdfUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="h-3 w-3" />
                    PDF
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Announcement Modal */}
      <AddAnnouncementModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          fetchAnnouncements();
          setIsAddModalOpen(false);
        }}
      />

      {/* View Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <Card 
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getTypeColor(selectedAnnouncement.reportType)}>
                      {selectedAnnouncement.reportType.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(selectedAnnouncement.createdAt)}
                    </span>
                  </div>
                  <CardTitle className="text-2xl">
                    {selectedAnnouncement.title}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedAnnouncement(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Summary */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Executive Summary</h3>
                  <div className="bg-accent/50 rounded-lg p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedAnnouncement.summary}
                    </p>
                  </div>
                </div>

                {/* Download Full Report */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-lg mb-3">Full Report</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Download the complete government report document.
                  </p>
                  <a
                    href={selectedAnnouncement.pdfUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="gap-2">
                      <Download className="h-4 w-4" />
                      Download Full Report (PDF)
                    </Button>
                  </a>
                </div>

                {/* Related Report Info */}
                {selectedAnnouncement.relatedReportId && (
                  <div className="border-t pt-6">
                    <h3 className="font-semibold text-lg mb-3">Related Report</h3>
                    <p className="text-sm text-muted-foreground">
                      This announcement is related to report:{" "}
                      <code className="bg-accent px-2 py-1 rounded">
                        {selectedAnnouncement.relatedReportId}
                      </code>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && announcementToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md m-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                Delete Announcement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this announcement? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setAnnouncementToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(announcementToDelete)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
