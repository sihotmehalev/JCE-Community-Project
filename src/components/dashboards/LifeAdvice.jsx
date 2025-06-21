// LifeAdvice.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { getAILifeAdvice } from "../../utils/aiService";
import { lifeAdviceTopics, getQuestionById } from '../../utils/LifeAdviceTopics';
import LoadingSpinner from '../ui/LoadingSpinner';
import CustomAlert from '../ui/CustomAlert';

// Function to create the content for the *initial* user message, including user data and detailed instructions
function createTailoredPrompt(questionText, userData, requesterFormConfig) {
  let prompt = `המשתמש/ת מבקש/ת עצה בנושא: "${questionText}".\n\n`;
  prompt += "להלן פרטי הפרופיל של המשתמש/ת הרלוונטיים למתן עצה מותאמת אישית:\n";

  const relevantFields = [
    { key: 'age', label: 'גיל' },
    { key: 'gender', label: 'מגדר' },
    { key: 'maritalStatus', label: 'מצב משפחתי' },
    { key: 'reason', label: 'סיבת פנייה עיקרית' },
    { key: 'needs', label: 'צרכים בתמיכה' },
  ];

  relevantFields.forEach(field => {
    if (userData && userData[field.key]) {
      const fieldDef = requesterFormConfig?.customFields?.find(cf => cf.name === field.key);
      const label = fieldDef?.label || field.label;
      const valueToDisplay = String(userData[field.key]).replace(/`/g, '\`');
      prompt += `- ${label}: ${valueToDisplay}\n`;
    }
  });

  // Exclude sensitive or irrelevant fields from the AI prompt
  const excludedFields = [
    'fullName', 'name', 'firstName', 'lastName', 'email', 'phone', 
    'uid', 'id', 'userType', 'approved', 'createdAt', 'lastLogin', 
    'profileComplete', 'requesterId', 'volunteerId', 
    'matchId', 'status', 'updatedAt'
  ];

  prompt += "\nפרטים נוספים מהפרופיל (כולל שדות מותאמים אישית):\n";
  if (userData) {
    for (const key in userData) {
      if (Object.hasOwnProperty.call(userData, key) && 
          !relevantFields.some(rf => rf.key === key) && 
          !excludedFields.includes(key) && 
          typeof userData[key] !== 'object' && 
          userData[key] !== null && 
          userData[key] !== '') {
          const fieldDef = requesterFormConfig?.customFields?.find(cf => cf.name === key);
          const label = fieldDef?.label || key;
          const valueToDisplay = String(userData[key]).replace(/`/g, '\`');
          prompt += `- ${label}: ${valueToDisplay}\n`;
      }
    }
  }

  prompt += `\nבהתבסס על כל המידע הנ"ל והשאלה שלי, אנא ספק/י עצה מקיפה, מעמיקה ומעשית.
התייחס/י באופן ספציפי לפרטי הפרופיל של המשתמש/ת בעצתך. 
הצע/י צעדים ברורים שהמשתמש/ת יכול/ה לנקוט, ושקול/י היבטים שונים של הנושא. 
התשובה צריכה להיות בעברית, מנוסחת היטב, מאורגנת ומפורטת מאוד.
חשוב מאוד שהתשובה תהיה ארוכה ומעמיקה ככל האפשר, כאילו אתה כותב מאמר שלם בנושא. אנא פרט והרחב ככל שניתן, ושאף לתשובה שתתפרס על פני מספר רב של פסקאות, אפילו 15-20 פסקאות או יותר אם הנושא מאפשר זאת, כדי לכסות את הנושא ביסודיות מכל היבטיו.
**הנחיה קריטית לשמירה על פרטיות**: לעולם אל תפנה למשתמש בשמו הפרטי, גם אם נדמה לך שאתה מזהה אותו בפרטים שנמסרו. השתמש בפניות כלליות כמו "שלום לך" או "פונה יקר/ה". שמירה על אנונימיות המשתמש היא בעלת חשיבות עליונה.
בסיום התשובה המפורטת, אנא הצע 2-3 שאלות המשך רלוונטיות או נושאים נוספים שאוכל לחקור או לשאול אותך כדי להמשיך את השיחה ולהעמיק בהבנת הנושא ופתרונות אפשריים.`;
  return prompt;
}

export default function LifeAdvice({ userData, requesterFormConfig }) {
  const [selectedQuestionId, setSelectedQuestionId] = useState('');
  const [currentInput, setCurrentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const chatContainerRef = useRef(null);
  const handleGetAdviceFromTemplate = async () => {
    if (!selectedQuestionId) {
      setAlertMessage({ message: "אנא בחר/י שאלה לקבלת עצה.", type: "error" });
      return;
    }
    const questionObj = getQuestionById(selectedQuestionId);
    const questionText = questionObj ? questionObj.text : '';

    if (!questionText) {
       setAlertMessage({ message: "שגיאה: השאלה שנבחרה אינה חוקית.", type: "error" });
       return;
    }
    await sendQuestionToAI(questionText);
    setSelectedQuestionId(''); // Clear selection after sending
  };

  const handleSendCustomQuestion = async () => {
    if (!currentInput.trim()) {
      setAlertMessage({ message: "אנא הקלד/י שאלה לשליחה.", type: "error" });
      return;
    }
    await sendQuestionToAI(currentInput.trim());
  };

  const sendQuestionToAI = async (questionTextForDisplay) => {
    setLoading(true);
    setAlertMessage(null);

    const userMessageForHistory = { role: 'user', content: questionTextForDisplay };

    const contentForAIMessage = conversationHistory.length === 0
      ? createTailoredPrompt(questionTextForDisplay, userData, requesterFormConfig)
      : questionTextForDisplay;

    const historyForAI = [
      ...conversationHistory,
      { role: 'user', content: contentForAIMessage }
    ];

    console.log("Messages sent to AI:", historyForAI);

    try {
      const aiResponseContent = await getAILifeAdvice(historyForAI);

      setConversationHistory(prevHistory => [
        ...prevHistory,
        userMessageForHistory,
        { role: 'assistant', content: aiResponseContent }
      ]);
      setCurrentInput('');
    } catch (error) {
      console.error("Error getting AI advice:", error);
      const errorMessage = error.message || "שגיאה לא ידועה בקבלת עצה מה-AI. נסה שוב מאוחר יותר.";
      setAlertMessage({ 
        message: `שגיאה בקבלת עצה מה-AI: ${errorMessage}`, 
        type: "error" 
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [conversationHistory]);

  // Early return if userData is not available, *after* all hooks have been called.
  if (!userData) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gradient-to-br from-orange-50 via-rose-50 to-amber-50 rounded-xl border border-orange-200 shadow-xl">
      <h2 className="text-3xl font-bold text-orange-800 mb-4 text-center">
        <span role="img" aria-label="heart sparkle" className="mr-2">💖</span>
        ייעוץ מהלב AI
      </h2>
      <p className="text-center text-orange-700 mb-8 text-md leading-relaxed max-w-2xl mx-auto">
        כאן תוכלו לקבל ייעוץ אישי המותאם לכם ממודל בינה מלאכותית מתקדם.
        בחרו נושא מהרשימה או שאלו שאלה משלכם, וה-AI יספק לכם תובנות והכוונה.
        זכרו, זהו כלי תומך ואינו מחליף ייעוץ מקצועי.
      </p>
      
      {/* Template Questions Section */}
      <div className="bg-white/70 backdrop-blur-sm p-6 rounded-lg shadow-md border border-orange-100 mb-8">
        <h3 className="text-xl font-semibold text-orange-700 mb-4 text-center">התחילו עם שאלה מוכנה:</h3>
      <div className="mb-4">
        <label htmlFor="adviceTopic" className="block text-sm font-medium text-orange-700 mb-1">בחר/י נושא לייעוץ מהרשימה:</label>
        <select
          id="adviceTopic"
          value={selectedQuestionId}
          onChange={(e) => setSelectedQuestionId(e.target.value)}
          className="w-full p-3 border-2 border-orange-200 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none text-sm bg-white"
        >
          <option value="" disabled>-- בחר שאלה --</option>
          {lifeAdviceTopics.map(category => (
            <optgroup label={category.category} key={category.category}>
              {category.questions.map(q => (
                <option key={q.id} value={q.id}>{q.text}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="flex justify-center mt-4">
        {!loading && (
          <Button 
            onClick={handleGetAdviceFromTemplate} 
            disabled={!selectedQuestionId} 
            className="px-8 py-3 text-lg bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-0.5"
          >
            קבל/י עצה מהרשימה
          </Button>
        )}
        {loading && <LoadingSpinner />}
      </div>
      </div>

      {/* Conversation History Display */}
      {conversationHistory.length > 0 && (
        <div 
          ref={chatContainerRef} 
          className="mt-6 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-orange-100 shadow-lg max-h-[32rem] overflow-y-auto space-y-4 mb-6 custom-scrollbar"
        >
          {conversationHistory.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[75%] px-4 py-3 rounded-2xl shadow-md ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-800 border border-gray-200 rounded-bl-none'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input for Custom Questions / Follow-ups */}
      <div className="mt-4 flex flex-col gap-3 bg-white/70 backdrop-blur-sm p-4 sm:p-6 rounded-lg shadow-md border border-orange-100">
        <label htmlFor="customQuestion" className="block text-lg font-semibold text-orange-700 text-center">
          {conversationHistory.length > 0 ? "יש לך שאלה נוספת או שאלת המשך?" : "או, שאל/י שאלה משלך:"}
        </label>
        <textarea
          id="customQuestion"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          placeholder="הקלד/י את שאלתך כאן... נסו להיות מפורטים ככל האפשר."
          rows="3"
          className="w-full p-3 border-2 border-orange-200 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none text-md bg-white shadow-inner"
        />
        {!loading && (
          <Button 
            onClick={handleSendCustomQuestion} 
            disabled={!currentInput.trim()} 
            className="px-8 py-3 text-lg self-center bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-0.5"
          >
            שלח שאלה
          </Button>
        )}
        {loading && <LoadingSpinner />}
      </div>
      
      <CustomAlert message={alertMessage?.message} type={alertMessage?.type} onClose={() => setAlertMessage(null)} />
    </div>
  );
}
