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
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export type UserRole = 'vendedor' | 'comprador' | 'admin';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  loading: boolean;
  loginWithGoogle: (role?: UserRole) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, role: UserRole, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isAdmin: false,
  loading: true,
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  signUpWithEmail: async () => {},
  logout: async () => {},
});

const ADMIN_EMAIL = 'dweminem@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch role from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role as UserRole);
        } else if (user.email === ADMIN_EMAIL) {
          setRole('admin');
        } else {
          setRole(null);
        }
      } else {
        setRole(null);
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
      isAdmin, 
      loading, 
      loginWithGoogle, 
      loginWithEmail,
      signUpWithEmail,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
