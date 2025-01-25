// tests/services/userService.test.js
const userService = require('../../src/services/userService');
const dynamoDB = require('../../src/config/db');

// Mock DynamoDB DocumentClient methods
jest.mock('../../src/config/db', () => ({
  put: jest.fn(),
  get: jest.fn(),
}));

describe('User Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('addUser should add a user successfully', async () => {
    dynamoDB.put.mockResolvedValue({}); // Mock the put method to resolve

    const user = { UserId: 'user123', Name: 'John Doe', Email: 'john@example.com' };
    const expectedResponse = {
      success: true,
      message: 'User added successfully'
    };
    
    await expect(userService.addUser(user)).resolves.toEqual(expectedResponse);
    expect(dynamoDB.put).toHaveBeenCalledWith({
      TableName: 'Users',
      Item: user,
      ConditionExpression: 'attribute_not_exists(UserId)'
    });
  });

  test('getUser should retrieve a user successfully', async () => {
    const mockUser = { UserId: 'user123', Name: 'John Doe', Email: 'john@example.com' };
    dynamoDB.get.mockResolvedValue({ Item: mockUser }); // Mock the get method to resolve with Item

    await expect(userService.getUser('user123')).resolves.toEqual(mockUser);
    expect(dynamoDB.get).toHaveBeenCalledWith({
      TableName: 'Users',
      Key: { UserId: 'user123' },
    });
  });

  test('getUser should return undefined if user not found', async () => {
    dynamoDB.get.mockResolvedValue({}); // Mock the get method to resolve with no Item

    const user = { UserId: 'user123', Name: 'John Doe', Email: 'john@example.com' };
    const result = await userService.addUser(user);
    expect(result).toEqual({
      success: true,
      message: 'User added successfully',
      user
    });
    expect(dynamoDB.get).toHaveBeenCalledWith({
      TableName: 'Users',
      Key: { UserId: 'nonexistent' },
    });
  });

  test('addUser should throw an error if DynamoDB fails with conditional check', async () => {
    const dbError = {
      code: 'ConditionalCheckFailedException',
      message: 'User already exists',
    };
    dynamoDB.put.mockRejectedValue(dbError);
    
    const user = { UserId: 'user123', Name: 'John Doe', Email: 'john@example.com' };
    await expect(userService.addUser(user)).rejects.toThrow('User already exists');
  });

  test('addUser should throw an error for other DynamoDB failures', async () => {
    const dbError = {
      code: 'InternalServerError',
      message: 'Internal server error',
    };
    dynamoDB.put.mockRejectedValue(dbError);
    
    const user = { UserId: 'user123', Name: 'John Doe', Email: 'john@example.com' };
    await expect(userService.addUser(user)).rejects.toThrow('Internal server error');
  });
});
