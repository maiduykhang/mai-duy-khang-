import type { NextApiHandler } from 'next';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
// FIX: Use Prisma namespace for generated enums.
import { Prisma } from '@prisma/client';

// FIX: Refactored to use NextApiHandler to resolve type inference issue with req.method.
const handler: NextApiHandler = async (req, res) => {
  const { id } = req.query;
  const session = await getServerSession(req, res, authOptions);

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const job = await prisma.job.findUnique({ where: { id } });
        if (job) {
          res.status(200).json(job);
        } else {
          res.status(404).json({ error: 'Job not found' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch job' });
      }
      break;

    case 'PUT':
      // FIX: Use Prisma.Role enum. Session type should be augmented by next-auth.d.ts.
      if (!session || ((session.user as any).role !== Prisma.Role.ADMIN && (session.user as any).role !== Prisma.Role.MODERATOR)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      try {
        const updatedJob = await prisma.job.update({
          where: { id },
          data: req.body,
        });
        res.status(200).json(updatedJob);
      } catch (error) {
        res.status(500).json({ error: 'Failed to update job' });
      }
      break;

    case 'DELETE':
      // FIX: Use Prisma.Role enum.
      if (!session || ((session.user as any).role !== Prisma.Role.ADMIN && (session.user as any).role !== Prisma.Role.MODERATOR)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      try {
        await prisma.job.delete({ where: { id } });
        res.status(204).end(); // No content
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete job' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default handler;