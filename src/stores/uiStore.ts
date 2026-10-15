import { create } from 'zustand';

interface UiState {
  readonly paletteOpen: boolean;
  readonly setPaletteOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
}));
