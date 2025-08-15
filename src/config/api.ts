const API_BASE_URL = 'http://localhost:5000/api';

export const api = {
  auth: {
    login: `${API_BASE_URL}/auth/login`,
    register: `${API_BASE_URL}/auth/register`,
    profile: `${API_BASE_URL}/auth/profile`,
  },
  exams: {
    list: `${API_BASE_URL}/exams`,
    create: `${API_BASE_URL}/exams`,
    get: (id: string) => `${API_BASE_URL}/exams/${id}`,
    update: (id: string) => `${API_BASE_URL}/exams/${id}`,
    delete: (id: string) => `${API_BASE_URL}/exams/${id}`,
  },
  tests: {
    start: (examId: string) => `${API_BASE_URL}/tests/${examId}/start`,
    submit: (testId: string) => `${API_BASE_URL}/tests/${testId}/submit`,
    results: (testId: string) => `${API_BASE_URL}/tests/${testId}/results`,
  }
};

export default API_BASE_URL;
