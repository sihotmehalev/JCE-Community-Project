import axios from 'axios';

// Groq AI Configuration
const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;
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
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "llama3-8b-8192",
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
    const groqResponseData = response.data;
    return groqResponseData.choices[0].message.content;
  } catch (error) {
    console.error('Groq AI Error:', JSON.stringify(error.response?.data), error.response?.status, error.response?.headers);
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

// Static system message defining the AI's persona for Life Advice
const lifeAdviceSystemMessageContent = `אתה יועץ AI אישי, אמפתי ומנוסה בשם 'יועץ מהלב'. מטרתך היא לספק עצות מפורטות, מעשיות, מעוררות מחשבה ותומכות למשתמשים, בהתבסס על המידע האישי שלהם והשאלה הספציפית שהם מציגים.

בעת מתן עצה, אנא:
1.  התייחס לפרטי המשתמש הרלוונטיים באופן ספציפי, והסבר כיצד הם משפיעים על העצה (הפרטים יסופקו בהודעת המשתמש).
2.  הצע צעדים קונקרטיים וניתנים ליישום, לא רק רעיונות כלליים.
3.  שקול נקודות מבט שונות או היבטים מרובים של הנושא הנדון.
4.  במידת האפשר, הצע מקורות נוספים (רעיוניים, לא קישורים חיצוניים) או רעיונות להמשך חקירה עצמית של המשתמש.
5.  שמור על טון חם, מכיל, מכבד ומקצועי.
6.  השתמש בשפה עשירה, ברורה ונגישה. הימנע מסיסמאות ריקות.
7.  ארגן את תשובתך בצורה הגיוטית, אולי עם כותרות משנה קצרות (ללא עיצוב מיוחד) או נקודות אם הנושא מורכב, כדי לשפר את הקריאות.
8.  התשובה צריכה להיות מקיפה ולכלול מספר רב של פסקאות.
9.  כל התשובות שלך חייבות להיות בעברית.
10. בסיום התשובה המפורטת, אנא הצע 2-3 שאלות המשך רלוונטיות או נושאים נוספים שהמשתמש/ת יכול/ה לחקור או לשאול אותך כדי להמשיך את השיחה.`;

/**
 * Sends a list of messages to the Groq API for life advice.
 * Prepends a specific system message for the 'יועץ מהלב AI' persona.
 * @param {Array<{role: 'user'|'assistant', content: string}>} conversationHistory The conversation history including the current user message.
 * The first user message in conversationHistory is expected to be a detailed prompt if it's the start of a new topic.
 * @returns {Promise<string>} The content of the AI's response.
 */
export const getAILifeAdvice = async (conversationHistory) => {
  try {
    const messagesToSend = [
      { role: "system", content: lifeAdviceSystemMessageContent },
      ...conversationHistory // The first user message here will contain the detailed tailored prompt
    ];

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "llama3-70b-8192",
        messages: messagesToSend,
        temperature: 0.75,
        max_tokens: 6000,
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
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Groq AI Life Advice Error:', error.response?.data || error.message);
    throw error;
  }
};

export const testGroqConnection = async () => {
  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "llama3-8b-8192",
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
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
};
