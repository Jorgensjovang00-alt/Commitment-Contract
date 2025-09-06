import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppState, Contract } from '../types/contract';

const KEY = 'app_state_v1';

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { history: [] };
    return JSON.parse(raw) as AppState;
  } catch {
    return { history: [] };
  }
}

export async function saveState(state: AppState): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

export async function upsertActiveContract(contract: Contract): Promise<AppState> {
  const state = await loadState();
  const updated: AppState = { ...state, activeContract: contract };
  await saveState(updated);
  return updated;
}

export async function completeActiveContract(updatedContract: Contract): Promise<AppState> {
  const state = await loadState();
  const history = [updatedContract, ...(state.history || [])];
  const updated: AppState = { history };
  await saveState(updated);
  return updated;
}
