import { auth } from "./firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export interface Resource {
  id?: string | number;
  type: "image" | "slide" | "test" | "chat" | "video";
  title: string;
  prompt: string;
  content: string; // JSON yoki URL
  author_id: string;
  author_name: string;
  author_photo?: string;
  is_public: boolean;
  created_at?: string;
}

// Hozirgi foydalanuvchini olish (yoki tizimga kirmagan bo'lsa mehmon)
function getCurrentUser() {
  const user = auth.currentUser;
  if (user) {
    return { uid: user.uid, displayName: user.displayName || "Foydalanuvchi", photoURL: user.photoURL };
  }
  return { uid: "guest", displayName: "Mehmon", photoURL: null };
}

// Namuna ma'lumotlar (Pre-seeded data) - foydalanuvchi birinchi marta kirganda hamjamiyat bo'sh bo'lmasligi uchun
const PRESEEDED_RESOURCES: Resource[] = [
  {
    id: "preseeded_slide_1",
    type: "slide",
    title: "Fotosintez: Hayot manbai",
    prompt: "Fotosintez jarayoni o'quvchilar uchun slayd darsi",
    author_id: "system_admin",
    author_name: "EduGen Ustoz",
    author_photo: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=100&auto=format&fit=crop&q=80",
    is_public: true,
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(), // 2 kun oldin
    content: JSON.stringify([
      {
        title: "Fotosintez: Hayot manbai",
        content: "# Fotosintez nima?\nFotosintez — yashil o'simliklar, suvo'tlar va ba'zi bakteriyalar tomonidan yorug'lik energiyasini kimyoviy energiyaga aylantirish jarayoni.\n\nBu jarayonsiz yer yuzida hayotni tasavvur qilib bo'lmaydi.",
        speakerNotes: "Assalomu alaykum hurmatli o'quvchilar. Bugungi darsimiz fotosintez jarayoni haqida bo'ladi.",
        colorScheme: "emerald",
        layoutType: "intro_title"
      },
      {
        title: "Fotosintez Formulasi",
        content: "Jarayonning umumiy kimyoviy tenglamasi:\n\n**6CO₂ + 6H₂O + Yorug'lik energyasi ➔ C₆H₁₂O₆ + 6O₂**\n\n* **Karbonat angidrid (CO₂):** Havo orqali barglarga kiradi.\n* **Suv (H₂O):** Ildizlar orqali so'riladi.\n* **Glyukoza (C₆H₁₂O₆):** O'simlik uchun oziq.\n* **Kislorod (O₂):** Atmosferaga ajraladi.",
        speakerNotes: "Ushbu formulada karbonat angidrid va suv quyosh nuri yordamida ozuqa va kislorodga aylanadi.",
        colorScheme: "emerald",
        layoutType: "text_icon",
        iconName: "Activity"
      },
      {
        title: "Fotosintezning 2 ta Fazasi",
        content: "Fotosintez jarayoni ikki asosiy fazada kechadi:",
        speakerNotes: "Ushbu ikki faza o'simlik xloroplastlarida amalga oshadi.",
        colorScheme: "emerald",
        layoutType: "comparison",
        comparisonData: {
          leftTitle: "Yorug'lik fazasi",
          rightTitle: "Qorong'ulik fazasi (Kalvin)",
          left: [
            "Xloroplastlarning granalarida kechadi.",
            "Quyosh nuri bo'lishi shart.",
            "Suv fotoliz bo'ladi va O₂ ajraladi.",
            "ATP va NADPH energiyalari hosil bo'ladi."
          ],
          right: [
            "Xloroplastlarning stromasida kechadi.",
            "Yorug'lik bo'lishi shart emas.",
            "Karbonat angidrid glyukozaga aylanadi.",
            "Yorug'lik fazasidagi energiya sarflanadi."
          ]
        }
      },
      {
        title: "Jarayon bosqichlari",
        content: "Fotosintezning ketma-ketlik qadamlari quyidagicha:",
        speakerNotes: "Har bir bosqich zanjirli reaktsiya hisoblanadi.",
        colorScheme: "cyan",
        layoutType: "process_diagram",
        diagramSteps: ["Yorug'lik yutilishi", "Suvning parchalanishi", "Elektronlar tashilishi", "Glyukoza sintezi"]
      },
      {
        title: "Xloroplastlarning tuzilishi",
        content: "Xloroplast — fotosintez sodir bo'ladigan organoid. Xlorofill pigmenti yorug'likni yutadi va o'simlikka yashil rang beradi.",
        speakerNotes: "Xloroplastlar faqat o'simlik hujayralariga xosdir.",
        colorScheme: "emerald",
        layoutType: "3d_illustration",
        imagePrompt: "Chloroplast detailed 3D structure, outer membrane, inner membrane, thylakoid, stroma, high quality scientific render"
      },
      {
        title: "Fotosintezning ahamiyati",
        content: "Fotosintez dunyodagi eng muhim biologik jarayonlardan biridir:\n\n* Yer yuzidagi barcha organizmlarni kislorod bilan ta'minlaydi.\n* Issiqxona gazlarini kamaytiradi (CO₂ yutadi).\n* Organik moddalar birlamchi manbaini yaratadi.",
        speakerNotes: "Agar fotosintez bo'lmaganda, yer yuzida hayot mavjud bo'lmas edi.",
        colorScheme: "amber",
        layoutType: "statistics_highlight",
        statValue: "98%",
        statDesc: "Atmosferadagi kislorodning o'simliklar tomonidan hosil qilinishi"
      }
    ])
  },
  {
    id: "preseeded_test_1",
    type: "test",
    title: "Botanika va O'simliklar Dunyosi",
    prompt: "O'simliklar anatomiyasi va fotosintez bo'yicha test",
    author_id: "system_admin",
    author_name: "Kamola Karimova",
    author_photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    is_public: true,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(), // 12 soat oldin
    content: JSON.stringify([
      {
        question: "O'simliklarda fotosintez jarayoni qaysi organoidda sodir bo'ladi?",
        options: ["Xloroplast", "Mitoxondriya", "Ribosoma", "Vakuola"],
        correctAnswer: "Xloroplast"
      },
      {
        question: "Fotosintez jarayoni davomida atmosferaga qaysi gaz ajralib chiqadi?",
        options: ["Karbonat angidrid", "Kislorod", "Azot", "Vodorod"],
        correctAnswer: "Kislorod"
      },
      {
        question: "Fotosintezning yorug'lik fazasining asosiy mahsulotlari nimalar?",
        options: ["Glyukoza va Suv", "ATP, NADPH va O₂", "CO₂ va H₂O", "Kraxmal va Oqsil"],
        correctAnswer: "ATP, NADPH va O₂"
      },
      {
        question: "Fotosintezning qorong'ulik fazasi (Kalvin sikli) xloroplastning qayerida sodir bo'ladi?",
        options: ["Stromada", "Tilaokidda", "Granada", "Tashqi membranada"],
        correctAnswer: "Stromada"
      },
      {
        question: "O'simlik tanasida suv va unda erigan mineral moddalar qaysi to'qima orqali harakatlanadi?",
        options: ["Ksiléma (Yog'ochlik)", "Floéma (Po'stloq)", "Mexanik to'qima", "Asosiy to'qima"],
        correctAnswer: "Ksiléma (Yog'ochlik)"
      }
    ])
  },
  {
    id: "preseeded_image_1",
    type: "image",
    title: "Xlorofill molekulasi mikroskop ostida",
    prompt: "Beautiful scientific illustration of chlorophyll molecules inside plant cell wall, vibrant green, neon micro lighting, 8k",
    author_id: "system_admin",
    author_name: "Azizbek Aliyev",
    author_photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
    is_public: true,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 soat oldin
    content: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=1024&auto=format&fit=crop&q=80"
  }
];

// LocalStorage-ni namunalar bilan to'ldirish
function initLocalStorage() {
  const localData = localStorage.getItem("edu_generation_local_resources_v3");
  if (!localData) {
    localStorage.setItem("edu_generation_local_resources_v3", JSON.stringify(PRESEEDED_RESOURCES));
  }
}

// LocalStorage funksiyasini chaqirish
initLocalStorage();

// Barcha local resurslarni olish
function getLocalResources(): Resource[] {
  try {
    const data = localStorage.getItem("edu_generation_local_resources_v3");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Local resurslarni saqlash
function saveLocalResources(resources: Resource[]) {
  localStorage.setItem("edu_generation_local_resources_v3", JSON.stringify(resources));
}

// 1. Resursni saqlash (Backend + LocalStorage)
export async function saveResource(resource: Omit<Resource, 'author_id' | 'author_name' | 'author_photo' | 'is_public'>) {
  const user = getCurrentUser();
  const payload: Resource = {
    ...resource,
    author_id: user.uid,
    author_name: user.displayName,
    author_photo: user.photoURL || undefined,
    is_public: false,
    created_at: new Date().toISOString()
  };

  // LocalStorage-ga har doim saqlab qo'yamiz (Offline chidamlilik uchun)
  const localId = "local_" + Date.now();
  const localPayload = { ...payload, id: localId };
  const locals = getLocalResources();
  locals.unshift(localPayload);
  saveLocalResources(locals);

  try {
    const response = await fetch(`${API_URL}/resources/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      // Agar backend muvaffaqiyatli saqlasa, local id-ni haqiqiy backend id-ga yangilab qo'yamiz
      const currentLocals = getLocalResources();
      const idx = currentLocals.findIndex(r => r.id === localId);
      if (idx !== -1) {
        currentLocals[idx].id = data.id;
        saveLocalResources(currentLocals);
      }
      return data.id;
    }
  } catch (error) {
    console.warn("Backend server is not available. Resource saved to LocalStorage only.");
  }
  
  return localId; // Agar server bo'lmasa local id qaytadi
}

// 2. Resursning ommaviyligini o'zgartirish (Hamjamiyatga ulashish)
export async function togglePublic(id: string | number, isPublic: boolean) {
  // Avval LocalStorage-da o'zgartiramiz
  const locals = getLocalResources();
  const idx = locals.findIndex(r => String(r.id) === String(id));
  if (idx !== -1) {
    locals[idx].is_public = isPublic;
    saveLocalResources(locals);
  }

  try {
    const response = await fetch(`${API_URL}/resources/${id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: isPublic }),
    });

    if (response.ok) return await response.json();
  } catch (error) {
    console.warn("Backend server is not available. Status updated in LocalStorage only.");
  }
  return { id, is_public: isPublic };
}

// 3. Resursni o'chirish (Kutubxonadan va serverdan butunlay yo'qotish)
export async function deleteResource(id: string | number) {
  // LocalStorage-dan o'chiramiz
  const locals = getLocalResources();
  const filtered = locals.filter(r => String(r.id) !== String(id));
  saveLocalResources(filtered);

  try {
    const response = await fetch(`${API_URL}/resources/${id}/`, {
      method: "DELETE",
    });
    if (response.ok) return true;
  } catch (error) {
    console.warn("Backend server is not available. Resource deleted from LocalStorage only.");
  }
  return true;
}

// 4. Hamjamiyat resurslarini olish (is_public = true)
export async function fetchResources(limitCount = 30): Promise<Resource[]> {
  try {
    const response = await fetch(`${API_URL}/resources/?is_public=true&limit=${limitCount}`);
    if (response.ok) {
      const serverData = await response.json();
      // Server ma'lumotlarini LocalStorage bilan sinxron qilamiz va takrorlanmasligini ta'minlaymiz
      const locals = getLocalResources();
      
      // Serverdagi yangi ommaviy resurslarni mahalliy keshga qo'shamiz
      serverData.forEach((sRes: Resource) => {
        if (!locals.some(l => String(l.id) === String(sRes.id))) {
          locals.push(sRes);
        }
      });
      saveLocalResources(locals);
      
      return serverData;
    }
  } catch {
    console.warn("Backend server is not available. Fetching public resources from LocalStorage fallback.");
  }

  // Backend bo'lmasa, mahalliy saqlangan barcha ommaviy (shu jumladan pre-seeded) resurslarni qaytaramiz
  return getLocalResources()
    .filter(r => r.is_public === true)
    .slice(0, limitCount);
}

// 5. Foydalanuvchining shaxsiy kutubxonasini olish (author_id = user.uid)
export async function fetchUserResources(): Promise<Resource[]> {
  const user = getCurrentUser();
  if (user.uid === "guest") {
    // Agar foydalanuvchi kirmagan bo'lsa, local storage-dagi guest ga tegishli ishlarni ko'rsatamiz
    return getLocalResources().filter(r => r.author_id === "guest");
  }

  try {
    const response = await fetch(`${API_URL}/resources/?author_id=${user.uid}`);
    if (response.ok) {
      const serverData = await response.json();
      return serverData;
    }
  } catch {
    console.warn("Backend server is not available. Fetching user library from LocalStorage fallback.");
  }

  // Backend bo'lmasa, LocalStorage-dagi foydalanuvchi resurslarini filtrlaymiz
  return getLocalResources().filter(r => r.author_id === user.uid);
}

export interface SubscriptionRequestPayload {
  user_uid: string;
  user_email: string;
  user_name: string;
  phone_number: string;
  plan: "free" | "pro" | "max";
  payment_method: "click" | "payme" | "card";
  amount: number;
  transaction_details: string;
}

export async function createSubscriptionRequest(payload: SubscriptionRequestPayload) {
  try {
    const response = await fetch(`${API_URL}/subscription-request/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error("Error creating subscription request:", error);
  }
  return null;
}

export async function fetchSubscriptionStatus(uid: string) {
  try {
    const response = await fetch(`${API_URL}/subscription-status/?uid=${uid}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error("Error fetching subscription status:", error);
  }
  return { plan: "free", status: null };
}

