// Main volunteer dashboard component - provides an interface for volunteers to manage their matches with help requesters
import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebaseConfig"; // Firebase authentication and database references
import { useNavigate } from "react-router-dom"; // For programmatic navigation between pages
import {
  collection, // Creates reference to a Firestore collection
  doc, // Creates reference to a Firestore document
  getDoc, // Fetches a single document
  query, // Creates a database query
  where, // Adds a filter to a query
  getDocs, // Fetches multiple documents from a query
  addDoc, // Adds a new document to a collection
  onSnapshot, // Sets up real-time listener for changes
  orderBy, // Orders query results
  updateDoc, // Updates fields in an existing document
  serverTimestamp,
} from "firebase/firestore";
import { Loader2 } from "lucide-react"; // For loading spinner
import DateTimePicker from "./ui/DateTimePicker"; // Import the new component

export default function VolunteerDashboard() {
  // State variables
  const [requesters, setRequesters] = useState([]); // Stores the requester matches assigned to this volunteer
  const [activeChat, setActiveChat] = useState(null); // Tracks which chat is currently active
  const [messages, setMessages] = useState([]); // Stores messages for the active chat
  const [newMessage, setNewMessage] = useState(""); // Stores draft message being typed
  const [showAllRequests, setShowAllRequests] = useState(false); // Controls visibility of waiting requests section
  const [waitingRequests, setWaitingRequests] = useState([]); // Stores requests waiting to be matched
  const [volunteerName, setVolunteerName] = useState(""); // Stores the current volunteer's name
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const navigate = useNavigate(); // Hook for programmatic navigation
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDatePickerMatchId, setActiveDatePickerMatchId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const chatEndRef = useRef(null);

  // Effect to load data when component mounts
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchVolunteerProfile(),
          fetchMatches(),
          fetchWaitingRequests()
        ]);
      } catch (error) {
        console.error("Error loading dashboard:", error);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Fetches the current volunteer's profile
  const fetchVolunteerProfile = async () => {
    if (!auth.currentUser?.uid) {
      throw new Error("User not authenticated");
    }

    const volunteerDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (volunteerDoc.exists()) {
      const data = volunteerDoc.data();
      setVolunteerName(data.fullName || auth.currentUser.email || "");
    }
  };

  // Fetches all matches for the current volunteer
  const fetchMatches = async () => {
    if (!auth.currentUser?.uid) {
      throw new Error("User not authenticated");
    }

    const q = query(
      collection(db, "matches"),
      where("volunteerId", "==", auth.currentUser.uid)
    );
    const querySnapshot = await getDocs(q);
    
    const requesterIds = querySnapshot.docs.map((docSnapshot) => ({
      id: docSnapshot.data().requesterId,
      matchId: docSnapshot.id,
      status: docSnapshot.data().status || "active",
      scheduledTime: docSnapshot.data().scheduledTime,
      lastUpdated: docSnapshot.data().updatedAt,
      createdAt: docSnapshot.data().createdAt,
    })).filter(item => item.id);

    const requesterData = await Promise.all(
      requesterIds.map(async (item) => {
        const userSnap = await getDoc(doc(db, "users", item.id));
        if (userSnap.exists()) {
          return { 
            ...item,
            ...userSnap.data(),
            unreadMessages: 0 // Will be updated by chat listener
          };
        }
        return null;
      })
    );

    setRequesters(requesterData.filter(Boolean));
  };

  // Fetches waiting requests
  const fetchWaitingRequests = async () => {
    const q = query(
      collection(db, "requests"),
      where("status", "==", "waiting")
    );
    const querySnapshot = await getDocs(q);
    const waitingRequestsData = await Promise.all(
      querySnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        const requesterSnap = await getDoc(doc(db, "users", data.requesterId));
        if (requesterSnap.exists()) {
          return {
            id: docSnapshot.id,
            requesterId: data.requesterId,
            ...data,
            requesterInfo: requesterSnap.data()
          };
        }
        return null;
      })
    );
    
    setWaitingRequests(waitingRequestsData.filter(Boolean));
  };

  // Accept a new match
  const acceptMatch = async (matchId) => {
    try {
      await updateDoc(doc(db, "matches", matchId), {
        status: "active",
        acceptedAt: serverTimestamp(),
      });
      
      // Update local state
      setRequesters(requesters.map(r => 
        r.matchId === matchId ? {...r, status: "active"} : r
      ));
    } catch (error) {
      console.error("Error accepting match:", error);
      alert("Failed to accept match. Please try again.");
    }
  };

  // Reject a match
  const rejectMatch = async (matchId) => {
    if (!window.confirm("Are you sure you want to reject this match?")) return;
    
    try {
      await updateDoc(doc(db, "matches", matchId), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
        rejectedBy: auth.currentUser.uid
      });
      
      // Update local state
      setRequesters(requesters.map(r => 
        r.matchId === matchId ? {...r, status: "rejected"} : r
      ));
    } catch (error) {
      console.error("Error rejecting match:", error);
      alert("Failed to reject match. Please try again.");
    }
  };

  // Filter requesters based on search and status
  const filteredRequesters = requesters.filter(r => {
    const matchesSearch = r.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === "all" || r.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Function to scroll chat to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Effect to scroll chat to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle typing indicator
  const handleTyping = () => {
    if (activeChat) {
      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Update typing status in Firestore
      updateDoc(doc(db, "matches", requesters.find(r => r.id === activeChat)?.matchId), {
        [`${auth.currentUser.uid}_typing`]: true,
        [`${auth.currentUser.uid}_lastTyping`]: serverTimestamp()
      });

      // Set new timeout to clear typing status
      const timeout = setTimeout(() => {
        updateDoc(doc(db, "matches", requesters.find(r => r.id === activeChat)?.matchId), {
          [`${auth.currentUser.uid}_typing`]: false
        });
      }, 2000);

      setTypingTimeout(timeout);
    }
  };

  // Enhanced openChat function with typing indicator listener
  const openChat = (requesterId) => {
    setActiveChat(requesterId);
    const matchDoc = requesters.find(r => r.id === requesterId)?.matchId;
    
    if (!matchDoc) return;

    // Listen for messages
    const q = query(
      collection(db, "messages", requesterId, auth.currentUser.uid),
      orderBy("timestamp")
    );
    
    onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      setMessages(msgs);
      
      // Mark messages as read
      snapshot.docs.forEach(doc => {
        if (doc.data().senderId !== auth.currentUser.uid && !doc.data().read) {
          updateDoc(doc.ref, { read: true });
        }
      });
      
      // Update unread count
      setRequesters(prev => prev.map(r => 
        r.id === requesterId ? {...r, unreadMessages: 0} : r
      ));
    });

    // Listen for typing indicator
    onSnapshot(doc(db, "matches", matchDoc), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const requesterTyping = data[`${requesterId}_typing`];
        setIsTyping(requesterTyping);
      }
    });
  };

  // Enhanced handleSend function
  const handleSend = async () => {
    if (!newMessage.trim() || !activeChat) return;

    const timestamp = serverTimestamp();
    
    // Add the message to Firestore
    await addDoc(collection(db, "messages", activeChat, auth.currentUser.uid), {
      text: newMessage,
      senderId: auth.currentUser.uid,
      timestamp,
      read: false
    });

    // Clear typing indicator
    const matchDoc = requesters.find(r => r.id === activeChat)?.matchId;
    if (matchDoc) {
      await updateDoc(doc(db, "matches", matchDoc), {
        [`${auth.currentUser.uid}_typing`]: false
      });
    }

    // Clear the message input field
    setNewMessage("");
  };

  // Handles cancellation of a match between volunteer and requester
  const cancelRequest = async (matchId) => {
    if (window.confirm("האם אתה בטוח שברצונך לבטל את הבקשה?")) {
      try {
        // Update the match status in Firestore
        await updateDoc(doc(db, "matches", matchId), {
          status: "canceled",
          canceledAt: new Date(),
          canceledBy: auth.currentUser.uid
        });
        
        // Update the local state to reflect the cancellation
        setRequesters(requesters.map(r => 
          r.matchId === matchId ? {...r, status: "canceled"} : r
        ));
      } catch (error) {
        console.error("Error canceling request:", error);
        alert("אירעה שגיאה בביטול הבקשה");
      }
    }
  };

  // Handles rescheduling a meeting time
  const changeSchedule = (matchId) => {
    setActiveDatePickerMatchId(matchId);
    setShowDatePicker(true);
  };

  const handleDateTimeSelect = async (newDateTime) => {
    try {
      await updateDoc(doc(db, "matches", activeDatePickerMatchId), {
        scheduledTime: newDateTime,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setRequesters(prev => prev.map(r => 
        r.matchId === activeDatePickerMatchId 
          ? { ...r, scheduledTime: newDateTime }
          : r
      ));
      
      setShowDatePicker(false);
      setActiveDatePickerMatchId(null);
      alert("זמן הפגישה עודכן בהצלחה!");
    } catch (error) {
      console.error("Error updating schedule:", error);
      alert("אירעה שגיאה בעדכון זמן הפגישה");
    }
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
          Retry
        </button>
      </div>
    );
  }

  // Render the dashboard UI
  return (
    <div className="p-6">
      {/* Header with title and profile button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {volunteerName ? `שלום ${volunteerName} 🙋‍♂️` : "שלום מתנדב 🙋‍♂️"}
        </h1>
        <button 
          onClick={() => navigate('/profile')}
          className="bg-violet-600 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <span>הפרופיל שלי</span>
          <span>👤</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="חיפוש לפי שם, אימייל, או סיבה..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 border rounded px-4 py-2"
        />
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="border rounded px-4 py-2"
        >
          <option value="all">כל הסטטוסים</option>
          <option value="pending">ממתין לאישור</option>
          <option value="active">פעיל</option>
          <option value="canceled">מבוטל</option>
          <option value="rejected">נדחה</option>
        </select>
      </div>

      {/* Waiting requests section (toggleable) */}
      <div className="mb-6">
        <button
          onClick={() => setShowAllRequests(!showAllRequests)}
          className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg mb-4"
        >
          {showAllRequests ? "הסתר בקשות ממתינות" : "הצג בקשות ממתינות"}
        </button>

        {showAllRequests && (
          <div className="mt-4">
            <h2 className="text-xl font-semibold mb-3">בקשות ממתינות</h2>
            {waitingRequests.length === 0 ? (
              <p className="text-gray-500">אין בקשות ממתינות כרגע</p>
            ) : (
              <div className="grid gap-4">
                {/* List of waiting requests */}
                {waitingRequests.map((request) => (
                  <div key={request.id} className="border p-4 rounded bg-gray-50 shadow-sm">
                    <div className="flex justify-between">
                      <h3 className="font-medium">{request.requesterInfo.fullName || "פונה ללא שם"}</h3>
                      <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">ממתין</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">סיבת פנייה: {request.requesterInfo.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assigned requesters section */}
      <h2 className="text-xl font-semibold mb-3">הפונים שלי</h2>
      {filteredRequesters.length === 0 ? (
        <p className="text-gray-500">לא נמצאו התאמות {searchTerm && "עבור החיפוש הנוכחי"}</p>
      ) : (
        <div className="grid gap-4">
          {filteredRequesters.map((r) => (
            <div
              key={r.id}
              className={`border p-4 rounded bg-white shadow-sm transition-all ${
                r.status === 'canceled' || r.status === 'rejected' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-lg">{r.fullName || "ללא שם"}</h3>
                  <p className="text-sm text-gray-600">{r.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.unreadMessages > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {r.unreadMessages}
                    </span>
                  )}
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    r.status === 'active' ? 'bg-green-100 text-green-800' :
                    r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    r.status === 'canceled' ? 'bg-red-100 text-red-800' :
                    r.status === 'rejected' ? 'bg-gray-100 text-gray-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {r.status === 'active' ? 'פעיל' :
                     r.status === 'pending' ? 'ממתין לאישור' :
                     r.status === 'canceled' ? 'בוטל' :
                     r.status === 'rejected' ? 'נדחה' :
                     r.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p><strong>טלפון:</strong> {r.phone || "לא צוין"}</p>
                  <p><strong>מגדר:</strong> {r.gender}</p>
                </div>
                <div>
                  <p><strong>גיל:</strong> {r.age}</p>
                  <p><strong>סיבת פנייה:</strong> {r.reason}</p>
                </div>
                {r.scheduledTime && (
                  <div className="col-span-2">
                    <p><strong>זמן מפגש:</strong> {r.scheduledTime}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {r.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => acceptMatch(r.matchId)}
                      className="bg-green-600 text-white px-4 py-2 rounded"
                    >
                      ✓ קבל התאמה
                    </button>
                    <button
                      onClick={() => rejectMatch(r.matchId)}
                      className="bg-red-600 text-white px-4 py-2 rounded"
                    >
                      ✕ דחה התאמה
                    </button>
                  </>
                ) : r.status === 'active' && (
                  <>
                    <button
                      onClick={() => openChat(r.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded"
                    >
                      💬 פתח שיחה
                    </button>
                    <button
                      onClick={() => changeSchedule(r.matchId)}
                      className="bg-green-600 text-white px-4 py-2 rounded"
                    >
                      🕒 שנה זמן
                    </button>
                    <button
                      onClick={() => cancelRequest(r.matchId)}
                      className="bg-red-600 text-white px-4 py-2 rounded"
                    >
                      ❌ בטל בקשה
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Chat Window */}
      {activeChat && (
        <div className="fixed bottom-0 right-4 w-96 bg-white shadow-lg rounded-t-lg">
          <div className="p-4 border-b flex justify-between items-center bg-violet-600 text-white rounded-t-lg">
            <div>
              <h3 className="font-semibold">
                {requesters.find(r => r.id === activeChat)?.fullName || "שיחה"}
              </h3>
              {isTyping && (
                <div className="text-xs text-white opacity-75">
                  מקליד/ה...
                </div>
              )}
            </div>
            <button onClick={() => setActiveChat(null)} className="text-white">
              ✕
            </button>
          </div>
          
          <div className="h-96 p-4 overflow-y-auto flex flex-col gap-2">
            {messages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={`max-w-[80%] ${
                  msg.senderId === auth.currentUser.uid ? 'ml-auto' : 'mr-auto'
                }`}
              >
                <div className={`rounded-lg p-3 ${
                  msg.senderId === auth.currentUser.uid
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-100'
                }`}>
                  {msg.text}
                </div>
                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  {msg.timestamp && msg.timestamp.toLocaleTimeString()}
                  {msg.senderId === auth.currentUser.uid && (
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

      {showDatePicker && (
        <DateTimePicker
          onSelect={handleDateTimeSelect}
          onCancel={() => {
            setShowDatePicker(false);
            setActiveDatePickerMatchId(null);
          }}
          initialDateTime={requesters.find(r => r.matchId === activeDatePickerMatchId)?.scheduledTime}
        />
      )}
    </div>
  );
}
