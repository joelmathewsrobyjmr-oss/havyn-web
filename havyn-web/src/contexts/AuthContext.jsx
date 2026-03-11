import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchUserData(firebaseUser.uid);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    return signOut(auth);
  };

  const resetPassword = async (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  const updateProfileData = async (uid, data) => {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
    await fetchUserData(uid);
  };

  const changePassword = async (newPassword) => {
    if (!user) throw new Error("No user logged in");
    return firebaseUpdatePassword(user, newPassword);
  };

  const reauthenticate = async (password) => {
    if (!user || !user.email) throw new Error("No user logged in");
    const credential = EmailAuthProvider.credential(user.email, password);
    return reauthenticateWithCredential(user, credential);
  };

  const role = userData?.role || null;
  const institutionId = userData?.institutionId || null;

  const value = { 
    user, 
    userData, 
    role,
    institutionId,
    loading, 
    login, 
    signup, 
    logout,
    resetPassword,
    changePassword,
    reauthenticate,
    updateProfileData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
