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
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useAppContext } from "../lib/AppContext";
import { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsDemo } from "../lib/firebase";
import { Language } from "../lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import dashboardPreview from "../assets/edu_gen_dashboard_preview.png";

export default function Home() {
  const { theme, setTheme, language, setLanguage, t: globalT } = useAppContext();
  
  // Auth Modal states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [showCoinsTable, setShowCoinsTable] = useState<boolean>(false);

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
      emailPlaceholder: "Login yoki Email manzilingiz",
      passwordPlaceholder: "Parol",
      namePlaceholder: "Ismingiz",
      orText: "yoki",
      googleBtn: "Google orqali kirish",
      guestBtn: "Mehmon bo'lib kirish",
      haveAccount: "Akkauntingiz bormi? Kirish",
      noAccount: "Akkauntingiz yo'qmi? Ro'yxatdan o'tish",
      coinsTitle: "Tangachalar Tizimi",
      coinsDesc: "EduGen-da har bir AI amali uchun ma'lum miqdorda tangachalar sarflanadi. Bu sizga resurslarni rejalashtirish imkonini beradi.",
      coinsTableTitle: "Tangacha Sarf Jadvali",
      coinCosts: [
        { name: "Slayd Yaratish (1 sahifa)", cost: "1 tangacha" },
        { name: "Pedagogik Tasvir (1 rasm)", cost: "2 tangacha" },
        { name: "Storyboard & Video (1 kadr)", cost: "5 tangacha" },
        { name: "Test Yozish (1 ta test to'plami)", cost: "3 tangacha" },
        { name: "AI Chat Suhbat (Cheksiz savol-javob)", cost: "Cheksiz (0 tangacha)" }
      ],
      showcaseTitle: "Imkoniyatlarimiz haqida batafsil",
      showcaseDesc: "Interfaol ta'lim ekotizimidagi har bir AI vositasining imkoniyatlari bilan birma-bir tanishing.",
      featuresDetail: [
        {
          title: "AI Chat & Pedagogik Yordamchi",
          desc: "Dars rejasini tuzishda, qiyin mavzularni sodda tushuntirishda va pedagogik metodikalarni tanlashda yordam beruvchi aqlli yordamchi. Savollaringizga ta'lim standartlariga mos ravishda ilmiy asoslangan javoblarni beradi.",
          costInfo: "Ishlatilishi: Mutlaqo Bepul va Cheksiz"
        },
        {
          title: "Avtomatlashtirilgan Slayd Yaratish",
          desc: "Faqatgina dars mavzusini kiritish orqali 5-10 sahifali to'liq kontentli, rasmli va so'zlovchi izohlari (speaker notes) bilan taqdimot slaydlarini yarating. PowerPoint (PPTX) va PDF formatida yuklab oling.",
          costInfo: "Sarfi: har bir sahifa uchun 1 tangacha"
        },
        {
          title: "Storyboard & Multimediali Kadrlar",
          desc: "Dars mavzusini tasviriy va ssenariy ko'rinishida tushuntirib beruvchi 6-8 kadrli storyboard. Har bir kadr uchun visual rasm va audio ssenariy matnlari hamda pedagogik maqsadlar avtomatik yoziladi.",
          costInfo: "Sarfi: har bir kadr uchun 5 tangacha"
        },
        {
          title: "Interaktiv Testlar Generatori",
          desc: "Mavzu bo'yicha turli qiyinchilik darajasidagi (oson, o'rtacha, qiyin) interaktiv test savollarini yarating. Testlarni PDF ko'rinishida yuklab olish va o'quvchilarga tarqatish imkoniyati mavjud.",
          costInfo: "Sarfi: har bir test to'plami uchun 3 tangacha"
        },
        {
          title: "Pedagogik Tasvirlar Yaratish",
          desc: "Darsdagi qiyin ilmiy mavzularni (masalan, fotosintez, atom tuzilishi) o'quvchilarga ko'rsatish uchun 3D, neon yoki chizilgan rasm formatidagi yuqori sifatli vizual diagrammalarni yarating.",
          costInfo: "Sarfi: har bir tasvir uchun 2 tangacha"
        }
      ],
      plans: [
        {
          name: "Free (Bepul)",
          price: "0",
          desc: "Tizim imkoniyatlarini sinab ko'rish uchun bepul reja.",
          features: [
            "20 Tangacha hisobda",
            "5 tagacha taqdimot slaydlarini yaratish",
            "Sodda AI Chat yordamchisi",
            "Standard Google TTS ovozli sintez",
            "Zaxira rasm generatoridan foydalanish"
          ]
        },
        {
          name: "Pro (O'qituvchi)",
          price: "14.99",
          desc: "Darslarni eng yuqori saviyada rejalashtiruvchi o'qituvchilar uchun.",
          features: [
            "500 Tangacha / oyiga",
            "Cheksiz slayd va dars ishlanmalari",
            "6-8 kadrli batafsil storyboardlar",
            "Microsoft Azure Neural HD ovozli diktorlik",
            "Premium Imagen 3 tasvir generatsiyasi",
            "PPTX va PDF formatida yuklab olish"
          ],
          popular: true
        },
        {
          name: "Max (Maktablar)",
          price: "49.99",
          desc: "O'quv markazlari va maktablar uchun to'liq AI reja.",
          features: [
            "2500 Tangacha / oyiga",
            "Barcha Pro imkoniyatlar",
            "Logotipsiz toza PDF/PPTX eksportlari",
            "Ustuvor tezkor AI generatsiyasi",
            "24/7 shaxsiy metodist yordami",
            "Jamoaviy ulashish kutubxonasi"
          ]
        }
      ],
      faqTitle: "Ko'p so'raladigan savollar",
      faqDesc: "Platforma va uning ishlash tizimi haqida eng ko'p beriladigan savollarga javoblar.",
      faqs: [
        { q: "EduGen qanday ishlaydi?", a: "EduGen sun'iy intellekt (Gemini va Imagen) yordamida bir necha soniyada dars ishlanmalari, slaydlar, multimedia storyboardlar, testlar va rasmlarni yaratadi. Buning uchun siz faqat dars mavzusini yozishingiz kifoya." },
        { q: "AI API kalitlari qayerda saqlanadi?", a: "Siz Account bo'limida kiritgan shaxsiy API kalitingiz faqat brauzeringizning ichki xotirasida (localStorage) saqlanadi va xavfsiz holatda bevosita AI modellariga yuboriladi. Hech qachon bizning yoki boshqa serverlarga uzatilmaydi." },
        { q: "Mehmon rejimi (Guest Mode) nima va u bepulmi?", a: "Ha, Mehmon rejimi 100% bepul. Platformaning barcha imkoniyatlarini ro'yxatdan o'tmasdan turib sinab ko'rish imkonini beradi. Biroq, yaratilgan loyihalaringiz bulutda saqlanmaydi va slayd sahifalari sonida biroz cheklovlar bo'ladi." },
        { q: "Microsoft Azure va Google TTS ovozlari orasida qanday farq bor?", a: "Premium tarifda ishlaydigan Microsoft Azure Neural HD ovozlari juda tabiiy, dars tushuntirayotgan haqiqiy o'qituvchidek eshitiladi. Google TTS esa standart sintezator ovozi bo'lib, zaxira sifatida ishlatiladi." }
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
      emailPlaceholder: "Логин или Email",
      passwordPlaceholder: "Пароль",
      namePlaceholder: "Ваше имя",
      orText: "или",
      googleBtn: "Войти через Google",
      guestBtn: "Войти как гость",
      haveAccount: "Уже есть аккаунт? Войти",
      noAccount: "Нет аккаунта? Зарегистрироваться",
      coinsTitle: "Система Монет",
      coinsDesc: "В EduGen каждое действие ИИ расходует определенное количество монет (кредитов). Это помогает вам планировать ресурсы.",
      coinsTableTitle: "Таблица Расхода Монет",
      coinCosts: [
        { name: "Создание Слайдов (1 страница)", cost: "1 монета" },
        { name: "Педагогический Рисунок (1 картинка)", cost: "2 монеты" },
        { name: "Storyboard & Видео (1 кадр)", cost: "5 монет" },
        { name: "Генерация Тестов (1 пакет тестов)", cost: "3 монеты" },
        { name: "Чат с ИИ (Безлимитные вопросы)", cost: "Бесплатно (0 монет)" }
      ],
      showcaseTitle: "Подробно о возможностях",
      showcaseDesc: "Познакомьтесь поближе с каждым инструментом ИИ в нашей интерактивной экосистеме.",
      featuresDetail: [
        {
          title: "Чат с ИИ и Педагогический Помощник",
          desc: "Умный помощник для составления планов уроков, простого объяснения сложных тем и подбора методик. Дает научно обоснованные ответы в соответствии со стандартами образования.",
          costInfo: "Использование: Полностью Бесплатно и Безлимитно"
        },
        {
          title: "Автоматическое Создание Слайдов",
          desc: "Создавайте презентации на 5-10 слайдов с полным контентом, иллюстрациями и заметками докладчика, просто введя тему урока. Скачивайте в PPTX и PDF.",
          costInfo: "Расход: 1 монета за каждую страницу"
        },
        {
          title: "Storyboard и Мультимедийные Кадры",
          desc: "Интерактивная раскадровка из 6-8 кадров, объясняющая тему урока визуально и сценарно. Для каждого кадра создается рисунок ИИ и аудиоскрипт.",
          costInfo: "Расход: 5 монет за каждый кадр"
        },
        {
          title: "Генератор Интерактивных Тестов",
          desc: "Создавайте тесты разной сложности (легкий, средний, сложный) по вашей теме. Удобное скачивание в PDF для раздачи ученикам на уроке.",
          costInfo: "Расход: 3 монеты за один пакет тестов"
        },
        {
          title: "Создание Педагогических Изображений",
          desc: "Создавайте качественные иллюстрации и диаграммы в 3D или векторном формате для наглядной демонстрации сложных тем (например, фотосинтез, строение атома).",
          costInfo: "Расход: 2 монеты за каждое изображение"
        }
      ],
      plans: [
        {
          name: "Free (Бесплатно)",
          price: "0",
          desc: "Бесплатный тариф для тестирования возможностей системы.",
          features: [
            "20 Монет на балансе",
            "Создание презентаций до 5 слайдов",
            "Простой ИИ-помощник чата",
            "Стандартная озвучка Google TTS",
            "Доступ к резервному генератору картинок"
          ]
        },
        {
          name: "Pro (Учитель)",
          price: "14.99",
          desc: "Для учителей, планирующих уроки на высшем профессиональном уровне.",
          features: [
            "500 Монет в месяц",
            "Безлимитные слайды и планы уроков",
            "Подробные раскадровки из 6-8 кадров",
            "Качественная озвучка Microsoft Azure Neural HD",
            "Генерация картинок через премиум Imagen 3",
            "Скачивание в PPTX и PDF"
          ],
          popular: true
        },
        {
          name: "Max (Школы)",
          price: "49.99",
          desc: "Групповой тариф для учебных центров и школ.",
          features: [
            "2500 Монет в месяц",
            "Все функции тарифа Pro",
            "Чистый экспорт PDF/PPTX без водяных знаков",
            "Приоритетная генерация контента ИИ",
            "Круглосуточная поддержка методиста",
            "Общая библиотека для преподавателей"
          ]
        }
      ],
      faqTitle: "Часто задаваемые вопросы",
      faqDesc: "Ответы на самые популярные вопросы о платформе и ее возможностях.",
      faqs: [
        { q: "Как работает EduGen?", a: "EduGen использует передовые модели ИИ (Gemini и Imagen) для генерации учебных планов, слайдов, мультимедийных раскадровок, тестов и изображений за секунды. Вам нужно лишь ввести тему урока." },
        { q: "Где хранятся персональные API-ключи?", a: "Введенные вами API-ключи в разделе Аккаунт сохраняются исключительно в локальном хранилище вашего браузера (localStorage) и передаются напрямую к моделям. Они никогда не передаются на сторонние серверы." },
        { q: "Что такое гостевой режим (Guest Mode) и бесплатен ли он?", a: "Да, гостевой режим полностью бесплатен. Он позволяет протестировать функции платформы без регистрации. При этом проекты хранятся локально в вашем браузере, а количество слайдов ограничено." },
        { q: "В чем разница между голосами Microsoft Azure и Google TTS?", a: "Нейросети Microsoft Azure Neural HD создают естественное звучание, похожее на голос настоящего учителя. Google TTS — это стандартный синтезатор речи, используемый в качестве резервного варианта." }
      ]
    },
    en: {
      subtitle: "AI-Powered Platform for Creating Modern Educational Resources",
      heroTitle: "Create the Future of Education Today",
      heroDesc: "EduGen is a smart ecosystem for teachers and educators that creates lesson plans, presentation slides, multimedia storyboards, interactive quizzes, and educational illustrations in seconds.",
      getStarted: "Start for Free",
      pricingTitle: "Pricing Plans",
      pricingDesc: "Choose the perfect plan to elevate your educational resources to the next level.",
      loginTitle: "Sign In",
      registerTitle: "Sign Up",
      emailPlaceholder: "Login or Email address",
      passwordPlaceholder: "Password",
      namePlaceholder: "Your name",
      orText: "or",
      googleBtn: "Sign in with Google",
      guestBtn: "Enter as Guest",
      haveAccount: "Already have an account? Sign In",
      noAccount: "Don't have an account? Sign Up",
      coinsTitle: "Coin System",
      coinsDesc: "In EduGen, every AI action consumes a specific number of coins (credits). This allows you to plan your resource usage efficiently.",
      coinsTableTitle: "Coin Cost Table",
      coinCosts: [
        { name: "Slide Generation (1 page)", cost: "1 coin" },
        { name: "Pedagogical Visual (1 image)", cost: "2 coins" },
        { name: "Storyboard & Video (1 frame)", cost: "5 coins" },
        { name: "Quiz Generation (1 quiz set)", cost: "3 coins" },
        { name: "AI Chat Assistant (Unlimited QA)", cost: "Free (0 coins)" }
      ],
      showcaseTitle: "Detailed Features",
      showcaseDesc: "Explore the features of each AI-powered tool in our interactive educational ecosystem.",
      featuresDetail: [
        {
          title: "AI Chat & Pedagogical Assistant",
          desc: "A smart assistant to help create lesson plans, explain complex topics simply, and choose teaching methodologies. Provides standard-aligned, scientific answers.",
          costInfo: "Usage: Completely Free & Unlimited"
        },
        {
          title: "Automated Slide Builder",
          desc: "Create full presentation slides with rich text content, embedded diagrams, and teacher speaker notes by just entering the topic. Export to PPTX and PDF.",
          costInfo: "Cost: 1 coin per page"
        },
        {
          title: "Storyboard & Multimedia Frames",
          desc: "A 6-8 frame storyboard visually mapping out the lesson topic. Automatically generates high-quality images, narration scripts, and pedagogical objectives.",
          costInfo: "Cost: 5 coins per frame"
        },
        {
          title: "Interactive Quiz Generator",
          desc: "Generate quizzes at different difficulty levels (easy, medium, hard) matching your lesson topic. Instantly download as printable PDF worksheets.",
          costInfo: "Cost: 3 coins per quiz set"
        },
        {
          title: "Pedagogical Image Creator",
          desc: "Generate scientific drawings and visual charts (e.g. photosynthesis, atomic structure) in 3D, neon, or vector styles to visually represent tough topics.",
          costInfo: "Cost: 2 coins per image"
        }
      ],
      plans: [
        {
          name: "Free",
          price: "0",
          desc: "Free guest tier to explore platform capabilities.",
          features: [
            "20 coins balance",
            "Generate slides up to 5 cards",
            "Basic AI Chat Assistant",
            "Standard Google TTS narration voice",
            "Access to fallback visual generator"
          ]
        },
        {
          name: "Pro (Teacher)",
          price: "14.99",
          desc: "For educators planning lessons at the highest professional level.",
          features: [
            "500 coins / month",
            "Unlimited slides and lesson plans",
            "Detailed 6-8 frame multimedia storyboards",
            "Microsoft Azure Neural HD voice narration",
            "Premium Imagen 3 visual generation",
            "Full PPTX and PDF downloads"
          ],
          popular: true
        },
        {
          name: "Max (Schools)",
          price: "49.99",
          desc: "Group subscription for learning centers and academic schools.",
          features: [
            "2500 coins / month",
            "All Pro features included",
            "Clean PDF/PPTX exports with no logos",
            "Priority high-speed AI processing",
            "24/7 dedicated educator assistance",
            "Shared collaboration libraries"
          ]
        }
      ],
      faqTitle: "Frequently Asked Questions",
      faqDesc: "Find answers to the most common questions about the platform and its operations.",
      faqs: [
        { q: "How does EduGen work?", a: "EduGen uses state-of-the-art AI models (Gemini and Imagen) to generate lesson plans, slides, multimedia storyboards, quizzes, and diagrams in seconds. You only need to type in your lesson topic." },
        { q: "Where are my personal API keys stored?", a: "Personal API keys entered in the Account settings are stored strictly in your browser's localStorage and sent directly to the AI models. They are never sent to or stored on our servers." },
        { q: "What is Guest Mode and is it free?", a: "Yes, Guest Mode is 100% free. It allows you to try and test the platform's capabilities without registering. However, your projects won't sync in the cloud and slides have slight limits." },
        { q: "What is the difference between Microsoft Azure and Google TTS voices?", a: "Microsoft Azure Narration offers natural, lifelike teacher speech. Google TTS is a standard fallback speech synthesizer used for fallback situations." }
      ]
    }
  };

  const t = {
    ...globalT,
    ...(landTrans[language as Language] || landTrans.uz)
  };

  const showcaseTabs = [
    { id: 0, icon: MessageSquare, color: "blue",    title: { uz: "AI Chat",     ru: "AI Чат",     en: "AI Chat"     } },
    { id: 1, icon: Presentation,  color: "indigo",  title: { uz: "Slaydlar",   ru: "Слайды",    en: "Slides"     } },
    { id: 2, icon: Video,         color: "pink",    title: { uz: "Video",      ru: "Видео",     en: "Video"      } },
    { id: 3, icon: FileText,      color: "emerald", title: { uz: "Testlar",    ru: "Тесты",     en: "Tests"      } },
    { id: 4, icon: ImageIcon,     color: "orange",  title: { uz: "Rasmlar",    ru: "Изображения", en: "Images"   } },
  ];

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
      <header className="sticky top-0 z-40 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/30 dark:border-slate-800/30 w-full transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
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
              className="hidden sm:block px-5 py-2.5 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 rounded-xl text-xs font-black transition-all shadow-xs uppercase tracking-wider cursor-pointer active:scale-95"
            >
              {t.getStarted}
            </button>
          </div>
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
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer active:scale-98 text-xs uppercase tracking-wider animate-pulse-slow"
          >
            {t.getStarted} <ArrowRight size={14} />
          </button>
        </div>

        {/* Dashboard Preview Mockup Container */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-16 relative w-full max-w-5xl mx-auto rounded-[32px] overflow-hidden border border-slate-200/50 dark:border-slate-800/80 bg-white/30 dark:bg-slate-900/30 backdrop-blur-md p-3 shadow-2xl"
        >
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-purple-500/10 to-indigo-500/10 blur-2xl opacity-80 pointer-events-none -z-10" />
          
          <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-inner">
            <img 
              src={dashboardPreview} 
              alt="EduGen Dashboard Mockup" 
              className="w-full h-auto object-cover select-none pointer-events-none dark:brightness-[0.82] dark:contrast-[1.05] dark:opacity-[0.92] transition-all duration-300"
              loading="lazy"
            />
          </div>
        </motion.div>
      </section>

      {/* Detailed Feature Showcase (Interactive Tabs Section) */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-200/50 dark:border-slate-800/50">
        <div className="text-center mb-12">
          <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full mb-3 inline-block">
            🔍 Barcha Imkoniyatlar
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-950 dark:text-white mb-3 tracking-tight">
            {t.showcaseTitle}
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold max-w-md mx-auto">
            {t.showcaseDesc}
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-10">
          {showcaseTabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            const tabTitle = tab.title[language as Language] || tab.title.uz;
            let activeStyle = "";
            if (tab.color === "blue") activeStyle = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
            if (tab.color === "indigo") activeStyle = "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30";
            if (tab.color === "pink") activeStyle = "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30";
            if (tab.color === "emerald") activeStyle = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
            if (tab.color === "orange") activeStyle = "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30";

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 border cursor-pointer active:scale-95 ${
                  isActive
                    ? `${activeStyle} shadow-xs font-black`
                    : "border-slate-200/40 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                }`}
              >
                <IconComponent size={13} />
                <span>{tabTitle}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tab Panel */}
        <div className="relative min-h-[440px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/80 rounded-[32px] p-6 md:p-10 shadow-2xl flex flex-col md:flex-row items-center gap-10 lg:gap-16"
            >
              {/* Left Side: Content */}
              <div className="flex-1 space-y-6 text-left">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs border ${
                  activeTab === 0 ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                  activeTab === 1 ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" :
                  activeTab === 2 ? "bg-pink-500/10 text-pink-600 border-pink-500/20" :
                  activeTab === 3 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                  "bg-orange-500/10 text-orange-600 border-orange-500/20"
                }`}>
                  {activeTab === 0 && <MessageSquare size={22} />}
                  {activeTab === 1 && <Presentation size={22} />}
                  {activeTab === 2 && <Video size={22} />}
                  {activeTab === 3 && <FileText size={22} />}
                  {activeTab === 4 && <ImageIcon size={22} />}
                </div>

                <h3 className="text-lg lg:text-xl font-black tracking-tight text-slate-950 dark:text-white uppercase">
                  {t.featuresDetail[activeTab].title}
                </h3>
                
                <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  {t.featuresDetail[activeTab].desc}
                </p>

                <div className={`inline-block px-4 py-2 rounded-2xl text-[10px] font-extrabold tracking-wide uppercase ${
                  activeTab === 0 ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" :
                  activeTab === 1 ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" :
                  activeTab === 2 ? "bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400" :
                  activeTab === 3 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" :
                  "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
                }`}>
                  {t.featuresDetail[activeTab].costInfo}
                </div>
              </div>

              {/* Right Side: Mockup Preview */}
              <div className="flex-1 w-full flex items-center justify-center">
                {activeTab === 0 && (
                  <div className="w-full max-w-md bg-slate-950 text-slate-100 rounded-[32px] p-6 border border-slate-800 shadow-2xl font-mono text-left relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-900 pb-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      <span className="text-[9px] text-slate-600 ml-2 font-black font-sans tracking-widest uppercase">EduGen AI Chatbot</span>
                    </div>
                    <div className="space-y-4 text-[10px]">
                      <div className="bg-slate-900/80 p-3.5 rounded-2xl rounded-tl-none border border-slate-800 max-w-[85%] font-sans">
                        <span className="text-blue-400 font-black block mb-1 uppercase tracking-wider text-[8px]">EduGen AI:</span>
                        Dars rejasini boyitish yoki pedagogik metodlar tanlashda qanday mavzu bo'yicha yordam beray?
                      </div>
                      <div className="bg-blue-600/15 text-blue-200 p-3.5 rounded-2xl rounded-tr-none border border-blue-500/20 max-w-[85%] ml-auto text-right font-sans">
                        <span className="text-blue-400 font-black block mb-1 uppercase tracking-wider text-[8px]">O'qituvchi:</span>
                        Fotosintez barglarning nafas olishi darsiga interaktiv faollik taklif qil
                      </div>
                      <div className="bg-slate-900/80 p-3.5 rounded-2xl rounded-tl-none border border-slate-800 max-w-[90%] font-sans animate-pulse-slow">
                        <span className="text-blue-400 font-black block mb-1 uppercase tracking-wider text-[8px]">EduGen AI:</span>
                        <strong>Sinf tajribasi:</strong> Barglarni bankaga solib, karbonat angidrid to'planishini ko'rsatish. O'quvchilarni visual storyboard yordamida guruhlarga bo'lish...
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 1 && (
                  <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-[32px] p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden text-left">
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex justify-between items-center text-[9px] font-black text-slate-400 tracking-wider">
                      <span className="uppercase">TAQDIMOT SLAYDI</span>
                      <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-lg">SLAYD #3</span>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-2xl p-6 aspect-video flex flex-col justify-between shadow-lg relative overflow-hidden">
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:14px_24px]"></div>
                      <h4 className="text-xs lg:text-sm font-black tracking-tight leading-tight z-10">Fotosintez: Xloroplastlar vazifasi</h4>
                      <div className="space-y-1.5 text-[8px] font-semibold text-indigo-100 z-10">
                        <p className="flex items-center gap-1">🟢 Xlorofill donachalari yorug'likni yutadi.</p>
                        <p className="flex items-center gap-1">🟢 Suv va CO₂ dan glyukoza hosil bo'ladi.</p>
                        <p className="flex items-center gap-1">🟢 Kislorod havoga nojo'ya mahsulot sifatida chiqadi.</p>
                      </div>
                      <span className="text-[5px] opacity-65 tracking-widest font-black uppercase z-10">EDUGEN PRESENTATION BUILDER</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-[8px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                      <span className="text-slate-700 dark:text-slate-200 font-black block mb-0.5 uppercase tracking-wider text-[7px] text-indigo-500">🗣️ O'qituvchi uchun izoh (Speaker Notes):</span>
                      Sinfga xloroplast donachasining mikroskop ostidagi ko'rinishini slayd bilan birga tushuntiring.
                    </div>
                  </div>
                )}

                {activeTab === 2 && (
                  <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-[32px] p-6 shadow-2xl flex flex-col gap-3 relative overflow-hidden text-left">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Storyboard Multimedia (Kadr #1)</span>
                    <div className="relative rounded-2xl overflow-hidden aspect-video border border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 flex items-center justify-center group cursor-pointer shadow-inner">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                      
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-600 blur-md opacity-30 animate-pulse"></div>
                        <div className="w-16 h-16 rounded-full border border-dashed border-pink-500/30 animate-spin-slow"></div>
                      </div>
                      
                      <div className="absolute bottom-3 left-3 z-25 text-white text-[9px] font-black uppercase tracking-wide">1. Atom yadrosi va elektronlar</div>
                      <div className="absolute z-25 w-11 h-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 group-hover:scale-105 group-hover:bg-white/20 transition-all shadow-md">
                        <svg className="w-4 h-4 fill-current ml-0.5 text-pink-400" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    </div>
                    <div className="text-[8px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-850">
                      <span className="font-black text-slate-700 dark:text-slate-200 block uppercase tracking-wider text-[7px] text-pink-550 mb-0.5">🗣️ Dars Narratsiyasi (Ssenariy):</span>
                      "Tasavvur qiling, har bir moddaning asosi bo'lgan atom markazida musbat yadro, uning atrofida esa sayyoralardek elektronlar aylanadi..."
                    </div>
                  </div>
                )}

                {activeTab === 3 && (
                  <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-[32px] p-6 shadow-2xl flex flex-col gap-4 text-left relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Interfaol Test Simulyatori (Demo)</span>
                    <h4 className="text-[11px] font-black text-slate-800 dark:text-white leading-normal">
                      Moddalar tarkibidagi atomlar bir-biri bilan qanday bog'lanadi?
                    </h4>
                    <div className="space-y-2">
                      {[
                        { id: 1, text: "A) Gravitatsion kuchlar orqali", correct: false },
                        { id: 2, text: "B) Kimyoviy bog'lanishlar (kovalent/ion)", correct: true },
                        { id: 3, text: "C) Mexanik ishqalanish yordamida", correct: false }
                      ].map((opt) => {
                        let style = "border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300";
                        if (quizSelected !== null) {
                          if (opt.id === quizSelected) {
                            style = opt.correct 
                              ? "border-emerald-500 bg-emerald-50/20 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 ring-1 ring-emerald-500"
                              : "border-rose-500 bg-rose-50/20 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 ring-1 ring-rose-500";
                          } else if (opt.correct) {
                            style = "border-emerald-500 bg-emerald-50/10 text-emerald-600 dark:bg-emerald-950/10 dark:text-emerald-400";
                          }
                        }
                        return (
                          <button
                            key={opt.id}
                            onClick={() => setQuizSelected(opt.id)}
                            className={`w-full p-3.5 rounded-xl border text-[9px] font-bold transition-all text-left flex justify-between items-center cursor-pointer active:scale-99 ${style}`}
                          >
                            <span>{opt.text}</span>
                            {quizSelected !== null && opt.id === quizSelected && (
                              <span className="text-[8px] font-black uppercase tracking-wider">{opt.correct ? "✓ To'g'ri" : "✗ Noto'g'ri"}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 4 && (
                  <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-[32px] p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden text-left">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex justify-between items-center text-[9px] font-black text-slate-400">
                      <span className="uppercase tracking-wider">TA'LIMIY DIAGRAMMA</span>
                      <span className="bg-orange-50 dark:bg-orange-900/30 text-orange-600 px-2.5 py-0.5 rounded-lg">3D USLUB</span>
                    </div>
                    <div className="relative aspect-square max-w-[180px] mx-auto rounded-full flex items-center justify-center border-4 border-slate-100 dark:border-slate-800/60 shadow-xl overflow-hidden p-6 bg-slate-50 dark:bg-slate-950">
                      <div className="absolute w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center text-white text-[7px] font-black shadow-md shadow-orange-500/40 animate-pulse">YADRO</div>
                      <div className="absolute w-20 h-20 rounded-full border border-dashed border-slate-300 dark:border-slate-700 animate-spin-slow"></div>
                      <div className="absolute w-32 h-32 rounded-full border border-dashed border-slate-200/80 animate-spin-reverse"></div>
                      <div className="absolute top-8 left-8 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-md animate-bounce"></div>
                      <div className="absolute bottom-10 right-6 w-2 h-2 rounded-full bg-emerald-500 shadow-md animate-ping"></div>
                    </div>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">
                      Mavzu: Kislorod Atom tuzilishi (Diagramma)
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
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
                  <li key={featIdx} className="flex items-start gap-2.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
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

        {/* Sleek Accordion for Coin Costs (Tangacha Sarfi) */}
        <div className="mt-12 max-w-xl mx-auto">
          <div className="border border-slate-200/50 dark:border-slate-800/80 rounded-[24px] bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl overflow-hidden shadow-md">
            <button
              onClick={() => setShowCoinsTable(!showCoinsTable)}
              className="w-full px-6 py-4 flex items-center justify-between text-left cursor-pointer focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  🪙 {t.coinsTitle} (Tushuntirish)
                </span>
              </div>
              <span className="text-slate-500">
                {showCoinsTable ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {showCoinsTable && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="px-6 pb-6 pt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/50 space-y-4">
                    <p className="font-bold text-slate-650 dark:text-slate-350">{t.coinsDesc}</p>
                    <div className="space-y-2">
                      {t.coinCosts && t.coinCosts.map((item: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-950/60 border border-slate-150 dark:border-slate-900/60 rounded-xl transition-colors"
                        >
                          <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{item.name}</span>
                          <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-lg">
                            {item.cost}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </section>

      {/* Accordion FAQ Section */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-black text-slate-950 dark:text-white mb-2">{t.faqTitle}</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold max-w-md mx-auto">{t.faqDesc}</p>
        </div>

        <div className="space-y-4">
          {t.faqs && t.faqs.map((faq: any, idx: number) => {
            const isOpen = openFaq === idx;
            return (
              <div 
                key={idx} 
                className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs hover:border-slate-350 dark:hover:border-slate-700 transition-all duration-300"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left cursor-pointer focus:outline-none"
                >
                  <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{faq.q}</span>
                  <span className="text-slate-500">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>
                
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-6 pb-5 pt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/50">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
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
              <div className="flex gap-1.5 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                <button
                  onClick={() => { setAuthMode("login"); setErrorMsg(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    authMode === "login"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  {t.loginTitle}
                </button>
                <button
                  onClick={() => { setAuthMode("register"); setErrorMsg(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    authMode === "register"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white"
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
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold"
                    />
                  </div>
                )}

                <div className="relative flex items-center">
                  <Mail size={14} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={t.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold"
                  />
                </div>

                <div className="relative flex items-center">
                  <Lock size={14} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="password"
                    placeholder={t.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold"
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
                  className="w-full py-3.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 uppercase tracking-wider shadow-xs"
                >
                  <Chrome size={14} className="text-blue-500" />
                  {t.googleBtn}
                </button>

                <button
                  onClick={handleGuestLogin}
                  disabled={loading}
                  className="w-full py-3.5 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 uppercase tracking-wider shadow-md"
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
