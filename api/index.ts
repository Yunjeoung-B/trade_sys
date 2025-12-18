import { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../server/index';

export default async function (req: VercelRequest, res: VercelResponse) {
  // Set Vercel environment flag
  process.env.VERCEL = "1";
  return handler(req as any, res as any);
}

