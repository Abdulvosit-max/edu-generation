/**
 * AI integratsiyasi (Gemini + Groq Fallback tizimi)
 * Avval Gemini-ga murojaat qiladi, xatolik bo'lsa Groq-ga o'tadi.
 */

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Gemini API-ga so'rov yuborish
 */
async function callGemini(payload: any) {
  if (!GEMINI_KEY) throw new Error("Gemini Key topilmadi");
  const resp = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) throw new Error("Gemini xatosi");
  const data = await resp.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * Groq API-ga so'rov yuborish
 */
async function callGroq(messages: any[], jsonMode = false) {
  if (!GROQ_KEY) throw new Error("Groq Key topilmadi");
  const resp = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      response_format: jsonMode ? { type: "json_object" } : undefined
    })
  });
  if (!resp.ok) throw new Error("Groq xatosi");
  const data = await resp.json();
  return data.choices[0].message.content;
}

/**
 * Smart Fallback AI so'rovi
 */
async function smartAIRequest(prompt: string, jsonMode = false, chatHistory: any[] = []) {
  // 1. Avval Gemini-da urinib ko'ramiz
  try {
    console.log("Gemini-ga so'rov yuborilmoqda...");
    const contents = chatHistory.length > 0 ? chatHistory : [{ parts: [{ text: prompt }] }];
    return await callGemini({ 
      contents,
      generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined
    });
  } catch (e) {
    console.warn("Gemini ishlamadi, Groq-ga o'tilmoqda...", e);
    
    // 2. Agar Gemini ishlamasa, Groq-da urinib ko'ramiz
    const messages = chatHistory.length > 0 
      ? chatHistory.map(h => ({ role: h.role === "user" ? "user" : "assistant", content: h.parts[0].text }))
      : [{ role: "user", content: prompt }];
    
    if (jsonMode) messages.unshift({ role: "system", content: "Siz faqat JSON qaytaradigan yordamchisiz." } as any);
    
    return await callGroq(messages, jsonMode);
  }
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
  const chatHistory = [
    { role: "user", parts: [{ text: "Sizning ismingiz Edu-Gen, ta'lim yordamchisiz. O'zbek tilida javob bering." }] },
    ...history.map(h => ({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text }] })),
    { role: "user", parts: [{ text: message }] }
  ];
  return await smartAIRequest(message, false, chatHistory);
}

/**
 * Rasm generatsiya (Pollinations AI)
 */
export async function generateEducationalImage(prompt: string) {
  // Pollinations barqaror va bepul
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

  const text = await smartAIRequest(prompt, true);
  const data = JSON.parse(text);
  return data.tests || data;
}

/**
 * Slayd generatsiya
 */
export async function generateEducationalSlides(topic: string): Promise<SlideData[]> {
  const prompt = `Quyidagi mavzu uchun 12 ta slayd tayyorlang: "${topic}". 
  Format: {"slides": [{"title": "...", "content": "markdown formatda punktlar", "speakerNotes": "..."}]}
  Har bir slayd kontenti oxiriga rasm linki qo'shing: ![img](https://image.pollinations.ai/prompt/{topic_keyword}?width=800&height=400)
  O'zbek tilida bo'lsin. Faqat JSON qaytaring.`;

  const text = await smartAIRequest(prompt, true);
  const data = JSON.parse(text);
  return data.slides || data;
}

/**
 * Test tahlili
 */
export async function analyzeTestResults(topic: string, difficulty: string, tests: TestData[], userAnswers: any): Promise<string> {
  const results = tests.map((t, i) => `Savol: ${t.question}, To'g'ri: ${t.correctAnswer}, Tanlangan: ${userAnswers[i]}`).join("\n");
  const prompt = `Mavzu: ${topic}, Daraja: ${difficulty}. Test natijalari:\n${results}\nIltimos tahlil qiling va o'zbek tilida maslahatlar bering.`;
  return await smartAIRequest(prompt);
}
