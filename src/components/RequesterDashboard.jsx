import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebaseConfig";
import { 
  doc, 
  getDoc, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy,
  updateDoc,
  serverTimestamp 
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import ChatWindow from "./ui/ChatWindow";

export default function RequesterDashboard() {
  const [volunteer, setVolunteer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [userData, setUserData] = useState(null);
  const [activeChat, setActiveChat] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const chatEndRef = useRef(null);
  const user = auth.currentUser;
  const navigate = useNavigate();

  // Function to scroll chat to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Effect to scroll chat to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) return;

    const loadDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchUserData(),
          fetchMatchAndVolunteer()
        ]);
      } catch (error) {
        console.error("Error loading dashboard:", error);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const fetchUserData = async () => {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      setUserData(userDoc.data());
    }
  };

  const fetchMatchAndVolunteer = async () => {
    // Listen to match document for real-time updates
    const unsubscribeMatch = onSnapshot(doc(db, "matches", user.uid), async (matchDoc) => {
      if (matchDoc.exists()) {
        const matchData = matchDoc.data();
        setMatchData(matchData);
        
        // Fetch volunteer data if there's a volunteerId
        if (matchData.volunteerId) {
          const volRef = await getDoc(doc(db, "users", matchData.volunteerId));
          if (volRef.exists()) {
            setVolunteer({
              id: matchData.volunteerId,
              ...volRef.data()
            });

            // Set up message listener if not already active
            if (!activeChat) {
              setupMessageListener(matchData.volunteerId);
            }
          }
        }
      }
    });

    return () => unsubscribeMatch();
  };

  const setupMessageListener = (volunteerId) => {
    const q = query(
      collection(db, "messages", user.uid, volunteerId),
      orderBy("timestamp")
    );
    
    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      setMessages(msgs);

      // Mark messages as read
      snapshot.docs.forEach(doc => {
        if (doc.data().senderId !== user.uid && !doc.data().read) {
          updateDoc(doc.ref, { read: true });
        }
      });
    });
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (volunteer?.id) {
      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Update typing status in Firestore
      updateDoc(doc(db, "matches", user.uid), {
        [`${user.uid}_typing`]: true,
        [`${user.uid}_lastTyping`]: serverTimestamp()
      });

      // Set new timeout to clear typing status
      const timeout = setTimeout(() => {
        updateDoc(doc(db, "matches", user.uid), {
          [`${user.uid}_typing`]: false
        });
      }, 2000);

      setTypingTimeout(timeout);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !volunteer?.id) return;

    const timestamp = serverTimestamp();
    
    // Add the message to Firestore
    await addDoc(collection(db, "messages", user.uid, volunteer.id), {
      text: newMessage,
      senderId: user.uid,
      timestamp,
      read: false
    });

    // Clear typing indicator
    await updateDoc(doc(db, "matches", user.uid), {
      [`${user.uid}_typing`]: false
    });

    // Clear the message input field
    setNewMessage("");
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="bg-violet-600 text-white px-4 py-2 rounded"
        >
          נסה שוב
        </button>
      </div>
    );
  }

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