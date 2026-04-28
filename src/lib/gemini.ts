/**
 * Gemini AI integratsiyasi (To'g'ridan-to'g'ri API so'rovlari orqali)
 * SDK-lardagi muammolarni chetlab o'tish uchun fetch usulidan foydalaniladi.
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Umumiy Gemini API so'rovi funksiyasi
 */
async function callGeminiAPI(model: string, payload: any) {
  if (!API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY topilmadi. Vercel sozlamalarini tekshiring.");
  }

  const response = await fetch(`${BASE_URL}/${model}:generateContent?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json();
    console.error("Gemini API Xatosi:", errData);
    throw new Error(errData.error?.message || "API so'rovida xatolik yuz berdi.");
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
  const historyText = history
    .map(h => `${h.role === "user" ? "Foydalanuvchi" : "Edu-Gen"}: ${h.text}`)
    .join("\n\n");
  
  const prompt = historyText 
    ? `${historyText}\n\nFoydalanuvchi: ${message}`
    : `Sizning ismingiz Edu-Gen, ta'lim yordamchisiz. O'zbek tilida javob bering.\n\nFoydalanuvchi: ${message}`;

  const data = await callGeminiAPI("gemini-1.5-flash", {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    }
  });

  return data.candidates[0].content.parts[0].text;
}

/**
 * Rasm generatsiya (Pollinations orqali zaxira usuli)
 * Gemini rasm yaratishda ba'zi hududlarda muammo berishi mumkin, 
 * shuning uchun Pollinations ishonchliroq.
 */
export async function generateEducationalImage(prompt: string) {
  // Pollinations AI - bepul va tezkor rasm generatsiya
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent("educational, " + prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;
  return imageUrl;
}

/**
 * Test generatsiya
 */
export async function generateEducationalTests(topic: string, difficulty: string): Promise<TestData[]> {
  const prompt = `Quyidagi mavzu uchun 10 ta test savolini JSON formatda tayyorlang: "${topic}". 
  Qiyinchilik darajasi: "${difficulty}". 
  Format: [{"question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "..."}]
  Faqat JSON qaytaring, boshqa matn kerak emas. O'zbek tilida bo'lsin.`;

  const data = await callGeminiAPI("gemini-1.5-flash", {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  });

  const text = data.candidates[0].content.parts[0].text;
  return JSON.parse(text);
}

/**
 * Slayd generatsiya
 */
export async function generateEducationalSlides(topic: string): Promise<SlideData[]> {
  const prompt = `Quyidagi mavzu uchun 12 ta slayd tayyorlang: "${topic}". 
  JSON formatda: [{"title": "...", "content": "markdown formatda punktlar", "speakerNotes": "..."}]
  Har bir slayd oxiriga rasm linki qo'shing: ![img](https://image.pollinations.ai/prompt/{topic_keyword}?width=800&height=400)
  Faqat JSON qaytaring. O'zbek tilida bo'lsin.`;

  const data = await callGeminiAPI("gemini-1.5-flash", {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" }
  });

  const text = data.candidates[0].content.parts[0].text;
  return JSON.parse(text);
}

/**
 * Test tahlili
 */
export async function analyzeTestResults(topic: string, difficulty: string, tests: TestData[], userAnswers: any): Promise<string> {
  const results = tests.map((t, i) => `Savol: ${t.question}, To'g'ri: ${t.correctAnswer}, Tanlangan: ${userAnswers[i]}`).join("\n");
  const prompt = `Mavzu: ${topic}, Daraja: ${difficulty}. Test natijalari:\n${results}\nIltimos tahlil qiling va o'zbek tilida maslahatlar bering.`;

  const data = await callGeminiAPI("gemini-1.5-flash", {
    contents: [{ parts: [{ text: prompt }] }]
  });

  return data.candidates[0].content.parts[0].text;
}
