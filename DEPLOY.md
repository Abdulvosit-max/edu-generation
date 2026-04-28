# 🚀 Edu-Generation: GitHub va Vercel Deploy Qo'llanmasi

> Bu qo'llanma loyihani GitHub repoga yuklash va Vercel orqali bepul publish qilishni o'rgatadi.

---

## 1️⃣ GitHub ga Yuklash

### 1.1 GitHub repository yaratish

1. [github.com](https://github.com) ga kiring
2. Yuqori o'ng burchakdagi **"+"** tugmasini bosing → **"New repository"**
3. Quyidagilarni to'ldiring:
   - **Repository name:** `edu-generation`
   - **Visibility:** `Public` (Vercel bepul uchun tavsiya etiladi)
4. **"Create repository"** tugmasini bosing

### 1.2 Loyihani GitHub ga yuklash

Terminalda loyiha papkasiga o'ting:

```bash
cd /Users/abdulvosit/Desktop/edu-generation
```

Git boshlash va yuklash:
```bash
# Git repositoryni boshlash
git init

# Barcha fayllarni qo'shish (.gitignore qoidalariga ko'ra)
git add .

# Birinchi commit
git commit -m "feat: Edu-Generation dastlabki versiya"

# GitHub ga ulash (o'z username ingizni kiriting)
git remote add origin https://github.com/YOUR_USERNAME/edu-generation.git

# Yuklash
git branch -M main
git push -u origin main
```

> [!IMPORTANT]
> `.gitignore` faylda quyidagilar ignore qilingan — ularni **HECH QACHON** push qilmang:
> - `.env.local` — maxfiy API kalitlar
> - `firebase-applet-config.json` — Firebase maxfiy config

---

## 2️⃣ Vercel ga Deploy Qilish

### 2.1 Vercel ga kirish

1. [vercel.com](https://vercel.com) ga o'ting
2. **"Sign Up"** → **"Continue with GitHub"** orqali kiring

### 2.2 Loyihani import qilish

1. Vercel dashboard da **"Add New → Project"** tugmasini bosing
2. GitHub repositories ro'yxatidan **`edu-generation`** ni toping
3. **"Import"** tugmasini bosing

### 2.3 Build sozlamalari

Vercel avtomatik ravishda Vite loyihani aniqlaydi:

| Sozlama | Qiymat |
|---|---|
| Framework Preset | `Vite` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

> [!NOTE]
> Bu qiymatlar avtomatik to'ldiriladi, o'zgartirishning hojati yo'q.

### 2.4 Environment Variables qo'shish

**"Environment Variables"** bo'limiga quyidagilarni qo'shing:

| Kalit | Qiymat | Muhit |
|---|---|---|
| `GEMINI_API_KEY` | Gemini API kalitingiz | Production, Preview, Development |
| `VITE_FIREBASE_API_KEY` | Firebase API kaliti | Production, Preview, Development |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` | Production, Preview, Development |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | Production, Preview, Development |
| `VITE_FIREBASE_APP_ID` | Firebase App ID | Production, Preview, Development |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.firebasestorage.app` | Production, Preview, Development |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging Sender ID | Production, Preview, Development |
| `VITE_FIREBASE_FIRESTORE_DB_ID` | Firestore Database ID | Production, Preview, Development |

> [!CAUTION]
> **`GEMINI_API_KEY`** ni hech qachon public repoga push qilmang!
> Uni faqat Vercel Environment Variables orqali kiriting.

### 2.5 Deploy qilish

1. Barcha o'zgaruvchilarni kiritgandan so'ng **"Deploy"** tugmasini bosing
2. Build jarayoni ~2-3 daqiqa davom etadi
3. Deploy tugagach Vercel sizga URL beradi:
   ```
   https://edu-generation-xxxxx.vercel.app
   ```

---

## 3️⃣ Firebase Sozlamalari

### 3.1 Google Authentication

1. [Firebase Console](https://console.firebase.google.com) → loyihangiz
2. **Authentication** → **Sign-in method**
3. **Google** ni yoqing
4. **Authorized domains** bo'limiga Vercel domenini qo'shing:
   ```
   edu-generation-xxxxx.vercel.app
   ```

> [!IMPORTANT]
> Vercel domeni Firebase'ga qo'shilmasa, Google login ishlaMaydi!

### 3.2 Firestore Rules

```
cd /Users/abdulvosit/Desktop/edu-generation
firebase deploy --only firestore:rules
```

---

## 4️⃣ Keyingi Yangilanishlar

GitHub'ga push qilganingizda Vercel avtomatik qayta deploy qiladi:

```bash
git add .
git commit -m "fix: xato to'g'irlandi"
git push origin main
```

---

## ✅ Tekshirish ro'yxati

Deploy tugagach quyidagilarni tekshiring:

- [ ] Bosh sahifa (`/`) ochiladi
- [ ] Google login ishlaydi
- [ ] Chat sahifasi (`/chat`) AI javob beradi
- [ ] Rasm generatsiya (`/image`) ishlaydi
- [ ] Slayd generatsiya (`/slide`) ishlaydi
- [ ] Test generatsiya (`/test`) ishlaydi
- [ ] To'g'ridan URL ga kirishda 404 xatosi chiqmaydi (`/chat` ga to'g'ridan kirish)

---

## 🆘 Muammolar va Yechimlar

| Muammo | Sabab | Yechim |
|---|---|---|
| Google login ishlamayapti | Firebase'da domen yo'q | Vercel domenini Firebase Authorized Domains ga qo'shing |
| AI javob bermayapti | `GEMINI_API_KEY` noto'g'ri | Vercel Environment Variables da kalitni tekshiring |
| `/chat` 404 xatosi | SPA routing | `vercel.json` faylini tekshiring |
| Build xatosi | Dependency muammo | `npm install && npm run build` lokal tekshiring |
