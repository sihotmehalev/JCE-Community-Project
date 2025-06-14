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
import { Button } from "./ui/button";

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
      <h1 className="text-2xl font-bold mb-4 text-orange-800">שלום מתנדב 🙋‍♂️</h1>

      {requesters.length === 0 ? (
        <p className="text-orange-600/80 bg-orange-50/50 p-4 rounded-lg border border-orange-100">לא שובצת לפונים עדיין.</p>
      ) : (
        requesters.map((r) => (
          <div
            key={r.id}
            className="border border-orange-100 p-4 rounded-lg mb-4 bg-orange-50/50 flex flex-col gap-2"
          >
            <div className="space-y-2">
              <h2 className="font-semibold text-lg text-orange-800">{r.fullName || "פונה ללא שם"}</h2>
              <div className="text-orange-700">
                <p><span className="font-medium">אימייל:</span> {r.email}</p>
                <p><span className="font-medium">טלפון:</span> {r.phone || "לא סופק"}</p>
                <p><span className="font-medium">מגדר:</span> {r.gender}</p>
                <p><span className="font-medium">גיל:</span> {r.age}</p>
                <p><span className="font-medium">סיבת פנייה:</span> {r.reason}</p>
              </div>
            </div>
            <Button
              onClick={() => openChat(r.id)}
              variant="outline"
              className="self-start"
            >
              💬 פתח שיחה
            </Button>
          </div>
        ))
      )}

      {/* Enhanced Chat Window */}
      {activeChat && (
        <div className="mt-6 border-t border-orange-200 pt-4">
          <h2 className="text-xl font-bold mb-2 text-orange-800">שיחה עם פונה</h2>
          <div className="bg-orange-50/30 rounded-lg p-4 h-64 overflow-y-scroll mb-4 border border-orange-100">
            {messages.map((msg, index) => (
              <div key={index} className={msg.senderId === auth.currentUser.uid ? "text-right" : "text-left"}>
                <span className={`block rounded-lg p-2 my-1 inline-block max-w-[80%] ${
                  msg.senderId === auth.currentUser.uid 
                    ? "bg-orange-600 text-white" 
                    : "bg-white border border-orange-100"
                }`}>
                  {msg.text}
                </span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="כתוב הודעה..."
              className="flex-1 border border-orange-200 rounded-md px-3 py-2 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none"
            />
            <Button>שלח</Button>
          </div>
        </div>
      )}
    </div>
  );
}
