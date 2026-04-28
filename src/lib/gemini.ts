/**
 * AI integratsiyasi (AI Studio uslubidagi barqaror versiya)
 */

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

// AI Studio-da ishlaydigan v1beta versiyasi va model
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callGemini(payload: any) {
  if (!GEMINI_KEY) throw new Error("Gemini Key topilmadi.");
  const resp = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Gemini: ${data.error?.message || resp.statusText}`);
  return data.candidates[0].content.parts[0].text;
}

async function callGroq(messages: any[], jsonMode = false) {
  if (!GROQ_KEY) throw new Error("Groq Key topilmadi.");
  const resp = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages,
      response_format: jsonMode ? { type: "json_object" } : undefined
    })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Groq: ${data.error?.message || resp.statusText}`);
  return data.choices[0].message.content;
}

async function smartAIRequest(prompt: string, jsonMode = false, chatHistory: any[] = []) {
  let geminiErr = "";
  try {
    const contents = chatHistory.length > 0 ? chatHistory : [{ parts: [{ text: prompt }] }];
    return await callGemini({ 
      contents,
      generationConfig: { 
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
        responseMimeType: jsonMode ? "application/json" : "text/plain"
      }
    });
  } catch (e: any) {
    geminiErr = e.message;
    console.warn("Gemini Error, trying Groq...", geminiErr);
    const messages = chatHistory.length > 0 
      ? chatHistory.map(h => ({ role: h.role === "user" ? "user" : "assistant", content: h.parts[0].text }))
      : [{ role: "user", content: prompt }];
    if (jsonMode) messages.unshift({ role: "system", content: "Siz faqat JSON qaytaradigan yordamchisiz." });
    return await callGroq(messages, jsonMode).catch(ge => {
      throw new Error(`Gemini: ${geminiErr} | Groq: ${ge.message}`);
    });
  }
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

/**
 * Gemini yordamida sifatli rasm prompti yaratish va rasm generatsiya qilish
 */
export async function generateEducationalImage(prompt: string) {
  try {
    // 1. Gemini orqali rasmni mukammallashtiramiz
    const improvedPrompt = await callGemini({
      contents: [{ parts: [{ text: `Create a detailed English image prompt for: "${prompt}". Focus on educational, high quality, realistic details. Output only the prompt text.` }] }]
    }).catch(() => prompt);
    
    // 2. Pollinations-ga yuboramiz
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(improvedPrompt)}?width=1024&height=1024&nologo=true&seed=${Math.random()}`;
  } catch (e) {
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.random()}`;
  }
}

export async function generateEducationalTests(topic: string, difficulty: string, count: number = 10): Promise<TestData[]> {
  const prompt = `Create ${count} tests on "${topic}" (${difficulty}) in JSON: {"tests": [{"question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "..."}]}. Uzbek language.`;
  const text = await smartAIRequest(prompt, true);
  const data = JSON.parse(text);
  return data.tests || data;
}

export async function generateEducationalSlides(topic: string): Promise<SlideData[]> {
  const prompt = `Create 10 slides on "${topic}" in JSON: {"slides": [{"title": "...", "content": "markdown points", "speakerNotes": "..."}]}. Add img: ![img](https://image.pollinations.ai/prompt/{keyword}?width=800&height=400). Uzbek language.`;
  const text = await smartAIRequest(prompt, true);
  const data = JSON.parse(text);
  return data.slides || data;
}

export async function analyzeTestResults(topic: string, difficulty: string, tests: TestData[], userAnswers: any): Promise<string> {
  const results = tests.map((t, i) => `Q: ${t.question}, Correct: ${t.correctAnswer}, User: ${userAnswers[i]}`).join("\n");
  return await smartAIRequest(`Analyze and advice in Uzbek for: ${topic}\n${results}`);
}
