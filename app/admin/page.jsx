'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AdminDashboard() {
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    pendingJobs: 0,
    approvedJobs: 0,
    rejectedJobs: 0,
    totalUsers: 0,
    totalApplications: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedJob, setSelectedJob] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const checkAdminAndFetchData = async () => {
    // Check if user is admin
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data?.user) {
      alert('Vui lòng đăng nhập');
      window.location.href = '/login';
      return;
    }
    const { user } = data;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (!profile || profile.user_type !== 'admin') {
      alert('Bạn không có quyền truy cập trang này');
      window.location.href = '/';
      return;
    }

    // Fetch all data
    await Promise.all([
      fetchJobs(),
      fetchUsers(),
      fetchReports(),
      fetchStats()
    ]);
    
    setLoading(false);
  };

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        employer:employer_id (
          email,
          user_profiles (
            full_name,
            company_name,
            phone
          )
        ),
        applications (count)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setJobs(data);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUsers(data);
    }
  };

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('fraud_reports')
      .select(`
        *,
        reporter:reporter_id (email),
        reported_user:reported_user_id (email),
        job:job_id (title, company)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReports(data);
    }
  };

  const fetchStats = async () => {
    const { data: jobsData } = await supabase.from('jobs').select('status', { count: 'exact' });
    const { count: applicationsCount } = await supabase.from('applications').select('id', { count: 'exact', head: true });
    const { count: usersCount } = await supabase.from('user_profiles').select('id', { count: 'exact', head: true });
    
    if (jobsData) {
        setStats({
            totalJobs: jobsData.length,
            pendingJobs: jobsData.filter(j => j.status === 'pending').length,
            approvedJobs: jobsData.filter(j => j.status === 'approved').length,
            rejectedJobs: jobsData.filter(j => j.status === 'rejected').length,
            totalUsers: usersCount || 0,
            totalApplications: applicationsCount || 0,
        });
    }
  };

  useEffect(() => {
    checkAdminAndFetchData();
    
    // Real-time subscription for job updates
    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        fetchJobs();
        fetchStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, () => {
        fetchUsers();
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const callAdminApi = async (endpoint, options) => {
    try {
        const { data, error } = await supabase.auth.getSession();
        const session = data?.session;
        if (error || !session) throw new Error("Not authenticated");

        const response = await fetch(endpoint, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                ...options.headers,
            }
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'API call failed');
        return result;

    } catch (error) {
        console.error('Admin API call error:', error);
        alert('Có lỗi xảy ra: ' + error.message);
        return null;
    }
  };

  const approveJob = async (jobId) => {
    const result = await callAdminApi('/api/admin/jobs', {
      method: 'POST',
      body: JSON.stringify({ jobId, action: 'approve' })
    });
    if (result) {
      alert('✓ Đã duyệt tin tuyển dụng');
    }
  };

  const rejectJob = async (jobId, reason) => {
    if (!reason || reason.trim().length < 10) {
      alert('Vui lòng nhập lý do từ chối (tối thiểu 10 ký tự)');
      return;
    }
    const result = await callAdminApi('/api/admin/jobs', {
      method: 'POST',
      body: JSON.stringify({ jobId, action: 'reject', reason })
    });
    if (result) {
      alert('✓ Đã từ chối tin tuyển dụng');
      setSelectedJob(null);
      setRejectReason('');
    }
  };

  const deleteJob = async (jobId) => {
    if (!confirm('⚠️ XÓA VĨNH VIỄN tin tuyển dụng này?\n\nHành động này không thể hoàn tác!')) return;
    const result = await callAdminApi(`/api/admin/jobs?jobId=${jobId}`, { method: 'DELETE' });
    if (result) {
      alert('✓ Đã xóa tin tuyển dụng');
    }
  };

  const banUser = async (userId, isBanned) => {
    if (!confirm(isBanned ? 'Gỡ cấm người dùng này?' : 'Cấm người dùng này?')) return;
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_banned: !isBanned })
      .eq('id', userId);
    if (!error) {
      alert(isBanned ? '✓ Đã gỡ cấm' : '✓ Đã cấm người dùng');
    } else {
      alert('Lỗi: ' + error.message);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesTab = activeTab === 'all' || job.status === activeTab;
    const matchesSearch = !searchTerm || 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-16 w-16 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">WorkHub - Quản lý toàn bộ hệ thống</p>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/';
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Tổng tin" value={stats.totalJobs} color="blue" icon="📊"/>
          <StatCard title="Chờ duyệt" value={stats.pendingJobs} color="yellow" icon="⏳" highlight={stats.pendingJobs > 0}/>
          <StatCard title="Đã duyệt" value={stats.approvedJobs} color="green" icon="✓"/>
          <StatCard title="Từ chối" value={stats.rejectedJobs} color="red" icon="✗"/>
          <StatCard title="Người dùng" value={stats.totalUsers} color="purple" icon="👥"/>
          <StatCard title="Ứng tuyển" value={stats.totalApplications} color="indigo" icon="📝"/>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="bg-white rounded-lg shadow">
          {/* Tabs */}
          <div className="border-b flex overflow-x-auto">
            <TabButton active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} badge={stats.pendingJobs}>⏳ Chờ duyệt</TabButton>
            <TabButton active={activeTab === 'approved'} onClick={() => setActiveTab('approved')}>✓ Đã duyệt</TabButton>
            <TabButton active={activeTab === 'rejected'} onClick={() => setActiveTab('rejected')}>✗ Từ chối</TabButton>
            <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')}>📋 Tất cả</TabButton>
            <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} badge={reports.length}>⚠️ Báo cáo</TabButton>
            <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>👥 Người dùng</TabButton>
          </div>

          {/* Search */}
          {activeTab !== 'reports' && activeTab !== 'users' && (
            <div className="p-4 border-b">
              <input
                type="text"
                placeholder="🔍 Tìm kiếm theo tiêu đề hoặc công ty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            {activeTab === 'reports' ? <ReportsTable reports={reports} onRefresh={fetchReports} />
            : activeTab === 'users' ? <UsersTable users={users} onBan={banUser} />
            : <JobsTable jobs={filteredJobs} onApprove={approveJob} onReject={(job) => setSelectedJob(job)} onDelete={deleteJob}/>}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6">
            <h3 className="text-2xl font-bold mb-4">Từ chối tin tuyển dụng</h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="font-medium">{selectedJob.title}</p>
              <p className="text-sm text-gray-600">{selectedJob.company}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Lý do từ chối * (tối thiểu 10 ký tự)</label>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="VD: Thông tin công ty không rõ ràng, địa chỉ không chính xác..."
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500"
              />
              <p className="text-sm text-gray-500 mt-1">Lý do này sẽ được gửi đến nhà tuyển dụng</p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => { setSelectedJob(null); setRejectReason(''); }} className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50">Hủy</button>
              <button onClick={() => rejectJob(selectedJob.id, rejectReason)} disabled={!rejectReason || rejectReason.trim().length < 10} className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">Từ chối tin</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Components
function StatCard({ title, value, color, icon, highlight }) {
  const colors = { blue: 'bg-blue-500', yellow: 'bg-yellow-500', green: 'bg-green-500', red: 'bg-red-500', purple: 'bg-purple-500', indigo: 'bg-indigo-500' };
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${highlight ? 'ring-2 ring-yellow-400' : ''}`}>
      <div className={`w-12 h-12 ${colors[color]} rounded-lg flex items-center justify-center text-white text-2xl mb-3`}>{icon}</div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-600 mt-1">{title}</p>
    </div>
  );
}

function TabButton({ active, onClick, children, badge }) {
  return (
    <button onClick={onClick} className={`relative px-6 py-3 font-medium whitespace-nowrap ${active ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}>
      {children}
      {badge > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{badge}</span>}
    </button>
  );
}

function JobsTable({ jobs, onApprove, onReject, onDelete }) {
  const [expandedJob, setExpandedJob] = useState(null);
  if (jobs.length === 0) return <div className="text-center py-12"><p className="text-gray-500 text-lg">Không có tin tuyển dụng nào</p></div>;
  return (
    <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50"><tr>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiêu đề</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Công ty</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">NTD</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày đăng</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hành động</th>
    </tr></thead><tbody className="divide-y divide-gray-200">
      {jobs.map(job => (<React.Fragment key={job.id}>
        <tr className="hover:bg-gray-50">
          <td className="px-4 py-3"><button onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)} className="text-left font-medium text-blue-600 hover:text-blue-800">{job.title}</button></td>
          <td className="px-4 py-3">{job.company}</td>
          <td className="px-4 py-3 text-sm">{job.employer?.email || 'N/A'}{job.employer?.user_profiles?.phone && <div className="text-xs text-gray-500">{job.employer.user_profiles.phone}</div>}</td>
          <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
          <td className="px-4 py-3 text-sm text-gray-600">{new Date(job.created_at).toLocaleDateString('vi-VN')}</td>
          <td className="px-4 py-3"><div className="flex gap-2">
            {job.status === 'pending' && (<>
              <button onClick={() => onApprove(job.id)} className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700" title="Duyệt tin">✓ Duyệt</button>
              <button onClick={() => onReject(job)} className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700" title="Từ chối">✗ Từ chối</button>
            </>)}
            <button onClick={() => onDelete(job.id)} className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700" title="Xóa vĩnh viễn">🗑️ Xóa</button>
          </div></td>
        </tr>
        {expandedJob === job.id && <tr><td colSpan={6} className="px-4 py-4 bg-gray-50"><div className="space-y-3">
          <div><strong>Mô tả:</strong><p className="text-sm text-gray-700 mt-1">{job.description}</p></div>
          {job.salary_min && <div><strong>Lương:</strong><p className="text-sm text-gray-700">{job.salary_min.toLocaleString()} - {job.salary_max?.toLocaleString() || 'Thỏa thuận'} VND</p></div>}
          <div><strong>Địa chỉ phỏng vấn:</strong><p className="text-sm text-gray-700">{job.interview_formatted || job.interview_address}</p><p className="text-xs text-gray-500">Tọa độ: {job.interview_lat}, {job.interview_lng} | Độ chính xác: {job.interview_accuracy}</p></div>
          {job.rejection_reason && <div className="bg-red-50 border border-red-200 rounded p-3"><strong className="text-red-800">Lý do từ chối:</strong><p className="text-sm text-red-700 mt-1">{job.rejection_reason}</p></div>}
          <div className="flex gap-2 text-sm text-gray-600"><span>👁️ {job.view_count} lượt xem</span><span>•</span><span>📝 {job.application_count} ứng tuyển</span></div>
        </div></td></tr>}
      </React.Fragment>))}
    </tbody></table></div>
  );
}

function StatusBadge({ status }) {
  const styles = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', expired: 'bg-gray-100 text-gray-800' };
  const labels = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', expired: 'Hết hạn' };
  return <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status]}`}>{labels[status]}</span>;
}

function UsersTable({ users, onBan }) {
  return <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50"><tr>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại TK</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hành động</th>
  </tr></thead><tbody className="divide-y divide-gray-200">{users.map(user => (<tr key={user.id} className="hover:bg-gray-50">
    <td className="px-4 py-3">{user.email}</td><td className="px-4 py-3">{user.full_name || '-'}</td>
    <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded ${user.user_type === 'admin' ? 'bg-purple-100 text-purple-800' : user.user_type === 'employer' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{user.user_type === 'admin' ? '👑 Admin' : user.user_type === 'employer' ? '💼 NTD' : '👤 Ứng viên'}</span></td>
    <td className="px-4 py-3">{user.is_banned ? <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">🚫 Đã cấm</span> : <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">✓ Hoạt động</span>}</td>
    <td className="px-4 py-3 text-sm text-gray-600">{new Date(user.created_at).toLocaleDateString('vi-VN')}</td>
    <td className="px-4 py-3">{user.user_type !== 'admin' && <button onClick={() => onBan(user.id, user.is_banned)} className={`px-3 py-1 text-sm rounded ${user.is_banned ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}`}>{user.is_banned ? '✓ Gỡ cấm' : '🚫 Cấm'}</button>}</td>
  </tr>))}</tbody></table></div>;
}

function ReportsTable({ reports, onRefresh }) {
  const resolveReport = async (reportId, action) => {
    const { error } = await supabase.from('fraud_reports').update({ status: action === 'resolve' ? 'resolved' : 'dismissed', resolved_at: new Date().toISOString() }).eq('id', reportId);
    if (!error) { alert(action === 'resolve' ? '✓ Đã giải quyết' : '✓ Đã bỏ qua'); onRefresh(); }
  };
  if (reports.length === 0) return <div className="text-center py-12"><p className="text-gray-500 text-lg">Không có báo cáo nào</p></div>;
  return (<div className="space-y-4">{reports.map(report => (<div key={report.id} className="border rounded-lg p-4">
    <div className="flex items-start justify-between mb-3">
      <div><span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded font-medium">{report.report_type}</span><p className="text-sm text-gray-600 mt-1">Bởi: {report.reporter?.email}</p></div>
      <span className="text-xs text-gray-500">{new Date(report.created_at).toLocaleDateString('vi-VN')}</span>
    </div>
    {report.job && <div className="bg-gray-50 p-3 rounded mb-3"><p className="font-medium">{report.job.title}</p><p className="text-sm text-gray-600">{report.job.company}</p></div>}
    <div className="mb-3"><strong>Mô tả:</strong><p className="text-sm text-gray-700 mt-1">{report.description}</p></div>
    {report.evidence_urls && report.evidence_urls.length > 0 && <div className="mb-3"><strong>Bằng chứng:</strong><div className="mt-1 space-y-1">{report.evidence_urls.map((url, idx) => (<a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline block">📎 Link {idx + 1}</a>))}</div></div>}
    <div className="flex gap-2">
      <button onClick={() => resolveReport(report.id, 'resolve')} className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">✓ Giải quyết</button>
      <button onClick={() => resolveReport(report.id, 'dismiss')} className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">Bỏ qua</button>
      {report.job_id && <button onClick={() => window.open(`/jobs/${report.job_id}`, '_blank')} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50">👁️ Xem tin</button>}
    </div>
  </div>))}</div>);
}
