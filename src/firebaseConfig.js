import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: console.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: console.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: console.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: console.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: console.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: console.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: "G-QQQ4EW03S6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
