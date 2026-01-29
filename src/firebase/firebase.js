import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCEr9isiB41rUZ5I4kqvTbiVnXkQdiGqN8",
  authDomain: "sistema-impo.firebaseapp.com",
  projectId: "sistema-impo",
  storageBucket: "sistema-impo.firebasestorage.app",
  messagingSenderId: "513664943389",
  appId: "1:513664943389:web:4b788955edbfde2ef0cdf4"
};


export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);