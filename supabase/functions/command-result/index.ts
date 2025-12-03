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
    const { command_id, status, result_message, current_version } = await req.json()

    // Validate required fields
    if (!command_id || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: command_id, status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate status value
    if (!['in_progress', 'completed', 'failed'].includes(status)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status. Must be: in_progress, completed, or failed' }),
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

    // Verify command belongs to this court
    const { data: command, error: commandError } = await supabase
      .from('commands')
      .select('*')
      .eq('id', command_id)
      .eq('court_id', courtId)
      .single()

    if (commandError || !command) {
      return new Response(
        JSON.stringify({ error: 'Command not found or does not belong to this court' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update command status
    const updateData: any = {
      status,
      result_message: result_message || null
    }

    if (status === 'in_progress' && !command.started_at) {
      updateData.started_at = new Date().toISOString()
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('commands')
      .update(updateData)
      .eq('id', command_id)

    if (updateError) throw updateError

    // If update command completed successfully, update court version
    if (status === 'completed' && command.command_type === 'update' && current_version) {
      await supabase
        .from('courts')
        .update({ current_version })
        .eq('id', courtId)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Command result recorded'
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