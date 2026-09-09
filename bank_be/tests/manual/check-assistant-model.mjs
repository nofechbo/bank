// Manual compatibility check; never included in npm test. Uses one provider call,
// synthetic text and tool schemas only. It does not execute any banking tool.
import 'dotenv/config';
import { createAssistantTools } from '../../dist/services/assistant/assistantTools.service.js';
import { createAssistantModel } from '../../dist/services/assistant/assistant.service.js';
import { ASSISTANT_DEFAULT_MODEL, ASSISTANT_TOOL_NAMES } from '../../dist/utils/assistantUtils/assistant.consts.js';

process.env.OPENROUTER_CHAT_MODEL = ASSISTANT_DEFAULT_MODEL;
try {
  const tools = createAssistantTools({ id: 'synthetic-compatibility-check' });
  const response = await createAssistantModel(tools).invoke([
    { role: 'system', content: 'This is a synthetic tool-calling compatibility test. Respond by calling getMyBalance with no arguments. Do not invent a balance or answer in text.' },
    { role: 'user', content: 'What is my balance?' },
  ]);
  const call = response.tool_calls?.find(item => item.name === ASSISTANT_TOOL_NAMES.BALANCE);
  if (!call || Object.keys(call.args).length !== 0) throw new Error('Unexpected tool response');
  console.log('PASS: free router returned a valid getMyBalance tool call. No account data accessed.');
} catch {
  console.error('Compatibility check did not pass (provider unavailable or unexpected tool response).');
  process.exitCode = 1;
}
