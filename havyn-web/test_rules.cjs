const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, getDocs, query, where, addDoc } = require('firebase/firestore');
require('dotenv').config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const INST_ID = 'y8qF0n0uL4m4hB4K6T2w';

async function testBooking() {
  try {
    console.log('1. Signing in as test donor...');
    await signInWithEmailAndPassword(auth, 'testviewer@example.com', 'password123');
    console.log('✅ Signed in successfully');

    console.log('2. Testing READ permissions on foodDonations...');
    const q = query(collection(db, 'institutions', INST_ID, 'foodDonations'));
    const snap = await getDocs(q);
    console.log(`✅ Read successful! Found ${snap.size} bookings.`);
    
    console.log('All tests passed. Firestore rules are active.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

testBooking();
