import React, { useState } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

export default function InitTestData() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const createTestData = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      if (!auth.currentUser) {
        throw new Error("יש להתחבר לחשבון מתנדב לפני יצירת נתוני בדיקה");
      }

      const volunteerId = auth.currentUser.uid;
      let log = ["Creating test data for volunteer ID: " + volunteerId];

      // 1. Make sure the volunteer has a user profile
      await setDoc(doc(db, "users", volunteerId), {
        fullName: "מתנדב לדוגמה",
        email: auth.currentUser.email,
        role: "volunteer",
        phone: "050-1234567",
        gender: "זכר",
        age: 35,
        profession: "יועץ נפשי",
        experience: "5 שנים",
        approved: true,
        createdAt: serverTimestamp()
      }, { merge: true });
      log.push("✅ פרופיל המתנדב עודכן");

      // 2. Create test requesters
      const requesters = [
        {
          id: "req1_" + Math.random().toString(36).substring(2, 10),
          fullName: "אבי כהן",
          email: "avi.cohen@example.com",
          phone: "052-1111111",
          gender: "זכר",
          age: 27,
          reason: "חרדה חברתית",
          role: "requester"
        },
        {
          id: "req2_" + Math.random().toString(36).substring(2, 10),
          fullName: "שרה לוי",
          email: "sarah.levy@example.com",
          phone: "054-2222222",
          gender: "נקבה",
          age: 42,
          reason: "דיכאון קליני",
          role: "requester"
        },
        {
          id: "req3_" + Math.random().toString(36).substring(2, 10),
          fullName: "יוסי אברהם",
          email: "yossi.a@example.com",
          phone: "058-3333333",
          gender: "זכר",
          age: 19,
          reason: "קשיי הסתגלות",
          role: "requester"
        }
      ];

      // Add requesters to users collection
      for (const requester of requesters) {
        const { id, ...userData } = requester;
        await setDoc(doc(db, "users", id), {
          ...userData,
          createdAt: serverTimestamp()
        });
      }
      log.push("✅ נוצרו פרופילים של פונים לדוגמה");

      // 3. Create matches between volunteer and requesters
      const matches = [
        {
          volunteerId,
          requesterId: requesters[0].id,
          status: "active",
          createdAt: serverTimestamp(),
          scheduledTime: "יום ראשון, 18:00"
        },
        {
          volunteerId,
          requesterId: requesters[1].id,
          status: "active",
          createdAt: serverTimestamp(),
          scheduledTime: "יום שלישי, 17:30"
        },
        {
          volunteerId,
          requesterId: requesters[2].id,
          status: "canceled",
          createdAt: serverTimestamp(),
          canceledAt: serverTimestamp(),
          canceledBy: volunteerId,
          scheduledTime: "יום רביעי, 19:00"
        }
      ];

      for (const match of matches) {
        await addDoc(collection(db, "matches"), match);
      }
      log.push("✅ נוצרו התאמות מתנדב-פונה");

      // 4. Create test messages
      const messages = [
        {
          senderId: volunteerId,
          text: "שלום, איך אני יכול לעזור?",
          timestamp: new Date(Date.now() - 100000)
        },
        {
          senderId: requesters[0].id,
          text: "תודה שהסכמת לדבר איתי. אני מרגיש מאוד לחוץ לאחרונה.",
          timestamp: new Date(Date.now() - 90000)
        },
        {
          senderId: volunteerId,
          text: "אני מבין. בוא נתחיל בלדבר על מה שגורם לך להרגיש כך.",
          timestamp: new Date(Date.now() - 80000)
        }
      ];

      // Add messages to the conversations collection
      for (const message of messages) {
        await addDoc(
          collection(db, "messages", requesters[0].id, volunteerId), 
          message
        );
      }
      log.push("✅ נוצרו הודעות לדוגמה");

      // 5. Create waiting requests
      const waitingRequests = [
        {
          requesterId: "waiting1_" + Math.random().toString(36).substring(2, 10),
          status: "waiting",
          createdAt: serverTimestamp(),
          preferredTimes: "ערב",
          reason: "בעיות בעבודה"
        },
        {
          requesterId: "waiting2_" + Math.random().toString(36).substring(2, 10),
          status: "waiting",
          createdAt: serverTimestamp(),
          preferredTimes: "בוקר",
          reason: "מתח במשפחה"
        }
      ];

      // Add waiting requesters' profiles
      await setDoc(doc(db, "users", waitingRequests[0].requesterId), {
        fullName: "דני ישראלי",
        email: "dani@example.com", 
        phone: "050-4444444",
        gender: "זכר",
        age: 31,
        reason: "בעיות בעבודה",
        role: "requester"
      });

      await setDoc(doc(db, "users", waitingRequests[1].requesterId), {
        fullName: "מיכל דוד",
        email: "michal@example.com", 
        phone: "050-5555555",
        gender: "נקבה",
        age: 45,
        reason: "מתח במשפחה",
        role: "requester"
      });

      // Add waiting requests
      for (const request of waitingRequests) {
        await addDoc(collection(db, "requests"), request);
      }
      log.push("✅ נוצרו בקשות ממתינות");

      log.push("✅ כל נתוני הבדיקה נוצרו בהצלחה! רענן את הדף כדי לראות את השינויים.");
      setResult({ success: true, messages: log });
    } catch (error) {
      console.error("Error creating test data:", error);
      setResult({ 
        success: false, 
        error: error.message || "שגיאה ביצירת נתוני בדיקה" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">יצירת נתוני בדיקה לדאשבורד מתנדב</h2>
      <p className="mb-4 text-gray-700">
        לחץ על הכפתור כדי ליצור נתונים לדוגמה שיאפשרו לך לבדוק את הפונקציונליות של דאשבורד המתנדב.
        נתונים אלו יכללו פרופיל מתנדב, פונים, התאמות, הודעות ובקשות ממתינות.
      </p>
      
      <div className="flex justify-center mb-4">
        <button
          onClick={createTestData}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-medium ${
            loading 
              ? "bg-gray-400 cursor-not-allowed" 
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {loading ? "מייצר נתונים..." : "צור נתוני בדיקה"}
        </button>
      </div>
      
      {result && (
        <div className={`mt-4 p-4 rounded-lg ${
          result.success ? "bg-green-100" : "bg-red-100"
        }`}>
          {result.success ? (
            <div>
              <h3 className="font-bold text-green-800 mb-2">פעולה הצליחה!</h3>
              <ul className="list-disc list-inside text-green-700">
                {result.messages.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-red-600">
              <h3 className="font-bold mb-2">שגיאה!</h3>
              <p>{result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 