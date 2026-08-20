// js/firebase-config.js
// إعداد Firebase المركزي - يُستخدم في جميع صفحات المتجر ولوحة الأدمن
// ------------------------------------------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-analytics.js";

// TODO: هذه بيانات مشروعك على Firebase (تم وضعها كما أرسلتها)
const firebaseConfig = {
  apiKey: "AIzaSyAbz5Fpo-Y5C818382zNWTe2oFAtahEp7A",
  authDomain: "store-216af.firebaseapp.com",
  projectId: "store-216af",
  storageBucket: "store-216af.firebasestorage.app",
  messagingSenderId: "363398960853",
  appId: "1:363398960853:web:11da112a474aa75942b45c",
  measurementId: "G-J6SR8MFKBB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Analytics قد لا يعمل محليًا (file://) لذلك نتحقق أولًا
isSupported().then((ok) => { if (ok) getAnalytics(app); }).catch(() => {});

export {
  app, auth, db, storage,
  // auth
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, updateProfile, sendPasswordResetEmail,
  // firestore
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, increment, Timestamp,
  // storage
  ref, uploadBytes, getDownloadURL, deleteObject
};
