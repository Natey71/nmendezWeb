// src/config/db.js
require('dotenv').config(); // Load environment variables from .env

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// Initialize the DynamoDB Client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1', // e.g., 'us-west-2'
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Your AWS Access Key ID
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // Your AWS Secret Access Key
  },
});
const dynamoDB = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true, // Remove undefined values from objects
    convertEmptyValues: true,    // Convert empty strings to null
  },
});

// Test the connection
const testConnection = async () => {
  try {
    await client.config.credentials();
    console.log('Successfully connected to DynamoDB');
  } catch (error) {
    console.error('Failed to connect to DynamoDB:', error);
    throw error;
  }
};

testConnection();
// Create the DynamoDB Document Client for easier data handling

module.exports = dynamoDB;
