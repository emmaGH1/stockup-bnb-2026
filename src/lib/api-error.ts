// Classifies errors thrown inside the API routes. Only messages we wrote for bad input are returned to the caller
// (400 with the message). Anything else is a server or upstream fault: 500 with a generic message, and the detail stays
// out of the response. The allow-list is explicit, so a new internal message cannot leak by accident.
export const GENERIC_SERVER_ERROR = 'The server could not complete this request. Nothing was sent.';

// Messages thrown deliberately for caller input problems. Matched by prefix so parameterised messages still count.
const INPUT_MESSAGE_PREFIXES = [
  'body must be a JSON object',
  'request body too large',
  'recipient must be a valid BSC address',
  'merchant must be text up to 200 characters',
  'spend must be a number',
  'invalid token address',
  'invalid recipient',
  'invalid token or recipient',
  'invalid address',
  'spend must be >0 and <= 10000 USD',
  'invest share must be 0.01%-20%',
  'amount must be >0 and <=',
  'slippage bps out of range',
  'txHash must be a 32-byte hash',
  'token must be a valid address',
  'recipient must be a valid address',
  'valueWei must',
  'minOutWei must',
  'quotedOutWei must',
  'minOutWei cannot exceed quotedOutWei',
  // Review-token rejections are caller input problems (the UI shows them). The signing secret error is NOT listed.
  'review token is required',
  'review token is invalid',
  'request does not match the signed review',
];

export function isInputError(message: string): boolean {
  return INPUT_MESSAGE_PREFIXES.some(p => message.startsWith(p));
}

export function errorResponseBody(e: unknown): { status: 400 | 500; body: { error: string } } {
  const message = e instanceof Error ? e.message : '';
  if (message && isInputError(message)) return { status: 400, body: { error: message } };
  return { status: 500, body: { error: GENERIC_SERVER_ERROR } };
}
