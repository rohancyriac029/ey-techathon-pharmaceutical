import axios from 'axios';
import { config } from '../config/env';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export async function callGemini(prompt: string, systemInstructions?: string): Promise<string> {
  try {
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

    const response = await axios.post<GeminiResponse>(
      `${GEMINI_API_URL}?key=${config.geminiApiKey}`,
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
      }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No response text from Gemini');
    }
    return text;
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
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
