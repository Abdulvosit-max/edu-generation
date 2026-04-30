const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

// Eng ishonchli va tezkor modellar (2025)
const MODELS = [
  "gemini-2.0-flash",      // Eng tez va sifatli (15 req/min bepul)
  "gemini-2.0-flash-lite", // Yengil va tez
  "gemini-1.5-flash",      // Zaxira
  "gemini-1.5-pro",        // Murakkab vazifalar uchun
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
    generationConfig: jsonMode 
      ? { 
          responseMimeType: "application/json",
          temperature: 0.7,
          topP: 0.95,
        } 
      : {
          temperature: 0.8,
          topP: 0.95,
        },
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

  // Agar Gemini ishlamasa, Groq tizimiga o'tiladi (Fallback)
  try {
    const messages = isConversation
      ? (chatHistory as any[]).map(h => ({ role: h.role === "user" ? "user" : "assistant", content: h.parts[0].text }))
      : [{ role: "user", content: prompt }];
    if (jsonMode) messages.unshift({ role: "system", content: "Siz faqat JSON qaytaradigan, ta'lim sohasidagi mutaxassis yordamchisiz. Javoblaringiz aniq va sifatli bo'lishi shart." });

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
  colorScheme: string;
  layoutType: "text_icon" | "process_diagram" | "3d_illustration";
  iconName?: string;
  diagramSteps?: string[];
  imagePrompt?: string;
}

export interface TestData {
  question: string;
  options: string[];
  correctAnswer: string;
}

export async function generateEducationalChat(history: { role: string; text: string }[], message: string) {
  const chatHistory = [
    { role: "user", parts: [{ text: "Siz Edu-Gen yordamchisiz. O'zbek tilida ta'limga oid savollarga aniq, professional va ilmiy asoslangan javoblar bering. Agar savol ta'limga oid bo'lmasa ham muloyimlik bilan javob qaytaring." }] },
    ...history.map(h => ({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text }] })),
    { role: "user", parts: [{ text: message }] },
  ];
  return await smartAIRequest(message, false, chatHistory);
}

export async function generateEducationalImage(prompt: string) {
  try {
    const enhancedPrompt = await smartAIRequest(
      `Convert this educational image request into a highly detailed, photorealistic 8k English prompt. Focus on clarity, educational value, and cinematic lighting. Original request: "${prompt}". Return ONLY the English prompt text.`,
      false
    );

    const seed = Math.floor(Math.random() * 9999999);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt.trim() + ", professional educational photography, 8k, sharp focus, high quality")}?model=flux&width=1024&height=1024&seed=${seed}&nologo=true`;
  } catch (e) {
    const seed = Math.floor(Math.random() * 9999);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + ", educational, clear, professional high quality")}?model=turbo&width=1024&height=1024&nologo=true&seed=${seed}`;
  }
}

export async function generateEducationalTests(topic: string, difficulty: string, count = 10): Promise<TestData[]> {
  const prompt = `Siz ta'lim bo'yicha mutaxassis o'qituvchisiz. 
Mavzu: "${topic}", qiyinchilik darajasi: ${difficulty}. 
Vazifa: Ushbu mavzu bo'yicha aynan ${count} ta test savoli yarating. 
Har bir savolda 4 ta variant bo'lsin.
Javoblar va savollar o'zbek tilida bo'lishi shart.
Quyidagi JSON formatida qaytaring:
{"tests":[{"question":"Savol matni","options":["A variant","B variant","C variant","D variant"],"correctAnswer":"to'g'ri variant matni"}]}`;
  const text = await smartAIRequest(prompt, true);
  const data = JSON.parse(text);
  return data.tests || data;
}

export async function generateEducationalSlides(topic: string, theme: string): Promise<SlideData[]> {
  let themeInstruction = "";
  if (theme === "tech") {
    themeInstruction = "Foydalanuvchi 'Tech/Minimal' uslubini tanladi. Barcha 'colorScheme' lar uchun quyuq, sovuq ranglarni tanlang: 'blue', 'indigo', 'slate', 'zinc'.";
  } else if (theme === "edu") {
    themeInstruction = "Foydalanuvchi 'Edu/Bright' uslubini tanladi. 'colorScheme' lar uchun yorqin, iliq va jozibali pastel ranglarni tanlang: 'emerald', 'amber', 'rose', 'fuchsia', 'cyan'.";
  } else {
    themeInstruction = "Foydalanuvchi 'Corporate' uslubini tanladi. 'colorScheme' lar uchun rasmiy va jiddiy ranglarni tanlang: 'sky', 'gray', 'teal', 'navy'.";
  }

  const prompt = `Siz professional prezentatsiya dizaynerisiz.
Mavzu: "${topic}".
Vazifa: Ushbu mavzu bo'yicha 8-10 ta slayddan iborat dars ishlanmasi yarating.

Struktura:
1. Kirish
2. Asosiy tushunchalar
3. Amaliy misollar
4. Qiziqarli faktlar
5. Xulosa va savol-javob

Slaydlarning zerikarli bo'lmasligi uchun, har bir slayd uchun mos 'layoutType' (dizayn qolipi) tanlang. Layout turlari:
- "text_icon": Oddiy matn va bitta tushuntiruvchi icon. (Buning uchun 'iconName' da Lucide React ikonka nomini bering, masalan "Globe", "Brain", "Rocket").
- "process_diagram": Zanjir, jarayon yoki bosqichlarni tushuntirish uchun. (Buning uchun 'diagramSteps' ro'yxatida 3-4 ta qisqa qadam matnini bering).
- "3d_illustration": Murakkab vizual yoki chizmalarni ko'rsatish uchun. (Buning uchun 'imagePrompt' ga inglizcha 3D izometrik illustratsiya promptini yozing, masalan "3d isometric minimalist brain structure").

Har bir slayd uchun majburiy maydonlar:
- title: Slayd sarlavhasi (O'zbekcha)
- content: Qisqa va mazmunli bandlar (O'zbekcha, Markdown)
- speakerNotes: O'qituvchi uchun nutq matni
- layoutType: Yuqoridagi 3 tadan bittasi
- colorScheme: Slayd uchun bitta rang palitrasi nomi ("blue", "emerald", "rose", "amber", "indigo", "purple", "cyan", "sky")

Muhim Yo'riqnoma: ${themeInstruction}. layoutTypelarni aralashtirib foydalaning, hammasi bir xil bo'lib qolmasin.

Quyidagi JSON formatida qaytaring:
{"slides":[{"title":"...","content":"...","speakerNotes":"...","colorScheme":"...","layoutType":"text_icon|process_diagram|3d_illustration","iconName":"...","diagramSteps":["..."],"imagePrompt":"..."}]}`;
  
  const text = await smartAIRequest(prompt, true);
  const data = JSON.parse(text);
  return data.slides || data;
}

export async function analyzeTestResults(topic: string, difficulty: string, tests: TestData[], userAnswers: Record<number, string>): Promise<string> {
  const results = tests.map((t, i) => `Q: ${t.question} | To'g'ri: ${t.correctAnswer} | Javob: ${userAnswers[i] ?? "tanlanmadi"}`).join("\n");
  return await smartAIRequest(`Siz pedagogik psixolog va ustozsiz. O'zbek tilida test natijalarini chuqur tahlil qiling va talabaga qaysi mavzular ustida ishlash kerakligi bo'yicha motivatsion maslahat bering:\nMavzu: ${topic} (${difficulty})\n${results}`);
}
