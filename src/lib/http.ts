// Bounded JSON body reader: refuses oversize or non-JSON bodies before any work is done.
export const MAX_BODY_BYTES = 8 * 1024;
export async function readBounded(req: Request): Promise<unknown> {
  const len = Number(req.headers.get('content-length') ?? '0');
  if (len > MAX_BODY_BYTES) throw new Error('request body too large');
  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) throw new Error('request body too large');
  return JSON.parse(text);
}
