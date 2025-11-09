"use client";

import { ThumbsUp, ThumbsDown } from "lucide-react";

interface MarkerHoverCardProps {
  title: string;
  votes: number;
  reportType: string;
  onLike: () => void;
  onDislike: () => void;
  onClose: () => void;
  position: { x: number; y: number };
}

export function MarkerHoverCard({
  title,
  votes,
  reportType,
  onLike,
  onDislike,
  onClose,
  position,
}: MarkerHoverCardProps) {
  return (
    <div
      className="fixed z-50 flex gap-2"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 40}px`,
        transform: "translate(-50%, 0)",
      }}
    >
      {/* Like Button - Green Circle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onLike();
        }}
        className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg transition-all hover:scale-110"
        title="Same issue"
      >
        <ThumbsUp className="h-5 w-5 text-white" />
      </button>

      {/* Dislike Button - Red Circle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDislike();
        }}
        className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all hover:scale-110"
        title="Different issue"
      >
        <ThumbsDown className="h-5 w-5 text-white" />
      </button>
    </div>
  );
}
