import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageSquare, ImageIcon, Presentation, Globe, LogOut, Moon, Sun, FileText, Video, Settings, User } from "lucide-react";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { cn } from "../lib/utils";
import { useAppContext } from "../lib/AppContext";
import { Language } from "../lib/i18n";

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { theme, language, setTheme, setLanguage, t } = useAppContext();

  const handleLogout = () => {
    signOut(auth);
  };

  const navItems = [
    { name: t.chat, path: "/chat", icon: MessageSquare, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" },
    { name: t.imageGen, path: "/image", icon: ImageIcon, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/30" },
    { name: t.slideGen, path: "/slide", icon: Presentation, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30" },
    { name: t.testBtn, path: "/test", icon: FileText, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/30" },
    { name: t.videosBtn, path: "/video", icon: Video, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-900/30" },
    { name: t.community, path: "/", icon: Globe, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/30" },
    { name: t.accountBtn, path: "/account", icon: User, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col justify-between hidden md:flex shrink-0 z-10 py-6">
        <div>
          <div className="px-6 font-bold text-2xl tracking-tight flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 via-orange-500 to-green-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200 dark:shadow-orange-900/20">E</div>
            <span className="text-slate-800 dark:text-slate-200">EduGen</span>
          </div>
          <nav className="flex flex-col gap-2 px-4">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300",
                    active ? `${item.bg} ${item.color} shadow-sm border border-slate-100 dark:border-slate-700/50` : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  <item.icon size={24} className={cn("transition-transform duration-300 group-hover:scale-110", active ? item.color : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
                  <span className="font-semibold text-sm">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="px-6 mt-auto flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4 mb-2">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <select
               value={language}
               onChange={(e) => setLanguage(e.target.value as Language)}
               className="bg-transparent text-sm font-medium text-slate-500 dark:text-slate-400 outline-none cursor-pointer"
            >
              <option value="uz">UZ</option>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </select>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-4 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium w-full"
          >
            <LogOut size={24} />
            {t.logout}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 font-bold text-xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-200 dark:shadow-blue-900 text-lg">E</div>
            <span className="text-slate-800 dark:text-slate-200">EduGen</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
            </button>
            <button onClick={handleLogout} className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"><LogOut size={24} /></button>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">Edu-generation</h1>
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase rounded tracking-wider">Education AI</span>
          </div>
          <div className="flex gap-4 items-center">
            <Link to="/slide" className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors">{t.slidesBtn}</Link>
            <Link to="/chat" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-md shadow-blue-100 dark:shadow-blue-900/20 transition-colors">{t.newProject}</Link>
            <Link to="/account" className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:ring-2 ring-blue-500 transition-all font-bold overflow-hidden shadow-sm border border-blue-200 dark:border-blue-800">
               {auth.currentUser?.photoURL ? <img src={auth.currentUser.photoURL} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : (auth.currentUser?.displayName?.charAt(0) || <User size={18} />)}
            </Link>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900">
          {children}
        </div>
      </main>
    </div>
  );
}
