import { useState } from "react";
import { 
  Sparkles, 
  MessageSquare, 
  ImageIcon, 
  Presentation, 
  FileText, 
  Video, 
  Chrome, 
  ArrowRight, 
  Check, 
  Moon, 
  Sun,
  User,
  Lock,
  Mail,
  X
} from "lucide-react";
import { useAppContext } from "../lib/AppContext";
import { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsDemo } from "../lib/firebase";
import { Language } from "../lib/i18n";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { theme, setTheme, language, setLanguage } = useAppContext();
  
  // Auth Modal states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Localization structure for landing page
  const landTrans = {
    uz: {
      subtitle: "Sun'iy Intellekt yordamida zamonaviy ta'lim resurslarini yaratish platformasi",
      heroTitle: "Kelajak ta'limini bugun yarating",
      heroDesc: "EduGen — o'qituvchilar va pedagoglar uchun dars ishlanmalari, slaydlar, multimedia storyboardlar, interaktiv testlar va rasmlarni soniyalar ichida yaratuvchi aqlli ta'lim ekotizimi.",
      getStarted: "Bepul boshlash",
      featuresTitle: "Loyihadagi imkoniyatlar",
      featuresDesc: "Dars o'tish sifatini oshiruvchi va vaqtingizni tejovchi sun'iy intellekt vositalari.",
      pricingTitle: "Tarif Rejalari",
      pricingDesc: "O'zingizga mos tarifni tanlang va ta'lim sifatini yangi bosqichga olib chiqing.",
      loginTitle: "Tizimga Kirish",
      registerTitle: "Ro'yxatdan O'tish",
      emailPlaceholder: "Email manzilingiz",
      passwordPlaceholder: "Parol (kamida 6 ta belgi)",
      namePlaceholder: "Ismingiz",
      orText: "yoki",
      googleBtn: "Google orqali kirish",
      guestBtn: "Mehmon bo'lib kirish",
      haveAccount: "Akkauntingiz bormi? Kirish",
      noAccount: "Akkauntingiz yo'qmi? Ro'yxatdan o'tish",
      plans: [
        {
          name: "Mehmon (Free)",
          price: "0",
          desc: "Tizim imkoniyatlarini sinab ko'rish uchun bepul mehmon rejimi.",
          features: [
            "5 tagacha taqdimot slaydlarini yaratish",
            "Sodda AI Chat yordamchisi",
            "Zaxira Google TTS ovozli diktori",
            "Uch xil rasm chizish uslubi"
          ]
        },
        {
          name: "Premium (Teacher)",
          price: "9.99",
          desc: "Darslarni eng yuqori saviyada rejalashtiruvchi o'qituvchilar uchun.",
          features: [
            "Cheksiz slayd va dars ishlanmalari",
            "6-8 kadrli batafsil multimedia storyboardlari",
            "Microsoft Azure Neural HD ovozli diktorlik",
            "PPTX va PDF formatida to'liq yuklab olish",
            "Kengaytirilgan pedagogik tahlil va baholash"
          ],
          popular: true
        },
        {
          name: "Pro (School/Institution)",
          price: "29.99",
          desc: "O'quv markazlari va maktablar uchun jamoaviy reja.",
          features: [
            "Barcha Premium imkoniyatlar",
            "Logotipsiz toza PDF/PPTX eksportlari",
            "Ustuvor tezkor AI generatsiyasi",
            "24/7 shaxsiy metodist yordami",
            "Jamoaviy ulashish kutubxonasi"
          ]
        }
      ]
    },
    ru: {
      subtitle: "Платформа для создания современных образовательных ресурсов с помощью ИИ",
      heroTitle: "Создавайте образование будущего сегодня",
      heroDesc: "EduGen — это умная экосистема для учителей и педагогов, создающая планы уроков, слайды, мультимедийные раскадровки, интерактивные тесты и изображения за секунды.",
      getStarted: "Начать бесплатно",
      featuresTitle: "Возможности проекта",
      featuresDesc: "Инструменты искусственного интеллекта, улучшающие качество обучения и экономящие ваше время.",
      pricingTitle: "Тарифные Планы",
      pricingDesc: "Выберите подходящий тариф и поднимите качество образования на новый уровень.",
      loginTitle: "Вход в Систему",
      registerTitle: "Регистрация",
      emailPlaceholder: "Ваш email",
      passwordPlaceholder: "Пароль (минимум 6 символов)",
      namePlaceholder: "Ваше имя",
      orText: "или",
      googleBtn: "Войти через Google",
      guestBtn: "Войти как гость",
      haveAccount: "Уже есть аккаунт? Войти",
      noAccount: "Нет аккаунта? Зарегистрироваться",
      plans: [
        {
          name: "Гость (Free)",
          price: "0",
          desc: "Бесплатный гостевой режим для тестирования возможностей системы.",
          features: [
            "Создание презентаций до 5 слайдов",
            "Простой ИИ-помощник чата",
            "Озвучка через стандартный Google TTS",
            "Три художественных стиля генерации"
          ]
        },
        {
          name: "Premium (Teacher)",
          price: "9.99",
          desc: "Для учителей, планирующих уроки на высшем профессиональном уровне.",
          features: [
            "Безлимитные слайды и планы уроков",
            "Подробные раскадровки из 6-8 кадров",
            "Качественная озвучка Microsoft Azure Neural HD",
            "Скачивание в форматах PPTX и PDF",
            "Расширенный педагогический анализ ИИ"
          ],
          popular: true
        },
        {
          name: "Pro (School/Institution)",
          price: "29.99",
          desc: "Групповой тариф для учебных центров и школ.",
          features: [
            "Все функции тарифа Premium",
            "Чистый экспорт PDF/PPTX без водяных знаков",
            "Приоритетная генерация контента ИИ",
            "Круглосуточная поддержка методиста",
            "Общая библиотека для преподавателей"
          ]
        }
      ]
    },
    en: {
      subtitle: "AI-Powered Platform for Creating Modern Educational Resources",
      heroTitle: "Create the Future of Education Today",
      heroDesc: "EduGen is a smart ecosystem for teachers and educators that creates lesson plans, presentation slides, multimedia storyboards, interactive quizzes, and educational illustrations in seconds.",
      getStarted: "Start for Free",
      featuresTitle: "Project Features",
      featuresDesc: "AI-driven tools designed to enhance teaching quality and save your valuable time.",
      pricingTitle: "Pricing Plans",
      pricingDesc: "Choose the perfect plan to elevate your educational resources to the next level.",
      loginTitle: "Sign In",
      registerTitle: "Sign Up",
      emailPlaceholder: "Your email address",
      passwordPlaceholder: "Password (min 6 characters)",
      namePlaceholder: "Your name",
      orText: "or",
      googleBtn: "Sign in with Google",
      guestBtn: "Enter as Guest",
      haveAccount: "Already have an account? Sign In",
      noAccount: "Don't have an account? Sign Up",
      plans: [
        {
          name: "Guest (Free)",
          price: "0",
          desc: "Free guest mode to test and explore the system capabilities.",
          features: [
            "Generate slides up to 5 cards",
            "Basic AI Chat Assistant",
            "Google Translate TTS fallback narration",
            "Three visual generation styles"
          ]
        },
        {
          name: "Premium (Teacher)",
          price: "9.99",
          desc: "For educators aiming to plan lessons at the highest professional level.",
          features: [
            "Unlimited slides and lesson generators",
            "Detailed 6-8 frame multimedia storyboards",
            "Microsoft Azure Neural HD voice narration",
            "Full PPTX and PDF downloads",
            "Advanced pedagogical AI assessment"
          ],
          popular: true
        },
        {
          name: "Pro (School/Institution)",
          price: "29.99",
          desc: "Group subscription for learning centers and academic schools.",
          features: [
            "All Premium subscription benefits",
            "Clean PDF/PPTX exports with no logos",
            "Priority high-speed AI processing",
            "24/7 dedicated educator assistance",
            "Shared collaboration libraries"
          ]
        }
      ]
    }
  };

  const t = landTrans[language as Language] || landTrans.uz;

  const openAuth = () => {
    setErrorMsg(null);
    setShowAuthModal(true);
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      setShowAuthModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Google orqali kirishda xato.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInAsDemo();
      setShowAuthModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Mehmon rejimida kirishda xato.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    
    if (!email.trim() || !password.trim()) {
      setErrorMsg("Iltimos barcha maydonlarni to'ldiring.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
      return;
    }
    
    setLoading(true);
    try {
      if (authMode === "login") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name);
      }
      setShowAuthModal(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Akkaunt amaliyotida xatolik.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 relative overflow-x-hidden selection:bg-blue-600 selection:text-white pb-20">
      
      {/* Subtle Background Minimalist Circles */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-5%] left-[-10%] w-[35%] h-[35%] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute top-[30%] right-[-10%] w-[30%] h-[30%] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Top Header */}
      <header className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-md">
            <Sparkles size={20} />
          </div>
          <span className="text-lg font-black tracking-tighter text-slate-950 dark:text-white uppercase leading-none">EduGen</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Light/Dark Toggle */}
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/50 hover:text-blue-600 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Mavzuni o'zgartirish"
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 px-3 py-2 rounded-xl text-xs font-black text-slate-500 dark:text-slate-400 outline-none cursor-pointer uppercase tracking-wider shadow-xs hover:text-blue-500 transition-colors"
          >
            <option value="uz">UZ</option>
            <option value="ru">RU</option>
            <option value="en">EN</option>
          </select>

          <button 
            onClick={openAuth}
            className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 rounded-xl text-xs font-black transition-all shadow-xs uppercase tracking-wider cursor-pointer active:scale-95"
          >
            {t.getStarted}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center flex flex-col items-center">
        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full mb-6">
          🌟 AI Education Ecosystem
        </span>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-slate-950 dark:text-white max-w-3xl mb-6">
          {t.heroTitle}
        </h1>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mb-8 font-medium">
          {t.heroDesc}
        </p>
        <div className="flex gap-4">
          <button
            onClick={openAuth}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer active:scale-98 text-xs uppercase tracking-wider"
          >
            {t.getStarted} <ArrowRight size={14} />
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-black text-slate-950 dark:text-white mb-2">{t.featuresTitle}</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold max-w-md mx-auto">{t.featuresDesc}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { title: t.chat, desc: t.chatDesc, icon: MessageSquare, color: "text-blue-500 bg-blue-500/5 border-blue-500/10" },
            { title: t.slideGen, desc: t.slideDesc, icon: Presentation, color: "text-indigo-500 bg-indigo-500/5 border-indigo-500/10" },
            { title: t.videoGenTitle, desc: t.videoGenDesc, icon: Video, color: "text-pink-500 bg-pink-500/5 border-pink-500/10" },
            { title: t.testTitle, desc: t.testDesc, icon: FileText, color: "text-emerald-500 bg-emerald-500/5 border-emerald-500/10" },
            { title: t.imageGen, desc: t.imageDesc, icon: ImageIcon, color: "text-orange-500 bg-orange-500/5 border-orange-500/10" }
          ].map((item, idx) => (
            <div 
              key={idx} 
              className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 shadow-xs flex flex-col gap-4 group hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 hover:shadow-md hover:-translate-y-1`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color} border group-hover:scale-105 transition-transform`}>
                <item.icon size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-slate-900 dark:text-white mb-1.5 uppercase tracking-wide">{item.title}</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Plans Grid */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-black text-slate-950 dark:text-white mb-2">{t.pricingTitle}</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold max-w-md mx-auto">{t.pricingDesc}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {t.plans.map((plan: any, idx: number) => (
            <div 
              key={idx} 
              className={`p-8 rounded-[32px] bg-white dark:bg-slate-900 border flex flex-col gap-6 relative shadow-xs ${
                plan.popular 
                  ? "border-blue-500 dark:border-blue-600 shadow-md ring-1 ring-blue-500 dark:ring-blue-600" 
                  : "border-slate-200/50 dark:border-slate-800/80"
              }`}
            >
              {plan.popular && (
                <span className="absolute top-0 right-8 -translate-y-1/2 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                  POPULAR
                </span>
              )}
              
              <div>
                <h3 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-950 dark:text-white">${plan.price}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">/ oy</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-3">{plan.desc}</p>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((feat: string, featIdx: number) => (
                  <li key={featIdx} className="flex items-start gap-2.5 text-[10px] font-semibold text-slate-650 dark:text-slate-350">
                    <span className="w-4 h-4 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Check size={10} strokeWidth={3} />
                    </span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <button 
                onClick={openAuth}
                className={`w-full py-3.5 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-98 text-center uppercase tracking-wider ${
                  plan.popular
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                    : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                }`}
              >
                {t.getStarted}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Authentifikatsiya Overlay Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200/50 dark:border-slate-800/80 shadow-2xl z-10 flex flex-col gap-6"
            >
              {/* Close Button */}
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer p-1"
              >
                <X size={18} />
              </button>

              <div className="text-center">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Sparkles size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  {authMode === "login" ? t.loginTitle : t.registerTitle}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">EduGen Ekotizimi</p>
              </div>

              {/* Login/Register Tab Toggles */}
              <div className="flex gap-1.5 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-850">
                <button
                  onClick={() => { setAuthMode("login"); setErrorMsg(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    authMode === "login"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-455 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  {t.loginTitle}
                </button>
                <button
                  onClick={() => { setAuthMode("register"); setErrorMsg(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    authMode === "register"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-455 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  {t.registerTitle}
                </button>
              </div>

              <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
                {authMode === "register" && (
                  <div className="relative flex items-center">
                    <User size={14} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={t.namePlaceholder}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold"
                    />
                  </div>
                )}

                <div className="relative flex items-center">
                  <Mail size={14} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    placeholder={t.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold"
                  />
                </div>

                <div className="relative flex items-center">
                  <Lock size={14} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="password"
                    placeholder={t.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold"
                  />
                </div>

                {errorMsg && (
                  <p className="text-[10px] text-rose-500 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/20 px-3 py-2 rounded-xl border border-rose-100 dark:border-rose-900/30">
                    ⚠️ {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-blue-500/20 active:scale-98"
                >
                  {loading ? t.generating.split(" ")[0] : (authMode === "login" ? t.loginTitle : t.registerTitle)}
                </button>
              </form>

              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-black tracking-widest my-1 select-none">
                <div className="w-5/12 h-px bg-slate-100 dark:bg-slate-800"></div>
                <span>{t.orText}</span>
                <div className="w-5/12 h-px bg-slate-100 dark:bg-slate-800"></div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-3.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 uppercase tracking-wider shadow-xs"
                >
                  <Chrome size={14} className="text-blue-500" />
                  {t.googleBtn}
                </button>

                <button
                  onClick={handleGuestLogin}
                  disabled={loading}
                  className="w-full py-3.5 bg-slate-950 hover:bg-slate-850 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 uppercase tracking-wider shadow-md"
                >
                  {t.guestBtn}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
