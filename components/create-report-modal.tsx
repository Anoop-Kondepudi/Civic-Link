"use client";

import { useState, useEffect, useRef } from "react";
import { X, ShieldAlert, Lightbulb, Users, Building2, MapPin, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ImageData {
  file: File;
  preview: string;
}

interface CreateReportModalProps {
  isOpen: boolean;
  isClosing?: boolean;
  onClose: () => void;
  location: { lat: number; lng: number } | null;
  onSubmit: (report: {
    type: "issue" | "idea" | "civilian-event" | "government-event";
    description: string;
    location: {
      lat: number;
      lng: number;
    };
    images?: File[];
  }) => void;
}

export function CreateReportModal({ isOpen, isClosing = false, onClose, location, onSubmit }: CreateReportModalProps) {
  const [reportType, setReportType] = useState<"issue" | "idea" | "civilian-event" | "government-event">("issue");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<ImageData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setReportType("issue");
      setDescription("");
      setImages([]);
      setIsUploading(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Handle image file selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const newImages: ImageData[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert(`File ${file.name} is not an image`);
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size is 5MB`);
          continue;
        }

        // Create preview URL (just for display, not for upload)
        const preview = URL.createObjectURL(file);

        newImages.push({
          file: file,
          preview: preview
        });
      }

      setImages(prev => [...prev, ...newImages]);
    } catch (error) {
      console.error('Error processing images:', error);
      alert('Failed to process images. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove an image
  const handleRemoveImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      // Revoke object URL to prevent memory leaks
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleSubmit = async () => {
    if ((!description.trim() && images.length === 0) || !location || isSubmitting) return;

    setIsSubmitting(true);

    console.log("📤 Submitting report:", {
      type: reportType,
      description: description.trim(),
      images: images.length,
      location: {
        lat: location.lat,
        lng: location.lng,
      },
    });

    // Start the submission process
    onSubmit({
      type: reportType,
      description: description.trim(),
      location: {
        lat: location.lat,
        lng: location.lng,
      },
      images: images.length > 0 ? images.map(img => img.file) : undefined,
    });

    // Close modal immediately after triggering submission
    // The parent component will handle the actual API call in the background
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!isOpen || !location) {
    console.log("❌ CreateReportModal not rendering:", { isOpen, location });
    return null;
  }

  console.log("✅ CreateReportModal rendering!", { isOpen, location });

  const categoryConfig = {
    'issue': {
      accent: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      icon: ShieldAlert
    },
    'idea': {
      accent: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      icon: Lightbulb
    },
    'civilian-event': {
      accent: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      icon: Users
    },
    'government-event': {
      accent: 'text-purple-500',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      icon: Building2
    }
  };
  const config = categoryConfig[reportType];
  const accentColor = config.accent;
  const bgColor = config.bg;
  const borderColor = config.border;
  const ReportIcon = config.icon;

  const canSubmit = description.trim().length > 0 || images.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`bg-card border rounded-lg shadow-lg pointer-events-auto relative max-w-lg w-full ${
            isClosing ? 'animate-fade-scale-out' : 'animate-fade-scale'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 hover:bg-muted"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-16 h-16 ${bgColor} ${borderColor} border-2 rounded-xl transition-colors`}>
                <ReportIcon className={`h-8 w-8 ${accentColor} transition-colors`} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Create New Report
                </h2>
                <p className="text-sm text-muted-foreground">Fill out the details below</p>
              </div>
            </div>

            {/* Report Type */}
            <div>
              <Label className="text-sm font-semibold text-foreground/80 mb-3 block">
                Report Type
              </Label>
              <RadioGroup value={reportType} onValueChange={(value) => setReportType(value as "issue" | "idea" | "civilian-event" | "government-event")}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="issue" id="issue" />
                    <Label htmlFor="issue" className="cursor-pointer flex items-center gap-2 text-sm">
                      <ShieldAlert className="h-4 w-4 text-red-500" />
                      Issue
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="idea" id="idea" />
                    <Label htmlFor="idea" className="cursor-pointer flex items-center gap-2 text-sm">
                      <Lightbulb className="h-4 w-4 text-blue-500" />
                      Idea
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="civilian-event" id="civilian-event" />
                    <Label htmlFor="civilian-event" className="cursor-pointer flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-green-500" />
                      Civilian Event
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="government-event" id="government-event" />
                    <Label htmlFor="government-event" className="cursor-pointer flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-purple-500" />
                      Government Event
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm font-semibold text-foreground/80 mb-2 block">
                Description {images.length > 0 && <span className="text-muted-foreground font-normal">(optional with images)</span>}
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the issue in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Image Upload */}
            <div>
              <Label className="text-sm font-semibold text-foreground/80 mb-2 block">
                Images {description.trim() && <span className="text-muted-foreground font-normal">(optional)</span>}
              </Label>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              
              {/* Upload button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full mb-3"
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                {isUploading ? "Processing..." : "Attach Images"}
              </Button>

              {/* Image previews */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image.preview}
                        alt={image.file.name}
                        className="w-full h-32 object-cover rounded-lg border border-border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b-lg truncate">
                        {image.file.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Location */}
            {/* <div>
              <Label className="text-sm font-semibold text-foreground/80 mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <p className="text-sm font-medium text-foreground">
                  Latitude: {location.lat.toFixed(6)}
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  Longitude: {location.lng.toFixed(6)}
                </p>
              </div>
            </div> */}
          </div>

          {/* Footer */}
          <div className="border-t p-4 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
