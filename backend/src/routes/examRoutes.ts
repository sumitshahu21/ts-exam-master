import { Router } from 'express';

const router = Router();

// Placeholder routes for exams
router.get('/', (req, res) => {
  res.json({ message: 'Exam routes - Coming soon' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create exam - Coming soon' });
});

export default router;
