import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Plain key-value storage. Never throws: storage can be blocked on the web
// (private mode), so values are also kept in memory for the current session.
const memory = new Map<string, string>();

export async function getItem(key: string): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  memory.set(key, value);
  try {
    await AsyncStorage.setItem(key, value);
  } catch {}
}

export async function removeItem(key: string): Promise<void> {
  memory.delete(key);
  try {
    await AsyncStorage.removeItem(key);
  } catch {}
}

// Session token goes to the Keychain / Keystore on phones.
const TOKEN_KEY = 'auth_token';

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') return getItem(TOKEN_KEY);
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    return token ? setItem(TOKEN_KEY, token) : removeItem(TOKEN_KEY);
  }
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {}
}
