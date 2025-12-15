import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config } from './config/env';
import queryRoutes from './routes/queryRoutes';
import reportRoutes from './routes/reportRoutes';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/query', queryRoutes);
app.use('/api/jobs', queryRoutes);
app.use('/api/jobs', reportRoutes);
app.use('/api/reports', reportRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/query`);
  console.log(`   GET  http://localhost:${PORT}/api/jobs/:id`);
  console.log(`   GET  http://localhost:${PORT}/api/jobs/:id/trace`);
  console.log(`   GET  http://localhost:${PORT}/api/jobs/:id/report`);
  console.log(`   GET  http://localhost:${PORT}/api/reports/:id/pdf`);
});

export default app;
