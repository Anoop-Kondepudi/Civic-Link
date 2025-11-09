import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

// Helper function to extract text from PDF buffer
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // For now, we'll send the PDF as base64 to the VLM model
  // In production, you might want to use a PDF parsing library
  const base64 = buffer.toString('base64');
  return base64;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const reportType = formData.get("reportType") as string; // issue, idea, or event
    const relatedReportId = formData.get("relatedReportId") as string;
    const pdfFile = formData.get("pdfFile") as File;

    if (!title || !reportType || !pdfFile) {
      return NextResponse.json(
        { error: "Title, report type, and PDF file are required" },
        { status: 400 }
      );
    }

    // Get related report context if provided
    let reportContext = "";
    if (relatedReportId) {
      const files = [
        { name: "issue.json", path: path.join(process.cwd(), "docs", "issue.json") },
        { name: "idea.json", path: path.join(process.cwd(), "docs", "idea.json") },
        { name: "civilian-event.json", path: path.join(process.cwd(), "docs", "civilian-event.json") },
        { name: "government-event.json", path: path.join(process.cwd(), "docs", "government-event.json") },
      ];

      for (const file of files) {
        if (fs.existsSync(file.path)) {
          const data = JSON.parse(fs.readFileSync(file.path, "utf-8"));
          const report = data.reports.find((r: any) => r.id === relatedReportId);
          
          if (report) {
            reportContext = `

RELATED REPORT CONTEXT:
- Report ID: ${report.id}
- Report Type: ${reportType}
- Title: ${report.title || "N/A"}
- Description: ${report.description}
- Location: ${report.location?.address || `${report.location?.city}, ${report.location?.state}` || `Coordinates: ${report.location?.lat}, ${report.location?.lng}`}
- Status: ${report.status}
- Votes: ${report.votes || 0} upvotes, ${report.downvotes || 0} downvotes
- Reported: ${new Date(report.timestamp).toLocaleDateString()}
`;
            break;
          }
        }
      }
    }

    // Convert file to buffer
    const bytes = await pdfFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract text from PDF (simplified - in production use proper PDF parser)
    const pdfBase64 = buffer.toString('base64');

    // Use Nemotron to summarize the document
    const completion = await openai.chat.completions.create({
      model: "nvidia/nemotron-nano-12b-v2-vl",
      messages: [
        {
          role: "user",
          content: `You are analyzing a government report document titled "${title}". Please provide a concise 2-3 paragraph summary of the key points, findings, and recommendations in this document. Focus on the most important information that citizens need to know.

The document is related to a ${reportType} report.${reportContext}

${reportContext ? `This government report is a response to or update on the related citizen report mentioned above. Make sure to reference the specific location, report ID, and issue details in your summary to provide context.` : ""}

Please provide a clear, accessible summary suitable for public announcements. If there is related report context, mention the specific report ID and location in your summary.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    const summary = completion.choices[0]?.message?.content || "Summary not available";

    // Save PDF file to public directory
    const fileName = `announcement-${Date.now()}-${pdfFile.name}`;
    const publicPath = path.join(process.cwd(), "public", "announcements");
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(publicPath)) {
      fs.mkdirSync(publicPath, { recursive: true });
    }
    
    const filePath = path.join(publicPath, fileName);
    fs.writeFileSync(filePath, buffer);

    // Create announcement object
    const announcement = {
      id: `announcement-${Date.now()}`,
      title,
      summary,
      reportType,
      relatedReportId: relatedReportId || null,
      pdfFileName: fileName,
      pdfUrl: `/announcements/${fileName}`,
      createdAt: new Date().toISOString(),
      status: "active",
    };

    // Read existing announcements
    const announcementsPath = path.join(process.cwd(), "docs", "announcements.json");
    const announcementsData = JSON.parse(fs.readFileSync(announcementsPath, "utf-8"));

    // Add new announcement
    announcementsData.announcements.unshift(announcement);

    // Save updated announcements
    fs.writeFileSync(announcementsPath, JSON.stringify(announcementsData, null, 2));

    return NextResponse.json({
      success: true,
      announcement,
    });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json(
      { error: "Failed to create announcement" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const announcementsPath = path.join(process.cwd(), "docs", "announcements.json");
    const announcementsData = JSON.parse(fs.readFileSync(announcementsPath, "utf-8"));

    return NextResponse.json(announcementsData);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Announcement ID is required" },
        { status: 400 }
      );
    }

    // Read existing announcements
    const announcementsPath = path.join(process.cwd(), "docs", "announcements.json");
    const announcementsData = JSON.parse(fs.readFileSync(announcementsPath, "utf-8"));

    // Find announcement to delete
    const announcementIndex = announcementsData.announcements.findIndex(
      (a: any) => a.id === id
    );

    if (announcementIndex === -1) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      );
    }

    const announcement = announcementsData.announcements[announcementIndex];

    // Delete PDF file
    const pdfPath = path.join(process.cwd(), "public", "announcements", announcement.pdfFileName);
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }

    // Remove announcement from array
    announcementsData.announcements.splice(announcementIndex, 1);

    // Save updated announcements
    fs.writeFileSync(announcementsPath, JSON.stringify(announcementsData, null, 2));

    return NextResponse.json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    return NextResponse.json(
      { error: "Failed to delete announcement" },
      { status: 500 }
    );
  }
}
