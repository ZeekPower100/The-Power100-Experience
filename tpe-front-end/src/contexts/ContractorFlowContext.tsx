"use client";

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Contractor } from '@/lib/types/contractor';
import { StrategicPartner } from '@/lib/types/strategic_partner';

// State types
interface ContractorFlowState {
  currentStep: number;
  contractor: Partial<Contractor> | null;
  matches: StrategicPartner[];
  selectedPartner: StrategicPartner | null;
  isLoading: boolean;
  error: string | null;
}

// Action types
type ContractorFlowAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_CONTRACTOR'; payload: Partial<Contractor> }
  | { type: 'UPDATE_CONTRACTOR'; payload: Partial<Contractor> }
  | { type: 'SET_MATCHES'; payload: StrategicPartner[] }
  | { type: 'SELECT_PARTNER'; payload: StrategicPartner | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_FLOW' };

// Initial state
const initialState: ContractorFlowState = {
  currentStep: 1,
  contractor: null,
  matches: [],
  selectedPartner: null,
  isLoading: false,
  error: null,
};

// Reducer
function contractorFlowReducer(state: ContractorFlowState, action: ContractorFlowAction): ContractorFlowState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    
    case 'SET_CONTRACTOR':
      return { ...state, contractor: action.payload };
    
    case 'UPDATE_CONTRACTOR':
      return {
        ...state,
        contractor: state.contractor ? { ...state.contractor, ...action.payload } : action.payload
      };
    
    case 'SET_MATCHES':
      return { ...state, matches: action.payload };
    
    case 'SELECT_PARTNER':
      return { ...state, selectedPartner: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'RESET_FLOW':
      return initialState;
    
    default:
      return state;
  }
}

// Context
const ContractorFlowContext = createContext<{
  state: ContractorFlowState;
  dispatch: React.Dispatch<ContractorFlowAction>;
} | null>(null);

// Provider component
export function ContractorFlowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(contractorFlowReducer, initialState);

  return (
    <ContractorFlowContext.Provider value={{ state, dispatch }}>
      {children}
    </ContractorFlowContext.Provider>
  );
}

// Hook to use the context
export function useContractorFlow() {
  const context = useContext(ContractorFlowContext);
  if (!context) {
    throw new Error('useContractorFlow must be used within a ContractorFlowProvider');
  }
  return context;
}

// Action creators
export const contractorFlowActions = {
  setStep: (step: number) => ({ type: 'SET_STEP' as const, payload: step }),
  setContractor: (contractor: Partial<Contractor>) => ({ type: 'SET_CONTRACTOR' as const, payload: contractor }),
  updateContractor: (updates: Partial<Contractor>) => ({ type: 'UPDATE_CONTRACTOR' as const, payload: updates }),
  setMatches: (matches: StrategicPartner[]) => ({ type: 'SET_MATCHES' as const, payload: matches }),
  selectPartner: (partner: StrategicPartner | null) => ({ type: 'SELECT_PARTNER' as const, payload: partner }),
  setLoading: (loading: boolean) => ({ type: 'SET_LOADING' as const, payload: loading }),
  setError: (error: string | null) => ({ type: 'SET_ERROR' as const, payload: error }),
  resetFlow: () => ({ type: 'RESET_FLOW' as const }),
};