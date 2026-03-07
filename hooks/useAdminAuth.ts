import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADMIN_SESSION_KEY = 'admin_session';
// Hardcoded admin password — replace with proper auth in a future phase
const ADMIN_PASSWORD = '1mc-admin-2026';

function getStorage() {
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) =>
        Promise.resolve(typeof window !== 'undefined' ? window.localStorage.getItem(key) : null),
      setItem: (key: string, value: string) =>
        Promise.resolve(typeof window !== 'undefined' ? window.localStorage.setItem(key, value) : undefined),
      removeItem: (key: string) =>
        Promise.resolve(typeof window !== 'undefined' ? window.localStorage.removeItem(key) : undefined),
    };
  }
  return AsyncStorage;
}

export function useAdminAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const storage = getStorage();

  useEffect(() => {
    storage.getItem(ADMIN_SESSION_KEY).then((value) => {
      setAuthenticated(value === 'true');
      setLoading(false);
    });
  }, []);

  async function login(password: string): Promise<boolean> {
    if (password !== ADMIN_PASSWORD) return false;
    await storage.setItem(ADMIN_SESSION_KEY, 'true');
    setAuthenticated(true);
    return true;
  }

  async function logout() {
    await storage.removeItem(ADMIN_SESSION_KEY);
    setAuthenticated(false);
  }

  return { authenticated, loading, login, logout };
}
