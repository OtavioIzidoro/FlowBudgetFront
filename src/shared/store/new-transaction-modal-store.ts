import { create } from 'zustand';

interface NewTransactionModalState {
  openFromFab: boolean;
  setOpenFromFab: (open: boolean) => void;
}

export const useNewTransactionModalStore = create<NewTransactionModalState>()((set) => ({
  openFromFab: false,
  setOpenFromFab: (open) => set({ openFromFab: open }),
}));
