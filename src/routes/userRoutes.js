import express from 'express';
const router = express.Router();
import { addUser, getUser } from '../services/userService.js';


// Route to add a new user
router.post('/', async (req, res) => {
  const user = req.body;

  try {
    await addUser(user);
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Route to get a user by ID
router.get('/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await getUser(userId);
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;