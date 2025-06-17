import React, { useEffect, useRef, useState } from "react";
import { auth, db } from "../firebaseConfig";
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
  serverTimestamp,
} from "firebase/firestore";
import { Button } from "./ui/button";
import LoadingSpinner from "../components/LoadingSpinner";
import { Card } from "./ui/card";
import { User, Calendar, Clock, MessageCircle, Plus, X } from "lucide-react";

/* ────────────────────────── helpers ────────────────────────── */

// one-shot fetch of a volunteer's public profile
const fetchVolunteer = async (uid) => {
  if (!uid) {
    console.warn("fetchVolunteer called with invalid UID. Returning null.");
    return null;
  }
  const snap = await getDoc(
    doc(db, "Users", "Info", "Volunteers", uid)
  );
  return snap.exists() ? { id: uid, ...snap.data() } : null;
};

// Calculate compatibility score between requester and volunteer preferences
const calculateCompatibilityScore = (requesterProfile, volunteer) => {
  let score = 0;
  let maxScore = 0;

  // Helper to extract time period from volunteer time slots
  const extractTimePeriod = (timeSlot) => {
    // Extract just the period name before the parentheses
    const match = timeSlot.match(/^([^(]+)/);
    return match ? match[1].trim() : timeSlot;
  };

  // Check frequency and days compatibility
  if (requesterProfile.frequency && (volunteer.availableDays || volunteer.frequency)) {
    maxScore += 3;
    
    const requesterFreqs = Array.isArray(requesterProfile.frequency)
      ? requesterProfile.frequency
      : [requesterProfile.frequency];
    
    // Filter out "אחר" from requester frequencies
    const validFreqs = requesterFreqs.filter(f => f !== "אחר");
    
    if (validFreqs.length > 0) {
      const volunteerDaysCount = volunteer.availableDays?.length || 0;
      
      // Score based on whether volunteer has enough available days
      validFreqs.forEach(freq => {
        if (freq === "פעם בשבוע" && volunteerDaysCount >= 1) score += 1.5;
        if (freq === "פעמיים בשבוע" && volunteerDaysCount >= 2) score += 1.5;
      });
    }
  }

  // Check preferred times compatibility
  if (requesterProfile.preferredTimes && volunteer.availableHours) {
    maxScore += 4;
    
    const requesterTimes = Array.isArray(requesterProfile.preferredTimes)
      ? requesterProfile.preferredTimes
      : [requesterProfile.preferredTimes];
    
    // Filter out "אחר" from requester times
    const validTimes = requesterTimes.filter(t => t !== "אחר");
    
    // Extract just the time period names from volunteer hours
    const volunteerPeriods = volunteer.availableHours.map(extractTimePeriod);
    
    // Count matching time periods
    const matchingPeriods = validTimes.filter(rt => 
      volunteerPeriods.some(vp => vp === rt)
    );
    
    // Award points based on number of matching periods
    // 1 match = 2 points, 2+ matches = 4 points
    if (matchingPeriods.length >= 2) {
      score += 4;
    } else if (matchingPeriods.length === 1) {
      score += 2;
    }
  }

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
};

// Sort volunteers by compatibility
const sortVolunteersByCompatibility = (volunteers, requesterProfile) => {
  return volunteers.map(volunteer => ({
    ...volunteer,
    compatibilityScore: calculateCompatibilityScore(requesterProfile, volunteer)
  })).sort((a, b) => b.compatibilityScore - a.compatibilityScore);
};

/* ────────────────────────── main component ────────────────────────── */

export default function RequesterDashboard() {
  /* -------- auth gate -------- */
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

  /* -------- UI state -------- */
  const [loading, setLoading] = useState(true);
  const [requestProfile, setRequestProfile] = useState({});
  const [personal, setPersonal] = useState(true); // true = פנייה ישירה למתנדב, false = ללא העדפה
  const [availableVolunteers, setAvailableVolunteers] = useState([]);
  const [sortedVolunteers, setSortedVolunteers] = useState([]);
  const [adminApprovalRequests, setAdminApprovalRequests] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeMatch, setActiveMatch] = useState(null);
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [userData, setUserData] = useState(null);  const [requestLoading, setRequestLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("available");
  // Set the appropriate first tab when switching modes
  useEffect(() => {
    if (personal) {
      setActiveTab("available");
    } else {
      setActiveTab("current");
    }
  }, [personal]);

  /* listener refs */
  const unsubVolunteers = useRef(null);
  const unsubAdminApproval = useRef(null);
  const unsubMatch = useRef(null);
  const unsubChat = useRef(null);
  const unsubPendingRequests = useRef(null);

  /* -------- bootstrap requester profile -------- */
  useEffect(() => {
    if (!authChecked || !user) return;

    const reqRef = doc(db, "Users", "Info", "Requesters", user.uid);

    const unsubReq = onSnapshot(
      reqRef,
      async (snap) => {
        if (!snap.exists()) {
          // first login → create skeleton profile
          await setDoc(reqRef, {
            personal: true, // default to פנייה ישירה למתנדב
            createdAt: serverTimestamp(),
          });
          return; // wait for next snapshot
        }
        const data = snap.data();
        setRequestProfile(data);
        setPersonal(data.personal ?? true);
        setUserData(data);
        setLoading(false);
      },
      (err) => {
        console.error("Requester doc error:", err);
        setLoading(false);
      }
    );

    return () => unsubReq();
  }, [authChecked, user]);

  /* -------- sort volunteers when data changes -------- */
  useEffect(() => {
    if (availableVolunteers.length > 0 && requestProfile) {
      const sorted = sortVolunteersByCompatibility(availableVolunteers, requestProfile);
      setSortedVolunteers(sorted);
    } else {
      setSortedVolunteers([]);
    }
  }, [availableVolunteers, requestProfile]);

  /* -------- attach / detach listeners based on mode -------- */
  useEffect(() => {
    if (loading || !user) return;

    // ---- active matches (always) ----
    unsubMatch.current?.();
    unsubMatch.current = onSnapshot(
      query(
        collection(db, "Matches"),
        where("requesterId", "==", user.uid),
        where("status", "==", "active")
      ),
      async (snap) => {
        const arr = [];
        for (const d of snap.docs) {
          const m = d.data();
          const vol = await fetchVolunteer(m.volunteerId);
          if (vol) {
            arr.push({ id: d.id, ...m, volunteer: vol });
          }
        }
        setActiveMatch(arr.length > 0 ? arr[0] : null); // Keep existing activeMatch behavior
        setMatches(arr);
      }
    );

    // ---- personal mode sections ----
    if (personal) {
      // available volunteers
      unsubVolunteers.current = onSnapshot(
        query(
          collection(db, "Users", "Info", "Volunteers"),
          where("approved", "==", true),
          where("isAvailable", "==", true)
        ),
        (snap) => {
          setAvailableVolunteers(
            snap.docs.map(d => ({ id: d.id, ...d.data() }))
          );
        }
      );
    } else {
      // ללא העדפה mode - show requests waiting for admin approval
      unsubAdminApproval.current = onSnapshot(
        query(
          collection(db, "Requests"),
          where("requesterId", "==", user.uid),
          where("status", "==", "waiting_for_admin_approval")
        ),
        async (snap) => {
          const arr = [];
          for (const d of snap.docs) {
            const rqData = d.data();
            const volunteer = await fetchVolunteer(rqData.volunteerId);
            if (volunteer) {
              arr.push({ id: d.id, ...rqData, volunteer: volunteer });
            }
          }
          setAdminApprovalRequests(arr);
        }
      );

      // clear personal mode data
      unsubVolunteers.current?.();
      setAvailableVolunteers([]);
    }

    // cleanup on mode change
    if (personal) {
      unsubAdminApproval.current?.();
      setAdminApprovalRequests([]);
    }

    return () => {
      unsubMatch.current?.();
      unsubVolunteers.current?.();
      unsubAdminApproval.current?.();
    };
  }, [personal, loading, user]);

  /* -------- listen for pending requests -------- */
  useEffect(() => {
    if (!user) return;

    unsubPendingRequests.current = onSnapshot(
      query(
        collection(db, "Requests"),
        where("requesterId", "==", user.uid),
        where("status", "in", ["waiting_for_first_approval", "waiting_for_admin_approval"])
      ),
      async (snap) => {
        const requests = await Promise.all(snap.docs.map(async (d) => {
          const data = d.data();
          if (data.volunteerId) {
            const volunteer = await fetchVolunteer(data.volunteerId);
            return { id: d.id, ...data, volunteer };
          }
          return { id: d.id, ...data };
        }));
        setPendingRequests(requests);
      }
    );

    return () => unsubPendingRequests.current?.();
  }, [user]);

  /* -------- handlers -------- */
  const flipPersonal = async () => {
    if (!user) return;
    const newVal = !personal;
    setPersonal(newVal); // optimistic
    await setDoc(
      doc(db, "Users", "Info", "Requesters", user.uid),
      { personal: newVal },
      { merge: true }
    );
  };

  const requestVolunteer = async (volunteerId) => {
    try {
      setRequestLoading(true);
      
      // First verify the volunteer is still available
      const volunteerDoc = await getDoc(doc(db, "Users", "Info", "Volunteers", volunteerId));
      if (!volunteerDoc.exists()) {
        alert("המתנדב/ת לא נמצא/ה במערכת");
        return;
      }
      
      const volunteerData = volunteerDoc.data();
      if (!volunteerData.isAvailable || !volunteerData.approved) {
        alert("המתנדב/ת אינו/ה זמין/ה כעת");
        return;
      }

      // Find the requester's existing request document
      const requestsRef = collection(db, "Requests");
      const q = query(
        requestsRef,
        where("requesterId", "==", user.uid),
        where("status", "==", "waiting_for_first_approval")
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const requestDoc = snapshot.docs[0];
        // Update the existing request with the selected volunteer
        await updateDoc(doc(db, "Requests", requestDoc.id), {
          volunteerId: volunteerId,
          initiatedBy: user.uid,
          updatedAt: serverTimestamp(),
        });
      }
      
      // Clear selected volunteer from UI
      const updatedVolunteers = availableVolunteers.filter(v => v.id !== volunteerId);
      setAvailableVolunteers(updatedVolunteers);
      
      alert("הבקשה נשלחה בהצלחה וממתינה לאישור");
    } catch (error) {
      console.error("Error requesting volunteer:", error);
      alert("אירעה שגיאה בשליחת הבקשה. אנא נסה שוב");
    } finally {
      setRequestLoading(false);
    }
  };

  const openChat = (matchId) => {
    setActiveMatchId(matchId);
    unsubChat.current?.();
    unsubChat.current = onSnapshot(
      query(
        collection(db, "conversations", matchId, "messages"),
        orderBy("timestamp")
      ),
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
    if (!newMsg.trim() || !activeMatch) return;
    await addDoc(
      collection(db, "conversations", activeMatch.id, "messages"),
      {
        text: newMsg.trim(),
        senderId: user.uid,
        timestamp: serverTimestamp(),
      }
    );
    setNewMsg("");
  };

  /* -------- render -------- */
  if (!authChecked || loading) {
    return <LoadingSpinner />;
  }
  const renderTabContent = () => {
    switch (activeTab) {
      case "available":
        return personal ? (
          <div className="space-y-4">
            {sortedVolunteers.length > 0 ? (
              sortedVolunteers.map((vol) => (
                <VolunteerCard
                  key={vol.id}
                  volunteer={vol}
                  onRequest={() => requestVolunteer(vol.id)}
                  isRecommended={vol.compatibilityScore >= 50}
                  compatibilityScore={vol.compatibilityScore}
                  requestLoading={requestLoading}
                  pendingRequests={pendingRequests}
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
              adminApprovalRequests.map((r) => (
                <AdminApprovalCard
                  key={r.id}
                  request={r}
                />
              ))
            ) : (
              <Empty text="אין בקשות הממתינות לאישור" />
            )}
          </div>
        );

      case "current":
        return (
          <div className="space-y-4">
            {activeMatch ? (
              <MatchCard
                match={activeMatch}
                onOpenChat={openChat}
                onCloseChat={closeChat}
                isChatOpen={!!unsubChat.current}
              />
            ) : (
              <Empty text="אין שיבוץ נוכחי" />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      {/* header + toggle */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-orange-800">
          שלום {userData?.fullName?.split(' ')[0] || ''} 👋
        </h1>
        <Button
          variant="outline"
          className="mr-2"
          onClick={() => window.location.href = '/profile'}
        >
          הפרופיל שלי
        </Button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-orange-700">פנייה ישירה למתנדב</span>
          <button
            onClick={flipPersonal}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none ring-2 ring-orange-400 ring-offset-2 ${
              personal ? 'bg-orange-600 border-orange-400' : 'bg-gray-200 border-orange-400'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform border-2 border-orange-400 ${
                personal ? '-translate-x-1' : '-translate-x-6'
              }`}
            />
          </button>
          <span className="text-sm text-orange-700">ללא העדפה</span>
        </div>
      </div>      {/* Tabs */}
      <Card className="mb-6">
        <div className="flex border-b border-gray-200">
          {personal && (
            <>              <button
                onClick={() => setActiveTab("available")}
                className={`
                  flex-1 p-4 text-center font-medium text-sm focus:outline-none
                  ${activeTab === "available"
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                מתנדבים זמינים ({sortedVolunteers.length})
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={`
                  flex-1 p-4 text-center font-medium text-sm focus:outline-none
                  ${activeTab === "pending"
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                בקשות שממתינות לאישור מנהל ({adminApprovalRequests.length})
              </button>
            </>
          )}          <button
            onClick={() => setActiveTab("current")}
            className={`
              flex-1 p-4 text-center font-medium text-sm focus:outline-none
              ${activeTab === "current"
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            השיבוץ הנוכחי שלי ({activeMatch ? 1 : 0})
          </button>
        </div>
      </Card>

      {/* Tab Content */}      <div className="mt-6">
        {renderTabContent()}
      </div>      {/* Chat Panel - Now shown as a floating window */}
      <ChatPanel
        isOpen={!!unsubChat.current && !!activeMatch}
        onClose={closeChat}
        messages={messages}
        newMsg={newMsg}
        setNewMsg={setNewMsg}
        onSend={sendMessage}
        chatPartnerName={activeMatch?.volunteer?.fullName || 'שיחה'}
      />
    </div>
  );
}

/* ────────────────────────── presentational helpers ───────────────────────── */

const Section = ({ title, empty, children }) => (
  <>
    <h2 className="text-xl font-semibold text-orange-800 mb-2">{title}</h2>
    {React.Children.count(children) === 0 ? (
      <Empty text={empty} />
    ) : (
      <div className="space-y-4">{children}</div>
    )}
  </>
);

const Empty = ({ text }) => (
  <p className="bg-orange-100 border border-orange-100 rounded-lg py-4 px-6 text-orange-700">
    {text}
  </p>
);

function VolunteerCard({ volunteer, onRequest, isRecommended, compatibilityScore, requestLoading, pendingRequests }) {
  const formatList = (list) => {
    if (!list) return "—";
    if (Array.isArray(list)) {
      return list.join(", ");
    }
    return list;
  };

  // Check if there's a pending request for this volunteer
  const pendingRequest = pendingRequests.find(req => req.volunteerId === volunteer.id);
  const isPending = !!pendingRequest;
  const isWaitingForAdmin = pendingRequest?.status === "waiting_for_admin_approval";

  return (    <div className="border border-orange-100 rounded-lg p-4 bg-orange-100">
      {isRecommended && (
        <div className="mb-2 flex items-center gap-2">
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
      )}      <Button 
        onClick={onRequest}
        className={`${(requestLoading || isPending) ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={requestLoading || isPending}
      >
        {requestLoading ? 'שולח בקשה...' : 
         isWaitingForAdmin ? 'ממתין לאישור מנהל' :
         isPending ? 'ממתין לאישור מתנדב/ת' :
         'פנה למתנדב/ת'}
      </Button>
    </div>
  );
}

function AdminApprovalCard({ request }) {
  const { volunteer } = request;
  return (
    <div className="border border-orange-100 bg-orange-100 rounded-lg p-4">
      <p className="font-semibold text-orange-800 text-lg mb-1">
        {volunteer?.fullName || "מתנדב/ת"}
      </p>
      <p className="text-orange-700 text-sm mb-2">
        תחום: {volunteer?.profession ?? "—"}
      </p>
      <p className="text-orange-700 mb-3">
        ניסיון: {volunteer?.experience ?? "—"}
      </p>
      <p className="text-orange-600 text-sm font-medium">
        ממתין לאישור מנהל
      </p>
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

  useEffect(() => {
    const sessionsRef = collection(db, "Sessions");
    return onSnapshot(
      query(
        sessionsRef,
        where("matchId", "==", match.id),
        orderBy("scheduledTime", "asc")
      ),
      (snapshot) => {
        const sessionData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          scheduledTime: doc.data().scheduledTime?.toDate()
        }));
        setSessions(sessionData);
      }
    );
  }, [match.id]);

  // Split sessions into categories: upcoming, past, and completed
  const now = new Date();
  const { upcomingSessions, pastSessions, completedSessions } = sessions.reduce((acc, session) => {
    if (session.status === 'completed') {
      acc.completedSessions.push(session);
    } else if (session.scheduledTime > now) {
      acc.upcomingSessions.push(session);
    } else {
      acc.pastSessions.push(session);
    }
    return acc;
  }, { upcomingSessions: [], pastSessions: [], completedSessions: [] });

  // Get the count of past sessions
  const pastSessionsCount = pastSessions.length;

  return (
    <div className="border border-orange-100 bg-orange-100 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-orange-800 text-lg mb-1">
            {volunteer?.fullName || "מתנדב/ת ללא שם"}
          </p>

        </div>
      </div>

      {/* Chat and Sessions Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={isChatOpen ? onCloseChat : () => onOpenChat(match.id)}>
          {isChatOpen ? "סגור שיחה" : "💬 פתח שיחה"}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setShowUpcomingSessionsModal(true)}
          className="flex items-center gap-2"
          disabled={upcomingSessions.length === 0}
        >
          מפגשים מתוכננים ({upcomingSessions.length})
        </Button>
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
        />
      )}
      {showPastSessionsModal && (
        <SessionModal
          title="מפגשים שהסתיימו"
          sessions={pastSessions}
          onClose={() => setShowPastSessionsModal(false)}
          readOnly={true}
        />
      )}
      {showCompletedSessionsModal && (
        <SessionModal
          title="מפגשים שהושלמו"
          sessions={completedSessions}
          onClose={() => setShowCompletedSessionsModal(false)}
          readOnly={true}
        />
      )}
    </div>
  );
}

function ChatPanel({ isOpen, onClose, messages, newMsg, setNewMsg, onSend, chatPartnerName }) {
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[380px] flex flex-col">
      {/* Chat Window */}
      <div className="bg-white rounded-lg shadow-lg border border-orange-200 flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="flex justify-between items-center px-4 py-3 bg-orange-50 border-b border-orange-200">
          <h2 className="text-sm font-medium text-orange-800">
            {chatPartnerName}
          </h2>
          <button 
            onClick={onClose}
            className="text-orange-400 hover:text-orange-600 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-auto h-[300px] px-4 py-3">
          <div className="space-y-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.senderId === auth.currentUser.uid ? "text-right" : "text-left"
                }
              >
                <span
                  className={`inline-block rounded-lg px-3 py-1.5 text-sm my-1 max-w-[85%] ${
                    m.senderId === auth.currentUser.uid
                      ? "bg-orange-600 text-white"
                      : "bg-gray-100 border border-gray-200"
                  }`}
                >
                  {m.text}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-orange-100 p-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              className="flex-1 border border-orange-200 rounded-md px-3 py-1.5 text-sm focus:ring-1 focus:ring-orange-400 focus:border-orange-400 outline-none"
              placeholder="כתוב הודעה..."
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSend()}
            />
            <Button 
              onClick={onSend} 
              size="sm"
              className="px-4"
            >
              שלח
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionModal({ title, sessions, onClose, readOnly = false }) {
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

                {session.status === 'completed' && session.sessionSummary && (
                  <div className="mt-2 text-gray-600 bg-white/80 p-2 rounded border border-orange-100">
                    <strong>סיכום המפגש:</strong> {session.sessionSummary}
                  </div>
                )}
              </div>
            ))} 
          </div>
        )}
      </div>
    </div>
  );
}