import type { NextApiHandler } from 'next';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
// FIX: Use Prisma namespace for generated types and enums.
import { Prisma } from '@prisma/client';

// FIX: Refactored to use NextApiHandler to resolve type inference issue with req.method.
const handler: NextApiHandler = async (req, res) => {
  const session = await getServerSession(req, res, authOptions);

  switch (req.method) {
    case 'GET':
      try {
        // Allow admin to see all jobs, public can only see approved jobs
        // FIX: Use Prisma.Role enum. Session type fix should come from next-auth augmentation.
        const whereClause = (session?.user as any)?.role === Prisma.Role.ADMIN || (session?.user as any)?.role === Prisma.Role.MODERATOR && req.query.all === 'true'
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
      // FIX: Use Prisma.Role enum.
      if (!session || ((session.user as any).role !== Prisma.Role.ADMIN && (session.user as any).role !== Prisma.Role.MODERATOR)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      try {
        const { title, company, location, description, requirements, salary, applicationLink } = req.body;
        // FIX: Use Prisma.Job for type annotation.
        const newJob: Prisma.Job = await prisma.job.create({
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

export default handler;