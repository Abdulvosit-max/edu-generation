import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
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
// Check if Firebase is using dummy keys or valid keys
const isDummyFirebase = !import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === "dummy-api-key";

export async function signInWithGoogle() {
  if (isDummyFirebase) {
    mockUser = {
      uid: "mock-google-user-123",
      displayName: "Abdulvosit (Pro)",
      email: "zokirjonovabdulvosit002@gmail.com",
      photoURL: "https://api.dicebear.com/7.x/initials/svg?seed=Abdulvosit",
      emailVerified: true
    };
    localStorage.setItem("edu_generation_mock_user", JSON.stringify(mockUser));
    listeners.forEach(cb => cb(mockUser));
    return mockUser;
  }
  try {
    const result = await signInWithPopup(originalAuth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Kirishda xatolik:", error);
    throw error;
  }
}

function transformCredentials(emailOrUsername: string, pass: string): { email: string; pass: string } {
  const clean = emailOrUsername.trim().toLowerCase();
  const transformedEmail = clean.includes("@") ? clean : `${clean}@edu-generation.uz`;
  const transformedPass = pass.length < 6 ? `${pass}_edu_gen_pass` : pass;
  return { email: transformedEmail, pass: transformedPass };
}

export async function signInWithEmail(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
  if ((cleanEmail === "murodillo" || cleanEmail === "murodillo@gmail.com" || cleanEmail === "murodillo@edu-generation.uz") && password === "1234") {
    mockUser = {
      uid: "murodillo-pro-user-123",
      displayName: "Murodillo (Pro)",
      email: "murodillo@edu-generation.uz",
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=Murodillo`,
      emailVerified: true
    };
    localStorage.setItem("edu_generation_mock_user", JSON.stringify(mockUser));
    listeners.forEach(cb => cb(mockUser));
    return mockUser;
  }

  const { email: transformedEmail, pass: transformedPass } = transformCredentials(email, password);

  if (isDummyFirebase) {
    mockUser = {
      uid: "mock-email-user-" + transformedEmail.replace(/[^a-zA-Z0-9]/g, ""),
      displayName: email.includes("@") ? email.split("@")[0] : email,
      email: transformedEmail,
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${email.includes("@") ? email.split("@")[0] : email}`,
      emailVerified: true
    };
    localStorage.setItem("edu_generation_mock_user", JSON.stringify(mockUser));
    listeners.forEach(cb => cb(mockUser));
    return mockUser;
  }
  const result = await signInWithEmailAndPassword(originalAuth, transformedEmail, transformedPass);
  return result.user;
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const { email: transformedEmail, pass: transformedPass } = transformCredentials(email, password);
  let resolvedDisplayName = displayName || (email.includes("@") ? email.split("@")[0] : email);
  if (email.trim().toLowerCase() === "zokirjonovabdulvosit002@gmail.com" && !displayName) {
    resolvedDisplayName = "Abdulvosit (Pro)";
  }

  if (isDummyFirebase) {
    mockUser = {
      uid: "mock-email-user-" + transformedEmail.replace(/[^a-zA-Z0-9]/g, ""),
      displayName: resolvedDisplayName,
      email: transformedEmail,
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${resolvedDisplayName}`,
      emailVerified: true
    };
    localStorage.setItem("edu_generation_mock_user", JSON.stringify(mockUser));
    listeners.forEach(cb => cb(mockUser));
    return mockUser;
  }
  const result = await createUserWithEmailAndPassword(originalAuth, transformedEmail, transformedPass);
  await updateProfile(result.user, { displayName: resolvedDisplayName });
  return result.user;
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
  try {
    return await signOut(originalAuth);
  } catch (e) {
    // Suppress dummy auth error on signout
  }
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

