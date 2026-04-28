/**
 * AI integratsiyasi (Gemini 1.5 Pro + Fallback)
 * Eng so'nggi va kuchli modelga o'tildi.
 */

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

// Gemini 1.5 Pro barqaror endpoint
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Gemini API
 */
async function callGemini(payload: any) {
  if (!GEMINI_KEY) throw new Error("Gemini Key topilmadi.");
  
  const resp = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`Gemini Xatosi: ${data.error?.message || resp.statusText}`);
  }
  
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error("Gemini javob qaytara olmadi.");
  }
  return data.candidates[0].content.parts[0].text;
}

/**
 * Groq API (Fallback)
 */
async function callGroq(messages: any[], jsonMode = false) {
  if (!GROQ_KEY) throw new Error("Groq Key topilmadi.");
  
  const resp = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages,
      response_format: jsonMode ? { type: "json_object" } : undefined
    })
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`Groq Xatosi: ${data.error?.message || resp.statusText}`);
  }
  
  return data.choices[0].message.content;
}

/**
 * Smart Fallback
 */
async function smartAIRequest(prompt: string, jsonMode = false, chatHistory: any[] = []) {
  let geminiError = "";

  // 1. Gemini 1.5 Pro
  try {
    const contents = chatHistory.length > 0 ? chatHistory : [{ parts: [{ text: prompt }] }];
    return await callGemini({ 
      contents,
      generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined
    });
  } catch (e: any) {
    console.error("Gemini failed:", e);
    geminiError = e.message;
  }

  // 2. Groq (Zaxira)
  try {
    const messages = chatHistory.length > 0 
      ? chatHistory.map(h => ({ role: h.role === "user" ? "user" : "assistant", content: h.parts[0].text }))
      : [{ role: "user", content: prompt }];
    
    if (jsonMode) messages.unshift({ role: "system", content: "Siz faqat JSON qaytaradigan yordamchisiz." });
    
    return await callGroq(messages, jsonMode);
  } catch (e: any) {
    console.error("Groq failed:", e);
    throw new Error(`Xatolik! Gemini Pro: ${geminiError} | Groq: ${e.message}`);
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

export async function generateEducationalImage(prompt: string) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent("educational, " + prompt)}?width=1024&height=1024&nologo=true&seed=${Math.random()}`;
}

export async function generateEducationalTests(topic: string, difficulty: string, count: number = 10): Promise<TestData[]> {
  const prompt = `Topic: "${topic}", Difficulty: "${difficulty}", Count: ${count}. Create tests in JSON: {"tests": [{"question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "..."}]}. Language: Uzbek.`;
  const text = await smartAIRequest(prompt, true);
  const data = JSON.parse(text);
  return data.tests || data;
}

export async function generateEducationalSlides(topic: string): Promise<SlideData[]> {
  const prompt = `Topic: "${topic}". Create 10 slides in JSON: {"slides": [{"title": "...", "content": "markdown points", "speakerNotes": "..."}]}. Add image link to content: ![img](https://image.pollinations.ai/prompt/{keyword}?width=800&height=400). Language: Uzbek.`;
  const text = await smartAIRequest(prompt, true);
  const data = JSON.parse(text);
  return data.slides || data;
}

export async function analyzeTestResults(topic: string, difficulty: string, tests: TestData[], userAnswers: any): Promise<string> {
  const results = tests.map((t, i) => `Q: ${t.question}, Correct: ${t.correctAnswer}, User: ${userAnswers[i]}`).join("\n");
  return await smartAIRequest(`Analyze results and give advice in Uzbek for: ${topic}\n${results}`);
}
