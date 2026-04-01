import { Request, Response, NextFunction } from 'express';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema';
import { createUser, listUsers, getUserById, updateUser } from '../services/users.service';

export async function createUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createUserSchema.parse(req.body);
    const user = await createUser(input);
    res.status(201).json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function listUsersController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await listUsers(page, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getUserById(req.params.id);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = updateUserSchema.parse(req.body);
    const user = await updateUser(req.params.id, input);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}
