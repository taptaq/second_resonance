/// <reference types="vite/client" />

export type ProviderType = 'DEEPSEEK' | 'MINIMAX' | 'QWEN';

async function fetchWithRetry(url: string, options: any, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      // 只有 5xx 错误或网络超时才重试
      if (res.status < 500 && res.status !== 429) return res; 
    } catch (err: any) {
      if (i === retries) throw err;
    }
    if (i < retries) {
      console.warn(`[LLM] Retrying fetch... (${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return fetch(url, options); // 最后一次尝试
}

export async function generateContent(
  provider: ProviderType, 
  systemPrompt: string, 
  userPrompt: string,
  isFallback = false
): Promise<string> {
  let url = '';
  let apiKey = '';
  let modelName = '';
  
  if (provider === 'DEEPSEEK') {
    url = 'https://api.deepseek.com/chat/completions';
    apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY || '';
    modelName = 'deepseek-chat';
  } else if (provider === 'MINIMAX') {
    url = 'https://api.minimax.io/v1/text/chatcompletion_v2';
    apiKey = import.meta.env.VITE_MINIMAX_API_KEY || '';
    modelName = 'MiniMax-M2.5-highspeed';
  } else if (provider === 'QWEN') {
    url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    apiKey = import.meta.env.VITE_QWEN_API_KEY || '';
    modelName = 'qwen-plus';
  }

  if (!apiKey) {
    console.error(`[${provider}] API KEY is missing.`);
    if (!isFallback && provider !== 'DEEPSEEK') {
      return generateContent('DEEPSEEK', systemPrompt, userPrompt, true);
    }
    return `[ERROR: Missing ${provider}_API_KEY]`;
  }

  try {
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1024
      })
    }, 2);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API returned ${res.status}: ${errText}`);
    }

    const json = await res.json();
    return json.choices?.[0]?.message?.content || '';
  } catch (error: any) {
    console.error(`${provider} API Final Error:`, error);
    
    // 如果不是 Fallback 且不是 DeepSeek 本身失败，则尝试回退到 DeepSeek
    if (!isFallback && provider !== 'DEEPSEEK') {
      console.warn(`[${provider}] 链路中断，正在紧急切换至 DEEPSEEK 备用信道...`);
      return generateContent('DEEPSEEK', systemPrompt, userPrompt, true);
    }
    
    return `[CONNECTION ERROR -> ${provider} CLUSTER OFFLINE]`;
  }
}
