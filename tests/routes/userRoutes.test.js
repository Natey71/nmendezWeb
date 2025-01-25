// tests/routes/userRoutes.test.js
const request = require('supertest');
const express = require('express');
const userRoutes = require('../../src/routes/userRoutes');
const userService = require('../../src/services/userService');

// Mock the userService methods
jest.mock('../../src/services/userService');

const app = express();
app.use(express.json());
app.use('/users', userRoutes);

describe('User Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /users', () => {
    it('should create a new user and return 201', async () => {
      const newUser = { UserId: 'user123', Name: 'John Doe', Email: 'john@example.com' };

      // Mock addUser to resolve successfully
      userService.addUser.mockResolvedValue();

      const res = await request(app)
        .post('/users')
        .send(newUser)
        .set('Accept', 'application/json');

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'User created successfully');
      expect(userService.addUser).toHaveBeenCalledWith(newUser);
    });

    it('should return 500 if addUser throws an error', async () => {
      const newUser = { UserId: 'user123', Name: 'John Doe', Email: 'john@example.com' };

      // Mock addUser to throw an error
      userService.addUser.mockRejectedValue(new Error('Failed to add user'));

      const res = await request(app)
        .post('/users')
        .send(newUser)
        .set('Accept', 'application/json');

      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty('error', 'Failed to create user');
      expect(userService.addUser).toHaveBeenCalledWith(newUser);
    });
  });

  describe('GET /users/:id', () => {
    it('should retrieve a user and return 200', async () => {
      const userId = 'user123';
      const mockUser = { UserId: 'user123', Name: 'John Doe', Email: 'john@example.com' };

      // Mock getUser to return the mockUser
      userService.getUser.mockResolvedValue(mockUser);

      const res = await request(app)
        .get(`/users/${userId}`)
        .set('Accept', 'application/json');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockUser);
      expect(userService.getUser).toHaveBeenCalledWith(userId);
    });

    it('should return 404 if user not found', async () => {
      const userId = 'nonexistent';

      // Mock getUser to return undefined
      userService.getUser.mockResolvedValue(undefined);

      const res = await request(app)
        .get(`/users/${userId}`)
        .set('Accept', 'application/json');

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('error', 'User not found');
      expect(userService.getUser).toHaveBeenCalledWith(userId);
    });

    it('should return 500 if getUser throws an error', async () => {
      const userId = 'user123';

      // Mock getUser to throw an error
      userService.getUser.mockRejectedValue(new Error('Failed to fetch user'));

      const res = await request(app)
        .get(`/users/${userId}`)
        .set('Accept', 'application/json');

      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty('error', 'Failed to fetch user');
      expect(userService.getUser).toHaveBeenCalledWith(userId);
    });
  });
});
