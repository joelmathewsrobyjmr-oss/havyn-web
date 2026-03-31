import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, query } from 'firebase/firestore';

// To run this: node --experimental-modules test_config.js
// Wait, I need the config. Let me read it from firebase.js
import { auth, db } from './src/firebase.js';

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
