import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Find which file contains this report
    const files = [
      { name: "issue.json", path: path.join(process.cwd(), "docs", "issue.json") },
      { name: "idea.json", path: path.join(process.cwd(), "docs", "idea.json") },
      { name: "civilian-event.json", path: path.join(process.cwd(), "docs", "civilian-event.json") },
      { name: "government-event.json", path: path.join(process.cwd(), "docs", "government-event.json") },
    ];

    for (const file of files) {
      if (fs.existsSync(file.path)) {
        const data = JSON.parse(fs.readFileSync(file.path, "utf-8"));
        const reportIndex = data.reports.findIndex((r: any) => r.id === id);
        
        if (reportIndex !== -1) {
          // Increment votes
          data.reports[reportIndex].votes = (data.reports[reportIndex].votes || 0) + 1;
          
          // Save back to file
          fs.writeFileSync(file.path, JSON.stringify(data, null, 2));
          
          return NextResponse.json({
            success: true,
            votes: data.reports[reportIndex].votes,
          });
        }
      }
    }
    
    return NextResponse.json(
      { error: "Report not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error voting on report:", error);
    return NextResponse.json(
      { error: "Failed to vote on report" },
      { status: 500 }
    );
  }
}
