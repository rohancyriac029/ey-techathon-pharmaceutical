import dotenv from 'dotenv';

dotenv.config();

export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  port: parseInt(process.env.PORT || '3001', 10),
};
