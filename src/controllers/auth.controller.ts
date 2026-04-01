import { Request, Response, NextFunction } from 'express';
import { loginSchema } from '../schemas/auth.schema';
import { login } from '../services/auth.service';

export async function loginController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const token = await login(email, password);
    res.json({ data: { token } });
  } catch (err) {
    next(err);
  }
}
