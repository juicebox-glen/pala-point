import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-pi-token',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get pi_token from header
    const piToken = req.headers.get('x-pi-token')
    if (!piToken) {
      return new Response(
        JSON.stringify({ error: 'Missing x-pi-token header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { mode, team1_score, team2_score, duration_seconds, started_at, ended_at, raw_data } = await req.json()

    // Validate required fields
    if (!mode || team1_score === undefined || team2_score === undefined || !started_at || !ended_at) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: mode, team1_score, team2_score, started_at, ended_at' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify pi_token and get court_id
    const { data: secret, error: secretError } = await supabase
      .from('court_secrets')
      .select('court_id')
      .eq('pi_token', piToken)
      .single()

    if (secretError || !secret) {
      return new Response(
        JSON.stringify({ error: 'Invalid pi_token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const courtId = secret.court_id

    // Insert match record
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        court_id: courtId,
        mode,
        team1_score,
        team2_score,
        duration_seconds: duration_seconds || null,
        started_at,
        ended_at,
        raw_data: raw_data || null
      })
      .select()
      .single()

    if (matchError) throw matchError

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Match recorded',
        match_id: match.id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})