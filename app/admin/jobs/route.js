// app/api/admin/jobs/route.js
// Admin operations: approve, reject, delete jobs

import { createClient } from '@supabase/supabase-js';

// This API route should be configured to run on the Edge runtime for performance.
export const runtime = 'edge';

// Helper: Verify admin using a JWT token from the request.
// This function centralizes the authentication and authorization logic for admin actions.
async function verifyAdmin(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { error: 'Unauthorized', status: 401 };
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Use a temporary Supabase client initialized with the public key to verify the user token.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { error: 'Invalid token', status: 401 };
  }
  
  // Use the service role client for the actual profile check to bypass RLS.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('user_type')
    .eq('id', user.id)
    .single();

  if (!profile || profile.user_type !== 'admin') {
    return { error: 'Admin access required', status: 403 };
  }

  return { user };
}

// Handler for POST requests to approve or reject a job.
export async function POST(request) {
  try {
    const adminCheck = await verifyAdmin(request);
    if (adminCheck.error) {
      return new Response(JSON.stringify({ error: adminCheck.error }), { status: adminCheck.status, headers: { 'Content-Type': 'application/json' } });
    }

    const { jobId, action, reason } = await request.json();

    if (!jobId || !action) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let updateData = {};
    let auditAction = '';
    let auditDetails = {};

    if (action === 'approve') {
      updateData = {
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminCheck.user.id
      };
      auditAction = 'job_approved';
    } else if (action === 'reject') {
      if (!reason || reason.trim().length < 10) {
        return new Response(JSON.stringify({ error: 'Rejection reason required (min 10 chars)' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      updateData = {
        status: 'rejected',
        rejection_reason: reason
      };
      auditAction = 'job_rejected';
      auditDetails.reason = reason;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { data, error } = await supabaseAdmin
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      console.error(`${action} error:`, error);
      return new Response(JSON.stringify({ error: `Failed to ${action} job` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
      user_id: adminCheck.user.id,
      action: auditAction,
      target_type: 'jobs',
      target_id: jobId,
      details: { ...auditDetails, job_title: data.title }
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Job ${action}d successfully`,
      job: data
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Admin API error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// Handler for DELETE requests to permanently remove a job.
export async function DELETE(request) {
  try {
    const adminCheck = await verifyAdmin(request);
    if (adminCheck.error) {
      return new Response(JSON.stringify({ error: adminCheck.error }), { status: adminCheck.status, headers: { 'Content-Type': 'application/json' } });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Job ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get job details before deleting for logging purposes.
    const { data: job } = await supabaseAdmin
      .from('jobs')
      .select('title, company')
      .eq('id', jobId)
      .single();

    // Delete job (cascades to applications due to database schema).
    const { error } = await supabaseAdmin
      .from('jobs')
      .delete()
      .eq('id', jobId);

    if (error) {
      console.error('Delete error:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete job' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
      user_id: adminCheck.user.id,
      action: 'job_deleted',
      target_type: 'jobs',
      target_id: jobId,
      details: { job_title: job?.title, company: job?.company }
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Job deleted successfully'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Delete API error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
