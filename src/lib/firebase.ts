import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBNMw_JcnQ-NWPXXcYFUCB9zuXk1lxBU6k",
  authDomain: "cheniart-studio.firebaseapp.com",
  projectId: "cheniart-studio",
  storageBucket: "cheniart-studio.firebasestorage.app",
  messagingSenderId: "133954899211",
  appId: "1:133954899211:web:26a709e2f5d330309f660e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
