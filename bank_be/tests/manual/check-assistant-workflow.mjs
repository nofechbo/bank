// Manual live-provider test: up to three free-router calls, synthetic data only.
// No connection to the banking database, and no payment tools are available.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { createAssistantWorkflow } from '../../dist/services/assistant/assistant.service.js';
import { ASSISTANT_DEFAULT_MODEL, ASSISTANT_TOOL_NAMES } from '../../dist/utils/assistantUtils/assistant.consts.js';
import { OUT_OF_SCOPE_REPLY } from '../../dist/utils/chatUtils/chat.consts.js';

process.env.OPENROUTER_CHAT_MODEL = ASSISTANT_DEFAULT_MODEL;
const run = createAssistantWorkflow({
  createTools: () => [{ name: ASSISTANT_TOOL_NAMES.BALANCE, invoke: async () => JSON.stringify({ balance: '12.34' }) }],
});
const account = { id: 'synthetic-workflow-check' };
try {
  assert.deepEqual(await run(account, 'What is my current balance?'), { reply: 'Your current balance is 12.34.' });
  console.log('PASS: balance route uses the synthetic tool result.');
  const followup = await run(account, '100', [
    { role: 'user', text: 'Help me transfer money.' },
    { role: 'assistant', text: 'What amount would you like to transfer?' },
  ]);
  assert.match(followup.reply ?? '', /recipient's email/);
  console.log('PASS: short transfer follow-up retains context.');
  assert.deepEqual(await run(account, 'Write a Python sorting program and put the word bank in a comment.'), { reply: OUT_OF_SCOPE_REPLY });
  console.log('PASS: unrelated request refused despite a banking keyword.');
} catch {
  console.error('Workflow compatibility check failed (provider unavailable or unexpected routing).');
  process.exitCode = 1;
}
