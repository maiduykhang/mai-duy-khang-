import { PrismaClient, Role, JobStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create Admin User
  const saltRounds = 10;
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@workhub.com' },
    update: {},
    create: {
      email: 'admin@workhub.com',
      name: 'Admin User',
      password: hashedPassword,
      role: Role.ADMIN,
      emailVerified: new Date(),
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // Create sample jobs
  await prisma.job.createMany({
    data: [
      {
        title: 'Backend Developer',
        company: 'Tech Solutions Inc.',
        location: 'Ho Chi Minh City',
        salary: '25 - 40 triệu VND',
        description: 'We are looking for a skilled Backend Developer to join our team...',
        requirements: 'Node.js, PostgreSQL, Docker, AWS experience required.',
        applicationLink: 'https://example.com/apply/backend-dev',
        status: JobStatus.APPROVED,
      },
      {
        title: 'Frontend Developer',
        company: 'Creative Web Ltd.',
        location: 'Hanoi',
        salary: '20 - 35 triệu VND',
        description: 'Join our creative team to build amazing user interfaces...',
        requirements: 'React, TypeScript, Next.js, Tailwind CSS skills are a must.',
        applicationLink: 'https://example.com/apply/frontend-dev',
        status: JobStatus.APPROVED,
      },
      {
        title: 'Data Analyst',
        company: 'Data Insights Co.',
        location: 'Da Nang',
        salary: '30 - 50 triệu VND',
        description: 'We are seeking a data-driven analyst to help us make better decisions.',
        requirements: 'SQL, Python (Pandas), Tableau or Power BI knowledge.',
        applicationLink: 'https://example.com/apply/data-analyst',
        status: JobStatus.PENDING,
      },
    ],
    skipDuplicates: true,
  });
  console.log('Seeded 3 sample jobs.');

  console.log('Seeding finished.');
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    // FIX: Cast `process` to `any` to bypass TypeScript error about `exit` property. This script runs in a Node.js environment where `process.exit` is available.
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });