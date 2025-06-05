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

  const handleSend = async () => {
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
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {userData?.fullName ? `שלום ${userData.fullName.split(' ')[0]} 👋` : 'שלום'}
        </h1>
        <button 
          onClick={() => navigate('/profile')}
          className="bg-violet-600 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <span>הפרופיל שלי</span>
          <span>👤</span>
        </button>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">סטטוס פנייה</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700">סטטוס התאמה:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              !matchData ? "bg-yellow-100 text-yellow-800" :
              matchData.status === 'pending' ? "bg-yellow-100 text-yellow-800" :
              matchData.status === 'active' ? "bg-green-100 text-green-800" :
              matchData.status === 'canceled' ? "bg-red-100 text-red-800" :
              "bg-gray-100 text-gray-800"
            }`}>
              {!matchData ? "ממתין להתאמה" :
               matchData.status === 'pending' ? "ממתין לאישור המתנדב" :
               matchData.status === 'active' ? "פעיל" :
               matchData.status === 'canceled' ? "בוטל" :
               matchData.status}
            </span>
          </div>

          {matchData?.scheduledTime && (
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">זמן מפגש מתוכנן:</span>
              <span className="font-medium">{matchData.scheduledTime}</span>
            </div>
          )}

          {volunteer && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">פרטי המתנדב/ת</h3>
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p><strong>שם:</strong> {volunteer.fullName}</p>
                  <p><strong>מקצוע:</strong> {volunteer.profession || 'לא צוין'}</p>
                </div>
                <div>
                  <p><strong>ניסיון:</strong> {volunteer.experience || 'לא צוין'}</p>
                  {volunteer.specialties && (
                    <p><strong>התמחות:</strong> {volunteer.specialties}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      {volunteer && matchData?.status === 'active' && (
        <div className="fixed bottom-0 right-4 w-96 bg-white shadow-lg rounded-t-lg">
          <div className="p-4 border-b flex justify-between items-center bg-violet-600 text-white rounded-t-lg">
            <div>
              <h3 className="font-semibold">{volunteer.fullName}</h3>
              {isTyping && (
                <div className="text-xs text-white opacity-75">
                  מקליד/ה...
                </div>
              )}
            </div>
            <button onClick={() => setActiveChat(false)} className="text-white">
              ✕
            </button>
          </div>
          
          <div className="h-96 p-4 overflow-y-auto flex flex-col gap-2">
            {messages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={`max-w-[80%] ${
                  msg.senderId === user.uid ? 'ml-auto' : 'mr-auto'
                }`}
              >
                <div className={`rounded-lg p-3 ${
                  msg.senderId === user.uid
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100'
                }`}>
                  {msg.text}
                </div>
                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  {msg.timestamp && msg.timestamp.toLocaleTimeString()}
                  {msg.senderId === user.uid && (
                    <span className="ml-1">
                      {msg.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="הקלד הודעה..."
                className="flex-1 border rounded px-3 py-2"
              />
              <button
                onClick={handleSend}
                className="bg-violet-600 text-white px-4 py-2 rounded"
              >
                שלח
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}