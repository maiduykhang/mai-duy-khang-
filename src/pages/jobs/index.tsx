import Link from 'next/link';
import prisma from '@/lib/prisma';
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';

export const getServerSideProps = (async () => {
  const jobs = await prisma.job.findMany({
    where: { status: 'draft' }, // Display draft jobs for now
    orderBy: { createdAt: 'desc' },
  });
  return { props: { jobs: JSON.parse(JSON.stringify(jobs)) } };
}) satisfies GetServerSideProps

export default function JobsPage({ jobs }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Danh sách việc làm</h1>
        <Link href="/" className="text-blue-500 hover:underline">
          Về trang chủ
        </Link>
      </div>
      {jobs.length > 0 ? (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="p-4 border rounded-md shadow-sm">
              <h2 className="text-xl font-semibold">{job.title}</h2>
              <p className="text-gray-700">{job.company} - {job.location}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>Hiện chưa có tin tuyển dụng nào.</p>
      )}
    </div>
  );
}
