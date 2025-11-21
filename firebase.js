// UNTUK WEB (JANGAN ADA ASYNCSTORAGE ATAU getReactNativePersistence!)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig2 = {
  apiKey: "AIzaSyAqTAPfBBFwYp6gVkpc6zds4CJ7kf16HGA",
  authDomain: "nekoride.firebaseapp.com",
  projectId: "nekoride",
  storageBucket: "nekoride.firebasestorage.app",
  messagingSenderId: "466597242666",
  appId: "1:466597242666:web:994130776f31c93d542053",
  measurementId: "G-9V4V1T90XC"
};

const app = initializeApp(firebaseConfig2);

export const auth = getAuth(app);
export const firestore = getFirestore(app);
export default app;