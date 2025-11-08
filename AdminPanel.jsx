// ADMIN PANEL - Run this in AI Studio as separate artifact
'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Use environment variables in production
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_ROLE_KEY'; // Admin key with full access

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default function AdminPanel() {
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('jobs');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    // Real-time updates for admin
    const channel = supabase
      .channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, fetchJobs)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, fetchStats)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchJobs(), fetchUsers(), fetchStats()]);
    setLoading(false);
  };

  const fetchJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    setJobs(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.auth.admin.listUsers();
    setUsers(data.users || []);
  };

  const fetchStats = async () => {
    const [jobsCount, applicationsCount, pendingJobs, usersList] = await Promise.all([
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
      supabase.from('applications').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.auth.admin.listUsers(),
    ]);

    setStats({
      totalJobs: jobsCount.count,
      totalApplications: applicationsCount.count,
      pendingApproval: pendingJobs.count,
      totalUsers: usersList.data.users.length,
    });
  };

  const approveJob = async (jobId) => {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'approved' })
      .eq('id', jobId);

    if (!error) {
      fetchData();
      alert('Đã duyệt tin tuyển dụng');
    }
  };

  const rejectJob = async (jobId) => {
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'rejected' })
      .eq('id', jobId);

    if (!error) {
      fetchData();
      alert('Đã từ chối tin tuyển dụng');
    }
  };

  const deleteJob = async (jobId) => {
    if (!confirm('Xóa vĩnh viễn tin này?')) return;

    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId);

    if (!error) {
      fetchData();
      alert('Đã xóa');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Đang tải dữ liệu admin...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">WorkHub Admin Panel</h1>
          <p className="text-sm text-gray-600">Quản lý toàn bộ hệ thống</p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard title="Tổng tin tuyển dụng" value={stats.totalJobs} color="blue" />
          <StatCard title="Chờ duyệt" value={stats.pendingApproval} color="yellow" />
          <StatCard title="Hồ sơ ứng tuyển" value={stats.totalApplications} color="green" />
          <StatCard title="Người dùng" value={stats.totalUsers} color="purple" />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b flex">
            <TabButton active={activeTab === 'jobs'} onClick={() => setActiveTab('jobs')}>
              Tin tuyển dụng ({jobs.length})
            </TabButton>
            <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
              Người dùng ({users.length})
            </TabButton>
          </div>

          <div className="p-6">
            {activeTab === 'jobs' && (
              <JobsTable 
                jobs={jobs} 
                onApprove={approveJob} 
                onReject={rejectJob}
                onDelete={deleteJob}
              />
            )}
            
            {activeTab === 'users' && (
              <UsersTable users={users} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }) {
  const colors = {
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className={`w-12 h-12 ${colors[color]} rounded-lg flex items-center justify-center text-white text-2xl font-bold mb-3`}>
        {value}
      </div>
      <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 font-medium ${
        active
          ? 'border-b-2 border-blue-500 text-blue-600'
          : 'text-gray-600 hover:text-gray-800'
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  const text = {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Đã từ chối',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {text[status] || status}
    </span>
  );
}

function JobsTable({ jobs, onApprove, onReject, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiêu đề</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Công ty</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày đăng</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {jobs.map(job => (
            <tr key={job.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-semibold">{job.title}</td>
              <td className="px-4 py-3">{job.company}</td>
              <td className="px-4 py-3">
                <StatusBadge status={job.status} />
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {new Date(job.created_at).toLocaleDateString('vi-VN')}
              </td>
              <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                {job.status === 'pending' && (
                  <>
                    <button onClick={() => onApprove(job.id)} className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700">Duyệt</button>
                    <button onClick={() => onReject(job.id)} className="px-3 py-1 text-xs font-medium text-white bg-yellow-600 rounded hover:bg-yellow-700">Từ chối</button>
                  </>
                )}
                <button onClick={() => onDelete(job.id)} className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700">Xóa</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsersTable({ users }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tham gia</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map(user => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{user.email}</td>
              <td className="px-4 py-3">{user.raw_user_meta_data?.name || 'Chưa cập nhật'}</td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {new Date(user.created_at).toLocaleDateString('vi-VN')}
              </td>
              <td className="px-4 py-3">
                 <button className="px-3 py-1 text-xs font-medium text-white bg-gray-600 rounded hover:bg-gray-700">Xem chi tiết</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
