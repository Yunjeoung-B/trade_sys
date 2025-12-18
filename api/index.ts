import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp } from '../server/index';

// Initialize app on module load
let appPromise: Promise<any> | null = null;

async function getApp() {
  if (!appPromise) {
    process.env.VERCEL = "1";
    appPromise = initializeApp();
  }
  return appPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    console.error('Error in Vercel handler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

