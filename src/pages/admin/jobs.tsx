import { useState, useEffect } from 'react';
import { Job, JobStatus } from '@prisma/client';
import { useSession } from 'next-auth/react';

const StatusBadge = ({ status }: { status: JobStatus }) => {
  const styles = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
};

export default function AdminJobsPage() {
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs?all=true');
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleUpdateStatus = async (id: string, status: JobStatus) => {
    await fetch(`/api/jobs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchJobs();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      fetchJobs();
    }
  };
  
  if (session?.user.role !== 'ADMIN' && session?.user.role !== 'MODERATOR') {
      return <div className="container mx-auto p-6"><p>Access Denied.</p></div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Manage Job Postings</h1>
      {loading ? (
        <p>Loading jobs...</p>
      ) : (
        <div className="bg-white p-4 rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Company</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {jobs.map((job) => (
                <tr key={job.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-semibold">{job.title}</td>
                  <td className="p-3">{job.company}</td>
                  <td className="p-3"><StatusBadge status={job.status} /></td>
                  <td className="p-3 space-x-2 whitespace-nowrap">
                    {job.status === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateStatus(job.id, 'APPROVED')}
                        className="px-3 py-1 text-xs text-white bg-green-600 rounded hover:bg-green-700"
                      >
                        Approve
                      </button>
                    )}
                    {job.status === 'PENDING' && (
                      <button
                        onClick={() => handleUpdateStatus(job.id, 'REJECTED')}
                        className="px-3 py-1 text-xs text-white bg-yellow-600 rounded hover:bg-yellow-700"
                      >
                        Reject
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="px-3 py-1 text-xs text-white bg-red-600 rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
