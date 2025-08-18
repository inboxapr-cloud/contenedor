import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase configuration for your project
const firebaseConfig = {
  "projectId": "container-tracker-me5sv",
  "appId": "1:452440162577:web:1d78de983c3e4503648cb0",
  "storageBucket": "container-tracker-me5sv.firebasestorage.app",
  "apiKey": "AIzaSyC33pgiaaIL2EhUG7djOEt9qYqwFRXCon4",
  "authDomain": "container-tracker-me5sv.firebaseapp.com",
  "messagingSenderId": "452440162577"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
