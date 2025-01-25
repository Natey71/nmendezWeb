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
  } catch (error) {
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

module.exports = { addUser, getUser };
