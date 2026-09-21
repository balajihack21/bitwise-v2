import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy GoogleGenAI initialization
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// 1. BitBot Chat Route
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const ai = getAI();
    
    // Construct system instructions and conversation
    const systemInstruction = `You are "BitBot", the friendly and knowledgeable AI tutor for Bitwise Learning Hub. 
Your goal is to help students understand technology and computer science concepts simply and clearly.
- Be encouraging, concise, and patient.
- Use intuitive analogies to explain complex tech concepts.
- When explaining code, give clean, readable examples in Java, Python, C++, or JavaScript.
- If a student asks about course tracks, point them to the platform's structured DSA, Web Dev, and System Design tracks.
- If asked about certificates, explain that verified certificates can be checked on the Verify Certificate page.`;

    // Map conversation history if provided
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (Array.isArray(history)) {
      for (const h of history) {
        if (h.role && h.text) {
          contents.push({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }],
          });
        }
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || "I didn't catch that. Could you rephrase?";
    res.json({ reply });
  } catch (error: any) {
    console.error('Server Gemini Chat Error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate response from Gemini',
      reply: "Sorry, I encountered an issue connecting to the AI Tutor engine. Please check your connection or try again shortly."
    });
  }
});

// 2. Code Execution Assistant Route
app.post('/api/gemini/execute-code', async (req, res) => {
  try {
    const { language, code, stdin } = req.body;
    if (!code) {
      res.status(400).json({ error: 'Code is required' });
      return;
    }

    const ai = getAI();
    // If code already contains full instructions, use it; otherwise build structured prompt with STDIN
    const prompt = code.includes('Execute this') || code.includes('STDIN:')
      ? code
      : `You are a high-precision runtime execution and compiler engine for ${language || 'the given language'}.
Execute the following source code with the provided standard input (STDIN).

STDIN:
${stdin !== undefined && stdin !== null ? stdin : ''}

SOURCE CODE:
${code}

Rules:
1. Parse the STDIN input as given.
2. If there is a syntax or compilation error, output: COMPILE_ERROR: <error description>
3. If there is an uncaught runtime exception, output: RUNTIME_ERROR: <error description>
4. Otherwise, output ONLY the exact program output (stdout).
5. Do NOT include markdown fences, code blocks, or conversational notes.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
    });

    res.json({ output: response.text?.trim() || 'No output generated.' });
  } catch (error: any) {
    console.error('Server Gemini Execute Error:', error);
    res.status(500).json({ error: error.message || 'Code simulation failed' });
  }
});

// Start Server & Integrate Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bitwise Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
