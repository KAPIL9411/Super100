import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from './config';

export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

export const signUpWithEmail = async (email, password, name) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: name });
  return result.user;
};

export const loginWithEmail = async (email, password) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const loginWithGoogleRedirect = () => {
  signInWithRedirect(auth, googleProvider);
};

export const getGoogleRedirectResult = async () => {
  const result = await getRedirectResult(auth);
  return result?.user || null;
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const resetPassword = async (email) => {
  await sendPasswordResetEmail(auth, email);
};
