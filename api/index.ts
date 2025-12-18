import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp } from '../server/index';

// Initialize app on module load (singleton pattern)
let appInstance: any = null;
let initPromise: Promise<any> | null = null;

async function getApp() {
  if (appInstance) {
    return appInstance;
  }
  
  if (!initPromise) {
    process.env.VERCEL = "1";
    process.env.NODE_ENV = "production";
    initPromise = initializeApp().then(app => {
      appInstance = app;
      return app;
    }).catch(error => {
      console.error('Failed to initialize app:', error);
      initPromise = null; // Reset on error
      throw error;
    });
  }
  
  return initPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    // Express app handles the request
    app(req as any, res as any);
  } catch (error: any) {
    console.error('Error in Vercel handler:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error?.message || 'Unknown error'
      });
    }
  }
}

