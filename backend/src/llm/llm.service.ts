import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LLMInteraction } from '@prisma/client';

export interface LLMResponse {
  text: string;
  tokensUsed?: number;
  model?: string;
}

@Injectable()
export class LlmService {
  private openai: OpenAI | null;
  private model: string = 'gpt-4o-mini'; 

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      console.warn('⚠️ OPENAI_API_KEY is not set. LLM features will not work.');
      this.openai = null;
    } else {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async generateExplanation(
    extractedText: string,
    context?: string
  ): Promise<LLMResponse> {
    if (!this.openai) {
      throw new Error(
        'OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.'
      );
    }

    const prompt = context
      ? `Based on the following extracted text from a document, provide a clear and comprehensive explanation. Context: ${context}\n\nExtracted text:\n${extractedText}`
      : `Based on the following extracted text from a document, provide a clear and comprehensive explanation. Identify key information, dates, amounts, parties involved, and any important details.\n\nExtracted text:\n${extractedText}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that explains documents clearly and concisely. Focus on extracting and explaining the key information.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content || '';
      const tokensUsed = completion.usage?.total_tokens;

      return {
        text: response,
        tokensUsed,
        model: this.model,
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = error && typeof error === 'object' && 'response' in error 
        ? JSON.stringify((error as any).response) 
        : '';
      console.error('Error details:', errorDetails);
      throw new Error(
        `LLM explanation failed: ${errorMessage}`
      );
    }
  }

  async answerQuery(
    extractedText: string,
    query: string,
    previousInteractions: LLMInteraction[] = []
  ): Promise<LLMResponse> {
    if (!this.openai) {
      throw new Error(
        'OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.'
      );
    }

    // Build context from previous interactions
    let contextMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (previousInteractions.length > 0) {
      contextMessages = previousInteractions
        .reverse()
        .map((interaction) => [
          {
            role: 'user' as const,
            content: interaction.prompt,
          },
          {
            role: 'assistant' as const,
            content: interaction.response,
          },
        ])
        .flat();
    }

    const prompt = `Based on the following extracted text from a document, answer the user's question. If the information is not available in the text, say so clearly.\n\nExtracted text:\n${extractedText}\n\nUser question: ${query}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that answers questions about documents. Use only the information provided in the extracted text. If information is not available, say so.',
          },
          ...contextMessages,
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content || '';
      const tokensUsed = completion.usage?.total_tokens;

      return {
        text: response,
        tokensUsed,
        model: this.model,
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = error && typeof error === 'object' && 'response' in error 
        ? JSON.stringify((error as any).response) 
        : '';
      console.error('Error details:', errorDetails);
      throw new Error(
        `LLM query failed: ${errorMessage}`
      );
    }
  }
}
