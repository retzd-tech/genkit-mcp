require('dotenv').config();
const { genkit } = require('genkit');

let plugins = [];
if (process.env.GEMINI_API_KEY) {
  try {
    const { googleAI } = require('@genkit-ai/google-genai');
    plugins.push(googleAI());
  } catch (err) {
    console.warn('[Genkit] Could not load @genkit-ai/google-genai:', err.message);
  }
}

// Single shared Genkit instance across tools, flows, and MCP server
const ai = genkit({
  plugins
});

module.exports = { ai };
