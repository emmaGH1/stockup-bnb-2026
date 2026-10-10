import { FIXTURE_STATUS, type SecurityStatus } from './fixtures/w3w';

/**
 * Returns security status. Live W3W lookup is NOT implemented yet (endpoint shape unverified, no keys),
 * so this always returns fixtures and says so. Replace the body once credentials exist.
 */
export function getStatuses(): { statuses: SecurityStatus[]; mode: 'fixture' } {
  return { statuses: FIXTURE_STATUS, mode: 'fixture' };
}
