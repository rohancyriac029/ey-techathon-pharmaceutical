import axios, { AxiosError } from 'axios';
import { config } from '../config/env';

// Primary and fallback models
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface GeminiError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

// Simple delay function for retry
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function callGemini(prompt: string, systemInstructions?: string): Promise<string> {
  const contents = [];
  
  if (systemInstructions) {
    contents.push({
      role: 'user',
      parts: [{ text: systemInstructions }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Understood. I will follow these instructions.' }]
    });
  }
  
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  let lastError: Error | null = null;

  // Try each model with retry logic
  for (const model of GEMINI_MODELS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${config.geminiApiKey}`;
        
        const response = await axios.post<GeminiResponse>(
          url,
          {
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 second timeout
          }
        );

        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('No response text from Gemini');
        }
        return text;
      } catch (error) {
        const axiosError = error as AxiosError<GeminiError>;
        const status = axiosError.response?.status;
        const errorMessage = axiosError.response?.data?.error?.message || axiosError.message;
        
        console.warn(`Gemini API attempt ${attempt}/3 failed (${model}): ${status} - ${errorMessage}`);
        lastError = error as Error;
        
        // Rate limit - wait and retry
        if (status === 429) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
          console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
          await delay(waitTime);
          continue;
        }
        
        // Server error - retry with backoff
        if (status && status >= 500) {
          await delay(1000 * attempt);
          continue;
        }
        
        // Other errors (400, 401, 403, 404) - don't retry, try next model
        break;
      }
    }
  }
  
  // All models and retries failed
  console.error('All Gemini API attempts failed. Using fallback response.');
  throw lastError || new Error('Gemini API unavailable');
}

// Helper to extract JSON from Gemini response (handles markdown code blocks)
export function extractJson(text: string): string {
  // Try to extract JSON from code blocks first
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  
  // Try to find JSON object or array
  const objectMatch = text.match(/\{[\s\S]*\}/);
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  
  if (objectMatch) return objectMatch[0];
  if (arrayMatch) return arrayMatch[0];
  
  return text.trim();
}
