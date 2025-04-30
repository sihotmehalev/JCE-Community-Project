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
    <div className="max-w-5xl mx-auto p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">שלום {userData?.fullName?.split(' ')[0] || ''} 👋</h1>
        <Button 
          onClick={() => navigate('/profile')}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          צפה בפרופיל
        </Button>
      </div>

      {/* Welcome Card */}
      <Card className="mb-6 shadow-sm">
        <CardContent className="p-4">
          <h2 className="text-xl font-semibold mb-2">ברוכים הבאים לדשבורד שלך</h2>
          <p className="text-gray-600">כאן תוכל/י לצפות בסטטוס ההתאמה שלך ולתקשר עם המתנדב/ת.</p>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card className="mb-6 shadow-sm">
        <CardContent className="p-4">
          <h2 className="text-xl font-semibold mb-4">סטטוס פנייה</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">סטטוס התאמה:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                volunteer ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
              }`}>
                {volunteer ? "הותאם למתנדב" : "ממתין להתאמה"}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">תאריך פנייה:</span>
              <span className="font-medium">
                {userData?.createdAt?.toDate().toLocaleDateString('he-IL') || "לא ידוע"}
              </span>
            </div>

            {volunteer && (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">מתנדב/ת:</span>
                <span className="font-medium">{volunteer.fullName}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Volunteer Info Section (shown only when matched) */}
      {volunteer && (
        <Card className="mb-6 shadow-sm">
          <CardContent className="p-4">
            <h2 className="text-xl font-semibold mb-4">פרטי המתנדב/ת</h2>
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-semibold text-blue-600">
                  {volunteer.fullName?.charAt(0) || "?"}
                </span>
              </div>
              <div>
                <h3 className="font-semibold">{volunteer.fullName}</h3>
                <p className="text-sm text-gray-600">המתנדב/ת זמין/ה לעזור לך. אנא השתמש/י בצ'אט כדי ליצור קשר.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Window */}
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