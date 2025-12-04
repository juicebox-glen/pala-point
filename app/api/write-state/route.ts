import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    // Only write in production (on Pi)
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ success: true, message: 'Skipped in development' });
    }

    const body = await request.json();
    
    // Write to /tmp/palapoint-state.json
    await writeFile('/tmp/palapoint-state.json', JSON.stringify(body));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to write game state:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

