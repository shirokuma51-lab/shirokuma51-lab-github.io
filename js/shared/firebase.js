import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
export const firebaseConfig = {
  apiKey: "AIzaSyAucRpmiRDuWK5qFEj11oAepAosWezWXhQ",
  authDomain: "your-api-key-87e31.firebaseapp.com",
  projectId: "your-api-key-87e31",
  storageBucket: "your-api-key-87e31.firebasestorage.app",
  messagingSenderId: "498476749816",
  appId: "1:498476749816:web:ab591e34401ba0f916bc0d",
};
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const ADMIN_UID = "i6GOrjireVa7gTM2IL8lLxvl5Zd2";
