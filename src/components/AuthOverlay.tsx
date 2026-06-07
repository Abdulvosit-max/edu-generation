import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import Home from "../pages/Home";

export default function AuthOverlay({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user: User | null) => {
      setCurrentUser(user);
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

  // Tizimga kirmagan bo'lsa -> Landing / Bosh sahifani ko'rsatish
  if (!currentUser) {
    return <Home />;
  }

  // Tizimga kirgan bo'lsa -> Ilovani ochish
  return <>{children}</>;
}
