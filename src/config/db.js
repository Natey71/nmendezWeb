// src/config/db.js
require('dotenv').config(); // Load environment variables from .env

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// Initialize the DynamoDB Client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION, // e.g., 'us-west-2'
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Your AWS Access Key ID
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // Your AWS Secret Access Key
  },
});

// Create the DynamoDB Document Client for easier data handling
const dynamoDB = DynamoDBDocumentClient.from(client);

module.exports = dynamoDB;
