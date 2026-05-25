// AuthOverlay — Mehmon rejimini qo'llab-quvvatlash
// Foydalanuvchi login qilmasa ham barcha funksiyalardan foydalana oladi.
// Google kirish — ixtiyoriy (bulut sinxronizatsiyasi uchun).

import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { signInAsDemo } from "../lib/firebase";

/**
 * AuthOverlay — autentifikatsiya holatini boshqaradi.
 *
 * Xatti-harakat:
 * - Yuklanayotganda: kichik spinner ko'rsatiladi
 * - Firebase foydalanuvchi yo'q bo'lsa → avtomatik "Mehmon" rejimiga kiradi
 * - Google bilan kirgan bo'lsa → haqiqiy foydalanuvchi sifatida ishlaydi
 * - Har ikki holatda ham BARCHA funksiyalar ishlaydi
 */
export default function AuthOverlay({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        // Foydalanuvchi kirmagan → avtomatik Mehmon rejimiga kirish
        try {
          await signInAsDemo();
        } catch (e) {
          console.warn("Mehmon rejimica kirish muvaffaqiyatsiz:", e);
        }
      }
      setReady(true);
    });
    return () => unsub();
  }, []);

  // Holat aniqlanguncha minimal loading
  if (!ready) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 animate-pulse">
            EduGen yuklanmoqda...
          </span>
        </div>
      </div>
    );
  }

  // Tayyor — ilovani ko'rsatamiz
  return <>{children}</>;
}
