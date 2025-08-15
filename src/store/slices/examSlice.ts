import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Exam } from '../../types';

interface ExamState {
  exams: Exam[];
  currentExam: Exam | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ExamState = {
  exams: [],
  currentExam: null,
  isLoading: false,
  error: null,
};

export const fetchExams = createAsyncThunk(
  'exam/fetchExams',
  async () => {
    const response = await fetch('/api/exams');
    if (!response.ok) {
      throw new Error('Failed to fetch exams');
    }
    return response.json();
  }
);

export const createExam = createAsyncThunk(
  'exam/createExam',
  async (examData: Partial<Exam>) => {
    const response = await fetch('/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(examData),
    });
    if (!response.ok) {
      throw new Error('Failed to create exam');
    }
    return response.json();
  }
);

const examSlice = createSlice({
  name: 'exam',
  initialState,
  reducers: {
    setCurrentExam: (state, action) => {
      state.currentExam = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExams.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExams.fulfilled, (state, action) => {
        state.isLoading = false;
        state.exams = action.payload;
      })
      .addCase(fetchExams.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch exams';
      })
      .addCase(createExam.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createExam.fulfilled, (state, action) => {
        state.isLoading = false;
        state.exams.push(action.payload);
      })
      .addCase(createExam.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to create exam';
      });
  },
});

export const { setCurrentExam, clearError } = examSlice.actions;
export default examSlice.reducer;
