import { create } from 'zustand';
import { TOUR_STEPS } from '@/shared/config/tour-steps';

interface TourState {
  isActive: boolean;
  currentStep: number;
  steps: typeof TOUR_STEPS;
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  complete: () => void;
}

export const useTourStore = create<TourState>()((set) => ({
      isActive: false,
      currentStep: 0,
      steps: TOUR_STEPS,

      start: () => set({ isActive: true, currentStep: 0 }),

      next: () =>
        set((s) => {
          if (s.currentStep >= s.steps.length - 1) {
            return { isActive: false, currentStep: 0 };
          }
          return { currentStep: s.currentStep + 1 };
        }),

      prev: () =>
        set((s) => ({
          currentStep: Math.max(0, s.currentStep - 1),
        })),

      skip: () => set({ isActive: false, currentStep: 0 }),

      complete: () => set({ isActive: false, currentStep: 0 }),
}));
