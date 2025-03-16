// routes/openaiRoute.js
import express from 'express';
const router = express.Router();
import { runPrompt } from '../controllers/openaiController.js';

// Render the form for user input
router.get('/openai', (req, res) => {
  res.render('openai', { response: null });
});

// Handle form submission and OpenAI API call
router.post('/api/prompt', async (req, res) => {
  const prompt = req.body.prompt;
  try {
    const response = await runPrompt(prompt);
    res.send(response);
  } catch (error) {
    res.status(500).send('Error generating response');
  }
});

export default router;
