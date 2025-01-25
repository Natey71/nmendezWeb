
const { OpenAI } = require('openai');
// Load environment variables
const openai = new OpenAI({
  organization: process.env.OPENAI_ORG_KEY,
  apiKey: process.env.OEPNAI_API_KEY,
  project: process.env.OPENAI_PROJ_KEY
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

module.exports = {
  runPrompt,
};