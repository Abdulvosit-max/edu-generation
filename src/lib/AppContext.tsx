import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from './i18n';
import { auth } from './firebase';
import { fetchSubscriptionStatus } from './db';

type Theme = 'light' | 'dark';

interface AppContextType {
  theme: Theme;
  language: Language;
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
  t: typeof translations['uz'];
  subscriptionPlan: 'FREE' | 'PRO' | 'MAX';
  subscriptionStatus: 'pending' | 'approved' | 'rejected' | null;
  pendingPlan: 'PRO' | 'MAX' | null;
  refreshSubscription: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'light';
  });
  
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('language') as Language) || 'uz';
  });

  const [subscriptionPlan, setSubscriptionPlan] = useState<'FREE' | 'PRO' | 'MAX'>('FREE');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [pendingPlan, setPendingPlan] = useState<'PRO' | 'MAX' | null>(null);

  const refreshSubscription = async () => {
    const user = auth.currentUser;
    if (!user || user.uid === "demo-user-123") {
      setSubscriptionPlan('FREE');
      setSubscriptionStatus(null);
      setPendingPlan(null);
      return;
    }

    // Default fallbacks (offline/mock support)
    let fallbackPlan: 'FREE' | 'PRO' | 'MAX' = 'FREE';
    if (user.email === 'zokirjonovabdulvosit002@gmail.com' || user.email === 'murodillomusajonov@gmail.com') {
      fallbackPlan = 'MAX';
    } else if (user.email === 'murodillo@edu-generation.uz' || user.displayName?.includes('(Pro)')) {
      fallbackPlan = 'PRO';
    }

    try {
      const statusData = await fetchSubscriptionStatus(user.uid);
      if (statusData) {
        // Map backend lowercase names to context uppercase values
        const backendPlan = (statusData.plan || 'free').toUpperCase() as 'FREE' | 'PRO' | 'MAX';
        
        // If the backend plan is free, but the fallback plan is higher, we respect the fallback
        if (backendPlan === 'FREE' && fallbackPlan !== 'FREE') {
          setSubscriptionPlan(fallbackPlan);
        } else {
          setSubscriptionPlan(backendPlan);
        }

        setSubscriptionStatus(statusData.status || null);
        if (statusData.status === 'pending' && statusData.pending_plan) {
          setPendingPlan(statusData.pending_plan.toUpperCase() as 'PRO' | 'MAX');
        } else {
          setPendingPlan(null);
        }
      } else {
        setSubscriptionPlan(fallbackPlan);
        setSubscriptionStatus(null);
        setPendingPlan(null);
      }
    } catch (e) {
      setSubscriptionPlan(fallbackPlan);
      setSubscriptionStatus(null);
      setPendingPlan(null);
    }
  };

  useEffect(() => {
    // Listen to Firebase auth changes to refresh subscription status
    const unsub = auth.onAuthStateChanged(() => {
      refreshSubscription();
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = translations[language] || translations['uz'];

  return (
    <AppContext.Provider value={{ 
      theme, 
      language, 
      setTheme, 
      setLanguage, 
      t, 
      subscriptionPlan, 
      subscriptionStatus, 
      pendingPlan, 
      refreshSubscription 
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}

