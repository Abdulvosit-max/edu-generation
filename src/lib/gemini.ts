const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

const MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];

// Simple in-memory cache with 30-minute TTL
const cache = new Map<string, { result: string; expires: number }>();
const CACHE_TTL = 30 * 60 * 1000;

function getCacheKey(prompt: string, jsonMode: boolean) {
  return `${jsonMode ? "json:" : ""}${prompt}`;
}

async function callGemini(payload: any, modelName: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_KEY}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || "Error");
  return data.candidates[0].content.parts[0].text;
}

async function smartAIRequest(prompt: string, jsonMode = false, chatHistory: any[] = []) {
  const isConversation = chatHistory.length > 0;

  // Cache faqat oddiy (chat tarixsiz) so'rovlar uchun
  if (!isConversation) {
    const key = getCacheKey(prompt, jsonMode);
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }
  }

  const contents = isConversation ? chatHistory : [{ parts: [{ text: prompt }] }];
  const payload = {
    contents,
    generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined
  };

  let result: string | null = null;

  for (const model of MODELS) {
    try {
      result = await callGemini(payload, model);
      break;
    } catch {
      // keyingisiga o'tamiz
    }
  }

  if (!result) {
    try {
      const messages = isConversation
        ? chatHistory.map(h => ({ role: h.role === "user" ? "user" : "assistant", content: h.parts[0].text }))
        : [{ role: "user", content: prompt }];
      if (jsonMode) messages.unshift({ role: "system", content: "Siz faqat JSON qaytaradigan yordamchisiz." });

      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          response_format: jsonMode ? { type: "json_object" } : undefined
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error?.message || "Groq fail");
      result = data.choices[0].message.content;
    } catch (e: any) {
      throw new Error("Barcha AI tizimlari (Gemini va Groq) ishlamayapti. Iltimos API kalitlarni tekshiring.");
    }
  }

  if (!isConversation && result) {
    const key = getCacheKey(prompt, jsonMode);
    cache.set(key, { result, expires: Date.now() + CACHE_TTL });
  }

  return result!;
}

export interface SlideData { title: string; content: string; speakerNotes: string; }
export interface TestData { question: string; options: string[]; correctAnswer: string; }

export async function generateEducationalChat(history: any[], message: string) {
  const chatHistory = [
    { role: "user", parts: [{ text: "Siz Edu-Gen yordamchisiz. O'zbekcha javob bering." }] },
    ...history.map(h => ({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text }] })),
    { role: "user", parts: [{ text: message }] }
  ];
  return await smartAIRequest(message, false, chatHistory);
}

export async function generateEducationalImage(prompt: string) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent("educational, " + prompt)}?width=1024&height=1024&nologo=true&seed=${Math.random()}`;
}

export async function generateEducationalTests(topic: string, difficulty: string, count: number = 10): Promise<TestData[]> {
  const prompt = `Topic: "${topic}", JSON tests (${count}): {"tests": [{"question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "..."}]}. Uzbek.`;
  const text = await smartAIRequest(prompt, true);
  const data = JSON.parse(text);
  return data.tests || data;
}

export async function generateEducationalSlides(topic: string): Promise<SlideData[]> {
  const prompt = `Topic: "${topic}". JSON slides (10): {"slides": [{"title": "...", "content": "markdown", "speakerNotes": "..."}]}. Uzbek.`;
  const text = await smartAIRequest(prompt, true);
  const data = JSON.parse(text);
  return data.slides || data;
}

export async function analyzeTestResults(topic: string, difficulty: string, tests: TestData[], userAnswers: any): Promise<string> {
  const results = tests.map((t, i) => `Q: ${t.question}, Correct: ${t.correctAnswer}, User: ${userAnswers[i]}`).join("\n");
  return await smartAIRequest(`Analyze and advice in Uzbek: ${topic}\n${results}`);
}
