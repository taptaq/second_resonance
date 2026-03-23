export type ProviderType = 'DEEPSEEK' | 'MINIMAX' | 'QWEN';

export async function generateContent(provider: ProviderType, systemPrompt: string, userPrompt: string): Promise<string> {
  let url = '';
  let apiKey = '';
  let modelName = '';
  
  if (provider === 'DEEPSEEK') {
    url = 'https://api.deepseek.com/chat/completions';
    apiKey = process.env.DEEPSEEK_API_KEY || '';
    modelName = 'deepseek-chat';
  } else if (provider === 'MINIMAX') {
    // Minimax provides an OpenAI-compatible v2 endpoint
    url = 'https://api.minimax.chat/v1/text/chatcompletion_v2';
    apiKey = process.env.MINIMAX_API_KEY || '';
    modelName = 'abab6.5s-chat';
  } else if (provider === 'QWEN') {
    // Aliyun DashScope OpenAI-compatible endpoint
    url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    apiKey = process.env.QWEN_API_KEY || '';
    modelName = 'qwen-plus';
  }

  if (!apiKey) {
    console.error(`[${provider}] API KEY is missing in environment variables.`);
    return `[ERROR: Missing ${provider}_API_KEY in .env.local]`;
  }

  try {
    const res = await fetch(url, {
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
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API returned ${res.status}: ${errText}`);
    }

    const json = await res.json();
    return json.choices?.[0]?.message?.content || '';
  } catch (error: any) {
    console.error(`${provider} API Error:`, error);
    return `[CONNECTION ERROR -> ${provider} CLUSTER OFFLINE]`;
  }
}
