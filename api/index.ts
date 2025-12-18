import { VercelRequest, VercelResponse } from '@vercel/node';

// Get initializeApp function - try built file first, fallback to source
async function getInitializeApp() {
  try {
    // Try to import from built file first (for Vercel production)
    const builtModule = await import('../dist/index.js');
    if (builtModule.initializeApp) {
      return builtModule.initializeApp;
    }
  } catch (e) {
    // Built file doesn't exist or doesn't export initializeApp
    console.log('Built file not available, using source');
  }
  
  // Fallback to source (for local development or if built file fails)
  const sourceModule = await import('../server/index.js');
  return sourceModule.initializeApp;
}

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
    
    // Get initializeApp function and initialize app
    initPromise = getInitializeApp().then((initializeAppFn: any) => {
      return initializeAppFn();
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

