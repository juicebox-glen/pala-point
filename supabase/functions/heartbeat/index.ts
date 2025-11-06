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
    const { ip_address, cpu_temp, disk_usage_percent, current_version, error_message } = await req.json()

    // Create Supabase client with service role (bypasses RLS)
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

    // Update last_heartbeat and current_version
    const { error: updateError } = await supabase
      .from('courts')
      .update({ 
        last_heartbeat: new Date().toISOString(),
        current_version: current_version || null
      })
      .eq('id', courtId)

    if (updateError) throw updateError

    // Log the heartbeat
    const { error: logError } = await supabase
      .from('status_logs')
      .insert({
        court_id: courtId,
        status: 'online',
        ip_address: ip_address || null,
        cpu_temp: cpu_temp || null,
        disk_usage_percent: disk_usage_percent || null,
        error_message: error_message || null
      })

    if (logError) throw logError

    // Check for pending commands
    const { data: commands, error: commandsError } = await supabase
      .from('commands')
      .select('*')
      .eq('court_id', courtId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)

    if (commandsError) throw commandsError

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Heartbeat received',
        pending_command: commands && commands.length > 0 ? commands[0] : null
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