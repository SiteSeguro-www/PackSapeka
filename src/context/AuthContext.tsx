import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export type UserRole = 'vendedor' | 'comprador' | 'admin';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  userProfile: any | null;
  isAdmin: boolean;
  loading: boolean;
  loginWithGoogle: (role?: UserRole) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, role: UserRole, name: string) => Promise<void>;
  loginAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  userProfile: null,
  isAdmin: false,
  loading: true,
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  signUpWithEmail: async () => {},
  loginAnonymously: async () => {},
  logout: async () => {},
});

const ADMIN_EMAIL = 'dweminem@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch role and profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setRole(data.role as UserRole);
          setUserProfile(data);
        } else if (user.email === ADMIN_EMAIL) {
          setRole('admin');
          setUserProfile({ uid: user.uid, email: user.email, role: 'admin' });
        } else {
          setRole(null);
          setUserProfile(null);
        }
      } else {
        setRole(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async (selectedRole: UserRole = 'comprador') => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if profile exists, if not create with selected role
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        const finalRole = user.email === ADMIN_EMAIL ? 'admin' : selectedRole;
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: finalRole,
          createdAt: new Date().toISOString()
        });
        setRole(finalRole);
      } else {
        setRole(userDoc.data().role as UserRole);
      }
    } catch (error) {
      console.error('Error logging in with Google:', error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error('Error logging in with email:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, selectedRole: UserRole, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      const user = result.user;
      
      const finalRole = email === ADMIN_EMAIL ? 'admin' : selectedRole;
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: name,
        role: finalRole,
        createdAt: new Date().toISOString()
      });
      setRole(finalRole);
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const loginAnonymously = async () => {
    try {
      const result = await signInAnonymously(auth);
      const user = result.user;
      
      // Create a basic profile for the guest
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: 'Convidado',
        role: 'comprador',
        isAnonymous: true,
        createdAt: new Date().toISOString()
      });
      setRole('comprador');
    } catch (error) {
      console.error('Error signing in anonymously:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setRole(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const isAdmin = role === 'admin' || user?.email === ADMIN_EMAIL;

  return (
    <AuthContext.Provider value={{ 
      user, 
      role, 
      userProfile,
      isAdmin, 
      loading, 
      loginWithGoogle, 
      loginWithEmail,
      signUpWithEmail,
      loginAnonymously,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
