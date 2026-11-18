import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Analysis, Athlete } from "../domain";

const KEY = "jumpcoach.v1";

export type Database = {
  version: 1;
  athletes: Athlete[];
  analyses: Analysis[];
};

export function emptyDatabase(): Database {
  return { version: 1, athletes: [], analyses: [] };
}

export async function loadDatabase(): Promise<Database> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return emptyDatabase();
  const parsed = JSON.parse(raw) as Database;
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.athletes) || !Array.isArray(parsed.analyses)) {
    return emptyDatabase();
  }
  return parsed;
}

export async function saveDatabase(db: Database): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(db));
}
