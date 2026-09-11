// @vitest-environment jsdom
import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useChatSession } from '../src/components/chatComponents/useChatSession';
import { assistantStorageKey, assistantInviteKey, parseRetryAfterSeconds } from '../src/components/chatComponents/chat.helpers';

const state = vi.hoisted(() => ({ auth: { isLoggedIn: true, token: 'token-a', email: 'a@example.test', initialized: true }, pathname: '/dashboard' }));
vi.mock('../src/contexts/AuthContext', () => ({ useAuth: () => state.auth }));
vi.mock('react-router-dom', () => ({ useLocation: () => ({ pathname: state.pathname }) }));

beforeEach(() => {
  sessionStorage.clear();
  state.auth = { isLoggedIn: true, token: 'token-a', email: 'a@example.test', initialized: true };
  state.pathname = '/dashboard';
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test('restores history after initialization and clears private storage and invitation on logout', async () => {
  const key = assistantStorageKey(state.auth.email);
  const invite = assistantInviteKey(state.auth.email);
  sessionStorage.setItem(key, JSON.stringify([{ role: 'assistant', text: 'Private balance' }]));
  sessionStorage.setItem(invite, 'shown');
  state.auth.initialized = false;
  const { result, rerender } = renderHook(() => useChatSession());
  expect(result.current.messages.some(m => m.text === 'Private balance')).toBe(false);
  state.auth.initialized = true;
  rerender();
  expect(result.current.messages[0].text).toBe('Private balance');
  state.auth = { ...state.auth, isLoggedIn: false, token: '', email: '' };
  rerender();
  expect(result.current.messages.some(m => m.text === 'Private balance')).toBe(false);
  expect(sessionStorage.getItem(key)).toBeNull();
  expect(sessionStorage.getItem(invite)).toBeNull();
});

test('account switch aborts and discards a late response even after returning to the original account', async () => {
  let resolve!: (response: Response) => void;
  const fetchMock = vi.fn(() => new Promise<Response>(done => { resolve = done; }));
  vi.stubGlobal('fetch', fetchMock);
  const { result, rerender } = renderHook(() => useChatSession());
  let pending!: Promise<void>;
  act(() => { pending = result.current.send('My balance'); });
  state.auth = { ...state.auth, email: 'b@example.test', token: 'token-b' };
  rerender();
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  expect(result.current.messages.some(m => m.text === 'My balance')).toBe(false);
  state.auth = { ...state.auth, email: 'a@example.test', token: 'token-a' };
  rerender();
  await act(async () => { resolve(new Response(JSON.stringify({ reply: 'Old private response' }))); await pending; });
  expect(result.current.messages.some(m => m.text === 'Old private response')).toBe(false);
});

test('401 remains blocked across navigation until a different token is issued', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
  const { result, rerender } = renderHook(() => useChatSession());
  await act(async () => { await result.current.send('My balance'); });
  expect(result.current.canSend).toBe(false);
  state.pathname = '/'; rerender();
  expect(result.current.canSend).toBe(true);
  state.pathname = '/dashboard'; rerender();
  expect(result.current.canSend).toBe(false);
  state.auth.token = 'replacement'; rerender();
  expect(result.current.canSend).toBe(true);
});

test('server cooldown survives navigation and never resends automatically', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 429, headers: { 'Retry-After': '7200' } }));
  vi.stubGlobal('fetch', fetchMock);
  const { result, rerender } = renderHook(() => useChatSession());
  await act(async () => { await result.current.send('My balance'); });
  expect(result.current.input).toBe('My balance');
  expect(result.current.retrySeconds).toBeGreaterThan(600);
  state.pathname = '/'; rerender();
  expect(result.current.canSend).toBe(false);
  state.pathname = '/dashboard'; rerender();
  expect(result.current.canSend).toBe(false);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('public requests have no authorization header and countdown releases sending', async () => {
  state.pathname = '/';
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 429, headers: { 'Retry-After': '0' } }));
  vi.stubGlobal('fetch', fetchMock);
  const { result } = renderHook(() => useChatSession());
  await act(async () => { await result.current.send('Help'); });
  await waitFor(() => expect(result.current.canSend).toBe(true));
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(parseRetryAfterSeconds('7200')).toBe(7200);
  expect(parseRetryAfterSeconds(null)).toBe(60);
});

test('only a validated assistant transfer draft is available for review', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    reply: 'Ready to send 100 to b@example.test?',
    transferDraft: { amount: '100', recipient: 'b@example.test' },
  }))));
  const { result, rerender } = renderHook(() => useChatSession());
  await act(async () => { await result.current.send('send 100 to b@example.test'); });
  expect(result.current.transferDraft).toEqual({ amount: '100', recipient: 'b@example.test' });

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    reply: 'Unsafe draft', transferDraft: { amount: '-1', recipient: 'not-an-email' },
  }))));
  rerender();
  await act(async () => { await result.current.send('another transfer'); });
  expect(result.current.transferDraft).toBeNull();
});

test('an assistant logout request exposes a confirmation action', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    reply: 'Ready to sign you out.',
    logoutConfirmation: true,
  }))));
  const { result } = renderHook(() => useChatSession());
  await act(async () => { await result.current.send('log me out'); });
  expect(result.current.logoutConfirmation).toBe(true);
  act(() => { result.current.dismissLogoutConfirmation(); });
  expect(result.current.logoutConfirmation).toBe(false);
});
