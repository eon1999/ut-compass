import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

function readFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

/**
 * Client SDK only — must not run during `next build` / SSR, or Firebase throws
 * `auth/invalid-api-key` when env is missing or still a placeholder.
 */
function ensureClientApp(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error(
      "Firebase client SDK is only available in the browser. Call from useEffect or event handlers, not during server render.",
    );
  }
  if (getApps().length > 0) {
    return getApp();
  }
  const config = readFirebaseConfig();
  if (!config.apiKey) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY");
  }
  return initializeApp(config);
}

let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

function getAuthSingleton(): Auth {
  if (!authInstance) {
    authInstance = getAuth(ensureClientApp());
  }
  return authInstance;
}

function getDbSingleton(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(ensureClientApp());
  }
  return dbInstance;
}

function getStorageSingleton(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(ensureClientApp());
  }
  return storageInstance;
}

function lazyServiceProxy<T extends object>(getInstance: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop, _receiver) {
      const instance = getInstance();
      const value = Reflect.get(instance, prop, instance);
      if (typeof value === "function") {
        return value.bind(instance);
      }
      return value;
    },
  });
}

/** Lazy — safe to import from the root layout / AuthProvider during prerender. */
export const auth = lazyServiceProxy(getAuthSingleton);
export const db = lazyServiceProxy(getDbSingleton);
export const storage = lazyServiceProxy(getStorageSingleton);
