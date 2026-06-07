import { Settings, Mail, Shield, LogOut, LogIn, Sparkles } from "lucide-react";
import { useAppContext } from "../lib/AppContext";
import { auth, logout, signInWithGoogle } from "../lib/firebase";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

/**
 * Foydalanuvchi akkaunti va ilova sozlamalari sahifasi.
 */
export default function Account() {
  const { t, theme, language, setTheme, setLanguage } = useAppContext();
  const user = auth.currentUser;

  // Mehmon foydalanuvchimi? (Demo rejimida kirganlari)
  const isGuest = !user || user.uid === "demo-user-123";
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      window.location.reload();
    } catch (e) {
      console.error("Google login xatosi:", e);
    } finally {
      setGoogleLoading(false);
    }
  };



  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto h-full flex flex-col">


      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
           <Settings className="text-slate-600 dark:text-slate-400" /> {t.accountSettings}
        </h1>
      </div>

      {/* Mehmon foydalanuvchi uchun Google login banner */}
      {isGuest && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-5 shadow-xl shadow-blue-500/20"
        >
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <Sparkles size={28} className="text-white" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-black text-white mb-1">Google bilan kiring — kengaytirilgan imkoniyatlar!</h3>
            <p className="text-sm text-blue-100 leading-relaxed">
              Hozir siz mehmon rejimida ishlayapsiz. Google bilan kirganingizda ishlaringiz bulutda saqlanadi
              va barcha qurilmalaringizda sinxronlashadi.
            </p>
          </div>
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="shrink-0 flex items-center gap-2.5 bg-white text-blue-700 font-black py-3 px-6 rounded-2xl hover:bg-blue-50 transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-70"
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogIn size={18} />
            )}
            Google bilan kirish
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-5 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" referrerPolicy="no-referrer" className="w-24 h-24 rounded-full shadow-md mb-4 border-4 border-slate-50 dark:border-slate-700" />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-md border-4 border-slate-50 dark:border-slate-700">
                {user?.displayName?.charAt(0) || 'U'}
              </div>
            )}
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2">
              {user?.displayName || "Foydalanuvchi"}
              {(user?.displayName?.includes("(Pro)") || 
                user?.email === "murodillo@edu-generation.uz" || 
                user?.email === "zokirjonovabdulvosit002@gmail.com") && (
                <span className="bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 shadow-sm shadow-amber-500/20">
                  PRO
                </span>
              )}
             </h2>
            <div className="flex items-center justify-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-2">
              <Mail size={14} />
              {user?.email}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-4 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full">
              <Shield size={14} />
              {user?.isAnonymous ? "Mehmon rejimi (Demo)" : "Tasdiqlangan foydalanuvchi"}
            </div>

            <button
              onClick={async () => {
                try {
                  await logout();
                  window.location.reload();
                } catch (e) {
                  alert(t.errorOccurred || "Xatolik yuz berdi");
                }
              }}
              className="mt-8 w-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold py-3.5 px-6 rounded-2xl border border-rose-100 dark:border-rose-900/30 transition-all flex justify-center items-center gap-2 cursor-pointer animate-pulse-slow"
            >
              <LogOut size={16} /> {t.logout}
            </button>
          </div>
        </div>

        {/* Settings Card */}
        <div className="md:col-span-7 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Ilova sozlamalari */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">Ilova Sozlamalari</h3>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tema (Mavzu)</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex-1 py-3 rounded-xl border font-medium text-sm transition-colors ${theme === 'light' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'}`}
                  >
                    Yorug'
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex-1 py-3 rounded-xl border font-medium text-sm transition-colors ${theme === 'dark' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'}`}
                  >
                    Qorong'i
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Til</label>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl outline-none focus:ring-2 font-medium focus:ring-blue-500"
                >
                  <option value="uz">O'zbek tili (UZ)</option>
                  <option value="ru">Русский (RU)</option>
                  <option value="en">English (EN)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

