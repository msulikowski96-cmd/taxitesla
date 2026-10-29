import { createContext, ReactNode, useContext, useState } from 'react';
import type { CarClassId, ExtraId, PaymentMethod, Place } from '../api';

// The ride being composed on the order screen, shared with the summary screen.
export type OrderDraft = {
  pickup: Place;
  destination: Place;
  scheduledAt: Date | null;
  carClass: CarClassId;
  passengers: number;
  extras: ExtraId[];
  payment: PaymentMethod;
  flightNumber: string;
  notes: string;
};

export const emptyDraft = (): OrderDraft => ({
  pickup: { address: '' },
  destination: { address: '' },
  scheduledAt: null,
  carClass: 'premium',
  passengers: 1,
  extras: [],
  payment: 'card',
  flightNumber: '',
  notes: '',
});

type OrderState = {
  draft: OrderDraft;
  setDraft: (fn: (d: OrderDraft) => OrderDraft) => void;
  reset: () => void;
};

const OrderContext = createContext<OrderState | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [draft, setState] = useState<OrderDraft>(emptyDraft);
  return (
    <OrderContext.Provider
      value={{ draft, setDraft: (fn) => setState((d) => fn(d)), reset: () => setState(emptyDraft()) }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder(): OrderState {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrder must be used inside OrderProvider');
  return ctx;
}
