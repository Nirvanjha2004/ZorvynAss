import { Request, Response, NextFunction } from 'express';
import { createRecordSchema, updateRecordSchema, recordFilterSchema } from '../schemas/record.schema';
import { createRecord, listRecords, getRecordById, updateRecord, softDeleteRecord } from '../services/records.service';

export async function createRecordController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createRecordSchema.parse(req.body);
    const record = await createRecord(input, req.user!.userId);
    res.status(201).json({ data: record });
  } catch (err) {
    next(err);
  }
}

export async function listRecordsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = recordFilterSchema.parse(req.query);
    const result = await listRecords(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getRecordController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const record = await getRecordById(req.params.id);
    res.json({ data: record });
  } catch (err) {
    next(err);
  }
}

export async function updateRecordController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = updateRecordSchema.parse(req.body);
    const record = await updateRecord(req.params.id, input);
    res.json({ data: record });
  } catch (err) {
    next(err);
  }
}

export async function deleteRecordController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await softDeleteRecord(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
