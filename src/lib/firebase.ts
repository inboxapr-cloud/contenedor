import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// We are removing getStorage as it's no longer used for photos.
// If you need it for other features, you can re-add it.
// import { getStorage } from "firebase/storage";

// IMPORTANT: Replace with your own Firebase project configuration.
// You can get this from the Firebase console for your project:
// Project settings > General > Your apps > Web app > Firebase SDK snippet > Config
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
// const storage = getStorage(app); // No longer initializing storage by default

export { db };
