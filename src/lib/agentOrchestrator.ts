import { useAgentStore, AgentRole } from '../store/useAgentStore';
import { generateContent, ProviderType } from './llmProviders';
import { AGENT_PROMPTS } from './prompts';

export async function runAgentTurn(songVibe: string) {
  const store = useAgentStore.getState();
  if (store.isGenerating) return;
  store.setGenerating(true);

  try {
    const history = store.messages;
    
    // Auto Shutdown logic: Terminate the infinite loop after 12 bounds.
    if (history.length >= 13) {
      if (history.length === 13 && history[history.length - 1].role !== 'SYSTEM') {
        store.addMessage({ 
          role: 'SYSTEM', 
          content: '>>> [A2A 进程冻结] 联合推演已达边界。当前时空的「第二共振」产物已永久落定。 <<<' 
        });
        store.setPlayState('COMPLETED');
      }
      return;
    }
    
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
    const roomInfo = store.roomInfo;
    let teamContext = '';
    let myProfile = '';

    if (roomInfo && roomInfo.members) {
      const roleMap: Record<string, string> = { 'DIRECTOR': '导演', 'WRITER': '编剧', 'VISUALIZER': '视觉', 'AUDIO': '音频' };
      const allProfiles = roomInfo.members.map((m: any) => {
        const title = roleMap[m.avatar.role] || m.avatar.role;
        return `- [${m.avatar.role} / ${title}] 代号: ${m.avatar.name} (MBTI: ${m.avatar.mbti})`;
      }).join('\n');
      teamContext = `\n\n[当前战局所有参演特遣队员]\n${allProfiles}\n请注意呼应团队中其他成员的设定。`;
      
      const me = roomInfo.members.find((m: any) => m.avatar.role === nextRole || m.avatar.role === roleMap[nextRole])?.avatar;
      if (me) {
        myProfile = `\n\n[你的专属身份卡]\n代号（名字）: ${me.name}\nMBTI 人格: ${me.mbti}\n（核心指令：你必须且只能以这个身份进行发言，带入该 MBTI 的说话风格，不要破坏沉浸感）。\n`;
      }
    }

    const recentMessages = history.slice(-8).map(m => `[${m.role}]: ${m.content}`).join('\n\n');
    let promptContext = `Theme/Song Vibe: "${songVibe}"${myProfile}${teamContext}\n\nRecent Conversation History:\n${recentMessages}\n\nNow, generate only the text for your next response as the ${nextRole}.`;

    if (history.length === 0) {
      promptContext = `The user has set the core theme/vibe for a story/MV: "${songVibe}".${myProfile}${teamContext}\n\nAs the DIRECTOR, start by setting the initial scene and commanding the WRITER to propose a plot. (Reply in Chinese, embody your Persona)`;
    } else if (history.length === 12) {
      // Enforce the Director's final cut scene summary
      promptContext = `[SYSTEM OVERRIDE]: The discussion has progressed for multiple rounds. ${teamContext}\n\nRecent Conversation History:\n${recentMessages}\n\nAs the DIRECTOR, you must now explicitly close this A2A brainstorm loop. Present a finalized, conclusive "Official MV Script & Music Concept Output" unifying all previous agent contributions. Limit to 300 words. (Reply in Chinese).`;
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
      await fetch(`http://localhost:3005/api/rooms/${store.roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentRole: nextRole, content: responseText, metadata: meta })
      }).catch(err => console.error("Sync error:", err));
    }

    // Phase 3 Checkpoint Ruleset: Break cadence after exactly 4 sequential agents complete a full round (excluding initial Briefing if considered 0)
    // Actually: messages length is now history.length + 1
    const newLen = history.length + 1;
    if (newLen > 0 && newLen % 4 === 0) {
      store.setPlayState('CHECKPOINT');
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
