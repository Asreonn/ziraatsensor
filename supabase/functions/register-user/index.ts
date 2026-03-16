import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase function secrets.');
}

const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

Deno.serve(async request => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: corsHeaders });
  }

  try {
    const { email, password } = await request.json();

    if (typeof email !== 'string' || !email.trim()) {
      return Response.json({ error: 'Email is required.' }, { status: 400, headers: corsHeaders });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters.' }, { status: 400, headers: corsHeaders });
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
    }

    return Response.json(
      {
        userId: data.user.id,
        email: data.user.email,
      },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unexpected error.' },
      { status: 500, headers: corsHeaders },
    );
  }
});
