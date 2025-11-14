// app/api/admin/jobs/route.js
// Admin operations: approve, reject, delete jobs
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This is a dynamic route, so we don't need to specify runtime
// export const runtime = 'edge';

// Helper: Verify admin using a JWT token from the request.
// This function centralizes the authentication and authorization logic for admin actions.
async function verifyAdmin(supabase) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return { error: 'Invalid token', status: 401 };
  }
  
  // Use the service role client for the actual profile check to bypass RLS.
  const { data: profile } = await supabase
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
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const adminCheck = await verifyAdmin(supabase);
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { jobId, action, reason } = await request.json();

    if (!jobId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Admin operations require service_role key
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
        return NextResponse.json({ error: 'Rejection reason required (min 10 chars)' }, { status: 400 });
      }
      updateData = {
        status: 'rejected',
        rejection_reason: reason
      };
      auditAction = 'job_rejected';
      auditDetails.reason = reason;
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('jobs')
      .update(updateData)
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      console.error(`${action} error:`, error);
      return NextResponse.json({ error: `Failed to ${action} job` }, { status: 500 });
    }

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
      user_id: adminCheck.user.id,
      action: auditAction,
      target_type: 'jobs',
      target_id: jobId,
      details: { ...auditDetails, job_title: data.title }
    });

    return NextResponse.json({
      success: true,
      message: `Job ${action}d successfully`,
      job: data
    });

  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Handler for DELETE requests to permanently remove a job.
export async function DELETE(request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const adminCheck = await verifyAdmin(supabase);
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
    }

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({
      user_id: adminCheck.user.id,
      action: 'job_deleted',
      target_type: 'jobs',
      target_id: jobId,
      details: { job_title: job?.title, company: job?.company }
    });

    return NextResponse.json({
      success: true,
      message: 'Job deleted successfully'
    });

  } catch (error) {
    console.error('Delete API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}