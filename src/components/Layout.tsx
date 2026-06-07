import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  MessageSquare, ImageIcon, Presentation, Globe,
  Moon, Sun, FileText, Video, User, Menu, X, Sparkles
} from "lucide-react";
import { auth } from "../lib/firebase";
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
    const unsub = onAuthStateChanged(auth, (u) => setCurrentUser(u));
    return () => unsub();
  }, []);

  const navItems = [
    { name: t.chat,       path: "/chat",    icon: MessageSquare },
    { name: t.imageGen,   path: "/image",   icon: ImageIcon },
    { name: t.slideGen,   path: "/slide",   icon: Presentation },
    { name: t.testBtn,    path: "/test",    icon: FileText },
    { name: t.videosBtn,  path: "/video",   icon: Video },
    { name: t.community,  path: "/",        icon: Globe },
    { name: t.accountBtn, path: "/account", icon: User },
  ];

  const NavLinks = ({ onNav }: { onNav?: () => void }) => (
    <nav className="flex flex-col gap-0.5 px-3">
      {navItems.map((item) => {
        const active = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNav}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
              active
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            <item.icon size={20} className={active ? "text-blue-600 dark:text-blue-400" : ""} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans overflow-hidden">

      {/* Desktop Sidebar */}
      <aside className="w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col justify-between hidden md:flex shrink-0 z-20">
        {/* Logo */}
        <div>
          <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="text-base font-semibold text-gray-900 dark:text-white">EduGen</span>
          </div>
          <div className="py-4">
            <NavLinks />
          </div>
        </div>

        {/* Bottom controls */}
        <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="flex items-center justify-center w-9 h-9 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-transparent outline-none cursor-pointer uppercase tracking-wider hover:text-blue-600 transition-colors"
          >
            <option value="uz">UZ</option>
            <option value="ru">RU</option>
            <option value="en">EN</option>
          </select>
          <div className="ml-auto">
            <Link to="/account">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold overflow-hidden">
                {currentUser?.photoURL
                  ? <img src={currentUser.photoURL} alt="profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  : (currentUser?.displayName?.charAt(0)?.toUpperCase() || <User size={16} />)}
              </div>
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-900 flex flex-col md:hidden border-r border-gray-200 dark:border-gray-800"
          >
            <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Sparkles size={16} className="text-white" />
                </div>
                <span className="text-base font-semibold text-gray-900 dark:text-white">EduGen</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="py-4 flex-1">
              <NavLinks onNav={() => setMobileOpen(false)} />
            </div>
            <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="text-sm font-medium text-gray-600 dark:text-gray-400 bg-transparent outline-none uppercase"
              >
                <option value="uz">O'zbek</option>
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Mobile header */}
        <header className="md:hidden h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600"
            >
              <Menu size={20} />
            </button>
            <span className="text-base font-semibold text-gray-900 dark:text-white">EduGen</span>
          </div>
          <Link to="/account">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 overflow-hidden text-xs font-bold">
              {currentUser?.photoURL
                ? <img src={currentUser.photoURL} alt="profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                : (currentUser?.displayName?.charAt(0)?.toUpperCase() || <User size={16} />)}
            </div>
          </Link>
        </header>

        {/* Desktop topbar */}
        <header className="hidden md:flex h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 items-center justify-between shrink-0">
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">
            {navItems.find(i => i.path === location.pathname)?.name || "EduGen"}
          </h1>
          <div className="flex items-center gap-2">
            <Link
              to="/account"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 overflow-hidden text-xs font-bold">
                {currentUser?.photoURL
                  ? <img src={currentUser.photoURL} alt="profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  : (currentUser?.displayName?.charAt(0)?.toUpperCase() || <User size={14} />)}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                {currentUser?.displayName || t.accountBtn}
              </span>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
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
