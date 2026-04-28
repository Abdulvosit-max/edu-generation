// Autentifikatsiya qatlami komponenti
// Foydalanuvchi tizimga kirmaganda login ekranini ko'rsatadi

import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, User } from "firebase/auth";
import { useAppContext } from "../lib/AppContext";

/**
 * AuthOverlay — autentifikatsiya holati bo'yicha router.
 * - Yuklanayotganda: spinner ko'rsatadi
 * - Kirmaganda: Google login ekranini ko'rsatadi
 * - Kirganda: children (asosiy ilova) ko'rsatadi
 */
export default function AuthOverlay({ children }: { children: React.ReactNode }) {
  // Firebase User tipidan foydalanamiz — any emas
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useAppContext();

  useEffect(() => {
    // Firebase auth holatini kuzatish (real vaqt)
    const unsub = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setLoading(false);
    });
    // Komponent unmount bo'lganda listener bekor qilinadi
    return () => unsub();
  }, []);

  /**
   * Google OAuth popup orqali tizimga kirish.
   * Xato bo'lsa foydalanuvchiga xabar ko'rsatiladi.
   */
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google login xatosi:", error);
      alert(t.loginError);
    }
  };

  // Yuklanish holati — animatsiyali indikator
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-blue-50 dark:bg-slate-900 text-blue-600 dark:text-blue-400">
        <div className="animate-pulse font-bold text-xl">{t.loading}</div>
      </div>
    );
  }

  // Foydalanuvchi kirmagan — login ekrani
  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 text-center border border-slate-100 dark:border-slate-700">
          {/* Logo */}
          <div className="w-16 h-16 bg-blue-600 text-white text-3xl font-bold flex items-center justify-center rounded-2xl mx-auto mb-6 shadow-sm dark:shadow-blue-900/30">E</div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Edu-Generation</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto text-sm">{t.appDesc}</p>
          {/* Google bilan kirish tugmasi */}
          <button
            onClick={loginWithGoogle}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 outline-none flex justify-center items-center gap-3 shadow-sm hover:-translate-y-0.5 active:translate-y-0"
          >
            {t.loginGoogle}
          </button>
        </div>
      </div>
    );
  }

  // Foydalanuvchi kirgan — asosiy ilovani ko'rsatish
  return <>{children}</>;
}
