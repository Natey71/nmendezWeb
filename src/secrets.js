import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import 'dotenv/config';

const session_secret_name = process.env.AWS_SESSION_NAME;
const openAI_secret_name = process.env.AWS_OPENAI_NAME;
const google_secret_name = process.env.AWS_GOOGLE_NAME; 
const client = new SecretsManagerClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function getSessionSecret() {
  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: session_secret_name,
        VersionStage: "AWSCURRENT",
      })
    );
    const secObj = JSON.parse(response.SecretString);
    const session = secObj.SESSION_SECRET; 
    return session;
  } catch (error) {
    console.error("Error retrieving secret:", error);
    throw error;
  }
}


async function getOpenAISecret() {
  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: openAI_secret_name,
        VersionStage: "AWSCURRENT",
      })
    );
    return response.SecretString;
  } catch (error) {
    console.error("Error retrieving secret:", error);
    throw error;
  }
}

async function getGoogleSecret() {
  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: google_secret_name,
        VersionStage: "AWSCURRENT",
      })
    );
    return response.SecretString;
  } catch (error) {
    console.error("Error retrieving secret:", error);
    throw error;
  }
}


export { 
    getSessionSecret, 
    getOpenAISecret,
    getGoogleSecret
};