const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

// Eng ishonchli bepul modellardan boshlanadi (2025 free tier)
const MODELS = [
  "gemini-2.5-flash-lite", // 15 req/min, 1000/kun
  "gemini-2.5-flash",      // 10 req/min, 500/kun
  "gemini-2.5-pro",        // 5 req/min, 100/kun
  "gemini-1.5-flash",      // zaxira
];

const CACHE_TTL = 30 * 60 * 1000;
const cache = new Map<string, { result: string; expires: number }>();

function getCacheKey(prompt: string, jsonMode: boolean) {
  return `${jsonMode ? "json:" : ""}${prompt}`;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class RateLimitError extends Error {
  constructor() { super("rate_limit"); }
}

async function callGemini(payload: object, modelName: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_KEY}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = await resp.json();

    if (resp.status === 429) throw new RateLimitError();
    if (resp.status === 403) throw new Error("API kalit noto'g'ri yoki ruxsat yo'q.");
    if (!resp.ok) throw new Error(data.error?.message || `HTTP ${resp.status}`);

    return data.candidates[0].content.parts[0].text;
  } finally {
    clearTimeout(timeout);
  }
}

async function smartAIRequest(prompt: string, jsonMode = false, chatHistory: object[] = []): Promise<string> {
  const isConversation = chatHistory.length > 0;

  if (!isConversation) {
    const key = getCacheKey(prompt, jsonMode);
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.result;
  }

  const contents = isConversation ? chatHistory : [{ parts: [{ text: prompt }] }];
  const payload = {
    contents,
    generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined,
  };

  let lastError: Error | null = null;

  for (const model of MODELS) {
    try {
      const result = await callGemini(payload, model);
      if (!isConversation) {
        cache.set(getCacheKey(prompt, jsonMode), { result, expires: Date.now() + CACHE_TTL });
      }
      return result;
    } catch (e) {
      if (e instanceof RateLimitError) {
        // Rate limit: 2 soniya kutib qayta ur
        await sleep(2000);
        try {
          const result = await callGemini(payload, model);
          if (!isConversation) {
            cache.set(getCacheKey(prompt, jsonMode), { result, expires: Date.now() + CACHE_TTL });
          }
          return result;
        } catch (retryErr) {
          lastError = retryErr as Error;
        }
      } else {
        lastError = e as Error;
      }
    }
  }

  // Groq fallback
  try {
    const messages = isConversation
      ? (chatHistory as any[]).map(h => ({ role: h.role === "user" ? "user" : "assistant", content: h.parts[0].text }))
      : [{ role: "user", content: prompt }];
    if (jsonMode) messages.unshift({ role: "system", content: "Siz faqat JSON qaytaradigan yordamchisiz." });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          response_format: jsonMode ? { type: "json_object" } : undefined,
        }),
        signal: controller.signal,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error?.message || "Groq xatosi");
      const result = data.choices[0].message.content;
      if (!isConversation) {
        cache.set(getCacheKey(prompt, jsonMode), { result, expires: Date.now() + CACHE_TTL });
      }
      return result;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    const hint = lastError?.message?.includes("noto'g'ri")
      ? "API kalit noto'g'ri. aistudio.google.com dan yangi kalit oling."
      : "Barcha AI tizimlari vaqtincha ishlamayapti. Biroz kutib qayta urining.";
    throw new Error(hint);
  }
}

export interface SlideData {
  title: string;
  content: string;
  speakerNotes: string;
  imagePrompt: string;
}

export interface TestData {
  question: string;
  options: string[];
  correctAnswer: string;
}

export async function generateEducationalChat(history: { role: string; text: string }[], message: string) {
  const chatHistory = [
    { role: "user", parts: [{ text: "Siz Edu-Gen yordamchisiz. O'zbekcha javob bering." }] },
    ...history.map(h => ({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text }] })),
    { role: "user", parts: [{ text: message }] },
  ];
  return await smartAIRequest(message, false, chatHistory);
}

export async function generateEducationalImage(prompt: string) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent("educational, " + prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 9999)}`;
}

export async function generateEducationalTests(topic: string, difficulty: string, count = 10): Promise<TestData[]> {
  const prompt = `Topic: "${topic}", difficulty: ${difficulty}. Return JSON with exactly ${count} questions:
{"tests":[{"question":"...","options":["A","B","C","D"],"correctAnswer":"exact option text"}]}
All text must be in Uzbek language.`;
  const text = await smartAIRequest(prompt, true);
  const data = JSON.parse(text);
  return data.tests || data;
}

export async function generateEducationalSlides(topic: string): Promise<SlideData[]> {
  const prompt = `Topic: "${topic}". Return JSON with exactly 8 educational slides:
{"slides":[{"title":"...","content":"3-5 bullet points in markdown (- item)","speakerNotes":"...","imagePrompt":"educational illustration of [specific concept], colorful, realistic, high quality"}]}
IMPORTANT: title, content, speakerNotes must be in Uzbek. imagePrompt must be in English only.`;
  const text = await smartAIRequest(prompt, true);
  const data = JSON.parse(text);
  return data.slides || data;
}

export async function analyzeTestResults(topic: string, difficulty: string, tests: TestData[], userAnswers: Record<number, string>): Promise<string> {
  const results = tests.map((t, i) => `Q: ${t.question} | To'g'ri: ${t.correctAnswer} | Javob: ${userAnswers[i] ?? "tanlanmadi"}`).join("\n");
  return await smartAIRequest(`O'zbek tilida test natijalarini tahlil qil va maslahat ber:\nMavzu: ${topic} (${difficulty})\n${results}`);
}
