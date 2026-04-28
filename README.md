<div align="center">

# 🎓 Edu-Generation

**Sun'iy intellekt yordamida ta'lim resurslarini yarating**

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev)
[![Gemini](https://img.shields.io/badge/Gemini-AI-orange?logo=google)](https://ai.google.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-yellow?logo=firebase)](https://firebase.google.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org)

</div>

---

## 📌 Loyiha haqida

**Edu-Generation** — bu o'qituvchilar va talabalar uchun mo'ljallangan AI yordamchi platforma.
Google Gemini AI texnologiyasi yordamida bir necha soniya ichida:

- 🖼️ **Ta'lim rasmlari** — mavzuga oid sifatli rasmlar
- 📊 **Taqdimot slaydlar** — 12 ta slayd + so'zlovchi izohlari (PPT yuklab olish)
- 📝 **Test savollar** — 10 ta savol, AI tahlili, PDF yuklab olish
- 💬 **AI suhbat** — o'zbek tilida ta'lim bo'yicha savol-javob
- 🌍 **Hamjamiyat** — boshqalar yaratgan resurslarni ko'rish va ulashish

**Til qo'llab-quvvatlash:** O'zbek 🇺🇿 | Rus 🇷🇺 | Ingliz 🇬🇧

---

## 🚀 Lokal Ishga Tushirish

### Talablar

- [Node.js](https://nodejs.org) v18 yoki undan yuqori
- [Google Gemini API kaliti](https://aistudio.google.com/app/apikey)
- Firebase loyihasi (Auth + Firestore)

### O'rnatish Bosqichlari

**1. Reponi klonlash:**
```bash
git clone https://github.com/your-username/edu-generation.git
cd edu-generation
```

**2. Paketlarni o'rnatish:**
```bash
npm install
```

**3. Muhit o'zgaruvchilarini sozlash:**
```bash
cp .env.example .env.local
```
`.env.local` faylini oching va qiymatlarni to'ldiring:
```env
GEMINI_API_KEY=your_gemini_api_key
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=1:xxx:web:xxx
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_FIRESTORE_DB_ID=your-firestore-db-id
```

**4. Dev serverni ishga tushirish:**
```bash
npm run dev
```

Brauzerda [http://localhost:3000](http://localhost:3000) ni oching.

---

## 🌐 Vercel ga Deploy Qilish

To'liq qo'llanma uchun: [DEPLOY.md](./DEPLOY.md)

**Qisqacha:**
1. [Vercel](https://vercel.com) ga GitHub orqali kiring
2. `edu-generation` reponi import qiling
3. Environment Variables qo'shing (`.env.example` ga qarang)
4. Deploy tugmasini bosing ✅

---

## 🗂️ Loyiha Tuzilishi

```
edu-generation/
├── src/
│   ├── components/
│   │   ├── AuthOverlay.tsx   # Google autentifikatsiya qatlami
│   │   └── Layout.tsx        # Sidebar + header layout
│   ├── pages/
│   │   ├── Feed.tsx          # Hamjamiyat resurslar sahifasi
│   │   ├── Chat.tsx          # AI suhbat sahifasi
│   │   ├── ImageGen.tsx      # Rasm generatsiya sahifasi
│   │   ├── SlideGen.tsx      # Slayd generatsiya sahifasi
│   │   ├── TestGen.tsx       # Test generatsiya sahifasi
│   │   ├── VideoGen.tsx      # Video (tez kunda)
│   │   └── Account.tsx       # Akkaunt sozlamalari
│   ├── lib/
│   │   ├── gemini.ts         # Gemini AI integratsiyasi
│   │   ├── firebase.ts       # Firebase/Firestore sozlamalari
│   │   ├── AppContext.tsx    # Global holat (tema, til)
│   │   ├── i18n.ts           # Tarjimalar (uz/ru/en)
│   │   └── utils.ts          # Yordamchi funksiyalar
│   ├── App.tsx               # Asosiy router
│   ├── main.tsx              # React kirish nuqtasi
│   └── index.css             # Global uslublar
├── .env.example              # Muhit o'zgaruvchilari namunasi
├── vercel.json               # Vercel SPA routing sozlamalari
├── vite.config.ts            # Vite konfiguratsiyasi
├── firestore.rules           # Firestore xavfsizlik qoidalari
└── README.md                 # Shu fayl
```

---

## 🛠️ Texnologiyalar

| Texnologiya | Versiya | Maqsad |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 5.8 | Tip xavfsizligi |
| Vite | 6 | Build vositasi |
| Tailwind CSS | 4 | Uslublash |
| Google Gemini AI | 2.0 Flash / 1.5 Pro | AI generatsiya |
| Firebase Auth | 12 | Autentifikatsiya |
| Firestore | 12 | Ma'lumotlar bazasi |
| React Router | 7 | Navigatsiya |
| pptxgenjs | 4 | PPT eksport |
| jsPDF | 4 | PDF eksport |

---

## 🔑 API Kalitlari Qayerdan Olish

### Gemini API
1. [Google AI Studio](https://aistudio.google.com/app/apikey) ga kiring
2. "Create API key" tugmasini bosing
3. Kalitni `.env.local` ga qo'shing

### Firebase
1. [Firebase Console](https://console.firebase.google.com) ga kiring
2. Yangi loyiha yarating yoki mavjudini tanlang
3. Authentication > Sign-in method > Google ni yoqing
4. Firestore Database ni yarating
5. Project Settings > Your apps > Config ni oling

---

## 📄 Litsenziya

MIT License — [LICENSE](./LICENSE)

---

<div align="center">
  <sub>O'zbek o'qituvchilari va talabalari uchun ❤️ bilan yaratilgan</sub>
</div>
