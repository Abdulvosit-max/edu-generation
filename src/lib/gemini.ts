/**
 * AI integratsiyasi (Groq Cloud API orqali)
 * Gemini-dagi muammolar sababli Groq-ga o'tildi.
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

/**
 * Groq API so'rovi funksiyasi
 */
async function callGroqAPI(messages: any[], jsonMode = false) {
  if (!GROQ_API_KEY) {
    throw new Error("VITE_GROQ_API_KEY topilmadi. Vercel sozlamalarini tekshiring.");
  }

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: messages,
      response_format: jsonMode ? { type: "json_object" } : undefined,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errData = await response.json();
    console.error("Groq API Xatosi:", errData);
    throw new Error(errData.error?.message || "Groq API so'rovida xatolik yuz berdi.");
  }

  const data = await response.json();
  return data.choices[0].message.content;
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
  const messages = [
    { role: "system", content: "Sizning ismingiz Edu-Gen, ta'lim yordamchisiz. O'zbek tilida qisqa va foydali javob bering." },
    ...history.map(h => ({ role: h.role === "user" ? "user" : "assistant", content: h.text })),
    { role: "user", content: message }
  ];

  return await callGroqAPI(messages);
}

/**
 * Rasm generatsiya (Pollinations AI)
 */
export async function generateEducationalImage(prompt: string) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent("educational, " + prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;
}

/**
 * Test generatsiya
 */
export async function generateEducationalTests(topic: string, difficulty: string): Promise<TestData[]> {
  const prompt = `Quyidagi mavzu uchun 10 ta test savolini JSON formatda tayyorlang: "${topic}". 
  Qiyinchilik darajasi: "${difficulty}". 
  Format: {"tests": [{"question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "..."}]}
  O'zbek tilida bo'lsin. Faqat JSON qaytaring.`;

  const messages = [
    { role: "system", content: "Siz faqat JSON qaytaradigan yordamchisiz." },
    { role: "user", content: prompt }
  ];

  const text = await callGroqAPI(messages, true);
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

  const messages = [
    { role: "system", content: "Siz faqat JSON qaytaradigan yordamchisiz." },
    { role: "user", content: prompt }
  ];

  const text = await callGroqAPI(messages, true);
  const data = JSON.parse(text);
  return data.slides || data;
}

/**
 * Test tahlili
 */
export async function analyzeTestResults(topic: string, difficulty: string, tests: TestData[], userAnswers: any): Promise<string> {
  const results = tests.map((t, i) => `Savol: ${t.question}, To'g'ri: ${t.correctAnswer}, Tanlangan: ${userAnswers[i]}`).join("\n");
  const prompt = `Mavzu: ${topic}, Daraja: ${difficulty}. Test natijalari:\n${results}\nIltimos tahlil qiling va o'zbek tilida maslahatlar bering.`;

  const messages = [
    { role: "system", content: "Siz ta'lim tahlilchisisiz. O'zbek tilida markdown formatida javob bering." },
    { role: "user", content: prompt }
  ];

  return await callGroqAPI(messages);
}
