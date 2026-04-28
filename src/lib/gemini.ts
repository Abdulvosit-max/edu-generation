/**
 * AI integratsiyasi (Gemini API orqali - Fetch usuli)
 * Groq-dagi muammolar sababli Gemini-ga qaytildi.
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-1.5-flash";

/**
 * Umumiy Gemini API so'rovi funksiyasi
 */
async function callGeminiAPI(payload: any) {
  if (!API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY topilmadi. Vercel sozlamalarini tekshiring.");
  }

  const response = await fetch(`${BASE_URL}/${MODEL}:generateContent?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json();
    console.error("Gemini API Xatosi:", errData);
    throw new Error(errData.error?.message || "Gemini API so'rovida xatolik yuz berdi.");
  }

  return await response.json();
}

export interface SlideData {
  title: string;
  content: string;
  speakerNotes: string;
}

export interface TestData {
  question: string;
  options: string[];
  correctAnswer: string;
}

/**
 * Chat funksiyasi
 */
export async function generateEducationalChat(history: any[], message: string) {
  const contents = [
    { role: "user", parts: [{ text: "Sizning ismingiz Edu-Gen, ta'lim yordamchisiz. O'zbek tilida qisqa va foydali javob bering." }] },
    { role: "model", parts: [{ text: "Tushunarlu, men Edu-Gen yordamchisiman. Sizga qanday yordam bera olaman?" }] },
    ...history.map(h => ({
      role: h.role === "user" ? "user" : "model",
      parts: [{ text: h.text }]
    })),
    { role: "user", parts: [{ text: message }] }
  ];

  const data = await callGeminiAPI({ contents });
  return data.candidates[0].content.parts[0].text;
}

/**
 * Rasm generatsiya (Pollinations AI)
 */
export async function generateEducationalImage(prompt: string) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent("educational, high quality, " + prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;
}

/**
 * Test generatsiya
 */
export async function generateEducationalTests(topic: string, difficulty: string, count: number = 10): Promise<TestData[]> {
  const prompt = `Quyidagi mavzu uchun ${count} ta test savolini JSON formatda tayyorlang: "${topic}". 
  Qiyinchilik darajasi: "${difficulty}". 
  Format: {"tests": [{"question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "..."}]}
  O'zbek tilida bo'lsin. Faqat JSON qaytaring.`;

  const data = await callGeminiAPI({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  });

  const text = data.candidates[0].content.parts[0].text;
  const parsed = JSON.parse(text);
  return parsed.tests || parsed;
}

/**
 * Slayd generatsiya
 */
export async function generateEducationalSlides(topic: string): Promise<SlideData[]> {
  const prompt = `Quyidagi mavzu uchun 12 ta slayd tayyorlang: "${topic}". 
  Format: {"slides": [{"title": "...", "content": "markdown formatda punktlar", "speakerNotes": "..."}]}
  Har bir slayd kontenti oxiriga rasm linki qo'shing: ![img](https://image.pollinations.ai/prompt/{topic_keyword}?width=800&height=400)
  O'zbek tilida bo'lsin. Faqat JSON qaytaring.`;

  const data = await callGeminiAPI({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  });

  const text = data.candidates[0].content.parts[0].text;
  const parsed = JSON.parse(text);
  return parsed.slides || parsed;
}

/**
 * Test tahlili
 */
export async function analyzeTestResults(topic: string, difficulty: string, tests: TestData[], userAnswers: any): Promise<string> {
  const results = tests.map((t, i) => `Savol: ${t.question}, To'g'ri: ${t.correctAnswer}, Tanlangan: ${userAnswers[i]}`).join("\n");
  const prompt = `Mavzu: ${topic}, Daraja: ${difficulty}. Test natijalari:\n${results}\nIltimos tahlil qiling va o'zbek tilida maslahatlar bering.`;

  const data = await callGeminiAPI({
    contents: [{ parts: [{ text: prompt }] }]
  });

  return data.candidates[0].content.parts[0].text;
}
