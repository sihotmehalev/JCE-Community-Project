import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBuXIZQb-c5N4_gnMrblt2Fw488a9nXkLI",
  authDomain: "talksfromtheheartbeta.firebaseapp.com",
  projectId: "talksfromtheheartbeta",
  storageBucket: "talksfromtheheartbeta.firebasestorage.app",
  messagingSenderId: "320132338131",
  appId: "1:320132338131:web:1ecadfdc23bd7e77731f26",
  measurementId: "G-QQQ4EW03S6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
