import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

type FirebaseClients = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  googleProvider: GoogleAuthProvider;
};

let cached: FirebaseClients | null = null;

export function getFirebaseClients(): FirebaseClients {
  if (cached) return cached;

  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  } as const;

  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
    const missing = [
      ["NEXT_PUBLIC_FIREBASE_API_KEY", config.apiKey],
      ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", config.authDomain],
      ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", config.projectId],
      ["NEXT_PUBLIC_FIREBASE_APP_ID", config.appId],
    ].filter(([, v]) => !v).map(([k]) => k);
    const message = `Missing Firebase env vars: ${missing.join(", ")}. Add them to .env.local and restart dev server.`;
    if (process.env.NODE_ENV !== "production") {
      throw new Error(message);
    } else {
      // eslint-disable-next-line no-console
      console.warn(message);
    }
  }

  const app = getApps().length ? getApps()[0]! : initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const googleProvider = new GoogleAuthProvider();

  cached = { app, auth, db, storage, googleProvider };
  return cached;
}

export const firebase = getFirebaseClients();


