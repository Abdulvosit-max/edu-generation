// Google Gemini AI integratsiyasi
// Barcha AI generatsiya funksiyalari shu faylda

import { GoogleGenAI, Type } from "@google/genai";

// Singleton pattern — bitta AI client instansiyasi
let aiClient: GoogleGenAI | null = null;

/**
 * Gemini AI client ni qaytaradi.
 * Birinchi marta chaqirilganda yaratiladi (lazy initialization).
 * GEMINI_API_KEY vite.config.ts orqali process.env ga inject qilinadi.
 */
export function getGemini() {
  if (!aiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY sozlanmagan. .env.local faylini tekshiring.");
    }
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// Slayd ma'lumotlari interfeysi
export interface SlideData {
  title: string;        // Slayd sarlavhasi
  content: string;      // Slayd asosiy matni (markdown formatida)
  speakerNotes: string; // So'zlovchi uchun izohlar
}

/**
 * Ta'limiy suhbat javobini generatsiya qiladi.
 * Ko'p turli suhbat tarixini saqlash uchun xabarlar ketma-ketligi uzatilib,
 * to'liq matn sifatida Gemini ga yuboriladi.
 *
 * @param history  - Oldingi suhbat xabarlari
 * @param message  - Yangi foydalanuvchi xabari
 * @returns AI javob matni
 */
export async function generateEducationalChat(
  history: { role: "user" | "model"; text: string }[],
  message: string
) {
  const ai = getGemini();

  // Suhbat tarixini matn ko'rinishiga o'tkazish
  const historyText = history
    .map(h => `${h.role === "user" ? "Foydalanuvchi" : "Edu-Gen"}: ${h.text}`)
    .join("\n\n");
  const fullPrompt = historyText
    ? `${historyText}\n\nFoydalanuvchi: ${message}`
    : `Foydalanuvchi: ${message}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: fullPrompt,
    config: {
      systemInstruction:
        "Siz ta'limga ixtisoslashgan yordamchisiz (Sizning ismingiz Edu-Gen). " +
        "Foydalanuvchilarga do'stona va foydali ma'lumotlar bilan o'zbek tilida yordam bering. " +
        "Siz faqat javobni o'zini qaytaring.",
    },
  });

  return response.text || "Kechirasiz, xatolik yuz berdi.";
}

/**
 * Ta'limiy rasm generatsiya qiladi.
 * Foydalanuvchi so'roviga asoslanib yuqori sifatli ta'lim rasmi yaratadi.
 *
 * @param prompt - Rasm tavsifi (o'zbek yoki ingliz tilida)
 * @returns Base64 formatida JPEG rasm (data URL)
 */
export async function generateEducationalImage(prompt: string) {
  const ai = getGemini();

  // So'rovni ta'lim konteksti uchun kengaytirish
  const enhancedPrompt = `Educational context, high quality, flat vector illustration or 3D render style, clean background: ${prompt}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp-image-generation",
    contents: { parts: [{ text: enhancedPrompt }] },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      },
    },
  });

  // Javobdan inline rasm ma'lumotlarini ajratib olish
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/jpeg;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Rasm yaratilmadi. Yana urinib ko'ring.");
}

// Test savoli ma'lumotlari interfeysi
export interface TestData {
  question: string;      // Savol matni
  options: string[];     // 4 ta variant
  correctAnswer: string; // To'g'ri javob matni
}

/**
 * Ta'limiy test savollarini generatsiya qiladi.
 * Structured output (JSON schema) yordamida aniq formatda 10 ta savol yaratadi.
 *
 * @param topic      - Test mavzusi
 * @param difficulty - Qiyinchilik darajasi: "easy" | "medium" | "hard"
 * @returns TestData massivi
 */
export async function generateEducationalTests(
  topic: string,
  difficulty: string
): Promise<TestData[]> {
  const ai = getGemini();

  const response = await ai.models.generateContent({
    model: "gemini-1.5-pro",
    contents: `Quyidagi mavzu uchun 10 ta test savolini tayyorlang: "${topic}". Qiyinchilik darajasi: "${difficulty}". Har bir savol 4 ta variantdan iborat bo'lsin va to'g'ri javobni alohida ajratib ko'rsating. Barcha o'zbek tilida bo'lsin.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question:      { type: Type.STRING, description: "Test savoli" },
            options:       { type: Type.ARRAY, items: { type: Type.STRING }, description: "4 ta variant (faqat matn, harf belgisisiz)" },
            correctAnswer: { type: Type.STRING, description: "To'g'ri variant matni" },
          },
          required: ["question", "options", "correctAnswer"],
        },
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Javob bo'sh keldi.");
  return JSON.parse(text) as TestData[];
}

/**
 * Ta'limiy taqdimot slaydlarini generatsiya qiladi.
 * 12 ta slayd, markdown content va so'zlovchi izohlari bilan.
 * Har bir slaydda Pollinations.ai orqali rasm ham qo'shiladi.
 *
 * @param topic - Taqdimot mavzusi
 * @returns SlideData massivi (12 ta)
 */
export async function generateEducationalSlides(
  topic: string
): Promise<SlideData[]> {
  const ai = getGemini();

  const response = await ai.models.generateContent({
    model: "gemini-1.5-pro",
    contents: `Quyidagi mavzu uchun 12 ta slayd tayyorlang: "${topic}". Har bir slaydning sarlavhasi, qisqacha mazmuni (tafsilotli kontent, markdown formatida) va so'zlovchi uchun izohlari bo'lsin.
Bundan tashqari, har bir slaydning mazmuni vizual jozibador bo'lishi uchun quyidagi formatda har bir slayd matnining oxirida bitta rasm qo'shing:
![tavsif](https://image.pollinations.ai/prompt/{mavzuga_oid_inglizcha_kalit_soz}?width=800&height=400&nologo=true)
Barcha ma'lumotlar o'zbek tilida bo'lsin va aynan 12 ta qismdan iborat bo'lsin.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title:        { type: Type.STRING, description: "Slayd sarlavhasi" },
            content:      { type: Type.STRING, description: "Slaydning asosiy qismi (markdown formatida punktlar)" },
            speakerNotes: { type: Type.STRING, description: "So'zlovchi uchun qo'shimcha ma'lumotlar" },
          },
          required: ["title", "content", "speakerNotes"],
        },
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Javob bo'sh keldi.");
  return JSON.parse(text) as SlideData[];
}

/**
 * Foydalanuvchi test natijalarini AI yordamida tahlil qiladi.
 * 100 ballik tizimda reyting beradi va qaysi mavzularda kamchilik borligini ko'rsatadi.
 *
 * @param topic       - Test mavzusi
 * @param difficulty  - Qiyinchilik darajasi
 * @param tests       - Test savollari
 * @param userAnswers - Foydalanuvchi javoblari (savol indeksi → tanlangan variant)
 * @returns Markdown formatida tahlil matni
 */
export async function analyzeTestResults(
  topic: string,
  difficulty: string,
  tests: TestData[],
  userAnswers: Record<number, string>
): Promise<string> {
  const ai = getGemini();

  // Natijalarni matn ko'rinishiga o'tkazish
  const historyText = tests
    .map((t, i) => {
      const userAns = userAnswers[i] || "Javob berilmagan";
      return `${i + 1}. Savol: ${t.question}\nTo'g'ri javob: ${t.correctAnswer}\nFoydalanuvchi javobi: ${userAns}`;
    })
    .join("\n\n");

  const prompt = `Foydalanuvchi quyidagi mavzuda test ishladi: "${topic}" (${difficulty} daraja).\n\nNatijalar:\n${historyText}\n\nIltimos, foydalanuvchining natijasini tahlil qiling. 100 ballik tizimda reyting bering va qaysi mavzularda oqsayotganini yoki qanday yutuqlarga erishganini tushuntiring. Xatolarini to'g'rilash uchun qisqacha maslahat bering. Tahlil faqat o'zbek tilida (Markdown formatida) bo'lsin.`;

  const response = await ai.models.generateContent({
    model: "gemini-1.5-pro",
    contents: prompt,
  });

  return response.text || "Kechirasiz, tahlil qilib bo'lmadi.";
}
