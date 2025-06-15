// firebaseHelpers.js
import { collection, doc } from "firebase/firestore";
import { db } from "../firebaseConfig";

// Generate random ID for matches and requests
export const generateRandomId = () => {
  return doc(collection(db, "temp")).id;
};

// AI Prompt Generator
export const generateAIPrompt = (request, availableVolunteers) => {
  const requesterAge = request.requesterInfo.age || 'לא ידוע';
  const requesterGender = request.requesterInfo.gender || 'לא ידוע';
  const requesterMainInterest = request.requesterInfo.reason || 'לא צוין עניין עיקרי';
  const requesterMessageRequest = request.messageRequest || 'לא סופקה הודעת בקשה';

  const prompt = `
אנא הצע את ההתאמה הטובה ביותר למתנדב עבור בקשת התמיכה הזו:

פרופיל הפונה:
- גיל: ${requesterAge}
- מין: ${requesterGender}
- עניין עיקרי: ${requesterMainInterest}
- הודעת בקשה: ${requesterMessageRequest}

מתנדבים זמינים:
${availableVolunteers.map((v, index) => `
מתנדב #${index + 1}:
   - גיל: ${v.age}
   - מין: ${v.gender}
   - מקצוע: ${v.profession || 'לא ידוע'}
   - ניסיון: ${v.experience || 'לא ידוע'}
   - התמחויות: ${v.specializations || 'תמיכה כללית'}
   - התאמות פעילות נוכחיות: ${v.activeMatchIds?.length || 0}
   - זמינות: ${v.isAvailable ? 'זמין/ה' : 'מוגבלת'}
`).join('')}

קריטריונים להתאמה:
1. רלוונטיות ניסיון לדאגות הפונה
2. התאמת גיל (שלב חיים דומה או פער מנטור מתאים)
3. התאמת מין אם חשוב מבחינה תרבותית/אישית
4. עומס עבודה נוכחי (העדף מתנדבים עם פחות התאמות פעילות)
5. התאמת רקע מקצועי לצרכים

אנא ספק 3 התאמות מובילות עם נימוק:
ההתאמה הטובה ביותר: מתנדב #[מספר]
נימוק: [הסבר מפורט]

בחירה שנייה: מתנדב #[מספר]
נימוק: [הסבר מפורט]

בחירה שלישית: מתנדב #[מספר]
נימוק: [הסבר מפורט]
`;

  return prompt;
};