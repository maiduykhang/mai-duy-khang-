import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { Job, Role } from '@prisma/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  switch (req.method) {
    case 'GET':
      try {
        // Allow admin to see all jobs, public can only see approved jobs
        const whereClause = session?.user?.role === Role.ADMIN || session?.user?.role === Role.MODERATOR && req.query.all === 'true'
          ? {}
          : { status: 'APPROVED' };
        
        const jobs = await prisma.job.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
        });
        res.status(200).json(jobs);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch jobs' });
      }
      break;

    case 'POST':
      if (!session || (session.user.role !== Role.ADMIN && session.user.role !== Role.MODERATOR)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      try {
        const { title, company, location, description, requirements, salary, applicationLink } = req.body;
        const newJob: Job = await prisma.job.create({
          data: {
            title,
            company,
            location,
            description,
            requirements,
            salary,
            applicationLink,
            // New jobs can be set to PENDING by default
            status: 'PENDING',
          },
        });
        res.status(201).json(newJob);
      } catch (error) {
        res.status(500).json({ error: 'Failed to create job' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
