import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let firestore: Firestore | null = null;

/**
 * Initializes Firebase Admin on first use. Importing this module must not throw:
 * Next.js runs `next build` without deployment secrets, but still loads API route graphs.
 */
export function getAdminDb(): Firestore {
  if (firestore) return firestore;

  const raw = process.env.PRIVATE_FIREBASE_SERVICE_ACCOUNT_KEY;
  const serviceAccount = raw
    ? (JSON.parse(raw) as Record<string, unknown>)
    : {};

  if (
    !serviceAccount ||
    typeof serviceAccount !== "object" ||
    !("project_id" in serviceAccount) ||
    !serviceAccount.project_id
  ) {
    throw new Error("Firebase service account credentials are not set properly.");
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount as Parameters<typeof cert>[0]),
    });
  }

  firestore = getFirestore();
  return firestore;
}

/**
 * Lazy Firestore handle — property access initializes Admin (same as getAdminDb()).
 * Prefer this in existing code so imports stay side-effect free at build time.
 */
export const db = new Proxy({} as Firestore, {
  get(_target, prop, _receiver) {
    const instance = getAdminDb();
    const value = Reflect.get(instance, prop, instance);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
