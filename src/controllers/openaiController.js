
import { OpenAI } from 'openai';
import { getOpenAISecret } from '../secrets.js';
// Load environment variables
const secret = await getOpenAISecret();
const secObj = JSON.parse(secret);
const org = secObj.ORG_KEY;
const api = secObj.API_KEY;
const proj = secObj.PROJ_KEY;
const openai = new OpenAI({
  organization: org,
  apiKey: api,
  project: proj 
});

const runPrompt = async(prompt) => {
  try {
    const chatComp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt}],
      max_tokens: 2048,
      temperature: 0.5,
    });
  
    return chatComp.choices[0]?.message.content;
  } catch(error) {
    console.error("Error with OpenAI API call: " + error);
    throw error;
  }

};

export {
  runPrompt,
};