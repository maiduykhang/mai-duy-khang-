import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import prisma from '@/lib/prisma';
import { Job } from '@prisma/client';
// FIX: Changed path alias to relative path to resolve module loading issue.
import JobCard from '../../components/JobCard';

export const getStaticProps: GetStaticProps<{ jobs: Job[] }> = async () => {
  const jobs = await prisma.job.findMany({
    where: {
      status: 'APPROVED',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return {
    props: { jobs: JSON.parse(JSON.stringify(jobs)) },
    revalidate: 60, // Re-generate the page every 60 seconds (Incremental Static Regeneration)
  };
};

export default function JobsPage({ jobs }: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Việc làm mới nhất</h1>
      {jobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">Chưa có tin tuyển dụng</h2>
          <p className="text-gray-500 mt-2">Hiện tại chưa có công việc nào được đăng. Vui lòng quay lại sau.</p>
        </div>
      )}
    </div>
  );
}