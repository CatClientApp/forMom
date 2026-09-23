import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  currentUserId: number | null;
  setCurrentUserId: (id: number | null) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      currentUserId: null,
      setCurrentUserId: (id) => set({ currentUserId: id }),
    }),
    {
      name: 'physics-trainer-user',
    }
  )
);

export const getUserStore = () => useUserStore.getState();
