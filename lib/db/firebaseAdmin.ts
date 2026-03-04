import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(
  process.env.PRIVATE_FIREBASE_SERVICE_ACCOUNT_KEY || "{}",
);

if (!serviceAccount || !serviceAccount.project_id) {
  throw new Error("Firebase service account credentials are not set properly.");
}

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export const db = getFirestore();
