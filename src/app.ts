import express from 'express';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/users.routes';
import recordRoutes from './routes/records.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { errorMiddleware } from './middleware/error.middleware';

const app = express();

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/records', recordRoutes);
app.use('/dashboard', dashboardRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ status: 404, error: 'NOT_FOUND', message: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorMiddleware);

export default app;
