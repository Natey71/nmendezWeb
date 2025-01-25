const express = require('express');
const router = express.Router();
const userService = require('../services/userService');


// Route to add a new user
router.post('/', async (req, res) => {
  const user = req.body;

  try {
    await userService.addUser(user);
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Route to get a user by ID
router.get('/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await userService.getUser(userId);
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;