// Firebase SDK dan kerakli funksiyalarni import qilish
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase konfiguratsiyasi — muhit o'zgaruvchilaridan o'qiladi (.env.local)
// Barcha VITE_ prefiksi bilan boshlanadigan o'zgaruvchilar Vite tomonidan
// frontend ga xavfsiz ravishda inject qilinadi.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

// Firebase ilovasini ishga tushirish
const app = initializeApp(firebaseConfig);

// Firestore ma'lumotlar bazasi (maxsus DB ID bilan)
export const db = getFirestore(app, import.meta.env.VITE_FIREBASE_FIRESTORE_DB_ID);

// Firebase Authentication
export const auth = getAuth(app);

// ============================================================
// Firestore operatsiya turlari — xato xabarlarini aniqlashtirish uchun
// ============================================================
export enum OperationType {
  CREATE = 'create', // Yangi hujjat yaratish
  UPDATE = 'update', // Mavjud hujjatni yangilash
  DELETE = 'delete', // Hujjatni o'chirish
  LIST   = 'list',   // Hujjatlar ro'yxatini olish
  GET    = 'get',    // Bitta hujjatni olish
  WRITE  = 'write',  // Umumiy yozish operatsiyasi
}

// Firestore xato ma'lumotlari interfeysi
export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?:       string | null;
    email?:        string | null;
    emailVerified?: boolean | null;
    isAnonymous?:  boolean | null;
    tenantId?:     string | null;
    providerInfo?: {
      providerId?: string | null;
      email?:      string | null;
    }[];
  };
}

/**
 * Firestore xatolarini konsolga chiqarish va qayta ulash funksiyasi.
 * Har qanday Firestore operatsiyasida xato yuz berganda shu funksiya chaqiriladi.
 *
 * @param error       - Xato obyekti
 * @param operationType - Qaysi operatsiya paytida xato bo'lgani
 * @param path        - Firestore hujjat yo'li
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId:        auth.currentUser?.uid,
      email:         auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous:   auth.currentUser?.isAnonymous,
      tenantId:      auth.currentUser?.tenantId,
      providerInfo:  auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email:      provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore xatosi: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
