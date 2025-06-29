import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { User, Calendar, Clock, MessageCircle, Plus, X, Phone } from "lucide-react";
import { auth, db } from "../../config/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  arrayUnion,
  getDocs
} from "firebase/firestore";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import LoadingSpinner from "../ui/LoadingSpinner";
import ChatPanel from "../ui/ChatPanel";
import CustomAlert from "../ui/CustomAlert";
import { generateRandomId } from "../../utils/firebaseHelpers";
import { writeBatch } from "firebase/firestore";
import ChatButton from "../ui/ChatButton";
// Removed import SessionScheduler from "../modals/SessionScheduler"; 

const fetchRequester = async (uid) => {
  if (!uid) {
    console.warn("fetchRequester called with invalid UID. Returning null.");
    return null;
  }
  const docRef = doc(db, "Users", "Info", "Requesters", uid);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: uid, ...snap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error("[DEBUG] fetchRequester error:", error);
    return null;
  }
};

// Helper function to create notifications
const createNotification = async (userId, message, link) => {
  if (!userId) return;
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      message,
      link,
      createdAt: serverTimestamp(),
      read: false,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

export default function VolunteerDashboard() {
  const [searchParams] = useSearchParams();
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
      if (!u) window.location.replace("/login");
    });
    return unsub;
  }, []);

  const [loading, setLoading] = useState(true);
  const [volProfile, setVolProfile] = useState({});
  const [personal, setPersonal] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [direct, setDirect] = useState([]);
  const [pool, setPool] = useState([]);
  const [matches, setMatches] = useState([]);
  const [adminApprovalRequests, setAdminApprovalRequests] = useState([]);
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [userData, setUserData] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [activeTab, setActiveTab] = useState("directRequests");
  const [alertMessage, setAlertMessage] = useState(null);

  const unsubDirect = useRef(null);
  const unsubPool = useRef(null);
  const unsubMatch = useRef(null);
  const unsubAdminApproval = useRef(null);
  const unsubChat = useRef(null);

  useEffect(() => {
    if (personal) {
      setActiveTab("directRequests");
    } else {
      setActiveTab("activeMatches");
    }
  }, [personal]);
  /* listener refs */

    // Admin Chat Panel
  const [showAdminChatPanel, setShowAdminChatPanel] = useState(false);
  const [adminMessages, setAdminMessages] = useState([]);
  const [adminNewMsg, setAdminNewMsg] = useState("");

  /* -------- bootstrap volunteer profile -------- */
  useEffect(() => {
    if (!authChecked || !user) return;
    const volRef = doc(db, "Users", "Info", "Volunteers", user.uid);
    const unsubVol = onSnapshot(volRef, (snap) => {
      const data = snap.data();
      if(data){
        setVolProfile(data);
        setPersonal(data.personal ?? true);
        setIsAvailable(data.isAvailable ?? true);
        setUserData(data);
      }
      setLoading(false);
    },
    (err) => {
      console.error("Volunteer doc error:", err);
      setLoading(false);
    });
    return () => unsubVol();
  }, [authChecked, user]);

  useEffect(() => {
    const chatWithMatchId = searchParams.get("chatWith");
    if (chatWithMatchId && matches.length > 0) {
      const matchExists = matches.some(m => m.id === chatWithMatchId);
      if (matchExists && activeMatchId !== chatWithMatchId) {
        openChat(chatWithMatchId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, matches]);

  useEffect(() => {
    if (loading || !user) return;

    unsubMatch.current?.();
    unsubMatch.current = onSnapshot(query(collection(db, "Matches"), where("volunteerId", "==", user.uid), where("status", "==", "active")), async (snap) => {
      const arr = await Promise.all(snap.docs.map(async (d) => {
        const m = d.data();
        const rq = await fetchRequester(m.requesterId);
        return rq ? { id: d.id, ...m, requester: rq } : null;
      }));
      setMatches(arr.filter(Boolean));
    });

    // ---- personal-only sections ----
    if (personal) {      // direct Requests
      unsubDirect.current = onSnapshot(
        query(
          collection(db, "Requests"),
          where("volunteerId", "==", user.uid),
          where("status",      "==", "waiting_for_first_approval")
        ),
        async (snap) => {
            const arr = [];
          for (const d of snap.docs) {
            const rqData = d.data();
            
            // Check if this volunteer is in the declined list
            const declinedVolunteers = rqData.declinedVolunteers || [];
            if (declinedVolunteers.includes(user.uid)) {
              continue;
            }

            const rqUser = await fetchRequester(rqData.requesterId);
            
            if (rqUser && rqUser.personal === true) {
              arr.push({ id: d.id, ...rqData, requester: rqUser });
            } else {
            }
          }
          
          setDirect(arr);
        }
      );      // Requests waiting for admin approval (new section)
      unsubAdminApproval.current = onSnapshot(
        query(
          collection(db, "Requests"),
          where("volunteerId", "==", user.uid),
          where("status",      "==", "waiting_for_admin_approval")
        ),
        async (snap) => {

          const arr = [];
          for (const d of snap.docs) {
            const rqData = d.data();

            const rqUser = await fetchRequester(rqData.requesterId);

            // Assuming these requests also come from requesters with personal: false, or this filter is not needed here
            if (rqUser) { // No personal filter needed here, as these are assigned requests
              arr.push({ id: d.id, ...rqData, requester: rqUser });
            } else {
            }
          }
          
          setAdminApprovalRequests(arr);
        }
      );      // open pool
      unsubPool.current = onSnapshot(
        query(
          collection(db, "Requests"),
          where("volunteerId", "==", null),
          where("status",      "==", "waiting_for_first_approval")
        ),
        async (snap) => {
          const arr = [];
          for (const d of snap.docs) {
            const rqData = d.data();
            
            // Check if this volunteer is in the declined list
            const declinedVolunteers = rqData.declinedVolunteers || [];
            if (declinedVolunteers.includes(user.uid)) {
              continue;
            }

            const rqUser = await fetchRequester(rqData.requesterId);

            if (rqUser && rqUser.personal === false) {
              arr.push({ id: d.id, ...rqData, requester: rqUser });
            } 
          }

          setPool(arr);
        }
      );
    } else {
      unsubDirect.current?.(); unsubDirect.current = null; setDirect([]);
      unsubPool.current?.(); unsubPool.current = null; setPool([]);
      unsubAdminApproval.current?.(); unsubAdminApproval.current = null; setAdminApprovalRequests([]);
    }

    return () => {
      unsubMatch.current?.();
      unsubDirect.current?.();
      unsubPool.current?.();
      unsubAdminApproval.current?.();
    };
  }, [personal, loading, user, volProfile]);

  const flipPersonal = async () => {
    if (!user) return;
    const newVal = !personal;
    setPersonal(newVal);
    await setDoc(doc(db, "Users", "Info", "Volunteers", user.uid), { personal: newVal }, { merge: true });
  };

  const toggleAvailability = async () => {
    if (!user) return;
    const newVal = !isAvailable;
    setIsAvailable(newVal);
    await setDoc(doc(db, "Users", "Info", "Volunteers", user.uid), { isAvailable: newVal }, { merge: true });
  };
  
  const handleRequestAction = async (req, action) => {
    const ref = doc(db, "Requests", req.id);
    try {
      if (action === "accept") {
        await updateDoc(ref, { status: "waiting_for_admin_approval" });
        setAlertMessage({message: "הבקשה התקבלה בהצלחה", type: "success"});
        
        // Update local state to reflect this change immediately
        const updatedDirect = direct.filter(r => r.id !== req.id);
        setDirect(updatedDirect);

        // Add to admin approval requests
        const updatedAdminApproval = [...adminApprovalRequests, {...req, status: "waiting_for_admin_approval"}];
        setAdminApprovalRequests(updatedAdminApproval);

      } else if (action === "decline") {
        // Add current volunteer to the declinedVolunteers array but keep the status unchanged
        await updateDoc(ref, {
          declinedVolunteers: arrayUnion(user.uid),          volunteerId: null, // Remove as assigned volunteer
          initiatedBy: null, // Clear initiation
        });
        setAlertMessage({message: "הבקשה נדחתה בהצלחה", type: "success"});

        // Update local state to remove the request from direct list
        const updatedDirect = direct.filter(r => r.id !== req.id);
        setDirect(updatedDirect);

      } else if (action === "take") {
        
        await updateDoc(ref, {
          volunteerId: user.uid,
          initiatedBy: user.uid,          status:      "waiting_for_admin_approval",
        });
        setAlertMessage({message: "הבקשה נלקחה בהצלחה", type: "success"});

        // Update local state
        const updatedPool = pool.filter(r => r.id !== req.id);
        setPool(updatedPool);

        // Add to admin approval requests
        const takenRequest = {...req, volunteerId: user.uid, initiatedBy: user.uid, status: "waiting_for_admin_approval"};
        const updatedAdminApproval = [...adminApprovalRequests, takenRequest];
        setAdminApprovalRequests(updatedAdminApproval);

      } else if (action === "withdraw") {
        
        await updateDoc(ref, {
          declinedVolunteers: arrayUnion(user.uid), // Add current volunteer to declinedVolunteers
          volunteerId: null, // Remove as assigned volunteer
          initiatedBy: null, // Clear initiation
          status:      "waiting_for_first_approval",        });
        setAlertMessage({message: "הבקשה בוטלה בהצלחה", type: "success"});

        // Update local state
        const updatedAdminApprovalRequests = adminApprovalRequests.filter(r => r.id !== req.id);
        setAdminApprovalRequests(updatedAdminApprovalRequests);
      }
    } catch (error) {
      console.error("[DEBUG] Error in handleRequestAction:", error);
      setAlertMessage({ message: "אירעה שגיאה בביצוע הפעולה. אנא נסה שוב", type: "error" });
    }
  };

  const openChat = async (matchId) => {
    closeAdminChat();
    setActiveMatchId(matchId);
    
    // Mark all messages from requester as seen
    const messagesRef = collection(db, "conversations", matchId, "messages");
    const messagesSnapshot = await getDocs(messagesRef);
    
    const batch = writeBatch(db);
    messagesSnapshot.docs.forEach(messageDoc => {
      const messageData = messageDoc.data();
      if (messageData.senderId !== user.uid && !messageData.seenByOther) {
        // Mark messages from requester as seen by volunteer
        batch.update(messageDoc.ref, { seenByOther: true });
      }
    });
    await batch.commit();
    
    unsubChat.current?.();
    unsubChat.current = onSnapshot(
      query(collection(db, "conversations", matchId, "messages"), orderBy("createdAt", "asc")),
      (snap) => setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  };

  const closeChat = () => {
    setActiveMatchId(null);
    unsubChat.current?.();
    unsubChat.current = null;
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeMatchId || !user) return;
    const currentMatch = matches.find(m => m.id === activeMatchId);
    if (!currentMatch) {
      console.error("Could not find active match data to send notification.");
      return;
    }
    try {
      await addDoc(
        collection(db, "conversations", activeMatchId, "messages"),
        {
          text: newMsg.trim(),
          senderId: user.uid,
          createdAt: serverTimestamp(),
          seenByOther: false,
        }
      );
      await createNotification(
        currentMatch.requesterId,
        `הודעה חדשה מ־${volProfile?.fullName || "מתנדב"}`,
        `/requester-dashboard?chatWith=${activeMatchId}`
      );
      setNewMsg("");
    } catch (error) {
      console.error("Error sending message or notification:", error);
      setAlertMessage({ message: "שגיאה בשליחת ההודעה", type: "error" });
    }
  };

  const openScheduleModal = (match) => {
    setSelectedMatch(match);
    setShowScheduleModal(true);
  };

  const closeScheduleModal = () => {
    setShowAdminChatPanel(false);
    setSelectedMatch(null);
    setShowScheduleModal(false);
  };

  const openAdminChat = async () => {
    if (unsubChat.current) closeChat();
  
    setAdminMessages([]);
    let convoId = "";
    try {
      const userDoc = await getDoc(doc(db, "Users", "Info", "Volunteers", user.uid));
      convoId = userDoc.data().conversationsWithAdminId;
      if (!convoId) {
        convoId = generateRandomId();
        await updateDoc(doc(db, "Users", "Info", "Volunteers", user.uid), {
          conversationsWithAdminId: convoId,
        });
      }
      
      // Mark all messages from admin as seen
      const messagesRef = collection(db, "conversations", convoId, "messages");
      const messagesSnapshot = await getDocs(messagesRef);
      
      const batch = writeBatch(db);
      messagesSnapshot.docs.forEach(messageDoc => {
        const messageData = messageDoc.data();
        if (messageData.senderId === "1" && !messageData.seenByOther) {
          // Mark messages from admin as seen by volunteer
          batch.update(messageDoc.ref, { seenByOther: true });
        }
      });
      await batch.commit();
      
      const msgs = await getDocs(
        query(
          collection(db, "conversations", convoId, "messages"),
          orderBy("timestamp")
        )
      );
      setAdminMessages(msgs.docs.map((d) => ({ id: d.id, ...d.data() })));
      
    } catch (error) {
      console.error("Error opening admin chat:", error);
      setAlertMessage({message: "אירעה שגיאה בפתיחת הצ'אט. אנא נסה שוב", type: "error"});
    }
    setShowAdminChatPanel(true);
    setAdminNewMsg("");
  };

  const closeAdminChat = () => {
    setShowAdminChatPanel(false);
    setAdminMessages([]);
    setAdminNewMsg("");
  };

  const sendAdminMessage = async () => {
    if (!adminNewMsg.trim()) return;
    const userDoc = await getDoc(doc(db, "Users", "Info", "Volunteers", user.uid));
    const convoId = userDoc.data().conversationsWithAdminId;
    if (!convoId) {
      setAlertMessage({message: "אירעה שגיאה בשליחת ההודעה. אנא נסה שוב", type: "error"});
      return;
    }
    await addDoc(
      collection(db, "conversations", convoId, "messages"),
      {
        text: adminNewMsg.trim(),
        senderId: user.uid,
        timestamp: serverTimestamp(),
        seenByOther: false,
      }
    );
    setAdminMessages(prev => [...prev, { text: adminNewMsg.trim(), senderId: user.uid, timestamp: serverTimestamp(), seenByOther: false }]);
    setAdminNewMsg("");
  };  


  const handleScheduleSession = async ({ match, scheduledTime, duration, location, notes, onSuccess, onError }) => {
    try {
      const sessionData = {
        matchId: match.id,
        volunteerId: match.volunteerId,
        requesterId: match.requesterId,
        scheduledTime: new Date(scheduledTime),
        status: "scheduled",
        notes: notes,
        durationMinutes: duration,
        location: location,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "Sessions"), sessionData);
      
      // --- NOTIFICATION LOGIC ADDED HERE ---
      const formattedDate = new Date(scheduledTime).toLocaleString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      await createNotification(
        match.requesterId,
        `${userData?.fullName || 'המתנדב/ת'} קבע/ה פגישה חדשה בתאריך ${formattedDate}`,
        "/requester-dashboard"
      );
      // --- END OF NOTIFICATION LOGIC ---

      // Update the match with the session reference AND increment totalSessions
      await updateDoc(doc(db, "Matches", match.id), {
        totalSessions: increment(1) // Increment totalSessions by 1
      });
      setAlertMessage({message: "המפגש נקבע בהצלחה!", type: "success"});
      onSuccess?.();
      return true;
    } catch (error) {
      console.error("Error scheduling session:", error);
      onError?.(error);
      return false;
    }
  };

  if (!authChecked || loading) {
    return <LoadingSpinner />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "directRequests":
        return personal ? <Section title="בקשות ישירות" empty="אין בקשות ישירות">{direct.map((r) => <RequestCard key={r.id} req={r} variant="direct" onAction={handleRequestAction} />)}</Section> : null;
      case "openRequests":
        return personal ? <Section title="דפדוף בפונים פתוחים" empty="אין פונים זמינים">{pool.map((r) => <RequestCard key={r.id} req={r} variant="pool" onAction={handleRequestAction} />)}</Section> : null;
      case "adminApproval":
        return <Section title="בקשות ממתינות לאישור מנהל" empty="אין בקשות הממתינות לאישור">{adminApprovalRequests.map((r) => <RequestCard key={r.id} req={r} variant="admin_approval" onAction={handleRequestAction} />)}</Section>;
      case "activeMatches":
        return <Section title="שיבוצים פעילים" empty="אין שיבוצים פעילים">{matches.map((m) => <MatchCard key={m.id} match={m} onOpenChat={() => openChat(m.id)} onCloseChat={closeChat} onScheduleSession={() => openScheduleModal(m)} activeMatchId={activeMatchId} handleScheduleSession={handleScheduleSession} />)}</Section>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-orange-800 flex-grow">
          שלום {userData?.fullName?.split(' ')[0] || ''} 👋
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => window.location.href = '/profile'}
          >
            הפרופיל שלי
          </Button>
          <ChatButton
            conversationId={volProfile?.conversationsWithAdminId}
            onClick={openAdminChat}
            currentUserId={volProfile?.id || user.uid}
            otherUserId="1"
            variant="outline"
            className="w-full sm:w-auto"
          >
            צאט עם מנהל
          </ChatButton>
        </div>
        <div className="flex-1 hidden sm:block" />
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-2 sm:mt-0 w-full sm:w-auto">
        {/* Availability Toggle */}
        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
          <span className="text-sm text-orange-700">זמין</span>
          <button onClick={toggleAvailability} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none ring-2 ring-orange-400 ring-offset-2 ${isAvailable ? 'bg-green-600 border-orange-400' : 'bg-gray-200 border-orange-400'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform border-2 border-orange-400 ${isAvailable ? '-translate-x-1' : '-translate-x-6'}`} />
          </button>
          <span className="text-sm text-orange-700">לא זמין</span>
        </div>
        {/* Personal/Admin Toggle */}
        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
          <span className="text-sm text-orange-700">בחירה עצמית</span>
          <button onClick={flipPersonal} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none ring-2 ring-orange-400 ring-offset-2 ${personal ? 'bg-orange-600 border-orange-400' : 'bg-gray-200 border-orange-400'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform border-2 border-orange-400 ${personal ? '-translate-x-1' : '-translate-x-6'}`} />
          </button>
          <span className="text-sm text-orange-700">שיוך ע״י מנהל</span>
        </div>
        </div>
      </div>
      <Card className="mb-6">
        <div className="flex flex-wrap border-b border-gray-200">
          {personal && (
            <>
              <button onClick={() => setActiveTab("directRequests")} className={`flex-1 p-2 sm:p-4 text-center font-medium text-xs sm:text-sm focus:outline-none ${activeTab === "directRequests" ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>בקשות ישירות ({direct.length})</button>
              <button onClick={() => setActiveTab("openRequests")} className={`flex-1 p-2 sm:p-4 text-center font-medium text-xs sm:text-sm focus:outline-none ${activeTab === "openRequests" ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>דפדוף בפונים ({pool.length})</button>
              <button onClick={() => setActiveTab("adminApproval")} className={`flex-1 p-2 sm:p-4 text-center font-medium text-xs sm:text-sm focus:outline-none ${activeTab === "adminApproval" ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>ממתינות לאישור מנהל ({adminApprovalRequests.length})</button>
            </>
          )}
          <button onClick={() => setActiveTab("activeMatches")} className={`${personal ? 'flex-1' : ''} p-2 sm:p-4 text-center font-medium text-xs sm:text-sm focus:outline-none ${activeTab === "activeMatches" ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>שיבוצים פעילים ({matches.length})</button>
        </div>
      </Card>
      <div className="mt-6">{renderTabContent()}</div>
      <ChatPanel
        isOpen={!!activeMatchId}
        onClose={closeChat}
        messages={messages}
        newMsg={newMsg}
        setNewMsg={setNewMsg}
        onSend={sendMessage}
        chatPartnerName={matches.find(m => m.id === activeMatchId)?.requester?.fullName || 'שיחה'}
        currentUserId={user.uid}
      />
        {/* Admin Chat Panel */}
      <ChatPanel
        isOpen={showAdminChatPanel}
        onClose={closeAdminChat}
        messages={adminMessages}
        newMsg={adminNewMsg}
        setNewMsg={setAdminNewMsg}
        onSend={sendAdminMessage}
        chatPartnerName={'מנהל'}
        currentUserId={user.uid}
      />

      {/* Schedule Session Modal */}
      {showScheduleModal && selectedMatch && (
        <SessionScheduler
          match={selectedMatch}
          onClose={closeScheduleModal}
          handleScheduleSession={handleScheduleSession}
        />
      )}
      <CustomAlert
        message={alertMessage?.message}
        onClose={() => setAlertMessage(null)}
        type={alertMessage?.type}
      />
    </div>
  );
}

const Section = ({ title, empty, children }) => (
  <>
    <h2 className="text-xl font-semibold text-orange-800 mb-2">{title}</h2>
    {React.Children.count(children) === 0 ? (<Empty text={empty} />) : (<div className="space-y-4">{children}</div>)}
  </>
);

const Empty = ({ text }) => (<p className="bg-orange-100 border border-orange-100 rounded-lg py-4 px-6 text-orange-700">{text}</p>);

function RequestCard({ req, variant, onAction }) {
  const { requester } = req;
  const formatList = (value) => {
    if (!value) return "—";
    if (Array.isArray(value)) {
      return value.filter(v => v !== "אחר").join(", ");
    }
    return value;
  };

  const [requesterAdminConfig, setRequesterAdminConfig] = useState(null);

  useEffect(() => {
    const fetchRequesterConfig = async () => {
      try {
        const configDocRef = doc(db, "admin_form_configs", "requester_config");
        const configSnap = await getDoc(configDocRef);
        if (configSnap.exists()) {
          setRequesterAdminConfig(configSnap.data());
        } else {
          setRequesterAdminConfig({ customFields: [] });
        }
      } catch (error) {
        console.error("Error fetching requester admin config:", error);
      }
    }
    fetchRequesterConfig(); // Call the fetch function
  }, []); // Empty dependency array means this runs once on mount


    return (
    <div className="bg-orange-100 border border-orange-100 rounded-lg py-4 px-6 text-orange-700">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center"><User className="w-6 h-6 text-orange-600" /></div>
          <div>
            <h3 className="font-bold text-orange-900 text-xl mb-1">{(() => { if (requester?.gender === "זכר") return "פונה אנונימי"; else if (requester?.gender === "נקבה") return "פונה אנונימית"; else return "פונה"; })()}</h3>
            <div className="flex items-center gap-4 text-sm text-orange-700">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-400 rounded-full"></span>גיל: {requester?.age ?? "—"}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-400 rounded-full"></span>מגדר: {requester?.gender ?? "—"}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="mb-4"><div className="bg-white/60 rounded-lg p-3 border border-orange-100"><h4 className="font-semibold text-orange-800 text-sm mb-1">סיבת הפנייה</h4><p className="text-orange-700 leading-relaxed">{requester?.reason ?? "—"}</p></div></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white/60 rounded-lg p-3 border border-orange-100">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-orange-600" />
            <h4 className="font-semibold text-orange-800 text-sm">תדירות</h4>
          </div>
          <p className="text-orange-700 text-sm">
            {formatList(requester?.frequency)}
          </p>
        </div>

        <div className="bg-white/60 rounded-lg p-3 border border-orange-100">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <h4 className="font-semibold text-orange-800 text-sm">זמנים מועדפים</h4>
          </div>
          <p className="text-orange-700 text-sm">
            {formatList(requester?.preferredTimes)}
          </p>
        </div>

        <div className="bg-white/60 rounded-lg p-3 border border-orange-100">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-4 h-4 text-orange-600" />
            <h4 className="font-semibold text-orange-800 text-sm">העדפת שיחה</h4>
          </div>
          <p className="text-orange-700 text-sm">
            {formatList(requester?.chatPref)}
          </p>
        </div>
      </div>

      {/* Shared Custom Fields from Requester */}
      {requesterAdminConfig && requesterAdminConfig.customFields && requesterAdminConfig.customFields.length > 0 && requester && (
        <div className="mt-4 pt-4 border-t border-orange-200">
          <h4 className="font-semibold text-orange-800 text-md mb-2">מידע נוסף מהפונה:</h4>
          <div className="space-y-1 text-sm">
            {Object.entries(requester).map(([key, value]) => {
              const fieldDef = requesterAdminConfig.customFields.find(
                (f) => f.name === key && f.shareWithPartner === true
              );
              if (fieldDef) {
                let displayValue = value;
                if (Array.isArray(value)) {
                  displayValue = value.join(", ");
                } else if (typeof value === 'boolean') {
                  displayValue = value ? "כן" : "לא";
                }
                return (
                  <p key={key} className="text-orange-700">
                    <strong className="text-orange-800">{fieldDef.label}:</strong> {displayValue}
                  </p>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}

      {variant === "direct" ? (
        <div className="flex gap-2 mt-4 pt-4 border-t border-orange-200">
          <Button onClick={() => onAction(req, "accept")}>אשר</Button>
          <Button variant="outline" onClick={() => onAction(req, "decline")}>
            דחה
          </Button>
        </div>
      ) : variant === "admin_approval" ? (
        <div className="flex gap-2 mt-4 pt-4 border-t border-orange-200">
          <Button variant="destructive" onClick={() => onAction(req, "withdraw")}>בטל בקשה</Button>
        </div>
      ) : (
        <div className="mt-4 pt-4 border-t border-orange-200">
          <Button onClick={() => onAction(req, "take")}>קח פונה זה</Button>
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, onOpenChat, onCloseChat, onScheduleSession, activeMatchId, handleScheduleSession }) {
  const { requester } = match;
  const isChatOpen = activeMatchId === match.id;
  const [sessions, setSessions] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showUpcomingSessionsModal, setShowUpcomingSessionsModal] = useState(false);
  const [showPastSessionsModal, setShowPastSessionsModal] = useState(false);
  const [showCompletedSessionsModal, setShowCompletedSessionsModal] = useState(false);
  const [requesterAdminConfig, setRequesterAdminConfig] = useState(null); // State for requester's admin config

  useEffect(() => {
    const sessionsRef = collection(db, "Sessions");
    const unsub = onSnapshot(query(sessionsRef, where("matchId", "==", match.id), orderBy("scheduledTime", "asc")), (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), scheduledTime: doc.data().scheduledTime?.toDate() })));
    });
    return unsub;
  }, [match.id]);

  // Fetch requester admin config when requester data is available
  useEffect(() => {
    const fetchRequesterConfig = async () => {
      if (match?.requesterId) {
        try {
          const configDocRef = doc(db, "admin_form_configs", "requester_config");
          const configSnap = await getDoc(configDocRef);
          if (configSnap.exists()) {
            const configData = configSnap.data();
            // Ensure customFields is an array
            setRequesterAdminConfig({
              ...configData,
              customFields: Array.isArray(configData.customFields) ? configData.customFields : []
            });
          } else {
            console.warn("[MatchCard - VolunteerDashboard] Requester admin config document not found at admin_form_configs/requester_config.");
            setRequesterAdminConfig({ customFields: [] });
          }
        } catch (error) {
          console.error("[MatchCard - VolunteerDashboard] Error fetching requester admin config:", error);
          setRequesterAdminConfig({ customFields: [] });
        }
      }
    };
    fetchRequesterConfig();
  }, [match?.requesterId]); // Depend on requesterId

  // Split sessions into categories: upcoming, past (needing completion), and completed
  const now = new Date();
  const { upcomingSessions, pastSessions, completedSessions } = sessions.reduce((acc, session) => {
    if (session.status === 'completed') acc.completedSessions.push(session);
    else if (session.scheduledTime > now) acc.upcomingSessions.push(session);
    else acc.pastSessions.push(session);
    return acc;
  }, { upcomingSessions: [], pastSessions: [], completedSessions: [] });

  const pastSessionsNeedingCompletionCount = pastSessions.length;

  return (
    <div className="border border-orange-100 bg-orange-100 rounded-lg p-4">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="font-bold text-orange-900 text-xl mb-1">
              {requester?.fullName || "פונה ללא שם"}
            </h3>
            <div className="flex flex-wrap items-center gap-4 text-sm text-orange-700">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                גיל: {requester?.age ?? "—"}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                מגדר: {requester?.gender ?? "—"}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                טלפון: {requester?.phone ?? "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Shared Custom Fields from Requester */}
      {requester && requesterAdminConfig && Array.isArray(requesterAdminConfig.customFields) && requesterAdminConfig.customFields.length > 0 && (
        <div className="mt-4 pt-4 border-t border-orange-200">
          <h4 className="font-semibold text-orange-800 text-md mb-2">מידע נוסף מהפונה:</h4>
          <div className="space-y-1 text-sm">
            {(() => {
              return null; // Or <></>
            })()}
            {Object.entries(requester).map(([key, value]) => {

              // Find the definition for this key in the admin config
              const fieldDef = requesterAdminConfig.customFields.find(
                (f) => f.name === key
              );

              if (fieldDef && fieldDef.shareWithPartner === true) {

                let displayValue = value;
                if (Array.isArray(value)) {
                  displayValue = value.join(", ");
                } else if (typeof value === 'boolean') {
                  displayValue = value ? "כן" : "לא";
                } else if (value === null || value === undefined || value === '') {
                  displayValue = "—";
                }
                return (
                  <p key={key} className="text-orange-700">
                    <strong className="text-orange-800">{fieldDef.label}:</strong> {String(displayValue)}
                  </p>
                );
              } else if (fieldDef) {
              }
              return null;
            })}
          </div>
        </div>
      )}

      {/* Chat and Schedule Buttons */}
      <div className="flex gap-2 flex-wrap">
        <ChatButton
          conversationId={match.id}
          onClick={isChatOpen ? onCloseChat : () => onOpenChat(match.id)}
          currentUserId={match.volunteerId}
          otherUserId={match.requesterId}
          isAdminChat={false}
          className="flex items-center gap-2"
        >
          {isChatOpen ? "סגור שיחה" : "💬 פתח שיחה"}
        </ChatButton>
        <Button
          variant="outline"
          onClick={() => setShowScheduleModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          קבע מפגש
        </Button>
        {upcomingSessions.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setShowUpcomingSessionsModal(true)}
            className="flex items-center gap-2"
          >
            מפגשים מתוכננים ({upcomingSessions.length})
          </Button>
        )}
        {pastSessionsNeedingCompletionCount > 0 && (
          <Button
            variant="outline"
            onClick={() => setShowPastSessionsModal(true)}
            className="flex items-center gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            מפגשים להשלמה ({pastSessionsNeedingCompletionCount})
          </Button>
        )}
        {completedSessions.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setShowCompletedSessionsModal(true)}
            className="flex items-center gap-2"
          >
            מפגשים שהושלמו ({completedSessions.length})
          </Button>
        )}
      </div>

      {/* Modals */}
      {showScheduleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <SessionScheduler
              match={match}
              onClose={() => setShowScheduleModal(false)}
              handleScheduleSession={handleScheduleSession}
            />
          </div>
        )}
      {showUpcomingSessionsModal && (
        <SessionModal
          title="מפגשים מתוכננים"
          sessions={upcomingSessions}
          onClose={() => setShowUpcomingSessionsModal(false)}
          partnerName={requester?.fullName}
        />
      )}
      {showPastSessionsModal && (
        <SessionModal
          title="מפגשים להשלמה"
          sessions={pastSessions}
          onClose={() => setShowPastSessionsModal(false)}
          showCompletionButton={true}
          partnerName={requester?.fullName}
        />
      )}
      {showCompletedSessionsModal && (
        <SessionModal
          title="מפגשים שהושלמו"
          sessions={completedSessions}
          onClose={() => setShowCompletedSessionsModal(false)}
          readOnly={true}
          partnerName={requester?.fullName}
        />
      )}
    </div>
  );
}

function SessionModal({ title, sessions, onClose, showCompletionButton = false, readOnly = false, partnerName }) {
  const [sessionToComplete, setSessionToComplete] = useState(null);
  const now = new Date();

  // Helper function to format session times in Hebrew
  const formatSessionTime = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleString('he-IL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper to generate Google Calendar link
  const generateGoogleCalendarLink = (session, partnerName) => {
    const startTime = new Date(session.scheduledTime);
    const endTime = new Date(startTime.getTime() + session.durationMinutes * 60 * 1000);

    const formatDateTime = (date) => {
      return date.toISOString().replace(/[-:]|\.\d{3}/g, '');
    };

    const title = encodeURIComponent(`מפגש תמיכה עם ${partnerName}`);
    const dates = `${formatDateTime(startTime)}/${formatDateTime(endTime)}`;
    const details = encodeURIComponent(session.notes || 'מפגש תמיכה שנקבע דרך המערכת');
    let location = '';
    if (session.location === 'video') location = encodeURIComponent('שיחת וידאו');
    if (session.location === 'phone') location = encodeURIComponent('שיחת טלפון');
    if (session.location === 'in_person') location = encodeURIComponent('פגישה פיזית');

    return (
      `https://www.google.com/calendar/render?action=TEMPLATE` +
      `&text=${title}` +
      `&dates=${dates}` +
      `&details=${details}` +
      `&location=${location}` +
      `&sf=true` +
      `&output=xml`
    );
  };

  const handleSessionCompletion = () => {
    setSessionToComplete(null);
  };

  const getSessionStatusColor = (session) => {
    if (session.status === 'completed') {
      return 'bg-green-50 border-green-100';
    }
    if (session.scheduledTime < now && !session.status === 'completed') {
      return 'bg-orange-100 border-orange-200';
    }
    return 'bg-orange-50 border-orange-100';
  };

  const getLocationIcon = (location) => {
    switch (location) {
      case 'video':
        return '🎥';
      case 'phone':
        return '📱';
      case 'in_person':
        return '🤝';
      default:
        return '📅';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-4 rounded-lg border border-orange-200 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-orange-800">{title}</h3>
          <button 
            onClick={onClose}
            className="text-orange-400 hover:text-orange-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sessions.length === 0 ? (
          <p className="text-center text-orange-500 py-4">
            אין מפגשים זמינים להצגה.
          </p>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {sessions.map(session => (
              <div 
                key={session.id} 
                className={`p-3 rounded-md text-sm transition-colors ${getSessionStatusColor(session)}`}
              >
                <div className="font-medium text-orange-800 flex items-center justify-between">
                  <span>{formatSessionTime(session.scheduledTime)}</span>
                  {session.status === 'completed' && (
                    <span className="text-green-600 text-xs bg-green-100 px-2 py-1 rounded-full">
                      הושלם
                    </span>
                  )}
                </div>
                
                <div className="text-orange-600 mt-1">
                  {getLocationIcon(session.location)}{' '}
                  {session.location === 'video' ? 'שיחת וידאו' :
                   session.location === 'phone' ? 'שיחת טלפון' : 'פגישה פיזית'}
                  {' • '}{session.durationMinutes} דקות
                </div>

                {session.notes && (
                  <div className="text-orange-500 mt-2 bg-white/50 p-2 rounded">
                    <strong>הערות:</strong> {session.notes}
                  </div>
                )}

                {session.sessionSummary && (
                  <div className="text-orange-500 mt-2 bg-white/50 p-2 rounded">
                    <strong>סיכום:</strong> {session.sessionSummary}
                  </div>
                )}

                {!readOnly && session.scheduledTime > now && (
                  <a
                    href={generateGoogleCalendarLink(session, partnerName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-orange-100 hover:text-orange-900 h-9 px-4 py-2 border border-orange-200 bg-orange-50 text-orange-700"
                  >
                    🗓️ הוסף ליומן גוגל
                  </a>
                )}

                {showCompletionButton && session.scheduledTime < now && session.status !== 'completed' && (
                  <div className="mt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setSessionToComplete(session)}
                      className="w-full border-orange-400 text-orange-600 hover:bg-orange-50"
                    >
                      סמן כהושלם והוסף סיכום
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Session Completion Modal */}
        {sessionToComplete && (
          <SessionCompletionModal
            session={sessionToComplete}
            onClose={() => setSessionToComplete(null)}
            onSubmit={handleSessionCompletion}
          />
        )}
      </div>
    </div>
  );
}

function SessionCompletionModal({ session, onClose, onSubmit }) {
  const [summary, setSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const sessionRef = doc(db, "Sessions", session.id);
      await updateDoc(sessionRef, {
        status: "completed",
        sessionSummary: summary,
        completedAt: serverTimestamp(),
      });
      onSubmit(); // This will trigger handleSessionCompletion in the parent
    } catch (err) {
      console.error("Error completing session:", err);
      setError("אירעה שגיאה בעדכון המפגש. אנא נסה שוב.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg border border-orange-200 shadow-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-orange-800">סיכום מפגש</h3>
          <button
            onClick={onClose}
            className="text-orange-400 hover:text-orange-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-2 rounded-md mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-1">
              סיכום קצר של המפגש (יוצג למנהל בלבד)
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-orange-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="מה עלה במפגש? האם יש דברים שחשוב שהמנהל יידע?"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className={isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {isSubmitting ? 'מעדכן...' : 'שמור סיכום וסמן כהושלם'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              ביטול
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SessionScheduler({ match, onClose, handleScheduleSession }) {
  const [scheduledTime, setScheduledTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState("video");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!scheduledTime) {
      setError("נא לבחור זמן למפגש");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    await handleScheduleSession({
      match,
      scheduledTime,
      duration,
      location,
      notes,
      onSuccess: () => {
        onClose();
      },
      onError: (error) => {
        setError("אירעה שגיאה בקביעת המפגש. נא לנסות שוב.");
        console.error(error);
      }
    });
    setIsSubmitting(false);
  };

  const durationOptions = [{ value: 30, label: "30 דקות" }, { value: 45, label: "45 דקות" }, { value: 60, label: "שעה" }, { value: 90, label: "שעה וחצי" }];
  const locationOptions = [{ value: "video", label: "שיחת וידאו" }, { value: "phone", label: "שיחת טלפון" }, { value: "in_person", label: "פגישה פיזית" }];

  return (
    <div className="bg-white p-6 rounded-lg border border-orange-200 shadow-lg max-w-md w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-orange-800">קביעת מפגש חדש</h3>
        <button
          onClick={onClose}
          className="text-orange-400 hover:text-orange-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-2 rounded-md mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium text-orange-700 mb-1"><Calendar className="inline-block w-4 h-4 ml-1" />תאריך ושעה</label><input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full rounded-md border border-orange-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-400" required /></div>
        <div><label className="block text-sm font-medium text-orange-700 mb-1"><Clock className="inline-block w-4 h-4 ml-1" />משך המפגש</label><select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full rounded-md border border-orange-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-400">{durationOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-orange-700 mb-1"><MessageCircle className="inline-block w-4 h-4 ml-1" />אופן המפגש</label><select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-md border border-orange-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-400">{locationOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-orange-700 mb-1"><MessageCircle className="inline-block w-4 h-4 ml-1" />הערות למפגש</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-md border border-orange-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="הערות או נושאים לדיון..." /></div>
        <div className="flex gap-2 pt-2"><Button type="submit" disabled={isSubmitting} className={isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}>{isSubmitting ? 'מעדכן...' : 'קבע מפגש'}</Button><Button type="button" variant="outline" onClick={onClose}>ביטול</Button></div>
      </form>
    </div>
  );
}
