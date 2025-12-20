import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { court_id, mode, team_a_games, team_b_games, duration_seconds, started_at, ended_at } = body;

    // Get Supabase credentials from environment
    // Using service role key for backend API route (bypasses RLS)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert match record
    const { data, error } = await supabase
      .from('matches')
      .insert({
        court_id,
        mode,
        team_a_games,
        team_b_games,
        duration_seconds,
        started_at,
        ended_at
      });

    if (error) {
      console.error('Failed to save match:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


