import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBNMw_JcnQ-NWPXXcYFUCB9zuXk1lxBU6k",
  authDomain: "cheniart-studio.firebaseapp.com",
  projectId: "cheniart-studio",
  storageBucket: "cheniart-studio.firebasestorage.app",
  messagingSenderId: "133954899211",
  appId: "1:133954899211:web:26a709e2f5d330309f660e"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const c1 = await getDocs(collection(db, 'flowers'));
  console.log('flowers count:', c1.size);
  const c2 = await getDocs(collection(db, 'products'));
  console.log('products count:', c2.size);
  const c3 = await getDocs(collection(db, 'expenses'));
  console.log('expenses count: ', c3.size);
  const c4 = await getDocs(collection(db, 'stock'));
  console.log('stock count:', c4.size);
  console.log('done');
}
main().catch(console.error);
