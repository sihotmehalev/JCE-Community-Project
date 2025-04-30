import React, { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc, collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import ChatWindow from "./ui/ChatWindow";

export default function RequesterDashboard() {
  const [volunteer, setVolunteer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userData, setUserData] = useState(null);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    };

    const fetchMatchAndVolunteer = async () => {
      const matchDoc = await getDoc(doc(db, "matches", user.uid));
      if (matchDoc.exists()) {
        const volunteerId = matchDoc.data().volunteerId;
        const volRef = await getDoc(doc(db, "users", volunteerId));
        if (volRef.exists()) setVolunteer(volRef.data());

        const msgRef = collection(db, "messages", user.uid, volunteerId);
        const q = query(msgRef, orderBy("timestamp"));
        onSnapshot(q, (snapshot) => {
          setMessages(snapshot.docs.map(doc => ({
            ...doc.data(),
            isRequester: doc.data().senderId === user.uid
          })));
        });
      }
    };

    fetchUserData();
    fetchMatchAndVolunteer();
  }, [user]);

  const handleSendMessage = async (text) => {
    if (!volunteer) return;
    const matchDoc = await getDoc(doc(db, "matches", user.uid));
    const volunteerId = matchDoc.data().volunteerId;
    await addDoc(collection(db, "messages", user.uid, volunteerId), {
      text,
      senderId: user.uid,
      timestamp: new Date()
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">שלום {userData?.fullName?.split(' ')[0] || ''} 👋</h1>
        <Button onClick={() => navigate('/profile')}>
          הפרופיל שלי
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-xl font-semibold mb-4">ברוכים הבאים לדשבורד שלך</h2>
          <p className="mb-2">כאן תוכל/י לצפות בסטטוס ההתאמה שלך ולתקשר עם המתנדב/ת.</p>
          {volunteer ? (
            <p className="text-green-600">יש לך התאמה! את/ה יכול/ה לפתוח צ'אט עם {volunteer.fullName} בתחתית המסך.</p>
          ) : (
            <p className="text-gray-600">אנחנו עדיין עובדים על מציאת התאמה מושלמת בשבילך. נעדכן אותך ברגע שנמצא!</p>
          )}
        </CardContent>
      </Card>

      <ChatWindow
        volunteer={volunteer}
        messages={messages}
        onSendMessage={handleSendMessage}
        isMinimized={isChatMinimized}
        onToggleMinimize={() => setIsChatMinimized(!isChatMinimized)}
      />
    </div>
  );
}
