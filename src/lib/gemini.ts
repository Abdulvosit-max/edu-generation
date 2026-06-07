// ============================================================
// gemini.ts — AI so'rovlari
// ============================================================
// Asosiy strategiya:
//   1. Avval backend proxy (/api/ai/generate/) orqali so'rov yuboriladi.
//      API kalitlari FAQAT server-side saqlanadi — frontend ko'rmaydi.
//   2. Agar backend mavjud bo'lmasa (lokal dev, oflayn) —
//      fallback sifatida foydalanuvchi o'z kalitini kiritgan bo'lsa ishlatiladi.
// ============================================================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// Foydalanuvchi o'z kalitini kiritgan bo'lsa (Account sahifasidan) yoki .env.local dan fallback
function getLocalGeminiKey(): string {
  try {
    return localStorage.getItem("edu_gen_custom_gemini_key") || 
           (import.meta.env.VITE_GEMINI_API_KEY as string) || "";
  } catch {
    return (import.meta.env.VITE_GEMINI_API_KEY as string) || "";
  }
}
function getLocalGroqKey(): string {
  try {
    return localStorage.getItem("edu_gen_custom_groq_key") || 
           (import.meta.env.VITE_GROQ_API_KEY as string) || "";
  } catch {
    return (import.meta.env.VITE_GROQ_API_KEY as string) || "";
  }
}

// Gemini model fallback tartibi (to'g'ridan chaqirganda)
const FALLBACK_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
];

const CACHE_TTL = 30 * 60 * 1000; // 30 daqiqa
const cache = new Map<string, { result: string; expires: number }>();

function getCacheKey(prompt: string, jsonMode: boolean) {
  return `${jsonMode ? "json:" : ""}${prompt.slice(0, 200)}`;
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

// ----------------------------------------------------------------
// Backend proxy orqali chaqiruv (asosiy yo'l)
// ----------------------------------------------------------------
async function callBackendProxy(
  prompt: string,
  jsonMode: boolean,
  chatHistory: object[]
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);

  try {
    const resp = await fetch(`${API_URL}/ai/generate/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        json_mode: jsonMode,
        chat_history: chatHistory,
      }),
      signal: controller.signal,
    });

    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.error || `Backend xatosi: HTTP ${resp.status}`);
    }

    return data.result as string;
  } finally {
    clearTimeout(timeout);
  }
}

// ----------------------------------------------------------------
// To'g'ridan Gemini API ga chaqiruv (fallback — foydalanuvchi kaliti bilan)
// ----------------------------------------------------------------
async function callGeminiDirect(
  payload: object,
  modelName: string,
  apiKey: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = await resp.json();

    if (resp.status === 429) throw new Error("rate_limit");
    if (resp.status === 403) throw new Error("API kalit noto'g'ri.");
    if (!resp.ok) throw new Error(data.error?.message || `HTTP ${resp.status}`);

    return data.candidates[0].content.parts[0].text;
  } finally {
    clearTimeout(timeout);
  }
}

// ----------------------------------------------------------------
// To'g'ridan Groq API ga chaqiruv (fallback — foydalanuvchi kaliti bilan)
// ----------------------------------------------------------------
async function callGroqDirect(
  messages: object[],
  jsonMode: boolean,
  apiKey: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        response_format: jsonMode ? { type: "json_object" } : undefined,
      }),
      signal: controller.signal,
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || "Groq xatosi");
    return data.choices[0].message.content;
  } finally {
    clearTimeout(timeout);
  }
}

// ----------------------------------------------------------------
// Asosiy so'rov funksiyasi
// ----------------------------------------------------------------
async function smartAIRequest(
  prompt: string,
  jsonMode = false,
  chatHistory: object[] = []
): Promise<string> {
  const isConversation = chatHistory.length > 0;

  // Kesh tekshiruvi (suhbat rejimida kesh ishlatilmaydi)
  if (!isConversation) {
    const key = getCacheKey(prompt, jsonMode);
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.result;
  }

  // -------------------------------------------------------
  // 1. Backend proxy orqali (kalit server-side — xavfsiz)
  // -------------------------------------------------------
  try {
    const result = await callBackendProxy(prompt, jsonMode, chatHistory);
    if (!isConversation) {
      cache.set(getCacheKey(prompt, jsonMode), {
        result,
        expires: Date.now() + CACHE_TTL,
      });
    }
    return result;
  } catch (proxyErr: any) {
    // Har qanday backend xatosida (ulanish xatosi, server kaliti yo'qligi) — foydalanuvchining local kaliti (VITE_GEMINI_API_KEY) orqali davom etamiz!
    console.warn("Backend proxy orqali AI so'rov yuborishda xatolik yuz berdi. Mahalliy kalit bilan urinib ko'rilmoqda...", proxyErr);
  }

  // -------------------------------------------------------
  // 2. Foydalanuvchining shaxsiy Gemini kaliti (fallback)
  // -------------------------------------------------------
  const localGeminiKey = getLocalGeminiKey();
  if (localGeminiKey) {
    const contents = isConversation
      ? chatHistory
      : [{ parts: [{ text: prompt }] }];
    const payload = {
      contents,
      generationConfig: jsonMode
        ? { responseMimeType: "application/json", temperature: 0.7, topP: 0.95 }
        : { temperature: 0.8, topP: 0.95 },
    };

    for (const model of FALLBACK_MODELS) {
      try {
        const result = await callGeminiDirect(payload, model, localGeminiKey);
        if (!isConversation) {
          cache.set(getCacheKey(prompt, jsonMode), {
            result,
            expires: Date.now() + CACHE_TTL,
          });
        }
        return result;
      } catch (e: any) {
        // Agar rate limit bo'lsa yoki kalit noto'g'ri bo'lsa, boshqa modellarni sinash ma'nosiz.
        // Darhol loopdan chiqib, Groq fallbackiga o'tamiz.
        if (e.message === "rate_limit" || e.message?.includes("quota") || e.message?.includes("key") || e.message?.includes("ruxsat")) {
          break;
        }
        continue;
      }
    }
  }

  // -------------------------------------------------------
  // 3. Foydalanuvchining shaxsiy Groq kaliti (oxirgi fallback)
  // -------------------------------------------------------
  const localGroqKey = getLocalGroqKey();
  if (localGroqKey) {
    const groqMessages = isConversation
      ? (chatHistory as any[]).map((h) => ({
          role: h.role === "user" ? "user" : "assistant",
          content: h.parts?.[0]?.text || "",
        }))
      : [{ role: "user", content: prompt }];

    if (jsonMode) {
      groqMessages.unshift({
        role: "system",
        content:
          "Siz faqat JSON qaytaradigan, ta'lim sohasidagi mutaxassis yordamchisiz.",
      });
    }

    try {
      const result = await callGroqDirect(groqMessages, jsonMode, localGroqKey);
      if (!isConversation) {
        cache.set(getCacheKey(prompt, jsonMode), {
          result,
          expires: Date.now() + CACHE_TTL,
        });
      }
      return result;
    } catch (e: any) {
      throw new Error(e.message || "Groq ham javob bermadi.");
    }
  }

  throw new Error(
    "AI xizmati mavjud emas. Backend serverga ulanib bo'lmadi. " +
    "Tarmoq aloqangizni tekshiring yoki Account sahifasidan o'z API kalitingizni kiriting."
  );
}

// ================================================================
// Eksport — barcha sahifalar tomonidan ishlatiladi
// ================================================================

export interface SlideData {
  title: string;
  content: string;
  speakerNotes: string;
  colorScheme: string;
  layoutType:
    | "intro_title"
    | "text_icon"
    | "process_diagram"
    | "3d_illustration"
    | "comparison"
    | "statistics_highlight";
  iconName?: string;
  diagramSteps?: string[];
  imagePrompt?: string;
  comparisonData?: {
    left: string[];
    right: string[];
    leftTitle: string;
    rightTitle: string;
  };
  statValue?: string;
  statDesc?: string;
}

export interface TestData {
  question: string;
  options: string[];
  correctAnswer: string;
}

export async function generateEducationalChat(
  history: { role: string; text: string }[],
  message: string
) {
  const chatHistory = [
    {
      role: "user",
      parts: [
        {
          text: "Siz Edu-Gen yordamchisiz. O'zbek tilida ta'limga oid savollarga aniq, professional va ilmiy asoslangan javoblar bering. Agar savol ta'limga oid bo'lmasa ham muloyimlik bilan javob qaytaring.",
        },
      ],
    },
    ...history.map((h) => ({
      role: h.role === "user" ? "user" : "model",
      parts: [{ text: h.text }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];
  return await smartAIRequest(message, false, chatHistory);
}

export async function generateEducationalImage(prompt: string, style = "", format = "") {
  try {
    const response = await fetch(`${API_URL}/ai/generate-image/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, style, format }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.image_url) {
        return data.image_url;
      }
    }
  } catch (err) {
    console.warn("Backend orqali tasvir yaratishda xato, frontend fallbackga o'tilmoqda:", err);
  }

  // Frontend Fallback to Pollinations AI
  try {
    const enhancedPrompt = await smartAIRequest(
      `Convert this educational image request into a highly detailed, photorealistic 8k English prompt. Focus on clarity, educational value, and cinematic lighting. Original request: "${prompt}". Return ONLY the English prompt text.`,
      false
    ).catch(() => prompt);

    const stylePrompt = style === "3D Render" ? ", isometric 3D render, minimalist cartoon style, vibrant colors" :
                        style === "Realistik" ? ", realistic photography, documentary educational style, highly detailed" :
                        style === "Infografik / Diagramma" ? ", educational infographic, labeled vector schematic, clear vector diagram" :
                        style === "Multfilm / Illyustratsiya" ? ", vibrant school book illustration, colorful drawing style" :
                        style === "Minimalizm" ? ", minimalist modern flat vector design, clean paths" : "";

    const seed = Math.floor(Math.random() * 9999999);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(
      enhancedPrompt.trim() + stylePrompt + ", professional educational photography, 8k, sharp focus, high quality"
    )}?model=flux&width=1024&height=1024&seed=${seed}&nologo=true`;
  } catch {
    const seed = Math.floor(Math.random() * 9999);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt + ", educational, clear, professional high quality"
    )}?model=flux&width=1024&height=1024&nologo=true&seed=${seed}`;
  }
}

export async function getSlideImageUrl(imagePrompt: string) {
  return await generateEducationalImage(imagePrompt, "3D Render", "1:1");
}


export async function generateEducationalTests(
  topic: string,
  difficulty: string,
  count = 10
): Promise<TestData[]> {
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

export async function generateEducationalSlides(
  topic: string,
  theme: string
): Promise<SlideData[]> {
  let themeInstruction = "";
  if (theme === "tech") {
    themeInstruction =
      "Foydalanuvchi 'Tech/Minimal' uslubini tanladi. Quyuq va sovuq ranglar: 'blue', 'indigo', 'slate', 'zinc'.";
  } else if (theme === "edu") {
    themeInstruction =
      "Foydalanuvchi 'Edu/Bright' uslubini tanladi. Yorqin va jozibali: 'emerald', 'amber', 'rose', 'cyan'.";
  } else {
    themeInstruction =
      "Foydalanuvchi 'Corporate' uslubini tanladi. Rasmiy: 'sky', 'gray', 'teal', 'navy'.";
  }

  const prompt = `Siz professional prezentatsiya dizaynerisiz.
Mavzu: "${topic}".
Vazifa: 8-12 ta slayddan iborat mukammal va juda batafsil dars ishlanmasi taqdimotini yarating.

Har bir slayd uchun mos 'layoutType' tanlang:
1. "intro_title": Faqat birinchi slayd uchun. Katta sarlavha.
2. "text_icon": Matn va bitta Lucide iconName.
3. "process_diagram": Jarayon yoki qadamlar. 'diagramSteps' (3-5 ta batafsil qadam matni).
4. "3d_illustration": Murakkab tushuncha uchun 'imagePrompt' (inglizcha 3d isometric prompt).
5. "comparison": Ikki narsani solishtirish. 'comparisonData' ({leftTitle, rightTitle, left:[], right:[]}) bering.
6. "statistics_highlight": Muhim raqamni ko'rsatish. 'statValue' (masalan: "90%") va 'statDesc' bering.

Har bir slayd uchun JSON maydonlari:
- title: Slayd sarlavhasi.
- content: Slaydning asosiy ta'limiy matni. MUHIM: Har bir slayd uchun matn juda qisqa bo'lmasin. Kamida 4-5 ta qatordan iborat, mavzuni chuqur yorituvchi faktlar, ta'riflar va batafsil tushuntirishlarni Markdown formatida (masalan, ro'yxatlar, qalin matnlar bilan) yozing.
- speakerNotes: Slaydni tushuntirishda o'qituvchi aytishi kerak bo'lgan juda batafsil va uzun nutq matni (kamida 3-4 ta to'liq gap).
- layoutType: Layout turi.
- colorScheme: Rang sxemasi ("blue", "emerald", "rose", "amber", "indigo", "purple", "cyan", "sky", "navy", "slate").
- Layoutga qarab kerakli qo'shimcha maydonlar (iconName, diagramSteps, imagePrompt, comparisonData, statValue, statDesc).

Muhim Yo'riqnoma: ${themeInstruction}. Ranglar va layoutlarni turli xil qiling. Barcha ma'lumotlar o'ta batafsil va ilmiy jihatdan mukammal bo'lishi shart.

JSON formatida qaytaring:
{"slides":[...]}`;

  const text = await smartAIRequest(prompt, true);
  const data = JSON.parse(text);
  return data.slides || data;
}

export async function analyzeTestResults(
  topic: string,
  difficulty: string,
  tests: TestData[],
  userAnswers: Record<number, string>
): Promise<string> {
  const results = tests
    .map(
      (t, i) =>
        `Q: ${t.question} | To'g'ri: ${t.correctAnswer} | Javob: ${userAnswers[i] ?? "tanlanmadi"}`
    )
    .join("\n");
  return await smartAIRequest(
    `Siz pedagogik psixolog va ustozsiz. O'zbek tilida test natijalarini chuqur tahlil qiling va talabaga qaysi mavzular ustida ishlash kerakligi bo'yicha motivatsion maslahat bering:\nMavzu: ${topic} (${difficulty})\n${results}`
  );
}

// ================================================================
// EduVisual AI — Yangi Pedagogik va Storyboard funksiyalari
// ================================================================

export async function enhanceEducationalPrompt(
  prompt: string,
  subject: string,
  ageGroup: string,
  resourceType: string
): Promise<string> {
  const query = `Siz ta'lim sohasida vizual resurslar va infografikalar yaratish bo'yicha ekspert pedagog-dizaynersiz.
Mavzu: "${prompt}"
Fan: "${subject}"
O'quvchilar yoshi/guruhi: "${ageGroup}"
Resurs turi: "${resourceType}"

Foydalanuvchi kiritgan oddiy mavzuni professional, ta'limga mos va batafsil ingliz tilidagi AI promptga aylantiring. Rasmda nimalar tasvirlanishi kerakligi, ranglar, diagramma qismlari, qadamlar va pedagogik jihatlar ingliz tilida juda aniq va batafsil yozilgan bo'lsin.
Javob faqat generatsiya qilingan ingliz tilidagi prompt matnidan iborat bo'lsin, boshqa hech qanday so'z yozmang.`;

  try {
    return await smartAIRequest(query, false);
  } catch (err) {
    console.warn("AI promptni yaxshilashda xato, lokal fallback ishlatilmoqda:", err);
    return `An educational illustration of "${prompt}" for ${subject} lessons, suitable for ${ageGroup}, in ${resourceType} style, detailed visual layout, labeled parts, high educational value, 4k`;
  }
}

export interface PedagogikEvaluation {
  pedagogicalGoal: string;
  pedagogicalEvaluation: {
    subjectAlignment: number;
    scientificAccuracy: number;
    clarity: number;
    ageAppropriateness: number;
    overallScorePercentage: number;
  };
  lessonIntegration: {
    stage: string;
    method: string;
    teacherInstructions: string;
  };
}

export async function generateEducationalImageEvaluation(
  prompt: string,
  subject: string,
  ageGroup: string,
  resourceType: string
): Promise<PedagogikEvaluation> {
  const query = `Siz o'quv materiallarini baholash va dars rejasiga integratsiya qilish bo'yicha ekspert pedagog-metodistsiz.
Mavzu: "${prompt}"
Fan: "${subject}"
O'quvchilar guruhi: "${ageGroup}"
Resurs turi: "${resourceType}"

Ushbu ta'limiy vizual resurs uchun metodik tavsiyalar va pedagogik baholashni ishlab chiqing. Baholashda ilmiy aniqlik, yoshga moslik va tushunarlilikka e'tibor bering.
Quyidagi JSON formatida qaytaring (o'zbek tilida):
{
  "pedagogicalGoal": "Ushbu vizual resurs yordamida o'quvchilarga [mavzu]ni vizual tushuntirish va ularda tushuncha shakllantirish.",
  "pedagogicalEvaluation": {
    "subjectAlignment": 5,
    "scientificAccuracy": 5,
    "clarity": 4,
    "ageAppropriateness": 5,
    "overallScorePercentage": 96
  },
  "lessonIntegration": {
    "stage": "[Dars bosqichi, masalan: Yangi mavzuni tushuntirish yoki Mustahkamlash]",
    "method": "[Tavsiya qilinadigan dars metodi, masalan: Klaster, Savol-javob, Aqliy hujum]",
    "teacherInstructions": "[O'qituvchiga rasm bilan darsda qanday ishlash bo'yicha 2-3 ta gaplik yo'riqnoma]"
  }
}`;

  const text = await smartAIRequest(query, true);
  return JSON.parse(text);
}

export interface StoryboardFrame {
  frameNumber: number;
  title: string;
  visualDescription: string;
  scriptText: string;
  animationDescription: string;
  pedagogicalValue: string;
  detailedExplanation: string; // Kadrda ko'rsatilgan ilmiy tushunchaning batafsil bayoni
  keyTerms: string;            // Kadrga oid asosiy terminlar va ularning ta'riflari
  studentActivity: string;     // O'quvchilar uchun kadr bo'yicha beriladigan interfaol savol yoki topshiriq
}

export interface StoryboardData {
  animationTitle: string;
  pedagogicalGoal: string;
  pedagogicalEvaluation: {
    subjectAlignment: number;
    scientificAccuracy: number;
    clarity: number;
    ageAppropriateness: number;
    overallScorePercentage: number;
  };
  lessonIntegration: {
    stage: string;
    method: string;
    teacherInstructions: string;
  };
  frames: StoryboardFrame[];
}
export async function generateEducationalStoryboard(
  topic: string,
  subject: string,
  ageGroup: string,
  style: string,
  lang: string = "uz"
): Promise<StoryboardData> {
  const langText = lang === "ru" ? "rus tilida" : lang === "en" ? "ingliz tilida" : "o'zbek tilida";
  const query = `Siz ta'limga oid animatsiyalar, multimedia va ssenariylar yozish bo'yicha ekspert pedagog va ssenarist-dizaynersiz.
Mavzu: "${topic}"
Fan: "${subject}"
O'quvchilar yoshi/guruhi: "${ageGroup}"
Animatsiya uslubi: "${style}"

Vazifa: Ushbu mavzuni bosqichma-bosqich tushuntiruvchi 6 tadan 8 tagacha kadrdan iborat professional ssenariy storyboardini ishlab chiqing.
Har bir kadr uchun rasm visual tasviri (visualDescription) ingliz tilida batafsil va ravshan prompt sifatida yozilsin (chunki AI tasvirlash vositalari faqat inglizchani yaxshi tushunadi). Audio ssenariy matni (scriptText), sarlavhalar, pedagogik maqsad va metodik yo'riqnomalar esa ${langText} bolalar yoki o'quvchilarga qaratilgan qilib yozilsin.

Quyidagi JSON formatida qaytaring (hamma matnlar ${langText}, faqat visualDescription inglizcha bo'lsin):
{
  "animationTitle": "[Animatsiya sarlavhasi]",
  "pedagogicalGoal": "[Pedagogik maqsad]",
  "pedagogicalEvaluation": {
    "subjectAlignment": 5,
    "scientificAccuracy": 5,
    "clarity": 5,
    "ageAppropriateness": 5,
    "overallScorePercentage": 98
  },
  "lessonIntegration": {
    "stage": "[Dars bosqichi, masalan: Yangi mavzuni tushuntirish]",
    "method": "[Dars metodi, masalan: Bosqichma-bosqich vizual interfaol tahlil]",
    "teacherInstructions": "[O'qituvchiga darsda ushbu storyboarddan foydalanish bo'yicha metodik tavsiyalar]"
  },
  "frames": [
    {
      "frameNumber": 1,
      "title": "[1-kadr sarlavhasi]",
      "visualDescription": "[Batafsil inglizcha tasvir tavsifi rasm chizish uchun, masalan: 'isometric 3D model of water cycle, cloud raining over a mountain, vector illustration, white background']",
      "scriptText": "[Kadr uchun audio matn yoki o'qituvchi aytadigan so'zlar. Ushbu so'zlar juda batafsil, qiziqarli va mavzuni to'liq ochib beruvchi bo'lishi shart (kamida 4-5 ta to'liq va jozibali gaplar)]",
      "animationDescription": "[Kadrda nimalar harakatlanishi yoki qanday animatsiya effekti bo'lishi]",
      "pedagogicalValue": "[Ushbu kadr darsda qanday pedagogik ahamiyatga ega]",
      "detailedExplanation": "[Kadrda tasvirlangan ilmiy mavzuning juda to'liq, batafsil va o'ta ilmiy tushuntirishi (kamida 5-6 ta to'liq ilmiy gapdan iborat bo'lsin)]",
      "keyTerms": "[Kadrga oid muhim tayanch atamalar va ularning batafsil ta'riflari (kamida 3-4 ta termin va ularning ta'riflari)]",
      "studentActivity": "[O'quvchilar uchun kadr bo'yicha beriladigan o'ta qiziqarli interfaol savol, aqliy hujum yoki topshiriq]"
    }
  ]
}`;

  const text = await smartAIRequest(query, true);
  return JSON.parse(text);
}
