import { VercelRequest, VercelResponse } from '@vercel/node';
// Import initializeApp dynamically to avoid TypeScript errors during build
// The buildCommand creates dist/index.js with all dependencies bundled
let initializeApp: any;

// Initialize app on module load (singleton pattern)
let appInstance: any = null;
let initPromise: Promise<any> | null = null;
let initError: any = null;

async function getApp() {
  if (appInstance) {
    return appInstance;
  }
  
  if (initError) {
    throw initError;
  }
  
  if (!initPromise) {
    // Set Vercel environment before initialization
    process.env.VERCEL = "1";
    process.env.NODE_ENV = process.env.NODE_ENV || "production";
    
    // Dynamically import initializeApp from dist/index.js
    initPromise = import('../dist/index.js').then((module: any) => {
      if (!module.initializeApp) {
        throw new Error('initializeApp not found in dist/index.js');
      }
      return module.initializeApp();
    }).then((app: any) => {
      appInstance = app;
      initError = null;
      return app;
    }).catch((error: any) => {
      console.error('Failed to initialize app:', error);
      console.error('Error stack:', error?.stack);
      console.error('Environment check:', {
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL
      });
      initError = error;
      initPromise = null; // Reset on error
      throw error;
    });
  }
  
  return initPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    
    // Wrap Express app call in a Promise to handle async properly
    return new Promise<void>((resolve, reject) => {
      // Set up timeout to prevent hanging
      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          res.status(504).json({ error: 'Request timeout' });
        }
        reject(new Error('Request timeout'));
      }, 30000); // 30 second timeout
      
      // Handle response completion
      res.on('finish', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      res.on('close', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      // Call Express app
      try {
        app(req as any, res as any, (err: any) => {
          clearTimeout(timeout);
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  } catch (error: any) {
    console.error('Error in Vercel handler:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code
    });
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      });
    }
  }
}

