import { ChatMessage } from '../types';

let chatHistory: Array<{ role: 'user' | 'model'; text: string }> = [];

export const initializeChat = () => {
  chatHistory = [];
};

export const sendMessageToAI = async (message: string): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history: chatHistory,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with status ${response.status}`);
    }

    const data = await response.json();
    const replyText = data.reply || "I didn't catch that. Could you rephrase?";

    // Update ongoing conversation history
    chatHistory.push({ role: 'user', text: message });
    chatHistory.push({ role: 'model', text: replyText });
    // Keep history manageable
    if (chatHistory.length > 20) {
      chatHistory = chatHistory.slice(-20);
    }

    return replyText;
  } catch (error) {
    console.error('Gemini API Error:', error);
    return 'Sorry, I encountered an error while communicating with the AI Tutor. Please try again.';
  }
};

export const executeCodeWithAI = async (language: string, code: string, stdin: string = ''): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/execute-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ language, code, stdin }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server error ${response.status}`);
    }

    const data = await response.json();
    return data.output || 'No output generated.';
  } catch (error) {
    console.error('Code Execution Error:', error);
    return 'Error executing code via AI simulation. Please try again.';
  }
};

export const translateContent = async (htmlContent: string, targetLanguage: string): Promise<string> => {
  try {
    const response = await fetch('/api/gemini/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ htmlContent, targetLanguage }),
    });

    if (!response.ok) {
      return htmlContent;
    }

    const data = await response.json();
    return data.translatedContent || htmlContent;
  } catch (error) {
    console.error('Translation Error:', error);
    return htmlContent;
  }
};
