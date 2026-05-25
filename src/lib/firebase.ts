import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, doc, updateDoc, deleteDoc, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy-auth-domain.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy-bucket.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "dummy-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "dummy-app-id"
};

if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  console.warn("VITE_FIREBASE_API_KEY topilmadi! App xato bermasligi uchun 'dummy' rejimda ishga tushmoqda. Firebase login ishlamaydi.");
}

const app = initializeApp(firebaseConfig);
const originalAuth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Mock User state va kuzatuvchilar (listeners)
let mockUser: any = null;
const listeners = new Set<(user: any) => void>();

// LocalStorage'dan mock userni tiklash
try {
  const saved = localStorage.getItem("edu_generation_mock_user");
  if (saved) {
    mockUser = JSON.parse(saved);
  }
} catch (e) {
  console.error("Mock userni tiklashda xatolik:", e);
}

// Transparent Proxy auth obyekti uchun
export const auth = new Proxy(originalAuth, {
  get(target, prop, receiver) {
    if (prop === "currentUser") {
      return mockUser || target.currentUser;
    }
    if (prop === "onAuthStateChanged") {
      return (callback: (user: any) => void) => {
        listeners.add(callback);
        // Hozirgi holatni darhol yuboramiz
        callback(mockUser || target.currentUser);
        
        // Asl firebase holat o'zgarishini ham kuzatamiz
        const unsub = target.onAuthStateChanged((usr) => {
          if (!mockUser) {
            callback(usr);
          }
        });
        
        return () => {
          listeners.delete(callback);
          unsub();
        };
      };
    }
    const val = Reflect.get(target, prop, receiver);
    if (typeof val === "function") {
      return val.bind(target);
    }
    return val;
  }
});

// Yordamchi funksiyalar va Firebase eksportlari
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(originalAuth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Kirishda xatolik:", error);
    throw error;
  }
}

export async function signInAsDemo() {
  mockUser = {
    uid: "demo-user-123",
    displayName: "Mehmon Foydalanuvchi",
    email: "mehmon@edu-generation.uz",
    photoURL: null,
    emailVerified: true
  };
  localStorage.setItem("edu_generation_mock_user", JSON.stringify(mockUser));
  listeners.forEach(cb => cb(mockUser));
  return mockUser;
}

export async function logout() {
  localStorage.removeItem("edu_generation_mock_user");
  mockUser = null;
  listeners.forEach(cb => cb(null));
  return signOut(originalAuth);
}

export { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  deleteDoc,
  where
};

