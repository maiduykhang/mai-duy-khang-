import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from 'next';
import Link from 'next/link';
import prisma from '@/lib/prisma';
// FIX: Import Prisma namespace to use generated types like Prisma.Job.
import type { Prisma } from '@prisma/client';

export const getStaticPaths: GetStaticPaths = async () => {
  const jobs = await prisma.job.findMany({
    where: { status: 'APPROVED' },
    select: { id: true },
  });

  const paths = jobs.map((job) => ({
    params: { id: job.id },
  }));

  return { paths, fallback: 'blocking' };
};

// FIX: Use Prisma.Job for type annotation.
export const getStaticProps: GetStaticProps<{ job: Prisma.Job | null }> = async ({ params }) => {
  const id = params?.id as string;
  const job = await prisma.job.findUnique({
    where: { id },
  });

  if (!job || job.status !== 'APPROVED') {
    return { notFound: true };
  }

  return {
    props: { job: JSON.parse(JSON.stringify(job)) },
    revalidate: 60, // Revalidate every 60 seconds
  };
};

export default function JobDetailPage({ job }: InferGetStaticPropsType<typeof getStaticProps>) {
  if (!job) return <div>Job not found.</div>;

  return (
    <main className="container mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <Link href="/jobs" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center text-sm">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Quay lại danh sách
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b bg-gray-50">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{job.title}</h1>
          <h2 className="text-lg font-semibold text-blue-700">{job.company}</h2>
          <p className="text-sm text-gray-500 mt-1">Địa điểm: {job.location}</p>
          <p className="text-base font-bold text-green-600 mt-2">Lương: {job.salary}</p>
        </div>

        <div className="p-6 space-y-8">
          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b-2 pb-2">Mô tả công việc</h3>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{job.description}</div>
          </section>

          <section>
            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b-2 pb-2">Yêu cầu ứng viên</h3>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{job.requirements}</div>
          </section>

          <div className="pt-4 border-t">
            <a
              href={job.applicationLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-block text-center bg-blue-600 text-white px-8 py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors"
            >
              Ứng tuyển ngay
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}