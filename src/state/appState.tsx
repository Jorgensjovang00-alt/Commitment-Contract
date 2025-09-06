import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadState, saveState, upsertActiveContract, completeActiveContract } from '../storage/local';
import type { AppState, Contract, CreateContractInput, CheckIn } from '../types/contract';
import { generateId } from '../types/contract';
import { useAuth } from './auth';
import { createDbContract, insertCheckIn, loadActiveContract, loadHistory, updateContractStatus } from './db';
import { scheduleDailyReminderLocal, cancelAllScheduledNotifications } from '../utils/notifications';

interface AppContextValue extends AppState {
  initialized: boolean;
  createContract: (input: CreateContractInput) => Promise<Contract>;
  addCheckIn: (checkIn: Omit<CheckIn, 'id'>) => Promise<void>;
  endContract: (outcome: 'completed' | 'cancelled') => Promise<void>;
  reset: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({ history: [] });
  const [initialized, setInitialized] = useState(false);

  const { userId } = useAuth();

  useEffect(() => {
    (async () => {
      if (!userId) {
        const s = await loadState();
        setState(s);
        setInitialized(true);
        return;
      }
      const [active, hist] = await Promise.all([
        loadActiveContract(userId),
        loadHistory(userId),
      ]);
      setState({ activeContract: active, history: hist });
      setInitialized(true);
    })();
  }, [userId]);

  const createContract = async (input: CreateContractInput): Promise<Contract> => {
    if (userId) {
      const dbContract = await createDbContract(userId, input);
      setState(prev => ({ ...prev, activeContract: dbContract }));
      // Notifications
      await scheduleDailyReminderLocal(18, 0);
      return dbContract;
    }
    // Local fallback (dev only)
    const now = new Date();
    const contract: Contract = {
      id: generateId('contract'),
      status: 'active',
      title: input.title,
      description: input.description,
      valueNok: input.valueNok,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      checkIns: [],
    };
    await upsertActiveContract(contract);
    setState(prev => ({ ...prev, activeContract: contract }));
    await scheduleDailyReminderLocal(18, 0);
    return contract;
  };

  const addCheckIn = async (_checkIn: Omit<CheckIn, 'id'>) => {
    if (!state.activeContract) return;
    if (userId) {
      const inserted = await insertCheckIn(state.activeContract.id, userId);
      const updated: Contract = {
        ...state.activeContract,
        updatedAt: new Date().toISOString(),
        checkIns: [inserted as any, ...state.activeContract.checkIns],
      };
      setState(prev => ({ ...prev, activeContract: updated }));
      return;
    }
    const updatedLocal: Contract = {
      ...state.activeContract,
      updatedAt: new Date().toISOString(),
      checkIns: [{ id: generateId('ci'), checkinTime: new Date().toISOString() }, ...state.activeContract.checkIns],
    };
    await upsertActiveContract(updatedLocal);
    setState(prev => ({ ...prev, activeContract: updatedLocal }));
  };

  const endContract = async (outcome: 'completed' | 'cancelled') => {
    if (!state.activeContract) return;
    if (userId) {
      await updateContractStatus(state.activeContract.id, outcome);
      const updated: Contract = { ...state.activeContract, status: outcome, updatedAt: new Date().toISOString() };
      setState(prev => ({ history: [updated, ...(prev.history || [])] }));
      await cancelAllScheduledNotifications();
      return;
    }
    const updatedLocal: Contract = { ...state.activeContract, status: outcome, updatedAt: new Date().toISOString() };
    await completeActiveContract(updatedLocal);
    setState({ history: [updatedLocal, ...(state.history || [])] });
    await cancelAllScheduledNotifications();
  };

  const reset = async () => {
    const empty: AppState = { history: [] };
    await saveState(empty);
    setState(empty);
  };

  const value = useMemo<AppContextValue>(() => ({
    initialized,
    activeContract: state.activeContract,
    history: state.history,
    createContract,
    addCheckIn,
    endContract,
    reset,
  }), [initialized, state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
