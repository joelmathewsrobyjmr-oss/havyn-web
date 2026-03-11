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
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
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
  const [institutionData, setInstitutionData] = useState(null);
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
    let unsubUserDoc = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setLoading(true);
        unsubUserDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSn) => {
          if (docSn.exists()) {
            setUserData(docSn.data());
          } else {
            setUserData(null);
          }
          setLoading(false);
        }, (err) => {
          // Rules denied access or network error — don't hang forever
          console.error('Failed to listen to user doc:', err.code, err.message);
          setLoading(false);
        });
      } else {
        setUserData(null);
        setLoading(false);
        if (unsubUserDoc) unsubUserDoc();
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  // Fetch institution data whenever institutionId changes
  useEffect(() => {
    let isSubscribed = true;
    if (!userData?.institutionId) {
      if (isSubscribed) setInstitutionData(null);
      return;
    }
    const unsubInst = onSnapshot(doc(db, 'institutions', userData.institutionId), (snap) => {
      if (snap.exists()) setInstitutionData(snap.data());
      else setInstitutionData(null);
    });
    return () => unsubInst();
  }, [userData?.institutionId]);

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
    institutionData,
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
