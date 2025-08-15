import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { TestAttempt, Answer } from '../../types';

interface TestState {
  currentAttempt: TestAttempt | null;
  timeRemaining: number;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: TestState = {
  currentAttempt: null,
  timeRemaining: 0,
  isSubmitting: false,
  error: null,
};

export const startTest = createAsyncThunk(
  'test/startTest',
  async (examId: string) => {
    const response = await fetch(`/api/tests/start/${examId}`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to start test');
    }
    return response.json();
  }
);

export const submitTest = createAsyncThunk(
  'test/submitTest',
  async ({ attemptId, answers }: { attemptId: string; answers: Answer[] }) => {
    const response = await fetch(`/api/tests/submit/${attemptId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    if (!response.ok) {
      throw new Error('Failed to submit test');
    }
    return response.json();
  }
);

const testSlice = createSlice({
  name: 'test',
  initialState,
  reducers: {
    updateAnswer: (state, action) => {
      if (state.currentAttempt) {
        const { questionId, answer } = action.payload;
        const existingAnswerIndex = state.currentAttempt.answers.findIndex(
          a => a.questionId === questionId
        );
        
        if (existingAnswerIndex >= 0) {
          state.currentAttempt.answers[existingAnswerIndex] = answer;
        } else {
          state.currentAttempt.answers.push(answer);
        }
      }
    },
    setTimeRemaining: (state, action) => {
      state.timeRemaining = action.payload;
    },
    decrementTime: (state) => {
      if (state.timeRemaining > 0) {
        state.timeRemaining -= 1;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startTest.fulfilled, (state, action) => {
        state.currentAttempt = action.payload;
        state.timeRemaining = action.payload.timeRemaining || 0;
      })
      .addCase(startTest.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to start test';
      })
      .addCase(submitTest.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(submitTest.fulfilled, (state) => {
        state.isSubmitting = false;
        state.currentAttempt = null;
        state.timeRemaining = 0;
      })
      .addCase(submitTest.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to submit test';
      });
  },
});

export const { updateAnswer, setTimeRemaining, decrementTime, clearError } = testSlice.actions;
export default testSlice.reducer;
