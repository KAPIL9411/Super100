import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthChange, logoutUser } from '../firebase/auth';
import { createUserProfile, getUserProfile, updateUserProfile } from '../firebase/db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialNullRef = useRef(true);

  useEffect(() => {
    let fallbackTimer;
    const unsub = onAuthChange(async (firebaseUser) => {
      // Firebase fires null first before detecting a persisted session.
      // Ignore the first null to avoid flashing login/access-key gates.
      if (!firebaseUser && initialNullRef.current) {
        initialNullRef.current = false;
        fallbackTimer = setTimeout(() => {
          setUser(null);
          setUserProfile(null);
          setLoading(false);
        }, 400);
        return;
      }
      clearTimeout(fallbackTimer);
      initialNullRef.current = false;
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        let profile = await getUserProfile(firebaseUser.uid);
        if (!profile) {
          const newProfile = {
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email,
            avatar: firebaseUser.photoURL || '/candidate_avatar.png',
            accessKeyVerified: false,
          };
          await createUserProfile(firebaseUser.uid, newProfile);
          profile = { ...newProfile, isAdmin: false };
        }
        setUserProfile(profile);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => {
      clearTimeout(fallbackTimer);
      unsub();
    };
  }, []);

  const logout = async () => {
    await logoutUser();
    localStorage.clear();
  };

  const updateProfile = async (data) => {
    if (!user) return;
    await updateUserProfile(user.uid, data);
    setUserProfile((prev) => ({ ...prev, ...data }));
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
