// firebase-config.js
// Mengimport fungsi dari Firebase Modular SDK (v9+)
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Konfigurasi Firebase sesuai dengan data project
const firebaseConfig = {
  apiKey: "AIzaSyCIoCEjNX3QsnNEQJzLep3E4Ekm0n9B2G0",
  authDomain: "analisis-firebase-iot.firebaseapp.com",
  databaseURL: "https://analisis-firebase-iot-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "analisis-firebase-iot",
  storageBucket: "analisis-firebase-iot.firebasestorage.app",
  messagingSenderId: "232748179632",
  appId: "1:232748179632:web:e7b4d579b6a1e92e055b75",
  measurementId: "G-FG2GQRV9XJ"
};

// Inisialisasi Firebase App
const app = initializeApp(firebaseConfig);

// Inisialisasi layanan Realtime Database dan Authentication
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Export instance layanan agar bisa digunakan di file lain (script.js)
export { db, auth, provider };
