import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "@/lib/firebaseConfig";
import { type UserProfile } from "@/lib/profile";

const PROFILE_COLLECTION = "profiles";

function removeUndefinedValues<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;
}

export async function getProfileFromFirestore(
  uid: string,
): Promise<Partial<UserProfile> | null> {
  const profileReference = doc(db, PROFILE_COLLECTION, uid);
  const profileSnapshot = await getDoc(profileReference);

  if (!profileSnapshot.exists()) {
    return null;
  }

  return profileSnapshot.data() as Partial<UserProfile>;
}

export async function upsertProfileToFirestore(
  uid: string,
  profile: Partial<UserProfile>,
): Promise<void> {
  const profileReference = doc(db, PROFILE_COLLECTION, uid);
  const payload = removeUndefinedValues({
    ...profile,
    uid,
    updatedAt: serverTimestamp(),
    updatedAtIso: new Date().toISOString(),
  });

  await setDoc(profileReference, payload, { merge: true });
}
