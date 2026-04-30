import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageSquare, ImageIcon, Presentation, Globe, Moon, Sun, FileText, Video, User, Menu, X, Sparkles } from "lucide-react";
import { auth } from "../lib/firebase";
import { cn } from "../lib/utils";
import { useAppContext } from "../lib/AppContext";
import { Language } from "../lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { theme, language, setTheme, setLanguage, t } = useAppContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(auth.currentUser);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  const navItems = [
    { name: t.chat, path: "/chat", icon: MessageSquare, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30", borderColor: "border-blue-100 dark:border-blue-800/50" },
    { name: t.imageGen, path: "/image", icon: ImageIcon, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/30", borderColor: "border-orange-100 dark:border-orange-800/50" },
    { name: t.slideGen, path: "/slide", icon: Presentation, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/30", borderColor: "border-indigo-100 dark:border-indigo-800/50" },
    { name: t.testBtn, path: "/test", icon: FileText, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30", borderColor: "border-emerald-100 dark:border-emerald-800/50" },
    { name: t.videosBtn, path: "/video", icon: Video, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-900/30", borderColor: "border-pink-100 dark:border-pink-800/50" },
    { name: t.community, path: "/", icon: Globe, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/30", borderColor: "border-purple-100 dark:border-purple-800/50" },
    { name: t.accountBtn, path: "/account", icon: User, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800/50", borderColor: "border-slate-200 dark:border-slate-700/50" },
  ];

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-1.5 px-4">
      {navItems.map((item) => {
        const active = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300",
              active
                ? `${item.bg} ${item.color} shadow-sm border ${item.borderColor}`
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent"
            )}
          >
            {active && (
              <motion.div
                layoutId="activeNav"
                className="absolute left-0 w-1.5 h-7 bg-current rounded-r-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <item.icon size={22} className={cn("transition-transform duration-300 group-hover:scale-110 shrink-0", active ? item.color : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
            <span className="font-bold text-[14px] tracking-tight whitespace-nowrap">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50 flex-col justify-between hidden md:flex shrink-0 z-20 py-8 shadow-2xl shadow-slate-200/20 dark:shadow-none">
        <div>
          <div className="px-8 flex items-center gap-4 mb-10 group cursor-pointer">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:rotate-6 transition-transform">
              <Sparkles size={22} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tighter text-slate-900 dark:text-white leading-none">EduGen</span>
            </div>
          </div>
          <NavLinks />
        </div>

        <div className="px-6 mt-auto">
           <div className="bg-slate-100/50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50 hover:text-blue-600 transition-all active:scale-95"
                >
                  {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="bg-transparent text-xs font-black text-slate-500 dark:text-slate-400 outline-none cursor-pointer uppercase tracking-widest hover:text-blue-500 transition-colors"
                >
                  <option value="uz">UZB</option>
                  <option value="ru">RUS</option>
                  <option value="en">ENG</option>
                </select>
              </div>
           </div>
        </div>
      </aside>

      {/* Mobile nav overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-md md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-slate-900 flex flex-col py-8 shadow-2xl md:hidden border-r border-slate-200/50 dark:border-slate-800/50"
          >
            <div className="flex items-center justify-between px-8 mb-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Sparkles size={20} />
                </div>
                <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">EduGen</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                <X size={20} />
              </button>
            </div>

            <NavLinks onNavigate={() => setMobileOpen(false)} />

            <div className="px-8 mt-auto flex items-center justify-between">
              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500"
              >
                {theme === "light" ? <Moon size={22} /> : <Sun size={22} />}
              </button>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-400 outline-none uppercase tracking-widest"
              >
                <option value="uz">O'zbek</option>
                <option value="ru">Ruscha</option>
                <option value="en">English</option>
              </select>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 px-4 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Menu size={20} />
            </button>
            <span className="text-lg font-black tracking-tighter text-slate-900 dark:text-white uppercase">EduGen</span>
          </div>
          <Link to="/account" className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50 overflow-hidden">
            {currentUser?.photoURL
              ? <img src={currentUser.photoURL} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              : (currentUser?.displayName?.charAt(0) || <User size={20} />)}
          </Link>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex h-20 bg-transparent px-10 items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-4">
            <div className="h-8 w-1 bg-blue-600 rounded-full"></div>
            <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
              {navItems.find(i => i.path === location.pathname)?.name || "Bosh sahifa"}
            </h1>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
              <Link to="/slide" className="px-5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all uppercase tracking-wider">{t.slidesBtn}</Link>
              <Link to="/chat" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all uppercase tracking-wider">{t.newProject}</Link>
            </div>
            
            <Link to="/account" className="flex items-center gap-3 pl-2 pr-4 py-1.5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/50 hover:border-blue-500 transition-all group">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black overflow-hidden shadow-sm border border-blue-200/50 dark:border-blue-800/50 group-hover:scale-105 transition-transform">
                {currentUser?.photoURL
                  ? <img src={currentUser.photoURL} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  : (currentUser?.displayName?.charAt(0) || <User size={18} />)}
              </div>
              <div className="flex flex-col">
                 <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 leading-none truncate max-w-[80px]">
                   {currentUser?.displayName || "Mehmon"}
                 </span>
                 <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Profil</span>
              </div>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-transparent relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
