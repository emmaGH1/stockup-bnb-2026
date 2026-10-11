// Plain-language copy and pure helpers for the reviewToken flow (docs/UI_REQUEST_CONTRACT.md, section 2).
// Kept in src/lib so the UI change stays small and the logic is tested here. Raw server text is never shown
// beyond the messages below.

export const GENERIC_UI_FAILURE = 'Stockup could not check this right now. Nothing was sent.';
export const EXPIRED_AUTHORIZATION = 'This check has expired. Run the check again.';

const SERVER_TO_UI: ReadonlyArray<readonly [RegExp, string]> = [
  [/^review token is required$/, 'This check is out of date. Run the check again.'],
  [/^review token is invalid$/, 'This check could not be confirmed. Run the check again.'],
  [/^request does not match the signed review: /, 'The details differ from the check. Run the check again.'],
  [/^The server could not complete this request\b/, GENERIC_UI_FAILURE],
];

/** Maps a server error to the plain-language message. Anything not listed becomes the generic message. */
export function reviewErrorText(serverError: unknown): string {
  if (typeof serverError === 'string') {
    for (const [re, text] of SERVER_TO_UI) if (re.test(serverError)) return text;
  }
  return GENERIC_UI_FAILURE;
}

/** The token to send with settle and receipt, or null. Only a non-empty string is sent. */
export function reviewTokenFor(res: { reviewToken?: unknown } | null | undefined): string | null {
  const t = res?.reviewToken;
  return typeof t === 'string' && t.length > 0 ? t : null;
}

/**
 * True when a NEW authorization must be refused because the review window has closed.
 * No window (reviewExpiresAt null or missing) means legacy mode, which has none.
 * Client-side only: the server does not enforce this. The on-chain 120-second deadline is the hard limit.
 */
export function isAuthorizationExpired(reviewExpiresAt: number | null | undefined, nowMs: number): boolean {
  if (typeof reviewExpiresAt !== 'number') return false;
  return nowMs / 1000 >= reviewExpiresAt;
}
