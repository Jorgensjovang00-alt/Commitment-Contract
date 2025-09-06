export interface CheckIn {
  id: string;
  checkinTime: string; // ISO
  notes?: string;
}

export type ContractStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface Contract {
  id: string;
  status: ContractStatus;
  title: string;
  description?: string;
  valueNok: number; // derived from value_ore / 100
  targetDate?: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
  checkIns: CheckIn[];
}

export interface AppState {
  activeContract?: Contract;
  history: Contract[];
}

export interface CreateContractInput {
  title: string;
  description?: string;
  valueNok: number;
  targetDate?: string; // YYYY-MM-DD
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}
