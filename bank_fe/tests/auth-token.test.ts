// @vitest-environment jsdom
import { expect, test, vi } from 'vitest';
import { isExpiredJwt } from '../src/utils/authToken';

function token(payload: object) {
  return `header.${btoa(JSON.stringify(payload)).replace(/=/g, '')}.signature`;
}

test('expired JWTs cannot count as an active browser session', () => {
  vi.setSystemTime(new Date('2026-09-10T12:00:00Z'));
  expect(isExpiredJwt(null)).toBe(true);
  expect(isExpiredJwt(token({ exp: 1_789_041_599 }))).toBe(true);
  expect(isExpiredJwt(token({ exp: 1_789_041_601 }))).toBe(false);
  expect(isExpiredJwt('unreadable')).toBe(true);
  expect(isExpiredJwt(token({}))).toBe(true);
  vi.useRealTimers();
});
