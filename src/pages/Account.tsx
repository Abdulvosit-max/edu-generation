import { Settings, User, Mail, Shield, LogOut } from "lucide-react";
import { useAppContext } from "../lib/AppContext";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";

export default function Account() {
  const { t, theme, language, setTheme, setLanguage } = useAppContext();
  const user = auth.currentUser;

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-3">
           <Settings className="text-slate-600 dark:text-slate-400" /> {t.accountSettings}
        </h1>
      </div>

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
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{user?.displayName || "Foydalanuvchi"}</h2>
            <div className="flex items-center justify-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-2">
              <Mail size={14} />
              {user?.email}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-4 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full">
              <Shield size={14} />
              Verified
            </div>
          </div>
          
          <button 
             onClick={handleLogout}
             className="w-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/30"
          >
             <LogOut size={18} />
             {t.logout}
          </button>
        </div>

        {/* Settings Card */}
        <div className="md:col-span-7 flex flex-col gap-6">
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
