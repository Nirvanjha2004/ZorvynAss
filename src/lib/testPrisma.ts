import { PrismaClient } from '@prisma/client';

// Separate client for tests pointing at test.db
const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? 'file:./test.db',
    },
  },
});

export default testPrisma;
