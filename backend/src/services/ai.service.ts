import OpenAI from 'openai';
import { env } from '../config/env';

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function isAiConfigured(): boolean {
  return !!env.deepseekApiKey && env.deepseekApiKey !== 'sk-your-deepseek-key';
}

export async function aiChat(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  if (!isAiConfigured()) {
    throw new Error('未配置 AI API Key，请在 .env 中设置 DEEPSEEK_API_KEY');
  }

  const client = new OpenAI({
    apiKey: env.deepseekApiKey,
    baseURL: env.deepseekBaseUrl,
  });

  const response = await client.chat.completions.create({
    model: env.deepseekModel,
    max_tokens: options?.maxTokens || 4096,
    temperature: options?.temperature || 0.3,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  return response.choices[0]?.message?.content || '';
}
