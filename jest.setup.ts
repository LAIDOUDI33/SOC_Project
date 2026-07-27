import { PrismaClient } from '@prisma/client';

// Mock Prisma client for testing
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    alert: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    incident: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
  })),
}));

// Mock Next.js
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init = {}) => ({
      status: init?.status || 200,
      json: async () => data,
      headers: new Headers(init?.headers || {}),
    })),
    redirect: jest.fn((url, init = {}) => ({
      status: init?.status || 307,
      headers: new Headers(init?.headers || {}),
    })),
  },
}));

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./db/test.db';
process.env.NEXTAUTH_SECRET = 'test-secret-for-jwt-generation-minimum-32-characters';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long';
