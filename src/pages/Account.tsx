import { Settings, Mail, Shield, LogOut, LogIn, Sparkles, CreditCard, Award, Clock } from "lucide-react";
import { useAppContext } from "../lib/AppContext";
import { auth, logout, signInWithGoogle } from "../lib/firebase";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import PaymentRequestModal from "../components/PaymentRequestModal";

/**
 * Foydalanuvchi akkaunti va ilova sozlamalari sahifasi.
 */
export default function Account() {
  const { t, theme, language, setTheme, setLanguage, subscriptionPlan, subscriptionStatus, pendingPlan } = useAppContext();
  const user = auth.currentUser;

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"PRO" | "MAX">("PRO");


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
              {subscriptionPlan === "MAX" ? (
                <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md shrink-0 shadow-sm shadow-fuchsia-500/25 animate-pulse-slow">
                  MAX
                </span>
              ) : subscriptionPlan === "PRO" ? (
                <span className="bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 shadow-sm shadow-amber-500/20">
                  PRO
                </span>
              ) : null}
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

          {/* Obuna va Tarif Rejalari */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <Award className="text-blue-500" size={20} /> Obuna va Tariflar
            </h3>

            {/* Pending payment request warning banner */}
            {subscriptionStatus === "pending" && (
              <div className="mb-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-4 flex gap-3 items-start animate-pulse-slow">
                <Clock className="text-amber-500 mt-0.5 shrink-0" size={16} />
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider block">
                    To'lov arizasi kutilmoqda
                  </span>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-normal font-semibold">
                    Sizning <strong>{pendingPlan}</strong> tarifi uchun to'lov arizangiz yuborilgan. To'lov tasdiqlangach, tarifingiz avtomatik ravishda faollashadi.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-150 dark:border-slate-850">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Joriy tarifingiz</span>
                  <span className="text-sm font-black text-slate-850 dark:text-white uppercase mt-0.5 block">{subscriptionPlan} PLAN</span>
                </div>
                {subscriptionPlan === "MAX" ? (
                  <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-md animate-pulse">
                    MAX TIER ACTIVE
                  </span>
                ) : subscriptionPlan === "PRO" ? (
                  <span className="bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl">
                    PRO ACTIVE
                  </span>
                ) : (
                  <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl">
                    FREE PLAN
                  </span>
                )}
              </div>

              {/* Upgrade triggers */}
              {subscriptionPlan !== "MAX" && (
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">Mavjud yangilanishlar</span>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {subscriptionPlan === "FREE" && (
                      <button
                        onClick={() => {
                          setSelectedPlan("PRO");
                          setPaymentModalOpen(true);
                        }}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center active:scale-95 shadow-lg shadow-blue-500/10"
                      >
                        PRO (29,000 UZS)
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedPlan("MAX");
                        setPaymentModalOpen(true);
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-750 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center active:scale-95 shadow-lg shadow-fuchsia-500/15"
                    >
                      MAX (59,000 UZS)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PaymentRequestModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        initialPlan={selectedPlan}
      />
    </div>
  );
}


