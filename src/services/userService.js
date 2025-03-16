// src/services/userService.js
const dynamoDB = require('../config/db');

const addUser = async (user) => {
  const params = {
    TableName: 'Users',
    Item: user,
  };

  try {
    await dynamoDB.put(params);
    console.log('User added successfully');
    return {
      success: true,
      message: 'User added successfully',
      user
    };
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      return {
        success: false,
        message: 'User already exists',
      };
    }
    console.error('Error adding user:', error);
    throw error;
  }
};

const getUser = async (userId) => {
  const params = {
    TableName: 'Users',
    Key: {
      UserId: userId,
    },
  };

  try {
    const { Item } = await dynamoDB.get(params);
    return Item;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

export default { addUser, getUser };
