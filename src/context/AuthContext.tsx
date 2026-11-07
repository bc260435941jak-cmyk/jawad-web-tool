import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider, validateFirestoreConnection } from '../config/firebase.js';
import { encryptKey, decryptKey, maskKey } from '../utils/crypto.js';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface UserCredentialsData {
  encryptedMarketKeys: Record<string, string>;
  encryptedAiKeys: Record<string, string>;
  activeMarketProvider: string;
  activeAiProvider: string;
  activeAiModel: string;
}

export interface UserPreferencesData {
  defaultTimeframe: string;
  defaultSymbol: string;
  watchlist: string[];
  maxStake: number;
  dailyLossLimit: number;
  maxOpenPositions: number;
  slippagePips: number;
  enableHighThinking: boolean;
}

export interface UserPaperAccountData {
  balance: number;
  equity: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  credentials: UserCredentialsData;
  preferences: UserPreferencesData;
  paperAccount: UserPaperAccountData;
  saveMarketKey: (providerId: string, rawApiKey: string) => Promise<void>;
  saveAiKey: (providerId: string, rawApiKey: string) => Promise<void>;
  setActiveMarketProvider: (providerId: string) => Promise<void>;
  setActiveAiProvider: (providerId: string, modelId?: string) => Promise<void>;
  getDecryptedMarketKey: (providerId: string) => string;
  getDecryptedAiKey: (providerId: string) => string;
  saveUserPreferences: (newPrefs: Partial<UserPreferencesData>) => Promise<void>;
  saveUserPaperAccount: (newAcc: Partial<UserPaperAccountData>) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  registerWithEmail: (e: string, p: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  getAuthToken: () => Promise<string | null>;
  saveStatus: 'saved' | 'saving' | 'error' | 'idle';
  saveErrorMessage: string | null;
}

const defaultCredentials: UserCredentialsData = {
  encryptedMarketKeys: {},
  encryptedAiKeys: {},
  activeMarketProvider: 'realtime_public',
  activeAiProvider: 'gemini',
  activeAiModel: 'gemini-3.8-flash',
};

const defaultPreferences: UserPreferencesData = {
  defaultTimeframe: '5m',
  defaultSymbol: 'EUR/USD',
  watchlist: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'BTC/USD'],
  maxStake: 250,
  dailyLossLimit: 500,
  maxOpenPositions: 5,
  slippagePips: 0.2,
  enableHighThinking: true,
};

const defaultPaperAccount: UserPaperAccountData = {
  balance: 10000.0,
  equity: 10000.0,
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<UserCredentialsData>(defaultCredentials);
  const [preferences, setPreferences] = useState<UserPreferencesData>(defaultPreferences);
  const [paperAccount, setPaperAccount] = useState<UserPaperAccountData>(defaultPaperAccount);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    validateFirestoreConnection();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Initialize or sync user profile
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0],
              photoURL: currentUser.photoURL || '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error('User profile init error:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Realtime Firestore listeners for authenticated user documents
  useEffect(() => {
    if (!user) {
      setCredentials(defaultCredentials);
      setPreferences(defaultPreferences);
      setPaperAccount(defaultPaperAccount);
      return;
    }

    const pathCreds = `users/${user.uid}/credentials/apiKeys`;
    const unsubCreds = onSnapshot(
      doc(db, 'users', user.uid, 'credentials', 'apiKeys'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as UserCredentialsData;
          setCredentials({
            encryptedMarketKeys: data.encryptedMarketKeys || {},
            encryptedAiKeys: data.encryptedAiKeys || {},
            activeMarketProvider: data.activeMarketProvider || 'realtime_public',
            activeAiProvider: data.activeAiProvider || 'gemini',
            activeAiModel: data.activeAiModel || 'gemini-3.8-flash',
          });
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, pathCreds)
    );

    const pathPrefs = `users/${user.uid}/preferences/trading`;
    const unsubPrefs = onSnapshot(
      doc(db, 'users', user.uid, 'preferences', 'trading'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as UserPreferencesData;
          setPreferences({
            ...defaultPreferences,
            ...data,
          });
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, pathPrefs)
    );

    const pathPaper = `users/${user.uid}/paper/account`;
    const unsubPaper = onSnapshot(
      doc(db, 'users', user.uid, 'paper', 'account'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as UserPaperAccountData;
          setPaperAccount({
            ...defaultPaperAccount,
            ...data,
          });
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, pathPaper)
    );

    return () => {
      unsubCreds();
      unsubPrefs();
      unsubPaper();
    };
  }, [user]);

  const getAuthToken = async () => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (e) {
      return null;
    }
  };

  const saveMarketKey = async (providerId: string, rawApiKey: string) => {
    if (!user) throw new Error('Authentication required to save API key');
    setSaveStatus('saving');
    setSaveErrorMessage(null);
    const path = `users/${user.uid}/credentials/apiKeys`;

    try {
      const encrypted = encryptKey(rawApiKey, user.uid);
      const newKeys = { ...credentials.encryptedMarketKeys, [providerId]: encrypted };
      await setDoc(
        doc(db, 'users', user.uid, 'credentials', 'apiKeys'),
        {
          uid: user.uid,
          encryptedMarketKeys: newKeys,
          encryptedAiKeys: credentials.encryptedAiKeys,
          activeMarketProvider: providerId,
          activeAiProvider: credentials.activeAiProvider,
          activeAiModel: credentials.activeAiModel,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err.message || 'Failed to save market key');
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const saveAiKey = async (providerId: string, rawApiKey: string) => {
    if (!user) throw new Error('Authentication required to save AI API key');
    setSaveStatus('saving');
    setSaveErrorMessage(null);
    const path = `users/${user.uid}/credentials/apiKeys`;

    try {
      const encrypted = encryptKey(rawApiKey, user.uid);
      const newKeys = { ...credentials.encryptedAiKeys, [providerId]: encrypted };
      await setDoc(
        doc(db, 'users', user.uid, 'credentials', 'apiKeys'),
        {
          uid: user.uid,
          encryptedMarketKeys: credentials.encryptedMarketKeys,
          encryptedAiKeys: newKeys,
          activeMarketProvider: credentials.activeMarketProvider,
          activeAiProvider: providerId,
          activeAiModel: credentials.activeAiModel,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('error');
      setSaveErrorMessage(err.message || 'Failed to save AI key');
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const setActiveMarketProvider = async (providerId: string) => {
    if (!user) return;
    setSaveStatus('saving');
    const path = `users/${user.uid}/credentials/apiKeys`;
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'credentials', 'apiKeys'),
        { activeMarketProvider: providerId, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('error');
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const setActiveAiProvider = async (providerId: string, modelId?: string) => {
    if (!user) return;
    setSaveStatus('saving');
    const path = `users/${user.uid}/credentials/apiKeys`;
    try {
      await setDoc(
        doc(db, 'users', user.uid, 'credentials', 'apiKeys'),
        {
          activeAiProvider: providerId,
          ...(modelId ? { activeAiModel: modelId } : {}),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('error');
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const getDecryptedMarketKey = (providerId: string): string => {
    if (!user) return '';
    const cipher = credentials.encryptedMarketKeys[providerId];
    return decryptKey(cipher, user.uid);
  };

  const getDecryptedAiKey = (providerId: string): string => {
    if (!user) return '';
    const cipher = credentials.encryptedAiKeys[providerId];
    return decryptKey(cipher, user.uid);
  };

  const saveUserPreferences = async (newPrefs: Partial<UserPreferencesData>) => {
    if (!user) return;
    setSaveStatus('saving');
    const path = `users/${user.uid}/preferences/trading`;
    try {
      const merged = { ...preferences, ...newPrefs };
      await setDoc(
        doc(db, 'users', user.uid, 'preferences', 'trading'),
        {
          uid: user.uid,
          ...merged,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('error');
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const saveUserPaperAccount = async (newAcc: Partial<UserPaperAccountData>) => {
    if (!user) return;
    const path = `users/${user.uid}/paper/account`;
    try {
      const merged = { ...paperAccount, ...newAcc };
      await setDoc(
        doc(db, 'users', user.uid, 'paper', 'account'),
        {
          uid: user.uid,
          ...merged,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const loginWithEmail = async (e: string, p: string) => {
    await signInWithEmailAndPassword(auth, e, p);
  };

  const registerWithEmail = async (e: string, p: string, name?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, e, p);
    if (name && cred.user) {
      await updateProfile(cred.user, { displayName: name });
    }
  };

  const logout = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        credentials,
        preferences,
        paperAccount,
        saveMarketKey,
        saveAiKey,
        setActiveMarketProvider,
        setActiveAiProvider,
        getDecryptedMarketKey,
        getDecryptedAiKey,
        saveUserPreferences,
        saveUserPaperAccount,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        getAuthToken,
        saveStatus,
        saveErrorMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
