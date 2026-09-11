import { handler } from '../netlify/functions/create-user.js';

/**
 * Vercel Serverless Function adapter — reuses the same handler as the
 * Netlify Function (same signature: {httpMethod, body} -> {statusCode, body})
 * so the business logic lives in one place for both deploy targets.
 */
export default async function (
  req: { method?: string; body?: unknown },
  res: { statusCode: number; setHeader: (key: string, value: string) => void; end: (chunk?: string) => void }
) {
  const result = await handler({
    httpMethod: req.method || 'GET',
    body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}),
  });
  res.statusCode = result.statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(result.body);
}
