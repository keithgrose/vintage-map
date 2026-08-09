import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBMV8CYMKi7QRA9Crn7T_wgV1Q-LrdBdWo",
  authDomain: "vintage-map-b8222.firebaseapp.com",
  projectId: "vintage-map-b8222",
  storageBucket: "vintage-map-b8222.firebasestorage.app",
  messagingSenderId: "278637862533",
  appId: "1:278637862533:web:65c69582553eda291613ec",
  measurementId: "G-517L33MEJD"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

export const logout = () => {
  return signOut(auth);
};
