// c:/Users/moti/Desktop/talksfromtheheart/18.6/JCE-Community-Project/src/components/dashboards/RequesterDashboard.jsx
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { auth, db } from "../../config/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { Button } from "../ui/button";
import EmergencyButton from "../EmergencyButton/EmergencyButton";
import LoadingSpinner from "../ui/LoadingSpinner";
import { Card } from "../ui/card";
import { X, User, Sparkles } from "lucide-react"; // Sparkles might be unused now
import ChatPanel from "../ui/ChatPanel";
import CustomAlert from "../ui/CustomAlert";
import LifeAdvice from "./LifeAdvice"; // Corrected import casing
import { generateRandomId } from "../../utils/firebaseHelpers";
import { writeBatch } from "firebase/firestore";
import ChatButton from "../ui/ChatButton";




const fetchVolunteer = async (uid) => {
  if (!uid) {
    console.warn("[DEBUG-FETCH] fetchVolunteer called with invalid UID. Returning null.");
    return null;
  }
  const snap = await getDoc(
    doc(db, "Users", "Info", "Volunteers", uid)
  );
  return snap.exists() ? { id: uid, ...snap.data() } : null;
};

const calculateCompatibilityScore = (requesterProfile, volunteer) => {
  let score = 0;
  let maxScore = 0;
  const extractTimePeriod = (timeSlot) => {
    const match = timeSlot.match(/^([^(]+)/);
    return match ? match[1].trim() : timeSlot;
  };

  if (requesterProfile.frequency && (volunteer.availableDays || volunteer.frequency)) {
    maxScore += 3;
    const requesterFreqs = Array.isArray(requesterProfile.frequency) ? requesterProfile.frequency : [requesterProfile.frequency];
    const validFreqs = requesterFreqs.filter(f => f !== "אחר");
    if (validFreqs.length > 0) {
      const volunteerDaysCount = volunteer.availableDays?.length || 0;
      validFreqs.forEach(freq => {
        if (freq === "פעם בשבוע" && volunteerDaysCount >= 1) score += 1.5;
        if (freq === "פעמיים בשבוע" && volunteerDaysCount >= 2) score += 1.5;
      });
    }
  }
  if (requesterProfile.preferredTimes && volunteer.availableHours) {
    maxScore += 4;

    const requesterTimes = Array.isArray(requesterProfile.preferredTimes) ? requesterProfile.preferredTimes : [requesterProfile.preferredTimes];
    const validTimes = requesterTimes.filter(t => t !== "אחר");
    const volunteerPeriods = volunteer.availableHours.map(extractTimePeriod);
    const matchingPeriods = validTimes.filter(rt => volunteerPeriods.some(vp => vp === rt));
    if (matchingPeriods.length >= 2) score += 4;

  }
  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
};

const sortVolunteersByCompatibility = (volunteers, requesterProfile) => {
  return volunteers.map(volunteer => ({
    ...volunteer,
    compatibilityScore: calculateCompatibilityScore(requesterProfile, volunteer)
  })).sort((a, b) => b.compatibilityScore - a.compatibilityScore);
};

export default function RequesterDashboard() {
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
  const [requestProfile, setRequestProfile] = useState({});
  const [personal, setPersonal] = useState(true);
  const [availableVolunteers, setAvailableVolunteers] = useState([]);
  const [sortedVolunteers, setSortedVolunteers] = useState([]);
  const [adminApprovalRequests, setAdminApprovalRequests] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeMatch, setActiveMatch] = useState(null);
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [, setUserData] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("available");
  const [alertMessage, setAlertMessage] = useState(null);
  const [declinedVolunteers, setDeclinedVolunteers] = useState([]);
  // eslint-disable-next-line
  const [requesterFormConfig, setRequesterFormConfig] = useState({
    hideNoteField: false, // Initialize with default structure
    customFields: []
  }); // For LifeAdvice

  // Set the appropriate first tab when switching modes
  useEffect(() => {
    // If AI advice tab is active, don't change it when 'personal' toggles
    if (activeTab === "lifeAdvice") return;

    if (personal) {
      setActiveTab("available");
    } else {
      // If not personal, default to 'current' match tab
      setActiveTab("current");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personal]); // Only re-run when 'personal' changes

  /* listener refs */
  const unsubVolunteers = useRef(null);
  const unsubAdminApproval = useRef(null);
  const unsubMatch = useRef(null);
  const unsubChat = useRef(null);
  const unsubPendingRequests = useRef(null);
  /* -------- bootstrap requester profile -------- */

  // Admin Chat Panel
  const [showAdminChatPanel, setShowAdminChatPanel] = useState(false);
  const [adminMessages, setAdminMessages] = useState([]);
  const [adminNewMsg, setAdminNewMsg] = useState("");


  useEffect(() => {
    if (personal) setActiveTab("available");
    else setActiveTab("current");
  }, [personal]);

  useEffect(() => {
    if (!authChecked || !user) return;
    const reqRef = doc(db, "Users", "Info", "Requesters", user.uid);
    const unsubReq = onSnapshot(reqRef, (snap) => {
      const data = snap.data();
      if(data) {
        setRequestProfile(data);
        setPersonal(data.personal ?? true);
        setUserData(data);
      }
      setLoading(false);
    }, (err) => {
      console.error("[DEBUG ERROR] Requester doc error:", err);
      setLoading(false);
    });
    return () => unsubReq();
  }, [authChecked, user]);
  
  // This new effect will check the URL for `chatWith` and open the chat
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
    if (!user) return;
    const fetchDeclinedVolunteers = async () => {
      try {
        const q = query(collection(db, "Requests"), where("requesterId", "==", user.uid), where("status", "==", "waiting_for_first_approval"));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) setDeclinedVolunteers(snapshot.docs[0].data().declinedVolunteers || []);
        else setDeclinedVolunteers([]);
      } catch (error) {
        console.error("Error fetching declined volunteers:", error);
      }
    };
    fetchDeclinedVolunteers();
  }, [user, pendingRequests]);
  
  useEffect(() => {
    if (availableVolunteers.length > 0 && requestProfile) {
      const filteredVolunteers = availableVolunteers.filter(v => !declinedVolunteers.includes(v.id));
      const sorted = sortVolunteersByCompatibility(filteredVolunteers, requestProfile);
      setSortedVolunteers(sorted);
    } else {
      setSortedVolunteers([]);
    }
  }, [availableVolunteers, requestProfile, declinedVolunteers]);
  useEffect(() => {
    if (loading || !user) return;

    unsubMatch.current?.();
    unsubMatch.current = onSnapshot(query(collection(db, "Matches"), where("requesterId", "==", user.uid), where("status", "==", "active")), async (snap) => {
      const arr = await Promise.all(snap.docs.map(async d => {
        const m = d.data();
        const vol = await fetchVolunteer(m.volunteerId);
        return vol ? { id: d.id, ...m, volunteer: vol } : null;
      }));
      const validMatches = arr.filter(Boolean);
      setActiveMatch(validMatches.length > 0 ? validMatches[0] : null);
      setMatches(validMatches);
    });

    unsubVolunteers.current?.();
    unsubAdminApproval.current?.();

    if (personal) {
      unsubVolunteers.current = onSnapshot(query(collection(db, "Users", "Info", "Volunteers"), where("approved", "==", "true"), where("isAvailable", "==", true)), (snap) => {
        setAvailableVolunteers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      unsubAdminApproval.current = onSnapshot(query(collection(db, "Requests"), where("requesterId", "==", user.uid), where("status", "==", "waiting_for_admin_approval")), async (snap) => {
        const arr = await Promise.all(snap.docs.map(async d => {
          const rqData = d.data();
          const volunteer = await fetchVolunteer(rqData.volunteerId);
          return volunteer ? { id: d.id, ...rqData, volunteer } : null;
        }));
        setAdminApprovalRequests(arr.filter(Boolean));
      });
    } else {
      setAvailableVolunteers([]);
      setAdminApprovalRequests([]);
    }

    return () => {
      unsubMatch.current?.();
      unsubVolunteers.current?.();
      unsubAdminApproval.current?.();
    };
  }, [personal, loading, user]);

  useEffect(() => {
    if (!user) return;
    unsubPendingRequests.current = onSnapshot(query(collection(db, "Requests"), where("requesterId", "==", user.uid), where("status", "in", ["waiting_for_first_approval", "waiting_for_admin_approval"])), async (snap) => {
      const firstApprovalRequest = snap.docs.find(d => d.data().status === "waiting_for_first_approval");
      if (firstApprovalRequest) {
        setDeclinedVolunteers(firstApprovalRequest.data().declinedVolunteers || []);
      }
      const requests = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data();
        const volunteer = data.volunteerId ? await fetchVolunteer(data.volunteerId) : null;
        return { id: d.id, ...data, volunteer };
      }));
      setPendingRequests(requests.filter(req => req.volunteerId));
    });
    return () => unsubPendingRequests.current?.();
  }, [user]);

  // Determine user status for display
  const userStatus = activeMatch
    ? "מותאם למתנדב"
    : pendingRequests.length > 0
    ? "ממתין לאישור"
    : "ממתין להתאמה";

  const statusColorClass = activeMatch ? "text-green-600" : "text-orange-600";

  const flipPersonal = async () => {
    if (!user) return;
    const newVal = !personal;
    setPersonal(newVal);
    await setDoc(doc(db, "Users", "Info", "Requesters", user.uid), { personal: newVal }, { merge: true });
  };
  
  const requestVolunteer = async (volunteerId) => {
    setRequestLoading(true);
    try {
      // 1. Verify volunteer is still available
      const volunteerDoc = await getDoc(doc(db, "Users", "Info", "Volunteers", volunteerId));
      if (!volunteerDoc.exists() || !volunteerDoc.data().isAvailable || volunteerDoc.data().approved !== "true") {
        setAlertMessage({ message: "המתנדב/ת אינו/ה זמין/ה כעת", type: "error" });
        setRequestLoading(false);
        return;
      }
      const volunteerData = volunteerDoc.data();

      // 2. Find an existing request document for the user that can be reused
      const requestsRef = collection(db, "Requests");
      const q = query(requestsRef, where("requesterId", "==", user.uid), where("status", "==", "waiting_for_first_approval"));
      const snapshot = await getDocs(q);

      const newStatus = volunteerData.personal === false 
        ? "waiting_for_admin_approval" 
        : "waiting_for_first_approval";

      const requestPayload = {
        volunteerId: volunteerId,
        initiatedBy: user.uid,
        status: newStatus,
        updatedAt: serverTimestamp(),
      };

      if (!snapshot.empty) {
        // Found an existing request to update
        const requestDocRef = snapshot.docs[0].ref;
        await updateDoc(requestDocRef, requestPayload);
      } else {
        // This case should ideally not happen if registration always creates a request.
        // But as a fallback, we can create one.
        console.warn("No existing 'waiting_for_first_approval' request found for user. This is unexpected. Creating a new one as a fallback.");
        await addDoc(requestsRef, {
          ...requestPayload,
          requesterId: user.uid,
          matchId: null,
          reason: requestProfile.reason || "",
          needs: requestProfile.needs || "",
          createdAt: serverTimestamp(),
          declinedVolunteers: [],
        });
      }

      setAlertMessage({ message: "הבקשה נשלחה בהצלחה וממתינה לאישור", type: "success" });

    } catch (error) {
      console.error("Error requesting volunteer:", error);
      setAlertMessage({ message: "אירעה שגיאה בשליחת הבקשה. אנא נסה שוב", type: "error" });
    } finally {
      setRequestLoading(false);
    }
  };

  const cancelRequest = async (requestId) => {
    setRequestLoading(true);
    try {
      const requestDocRef = doc(db, "Requests", requestId);
      const requestDoc = await getDoc(requestDocRef);
      
      if (!requestDoc.exists()) {
        setAlertMessage({ message: "הבקשה לא נמצאה במערכת", type: "error" });
        return;
      }

      // Reset the request to be available in the pool again
      await updateDoc(requestDocRef, {
        volunteerId: null,
        initiatedBy: null,
        status: "waiting_for_first_approval", // Reset status
        updatedAt: serverTimestamp(),
      });

      setAlertMessage({ message: "הבקשה בוטלה בהצלחה", type: "success" });
    } catch (error) {
      console.error("Error canceling request:", error);
      setAlertMessage({ message: "אירעה שגיאה בביטול הבקשה. אנא נסה שוב", type: "error" });
    } finally {
      setRequestLoading(false);
    }
  };
  
const openChat = async (matchId) => {
  closeAdminChat();
  setActiveMatchId(matchId);
  
  // Mark all messages from volunteer as seen
  const messagesRef = collection(db, "conversations", matchId, "messages");
  const messagesSnapshot = await getDocs(messagesRef);
  
  const batch = writeBatch(db);
  messagesSnapshot.docs.forEach(messageDoc => {
    const messageData = messageDoc.data();
    if (messageData.senderId !== user.uid && !messageData.seenByOther) {
      // Mark messages from volunteer as seen by requester
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
    if (!newMsg.trim() || !activeMatch || !user) return;
    try {
      await addDoc(
        collection(db, "conversations", activeMatch.id, "messages"),
        { text: newMsg.trim(), senderId: user.uid, createdAt: serverTimestamp(), seenByOther: false}
      );
      if (activeMatch.volunteerId) {
        await addDoc(collection(db, "notifications"), {
          userId: activeMatch.volunteerId,
          message: `הודעה חדשה מ־${requestProfile?.fullName || "פונה"}`,
          link: `/volunteer-dashboard?chatWith=${activeMatch.id}`,
          createdAt: serverTimestamp(),
          read: false,
        });
      }
      setNewMsg("");
    } catch (error) {
      console.error("Error sending message or notification:", error);
      setAlertMessage({ message: "שגיאה בשליחת ההודעה", type: "error" });
    }
  };

  if (!authChecked || loading) {
    return <LoadingSpinner />;
  }
  const renderTabContent = () => {
    switch (activeTab) {
      case "available":
        return personal ? (
          <div className="space-y-4">
            {activeMatch ? (
              <div className="bg-orange-100 border border-orange-200 rounded-lg p-4 text-orange-700 text-center">
                <p className="font-medium">יש לך כבר שיבוץ פעיל עם מתנדב/ת. אין אפשרות לפנות למתנדבים נוספים.</p>
              </div>
            ) : sortedVolunteers.length > 0 ? (
              sortedVolunteers.map((vol) => (
                <VolunteerCard
                  key={vol.id}
                  volunteer={vol}
                  onRequest={() => requestVolunteer(vol.id)}
                  isRecommended={vol.compatibilityScore >= 50}
                  compatibilityScore={vol.compatibilityScore}
                  requestLoading={requestLoading}
                  pendingRequests={pendingRequests}
                  cancelRequest={cancelRequest}
                />
              ))
            ) : (
              <Empty text="אין מתנדבים זמינים כרגע" />
            )}
          </div>
        ) : null;
      case "pending":
        return (
          <div className="space-y-4">
            {adminApprovalRequests.length > 0 ? (
              adminApprovalRequests.map((r) => <AdminApprovalCard key={r.id} request={r} />)
            ) : (
              <Empty text="אין בקשות הממתינות לאישור" />
            )}
          </div>
        );
      case "current":
        return (
          <div className="space-y-4">
            {activeMatch ? (
              <MatchCard match={activeMatch} onOpenChat={openChat} onCloseChat={closeChat} activeMatchId={activeMatchId} />
            ) : (
              <Empty text="אין שיבוץ נוכחי" />
            )}
          </div>
        );
      case "lifeAdvice": // New case for LifeAdvice tab
        // Ensure both requestProfile and requesterFormConfig are loaded before rendering
        if (!requestProfile || Object.keys(requestProfile).length === 0 || !requesterFormConfig) {
           return <LoadingSpinner />;
        }
        // Pass requestProfile as userData and the fetched config
        return requestProfile ? <LifeAdvice userData={requestProfile} requesterFormConfig={requesterFormConfig} /> : <LoadingSpinner />;
      default:
        return null;
    }
  };

  const openAdminChat = async () => {
    if (unsubChat.current) closeChat();

    setAdminMessages([]);
    let convoId = "";
    try {
      const userDoc = await getDoc(doc(db, "Users", "Info", "Requesters", user.uid));
      convoId = userDoc.data().conversationsWithAdminId;
      if (!convoId) {
        convoId = generateRandomId();
        await updateDoc(doc(db, "Users", "Info", "Requesters", user.uid), {
          conversationsWithAdminId: convoId,
        });
      }

      const messagesRef = collection(db, "conversations", convoId, "messages");
      const messagesSnapshot = await getDocs(messagesRef);
      
      const batch = writeBatch(db);
      messagesSnapshot.docs.forEach(messageDoc => {
        const messageData = messageDoc.data();
        if (messageData.senderId === "1" && !messageData.seenByOther) {
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
    const userDoc = await getDoc(doc(db, "Users", "Info", "Requesters", user.uid));
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
    setAdminMessages(prev => [...prev, { text: adminNewMsg.trim(), senderId: user.uid, timestamp: serverTimestamp() }]);
    setAdminNewMsg("");
  };  

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-orange-800 flex-grow">
          שלום {requestProfile && requestProfile.fullName ? requestProfile.fullName.split(' ')[0] : ''} 👋
        </h1>
        <p className={`text-sm sm:text-base font-semibold ${statusColorClass} mb-2 sm:mb-0`}>
          סטטוס: {userStatus}
        </p>
        <Button
          variant="outline"
          className="mr-0 sm:mr-2 w-full sm:w-auto"
          onClick={() => window.location.href = '/profile'}
        >
          הפרופיל שלי
        </Button>
        <ChatButton 
          conversationId={requestProfile?.conversationsWithAdminId}
          onClick={openAdminChat}
          currentUserId={requestProfile?.id || user.uid}
          otherUserId="1"
          variant="outline"
          className="mr-2"
        >
          צאט עם מנהל
        </ChatButton>
        <div className="flex-1" />
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <span className="text-sm text-orange-700">פנייה ישירה למתנדב</span>
          <button onClick={flipPersonal} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none ring-2 ring-orange-400 ring-offset-2 ${personal ? 'bg-orange-600 border-orange-400' : 'bg-gray-200 border-orange-400'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform border-2 border-orange-400 ${personal ? '-translate-x-1' : '-translate-x-6'}`} />
          </button>
          <span className="text-sm text-orange-700">ללא העדפה</span>
        </div>
      </div>
      <Card className="mb-6">
        <div className="flex border-b border-gray-200">
          {!activeMatch && personal && (
            <div className="flex flex-wrap w-full sm:w-auto">
            <button
                onClick={() => setActiveTab("available")}
                className={`
                  flex-1 p-2 sm:p-4 text-center font-medium text-xs sm:text-sm focus:outline-none
                  ${activeTab === "available"
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                מתנדבים זמינים{!activeMatch && ` (${sortedVolunteers.length})`} 
              </button>
              <button onClick={() => setActiveTab("pending")} className={`flex-1 p-2 sm:p-4 text-center font-medium text-xs sm:text-sm focus:outline-none ${activeTab === "pending" ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>
                בקשות ממתינות לאישור מנהל ({adminApprovalRequests.length})
              </button>
            </div>
          )}
          <button onClick={() => setActiveTab("current")} className={`flex-1 p-4 text-center font-medium text-sm focus:outline-none ${activeTab === "current" ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>
            השיבוץ הנוכחי שלי ({activeMatch ? 1 : 0})
          </button>
          <button 
            onClick={() => setActiveTab("lifeAdvice")}
            className={`
              flex-1 p-4 text-center font-medium text-sm focus:outline-none flex items-center justify-center gap-2
              ${activeTab === "lifeAdvice"
                ? 'border-b-2 border-purple-500 text-purple-500 mx-1'
                : 'text-gray-500 hover:text-gray-700 hover:bg-orange-50/50'
              }
              transition-all duration-200 ease-in-out
            `}
          >
            <Sparkles className={`w-4 h-4 ${activeTab === "lifeAdvice" ? 'text-purple-500' : 'text-purple-500'}`} />
            ייעוץ מהלב AI
          </button>
        </div>
      </Card>

      {/* Tab Content */}
      <div className="mt-6">
        {renderTabContent()}
      </div>

      {/* Emergency Button - Ensure it's always visible */}
      <EmergencyButton activeMatch={activeMatch} />

      {/* Chat Panel - Now shown as a floating window */}
      <ChatPanel
        isOpen={!!activeMatchId && !!activeMatch}
        onClose={closeChat}
        messages={messages}
        newMsg={newMsg}
        setNewMsg={setNewMsg}
        onSend={sendMessage}
        chatPartnerName={activeMatch?.volunteer?.fullName || 'שיחה'}
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

      <CustomAlert
        message={alertMessage?.message}
        onClose={() => setAlertMessage(null)}
        type={alertMessage?.type}
      />
    </div>
  );
}

const Empty = ({ text }) => (
  <p className="bg-orange-100 border border-orange-100 rounded-lg py-4 px-6 text-orange-700">{text}</p>
);

function VolunteerCard({ volunteer, onRequest, isRecommended, compatibilityScore, requestLoading, pendingRequests, cancelRequest }) {
  const formatList = (list) => {
    if (!list) return "—";
    if (Array.isArray(list)) return list.join(", ");
    return list;
  };
  const [volunteerAdminConfig, setVolunteerAdminConfig] = useState(null);

  useEffect(() => {
    const fetchVolunteerConfig = async () => {
      try {
        const configDocRef = doc(db, "admin_form_configs", "volunteer_config");
        const configSnap = await getDoc(configDocRef);
        if (configSnap.exists()) {
          const configData = configSnap.data();
          setVolunteerAdminConfig({
            ...configData,
            customFields: Array.isArray(configData.customFields) ? configData.customFields : []
          });
        } else {
          // console.warn("[VolunteerCard] Volunteer admin config document not found at admin_form_configs/volunteer_config.");
          setVolunteerAdminConfig({ customFields: [] });
        }
      } catch (error) {
        console.error("[VolunteerCard] Error fetching volunteer admin config:", error);
        setVolunteerAdminConfig({ customFields: [] });
      }
    };
    if (volunteer?.id) { // Only fetch if volunteer.id is available
      fetchVolunteerConfig();
    }
  }, [volunteer?.id]); // Depend on volunteer.id

  // Check if there's a pending request for this volunteer
  const pendingRequest = pendingRequests.find(req => req.volunteerId === volunteer.id);
  const isPending = !!pendingRequest;
  const hasAnyPendingRequest = pendingRequests.length > 0;
  const showOtherVolunteers = !hasAnyPendingRequest || isPending;

  const shouldShowButton = showOtherVolunteers || isPending;

  // Determine if there are any shareable custom fields to display
  let shareableCustomFields = [];
  if (volunteer && volunteerAdminConfig && Array.isArray(volunteerAdminConfig.customFields) && volunteerAdminConfig.customFields.length > 0) {
    Object.entries(volunteer).forEach(([key, value]) => {
      const fieldDef = volunteerAdminConfig.customFields.find(
        (f) => f.name === key && f.shareWithPartner === true
      );
      if (fieldDef) {
        let displayValue = value;
        if (Array.isArray(value)) {
          displayValue = value.join(", ");
        } else if (typeof value === 'boolean') {
          displayValue = value ? "כן" : "לא";
        } else if (value === null || value === undefined || value === '') {
          displayValue = "—";
        }
        shareableCustomFields.push({ key, label: fieldDef.label, value: String(displayValue) });
      }
    });
  }


  return (
    <div className="border border-orange-100 rounded-lg p-4 bg-orange-100">
      {isRecommended && (
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          <span className="text-green-600 text-sm font-medium bg-green-50 px-2 py-1 rounded-full border border-green-200">
            ⭐ מומלץ ({Math.round(compatibilityScore)}% התאמה)
          </span>
        </div>
      )}
        <p className="font-semibold text-lg mb-1 text-orange-800">
        {volunteer.fullName || "מתנדב/ת"}
      </p>

      <p className="text-sm mb-2 text-orange-700">
        תחום: {volunteer.profession ?? "—"}
      </p>

      <p className="text-sm mb-2 text-orange-700">
        ניסיון: {volunteer.experience ?? "—"}
      </p>

      {/* Show availability information */}
      {volunteer.availableHours && (
        <p className="text-sm mb-2 text-orange-700">
          שעות זמינות: {formatList(volunteer.availableHours)}
        </p>
      )}

      {volunteer.availableDays && (
        <p className="text-sm mb-2 text-orange-700">
          ימים זמינים: {formatList(volunteer.availableDays)}
        </p>
      )}

      {volunteer.frequency && (
        <p className="text-sm mb-3 text-orange-700">
          תדירות: {formatList(volunteer.frequency)}
        </p>
      )}

      {/* Shared Custom Fields from Volunteer */}
      {shareableCustomFields.length > 0 && (
        <div className="mt-4 pt-4 border-t border-orange-200">
          <h4 className="font-semibold text-orange-800 text-md mb-2">מידע נוסף מהמתנדב:</h4>
          <div className="space-y-1 text-sm">
            {shareableCustomFields.map(field => (
              <p key={field.key} className="text-orange-700">
                <strong className="text-orange-800">{field.label}:</strong> {field.value}
              </p>
            ))}
          </div>
        </div>
      )}
            {shouldShowButton && (
        isPending ? (
          <Button onClick={() => cancelRequest(pendingRequest.id)} className={requestLoading ? 'opacity-50 cursor-not-allowed bg-red-600 hover:bg-red-700' : 'bg-red-600 hover:bg-red-700'} disabled={requestLoading}>
            {requestLoading ? 'מבטל בקשה...' : 'בטל בקשה'}
          </Button>
        ) : (
          <Button onClick={onRequest} className={requestLoading ? 'opacity-50 cursor-not-allowed' : ''} disabled={requestLoading}>
            {requestLoading ? 'שולח בקשה...' : 'פנה למתנדב/ת'}
          </Button>
        )
      )}
    </div>
  );
}

function AdminApprovalCard({ request }) {
  const { volunteer } = request;
  return (
    <div className="border border-orange-100 bg-orange-100 rounded-lg p-4">
      <p className="font-semibold text-orange-800 text-lg mb-1">{volunteer?.fullName || "מתנדב/ת"}</p>
      <p className="text-orange-700 text-sm mb-2">תחום: {volunteer?.profession ?? "—"}</p>
      <p className="text-orange-700 mb-3">ניסיון: {volunteer?.experience ?? "—"}</p>
      <p className="text-orange-600 text-sm font-medium">ממתין לאישור מנהל</p>
    </div>
  );
}

function MatchCard({ match, onOpenChat, onCloseChat, activeMatchId }) {
  const { volunteer } = match;
  const isChatOpen = activeMatchId === match.id;
  const [sessions, setSessions] = useState([]);
  const [showUpcomingSessionsModal, setShowUpcomingSessionsModal] = useState(false);
  const [showPastSessionsModal, setShowPastSessionsModal] = useState(false);
  const [showCompletedSessionsModal, setShowCompletedSessionsModal] = useState(false);
  const [volunteerAdminConfig, setVolunteerAdminConfig] = useState(null);

  useEffect(() => {
    const sessionsRef = collection(db, "Sessions");
    const unsub = onSnapshot(query(sessionsRef, where("matchId", "==", match.id), orderBy("scheduledTime", "asc")), (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), scheduledTime: doc.data().scheduledTime?.toDate() })));
    });
    return unsub;
  }, [match.id]);

  // Fetch volunteer admin config when volunteer data is available
  useEffect(() => {
    const fetchVolunteerConfig = async () => {
      if (match?.volunteerId) {
        try {
          const configDocRef = doc(db, "admin_form_configs", "volunteer_config");
          const configSnap = await getDoc(configDocRef);
          if (configSnap.exists()) {
            const configData = configSnap.data();
            setVolunteerAdminConfig({
              ...configData,
              customFields: Array.isArray(configData.customFields) ? configData.customFields : []
            });
          } else {
            setVolunteerAdminConfig({ customFields: [] });
          }
        } catch (error) {
          console.error("[MatchCard - RequesterDashboard] Error fetching volunteer admin config:", error);
          setVolunteerAdminConfig({ customFields: [] });
        }
      } else {
        setVolunteerAdminConfig({ customFields: [] });
      }
    };
    fetchVolunteerConfig();
  }, [match?.volunteerId]); // Depend on volunteerId


  // Split sessions into categories: upcoming, past, and completed
  const now = new Date();
  const { upcomingSessions, pastSessions, completedSessions } = sessions.reduce((acc, session) => {
    if (session.status === 'completed') acc.completedSessions.push(session);
    else if (session.scheduledTime > now) acc.upcomingSessions.push(session);
    else acc.pastSessions.push(session);
    return acc;
  }, { upcomingSessions: [], pastSessions: [], completedSessions: [] });

  const pastSessionsCount = pastSessions.length;

  // Determine if there are any shareable custom fields to display for the MatchCard
  let matchShareableCustomFields = [];
  if (volunteer && volunteerAdminConfig && Array.isArray(volunteerAdminConfig.customFields) && volunteerAdminConfig.customFields.length > 0) {
    Object.entries(volunteer).forEach(([key, value]) => {
      const fieldDef = volunteerAdminConfig.customFields.find(
        (f) => f.name === key && f.shareWithPartner === true
      );
      if (fieldDef) {
        let displayValue = value;
        if (Array.isArray(value)) {
          displayValue = value.join(", ");
        } else if (typeof value === 'boolean') {
          displayValue = value ? "כן" : "לא";
        } else if (value === null || value === undefined || value === '') {
          displayValue = "—";
        }
        matchShareableCustomFields.push({ key, label: fieldDef.label, value: String(displayValue) });
      }
    });
  }

  return (
    <div className="border border-orange-100 bg-orange-100 rounded-lg p-4">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="font-bold text-orange-900 text-xl mb-1">
              {volunteer?.fullName || "מתנדב/ת ללא שם"} {/* Changed to volunteer */}
            </h3>
            <div className="flex flex-wrap items-center gap-4 text-sm text-orange-700">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                גיל: {volunteer?.age ?? "—"} {/* Changed to volunteer */}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                מגדר: {volunteer?.gender ?? "—"} {/* Changed to volunteer */}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                טלפון: {volunteer?.phone ?? "—"} {/* Changed to volunteer */}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Shared Custom Fields from Volunteer */}
      {matchShareableCustomFields.length > 0 && (
        <div className="mt-4 pt-4 border-t border-orange-200">
          <h4 className="font-semibold text-orange-800 text-md mb-2">מידע נוסף מהמתנדב:</h4>
          <div className="space-y-1 text-sm">
            {matchShareableCustomFields.map(field => (
              <p key={field.key} className="text-orange-700">
                <strong className="text-orange-800">{field.label}:</strong> {field.value}
              </p>
            ))}
          </div>
        </div>
      )}


      {/* Chat and Sessions Buttons */}
      <div className="flex gap-2 flex-wrap">
      <ChatButton 
        conversationId={match.id} 
        onClick={isChatOpen ? onCloseChat : () => onOpenChat(match.id)}
        currentUserId={match.requesterId}
        otherUserId={match.volunteerId}
        className="flex items-center gap-2"
      >
        {isChatOpen ? "סגור שיחה" : "💬 פתח שיחה"}
      </ChatButton>
        {upcomingSessions.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setShowUpcomingSessionsModal(true)}
            className="flex items-center gap-2"
          >
            מפגשים מתוכננים ({upcomingSessions.length})
        </Button>
        )}
        {pastSessionsCount > 0 && (
          <Button
            variant="outline"
            onClick={() => setShowPastSessionsModal(true)}
            className="flex items-center gap-2"
          >
            מפגשים שהסתיימו ({pastSessionsCount})
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
      {showUpcomingSessionsModal && (
        <SessionModal
          title="מפגשים מתוכננים"
          sessions={upcomingSessions}
          onClose={() => setShowUpcomingSessionsModal(false)}
          partnerName={volunteer?.fullName}
        />
      )}
      {showPastSessionsModal && (
        <SessionModal
          title="מפגשים שהסתיימו"
          sessions={pastSessions}
          onClose={() => setShowPastSessionsModal(false)}
          readOnly={true}
          partnerName={volunteer?.fullName}
        />
      )}
      {showCompletedSessionsModal && (
        <SessionModal
          title="מפגשים שהושלמו"
          sessions={completedSessions}
          onClose={() => setShowCompletedSessionsModal(false)}
          readOnly={true}
          partnerName={volunteer?.fullName}
        />
      )}
    </div>
  );
}

function SessionModal({ title, sessions, onClose, readOnly = false, partnerName }) {
  const now = new Date();

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
                className={`p-3 rounded-md text-sm transition-colors ${session.status === 'completed' ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}
              >
                <div className="font-medium text-orange-800 flex items-center justify-between">
                  <span>{new Date(session.scheduledTime).toLocaleString('he-IL', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                  {session.status === 'completed' && (
                    <span className="text-green-600 text-xs bg-green-100 px-2 py-1 rounded-full">
                      הושלם
                    </span>
                  )}
                </div>

                <div className="text-orange-600 mt-1">
                  {session.location === 'video' ? '🎥' : session.location === 'phone' ? '📱' : '🤝'}
                  {' • '}{session.durationMinutes} דקות
                </div>

                {session.notes && (
                  <div className="text-orange-500 mt-2 bg-white/50 p-2 rounded">
                    <strong>הערות:</strong> {session.notes}
                  </div>
                )}
                 {session.status === 'completed' && session.sessionSummary && (
                  <div className="mt-2 text-gray-600 bg-white/80 p-2 rounded border border-orange-100">
                    <strong>סיכום המפגש:</strong> {session.sessionSummary}
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
