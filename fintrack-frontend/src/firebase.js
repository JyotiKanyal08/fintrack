import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: "fintrack-6550f.firebaseapp.com",
    projectId: "fintrack-6550f",
    storageBucket: "fintrack-6550f.firebasestorage.app",
    messagingSenderId: "897856781876",
    appId: "1:897856781876:web:a77520c434a93410a2d461"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
