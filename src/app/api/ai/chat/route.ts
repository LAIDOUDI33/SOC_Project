/**
 * AI Chat API Endpoint
 * 
 * Provides LLM chat interface for SOC analysts
 * POST /api/ai/chat - Send message and get response
 * GET  /api/ai/chat/history - Get conversation history
 * 
 * @version 1.0.0
 * @route /api/ai/chat
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOllamaClient } from '@/lib/ai/internal/ollama-client';

// In-memory conversation history (would use Redis in production)
const conversationHistory: Map<string, Array<{ role: string; content: string }>> = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId = 'default', systemPrompt, options } = body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    if (message.length > 10000) {
      return NextResponse.json(
        { error: 'Message too long (max 10000 characters)' },
        { status: 400 }
      );
    }

    // Get or create Ollama client
    let ollama;
    try {
      ollama = getOllamaClient();
    } catch (error) {
      return NextResponse.json(
        { error: 'AI service not available', details: 'Ollama not configured' },
        { status: 503 }
      );
    }

    // Check if Ollama is running
    const healthStatus = await ollama.healthCheck();
    if (!healthStatus.running) {
      return NextResponse.json(
        { error: 'AI service unavailable', details: 'Ollama server not running' },
        { status: 503 }
      );
    }

    // Get or initialize conversation history
    if (!conversationHistory.has(sessionId)) {
      conversationHistory.set(sessionId, []);
      
      // Add system prompt if provided
      if (systemPrompt) {
        conversationHistory.get(sessionId)?.push({
          role: 'system',
          content: systemPrompt
        });
      }
    }

    const history = conversationHistory.get(sessionId)!;

    // Add user message to history
    history.push({ role: 'user', content: message });

    // Build messages for API call (include recent history for context)
    const maxHistoryMessages = 20; // Keep last 10 exchanges
    const recentHistory = history.slice(-maxHistoryMessages);
    
    const apiMessages = recentHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }));

    // Call Ollama chat API
    const startTime = Date.now();
    
    try {
      const response = await ollama.chat(apiMessages, {
        stream: false,
        options: {
          temperature: options?.temperature || 0.1,
          numPredict: options?.maxTokens || 2048
        }
      });

      // Add assistant response to history
      history.push({ role: 'assistant', content: response.message.content });

      // Trim history if too long
      if (history.length > 100) {
        // Keep system message and last 98 messages
        const systemMsgs = history.filter(m => m.role === 'system');
        const otherMsgs = history.filter(m => m.role !== 'system').slice(-98);
        conversationHistory.set(sessionId, [...systemMsgs, ...otherMsgs]);
      }

      return NextResponse.json({
        success: true,
        data: {
          response: response.message.content,
          model: response.model,
          metadata: {
            processingTimeMs: Date.now() - startTime,
            tokensUsed: {
              prompt: response.promptEvalCount || 0,
              completion: response.evalCount || 0
            },
            sessionId,
            historyLength: history.length
          }
        }
      });

    } catch (ollamaError) {
      console.error('[AI Chat] Ollama error:', ollamaError);
      
      return NextResponse.json(
        { 
          error: 'Failed to generate response',
          details: ollamaError instanceof Error ? ollamaError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[AI Chat] Request error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId') || 'default';
    const limit = parseInt(searchParams.get('limit') || '50');

    const history = conversationHistory.get(sessionId) || [];
    const limitedHistory = history.slice(-limit);

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        messages: limitedHistory,
        totalMessages: history.length
      }
    });

  } catch (error) {
    console.error('[AI Chat] History fetch error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch conversation history' },
      { status: 500 }
    );
  }
}

// Export for testing
export { conversationHistory };
