import { FinancialRecord } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../errors/AppError';
import { CreateRecordInput, UpdateRecordInput, RecordFilterInput } from '../schemas/record.schema';

export async function createRecord(input: CreateRecordInput, createdById: string): Promise<FinancialRecord> {
  return prisma.financialRecord.create({
    data: {
      amount: input.amount,
      type: input.type,
      category: input.category,
      date: new Date(input.date),
      notes: input.notes,
      createdById,
    },
  });
}

export async function listRecords(filters: RecordFilterInput): Promise<{
  data: FinancialRecord[];
  meta: { page: number; limit: number; total: number };
}> {
  const { page, limit, dateFrom, dateTo, category, type } = filters;
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null,
    ...(dateFrom && { date: { gte: new Date(dateFrom) } }),
    ...(dateTo && { date: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), lte: new Date(dateTo) } }),
    ...(category && { category }),
    ...(type && { type }),
  };

  // Handle date range properly
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (dateFrom) dateFilter.gte = new Date(dateFrom);
  if (dateTo) dateFilter.lte = new Date(dateTo);

  const whereClause = {
    deletedAt: null,
    ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
    ...(category && { category }),
    ...(type && { type }),
  };

  const [records, total] = await Promise.all([
    prisma.financialRecord.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { date: 'desc' },
    }),
    prisma.financialRecord.count({ where: whereClause }),
  ]);

  return { data: records, meta: { page, limit, total } };
}

export async function getRecordById(id: string): Promise<FinancialRecord> {
  const record = await prisma.financialRecord.findFirst({
    where: { id, deletedAt: null },
  });
  if (!record) throw AppError.notFound('Financial record not found');
  return record;
}

export async function updateRecord(id: string, input: UpdateRecordInput): Promise<FinancialRecord> {
  const existing = await prisma.financialRecord.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw AppError.notFound('Financial record not found');

  return prisma.financialRecord.update({
    where: { id },
    data: {
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.date !== undefined && { date: new Date(input.date) }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
}

export async function softDeleteRecord(id: string): Promise<void> {
  const existing = await prisma.financialRecord.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw AppError.notFound('Financial record not found');

  await prisma.financialRecord.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
