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
          content: '>>> [系统提示] 推演已达上限。当前时空的「第二共振」成果已锁定。 <<<' 
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
      teamContext = `\n\n[当前房间所有参与角色]\n${allProfiles}\n请注意呼应团队中其他成员的设定。`;
      
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
    
    // 视觉与音频元数据提取优化
    let meta = undefined;
    if (nextRole === 'VISUALIZER') {
      meta = extractVisualTags(responseText);
    } else if (nextRole === 'AUDIO') {
      meta = extractAudioTags(responseText);
    }

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

/**
 * AI 智能启发分析：基于导演性格与歌曲调性，生成专业的开场指令建议
 */
export async function analyzePacingDirective(songVibe: string, avatarId: string): Promise<string> {
  const store = useAgentStore.getState();
  const roomInfo = store.roomInfo;
  const songInfo = store.songInfo;
  
  // 查找当前用户的导演身份卡
  const me = roomInfo?.members?.find((m: any) => m.avatar?.id === avatarId)?.avatar;
  const directorName = me?.name || "未知角色";
  const directorMBTI = me?.mbti || "INTJ";
  
  const history = store.messages;
  const currentAct = Math.floor(history.length / 4) + 1;
  const recentHistory = history.length > 0 
    ? history.slice(-4).map(m => `[${m.role}]: ${m.content}`).join('\n\n')
    : "尚未開始。";

  const systemPrompt = "你是一位专业的导演助理，负责根据导演性格、当前音乐主题以及剧情进展，撰写具有感染力和叙事递进感的「启发指令」。";
  
  const userPrompt = `
[当前角色身份]
代号: ${directorName}
人格类型 (MBTI): ${directorMBTI}

[当前音乐/场景基调]
${songVibe}
歌曲名称: ${songInfo?.trackName || '未知'}
歌手: ${songInfo?.artistName || '未知'}

[剧情演化状态]
当前幕次: 第 ${currentAct} 幕
${currentAct > 1 ? `\n[前一幕剧情回顾]\n${recentHistory}\n` : "[初始状态] 准备开启第一幕。"}

[任务要求]
请以该导演的身份，为团队中的「编剧」下达一段富有张力的【第 ${currentAct} 幕】创作指令。
1. 字数控制在 100 字以内。
2. 说话风格严格符合导演的 MBTI 性格。
3. 指令要具体、有画面感，提及歌曲的独特氛围。
4. **关键要求**：${currentAct === 1 ? '这是开篇，请设定宏大的视角与悬念。' : `这是剧情的深入，请基于「前一幕回顾」的内容，引导编剧将冲突升级。`}
5. 格式：【启发指令】[指令内容]

请直接输出指令内容，不要有任何开场白。
  `;

  try {
    const response = await generateContent('DEEPSEEK', systemPrompt, userPrompt);
    return response || "【自动启发】信号同步失败，请手动输入指令。";
  } catch (err) {
    console.error("Pacing analysis failed:", err);
    return "【自动启发】由于网络不稳定，分析仪暂时下线。";
  }
}

function extractVisualTags(text: string) {
  // 匹配中括号内的内容，且不限于大写，更加宽容
  const match = text.match(/\[(.*?)\]/);
  if (match) return { tag: match[1].trim() };
  
  // 如果没找到中括号，尝试提取前 10 个字符作为语义种子
  return { tag: 'SCENE_AUTO_GEN' };
}

function extractAudioTags(text: string) {
  const match = text.match(/\[(.*?)\]/);
  return { tags: match ? match[1].trim() : 'BPM:120, Genre:Ambient, Mood:Ethereal' };
}
