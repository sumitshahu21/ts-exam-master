import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import examSlice from './slices/examSlice';
import testSlice from './slices/testSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    exam: examSlice,
    test: testSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
