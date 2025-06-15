import axios from 'axios';

// Groq AI Configuration
const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;
// console.log("GROQ_API_KEY from .env (aiService.js):", GROQ_API_KEY);
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * @typedef {object} GroqMessage
 * @property {string} content
 */

/**
 * @typedef {object} GroqChoice
 * @property {GroqMessage} message
 */

/**
 * @typedef {object} GroqChatCompletionResponse
 * @property {GroqChoice[]} choices
 */

export const getAIMatchingSuggestions = async (prompt) => {
  try {
    // console.log("AI Matching Suggestions Prompt:", prompt);
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "llama3-8b-8192", // Updated Groq model
        messages: [
          {
            role: "system",
            content: "אתה רכז התאמה מומחה לתוכנית תמיכה בהתנדבות. נתח פרופילים והצע התאמות מיטביות על בסיס גורמי תאימות. ספק המלצות ברורות ומובנות, וודא שכל התשובות שלך הן בעברית."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    /** @type {GroqChatCompletionResponse} */
    const groqResponseData = response.data;
    return groqResponseData.choices[0].message.content;
  } catch (error) {
    console.error('Groq AI Error:', JSON.stringify(error.response?.data), error.response?.status, error.response?.headers);

    // Fallback error handling
    if (error.response?.status === 401) {
      throw new Error('Invalid API key. Please check your Groq API configuration.');
    } else if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (error.response?.status === 400) {
      throw new Error('Invalid request format. Please check the prompt.');
    }

    throw new Error('Failed to get AI suggestions. Please try again.');
  }
};

export const testGroqConnection = async () => {
  try {
    // console.log("Testing Groq connection with API Key:", GROQ_API_KEY ? "Loaded" : "Not Loaded");
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "llama3-8b-8192", // Updated Groq model
        messages: [
          {
            role: "system",
            content: "אמור 'שלום, החיבור הצליח!' בדיוק במילים אלו."
          },
          {
            role: "user",
            content: "אמור 'שלום, החיבור הצליח!' בדיוק במילים אלו."
          }
        ],
        temperature: 0,
        max_tokens: 20,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    /** @type {GroqChatCompletionResponse} */
    const groqResponseData = response.data;
    return groqResponseData.choices[0].message.content;
  } catch (error) {
    console.error('Groq connection test failed:', JSON.stringify(error.response?.data), error.response?.status, error.response?.headers);
    throw error;
  }
};

export const getAIMatchingSuggestionsWithRetry = async (prompt, retries = 2) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await getAIMatchingSuggestions(prompt);
    } catch (error) {
      if (i === retries) throw error;

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}; 