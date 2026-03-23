import { useAgentStore, AgentRole } from '../store/useAgentStore';
import { generateContent, ProviderType } from './llmProviders';
import { AGENT_PROMPTS } from './prompts';

export async function runAgentTurn(songVibe: string) {
  const store = useAgentStore.getState();
  if (store.isGenerating) return;
  store.setGenerating(true);

  try {
    const history = store.messages;
    
    // Determine the next role
    let nextRole: AgentRole = 'DIRECTOR';
    if (history.length > 0) {
      const lastRole = history[history.length - 1].role;
      // Loop: HUMAN -> DIRECTOR -> WRITER -> VISUALIZER -> AUDIO -> DIRECTOR ...
      if (lastRole === 'DIRECTOR' || lastRole === 'HUMAN') nextRole = 'WRITER';
      else if (lastRole === 'WRITER') nextRole = 'VISUALIZER';
      else if (lastRole === 'VISUALIZER') nextRole = 'AUDIO';
      else if (lastRole === 'AUDIO') nextRole = 'DIRECTOR';
    }

    // Determine the Provider for the role
    let provider: ProviderType = 'DEEPSEEK'; // default Director
    if (nextRole === 'WRITER') provider = 'MINIMAX';
    if (nextRole === 'VISUALIZER' || nextRole === 'AUDIO') provider = 'QWEN';

    // Build context
    const recentMessages = history.slice(-6).map(m => `[${m.role}]: ${m.content}`).join('\n');
    let promptContext = `Theme/Song Vibe: "${songVibe}"\n\nRecent Conversation History:\n${recentMessages}\n\nNow, generate only the text for your next response as the ${nextRole}.`;

    if (history.length === 0) {
      promptContext = `The user has set the core theme/vibe for a story/MV: "${songVibe}". As the DIRECTOR, start by setting the initial scene and commanding the WRITER to propose a plot. (Reply in Chinese)`;
    }

    const systemPrompt = AGENT_PROMPTS[nextRole as keyof typeof AGENT_PROMPTS] || 'You are an AI assistant.';
    
    // Slight delay for UI effect
    await new Promise(resolve => setTimeout(resolve, 800));

    const responseText = await generateContent(provider, systemPrompt, promptContext);
    
    const meta = nextRole === 'VISUALIZER' 
      ? extractVisualTags(responseText) 
      : nextRole === 'AUDIO' 
        ? extractAudioTags(responseText) 
        : undefined;

    store.addMessage({
      role: nextRole,
      content: responseText,
      metadata: meta
    });

    // Background push to database
    if (store.roomId) {
      fetch(`http://localhost:3001/api/rooms/${store.roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentRole: nextRole, content: responseText, metadata: meta })
      }).catch(err => console.error("Sync error:", err));
    }

  } catch (err) {
    console.error('Agent Turn Error:', err);
    store.addMessage({ role: 'SYSTEM', content: '>>> COMMUNICATION LINK SEVERED. LLM CLUSTER OFFLINE. <<<' });
  } finally {
    store.setGenerating(false);
  }
}

function extractVisualTags(text: string) {
  const match = text.match(/\[(.*?)\]/);
  return { tag: match ? match[1] : 'RENDER_UNDEFINED' };
}

function extractAudioTags(text: string) {
  const match = text.match(/\[(.*?)\]/);
  return { tags: match ? match[1] : 'BPM:100, Genre:Unknown, Mood:Unknown' };
}
