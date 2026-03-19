import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('DemoPassword1!', 12);

  const user = await prisma.user.upsert({
    where: { email: 'admin@demo.eng' },
    update: {},
    create: {
      email: 'admin@demo.eng',
      name: 'Demo Admin',
      password: hashedPassword,
    },
  });

  const org = await prisma.organisation.upsert({
    where: { slug: 'demo-engineering' },
    update: {},
    create: {
      name: 'Demo Engineering Pty Ltd',
      slug: 'demo-engineering',
      abn: '12345678901',
    },
  });

  await prisma.organisationMember.upsert({
    where: {
      organisationId_userId: { organisationId: org.id, userId: user.id },
    },
    update: {},
    create: {
      organisationId: org.id,
      userId: user.id,
      role: 'owner',
    },
  });

  const project = await prisma.project.upsert({
    where: {
      organisationId_code: { organisationId: org.id, code: 'DEMO-001' },
    },
    update: {},
    create: {
      organisationId: org.id,
      name: 'Demo Bridge Assessment',
      code: 'DEMO-001',
      description: 'Demonstration project for the engineering platform',
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: user.id },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: user.id,
      role: 'lead',
    },
  });

  const existingProfile = await prisma.standardsProfile.findFirst({
    where: { organisationId: org.id, name: 'Default Profile' },
  });

  if (!existingProfile) {
    await prisma.standardsProfile.create({
      data: {
        organisationId: org.id,
        name: 'Default Profile',
        description: 'Empty default standards profile',
      },
    });
  }

  console.log('Seed data created successfully');
  console.log(`  User:    ${user.email} (password: DemoPassword1!)`);
  console.log(`  Org:     ${org.name} (${org.slug})`);
  console.log(`  Project: ${project.name} (${project.code})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
