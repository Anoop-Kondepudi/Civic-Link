import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, description, location } = body;

    // Validate input
    if (!type || !description || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (type !== 'crime' && type !== 'construction') {
      return NextResponse.json(
        { error: 'Invalid report type. Must be "crime" or "construction"' },
        { status: 400 }
      );
    }

    // Determine which JSON file to update
    const fileName = type === 'crime' ? 'crime.json' : 'construction.json';
    const filePath = path.join(process.cwd(), 'docs', fileName);

    // Read existing data
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    // Generate new ID
    const prefix = type === 'crime' ? 'crime' : 'const';
    const existingIds = data.reports.map((r: any) => {
      const match = r.id.match(new RegExp(`${prefix}-(\\d+)`));
      return match ? parseInt(match[1]) : 0;
    });
    const nextId = Math.max(...existingIds, 0) + 1;
    const newId = `${prefix}-${String(nextId).padStart(3, '0')}`;

    // Create new report
    const newReport = {
      id: newId,
      description,
      location: {
        city: location.city || '',
        state: location.state || '',
        address: location.address || '',
        lat: location.lat,
        lng: location.lng,
      },
      timestamp: new Date().toISOString(),
      status: 'open',
    };

    // Add to beginning of reports array (most recent first)
    data.reports.unshift(newReport);

    // Write back to file with pretty formatting
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`✅ New ${type} report created:`, newId);

    return NextResponse.json({
      success: true,
      report: newReport
    });

  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    );
  }
}
