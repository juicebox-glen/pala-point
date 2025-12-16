import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { match_id, court_id, mode, team1_score, team2_score, duration_seconds, started_at, ended_at, raw_data } = body;

    // Get Supabase credentials from environment
    // Using service role key for backend API route (bypasses RLS)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // If no match_id, this is a NEW match (game starting)
    if (!match_id) {
      const { data, error } = await supabase
        .from('matches')
        .insert({
          court_id,
          started_at: started_at || new Date().toISOString(),
          ended_at: null,  // Game in progress
          team1_score: 0,
          team2_score: 0,
          mode,
          duration_seconds: 0,
          raw_data: raw_data || {}
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create match:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, matchId: data.id });
    }

    // If match_id exists, UPDATE existing match (game ending)
    const { data, error } = await supabase
      .from('matches')
      .update({
        ended_at: ended_at || new Date().toISOString(),
        team1_score,
        team2_score,
        duration_seconds,
        raw_data: raw_data || {}
      })
      .eq('id', match_id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update match:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, matchId: data.id });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


