// VolunteerDashboard.jsx
import React, { useEffect, useRef, useState } from "react";
import { User, Calendar, Clock, MessageCircle, Plus, X } from "lucide-react";
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
} from "firebase/firestore";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import LoadingSpinner from "../ui/LoadingSpinner";
import CustomAlert from "../ui/CustomAlert";

/* ────────────────────────── helpers ────────────────────────── */

// one-shot fetch of a requester's public profile
const fetchRequester = async (uid) => {
  if (!uid) {
    console.warn("fetchRequester called with invalid UID. Returning null.");
    return null;
  }
  const snap = await getDoc(
    doc(db, "Users", "Info", "Requesters", uid)
  );
  return snap.exists() ? { id: uid, ...snap.data() } : null;
};

/* ────────────────────────── main component ────────────────────────── */

export default function VolunteerDashboard() {
  /* -------- auth gate -------- */
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser]               = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
      if (!u) window.location.replace("/login");
    });
    return unsub;
  }, []);

  /* -------- UI state -------- */
  const [loading, setLoading]         = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [volProfile, setVolProfile]   = useState({});
  const [personal, setPersonal]       = useState(true);
  const [direct, setDirect]           = useState([]);
  const [pool, setPool]               = useState([]);
  const [matches, setMatches]         = useState([]);
  const [adminApprovalRequests, setAdminApprovalRequests] = useState([]);
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [messages, setMessages]       = useState([]);
  const [newMsg, setNewMsg]           = useState("");
  const [userData, setUserData]        = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [activeTab, setActiveTab]     = useState("directRequests");
  const [alertMessage, setAlertMessage] = useState(null);

  useEffect(() => {
    if (personal) {
      setActiveTab("directRequests");
    } else {
      setActiveTab("activeMatches");
    }
  }, [personal]);

  /* listener refs */
  const unsubDirect = useRef(null);
  const unsubPool   = useRef(null);
  const unsubMatch  = useRef(null);
  const unsubAdminApproval = useRef(null);
  const unsubChat   = useRef(null);

  /* -------- bootstrap volunteer profile -------- */
  useEffect(() => {
    if (!authChecked || !user) return;

    const volRef = doc(db, "Users", "Info", "Volunteers", user.uid);

    const unsubVol = onSnapshot(
      volRef,
      async (snap) => {
        if (!snap.exists()) {
          // first login → create skeleton profile
          await setDoc(volRef, {
            approved: "pending",
            personal: true,
            createdAt: serverTimestamp(),
          });
          return;                 // wait for next snapshot
        }
        const data = snap.data();
        setVolProfile(data);
        setPersonal(data.personal ?? true);
        setUserData(data);
        setLoading(false);
      },
      (err) => {
        console.error("Volunteer doc error:", err);
        setLoading(false);
      }
    );

    return () => unsubVol();
  }, [authChecked, user]);

  /* -------- attach / detach pool listeners -------- */
  useEffect(() => {
    if (loading || !user) return;

    // ---- active matches (always) ----
    unsubMatch.current?.();
    unsubMatch.current = onSnapshot(
      query(
        collection(db, "Matches"),
        where("volunteerId", "==", user.uid),
        where("status",      "==", "active")
      ),
      async (snap) => {
        const arr = [];
        for (const d of snap.docs) {
          const m  = d.data();
          const rq = await fetchRequester(m.requesterId);
          arr.push({ id: d.id, ...m, requester: rq });
        }
        setMatches(arr);
      }
    );

    // ---- personal-only sections ----
    if (personal) {
      // direct Requests
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
            const rqUser = await fetchRequester(rqData.requesterId);
            if (rqUser && rqUser.personal === false) {
              arr.push({ id: d.id, ...rqData, requester: rqUser });
            }
          }
          setDirect(arr);
        }
      );

      // Requests waiting for admin approval (new section)
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
            }
          }
          setAdminApprovalRequests(arr);
        }
      );

      // open pool
      unsubPool.current = onSnapshot(
        query(
          collection(db, "Requests"),
          where("volunteerId", "==", null),
          where("status",      "==", "waiting_for_first_approval")
        ),        async (snap) => {
          console.log("Pool snapshot docs:", snap.docs.map(d => ({ id: d.id, ...d.data() })));
          const arr = [];
          for (const d of snap.docs) {
            const rqData = d.data();
            console.log("Processing request:", { id: d.id, ...rqData });
            const rqUser = await fetchRequester(rqData.requesterId);
            console.log("Fetched requester:", rqUser);
            if (rqUser && rqUser.personal === false) {
              arr.push({ id: d.id, ...rqData, requester: rqUser });
              console.log("Added to pool:", { id: d.id, ...rqData, requester: rqUser });
            } else {
              console.log("Skipped request because:", !rqUser ? "no requester found" : "requester.personal is true");
            }
          }
          console.log("Final pool array:", arr);
          setPool(arr);
        }
      );
    } else {
      unsubDirect.current?.(); unsubDirect.current = null; setDirect([]);
      unsubPool.current?.();   unsubPool.current   = null; setPool([]);
      unsubAdminApproval.current?.(); unsubAdminApproval.current = null; setAdminApprovalRequests([]); // Clear on personal mode off
    }

    return () => {
      unsubMatch.current?.();
      unsubDirect.current?.();
      unsubPool.current?.();
      unsubAdminApproval.current?.(); // Unsubscribe new listener
    };
  }, [personal, loading, user]);

  /* -------- handlers -------- */
  const flipPersonal = async () => {
    if (!user) return;
    const newVal = !personal;
    setPersonal(newVal);
    await setDoc(
      doc(db, "Users", "Info", "Volunteers", user.uid),
      { personal: newVal },
      { merge: true }
    );
  };

  const handleRequestAction = async (req, action) => {
    const ref = doc(db, "Requests", req.id);
    if (action === "accept") {
      await updateDoc(ref, { status: "waiting_for_admin_approval" });
      setAlertMessage({ message: "הבקשה נשלחה לאישור מנהל.", type: "info" });
    } else if (action === "decline") {
      await updateDoc(ref, { status: "declined" });
      setAlertMessage({ message: "הבקשה נדחתה בהצלחה.", type: "info" });
    } else if (action === "take") {
      await updateDoc(ref, {
        volunteerId: user.uid,
        initiatedBy: user.uid,
        status:      "waiting_for_admin_approval",
      });
      setAlertMessage({ message: "הבקשה נלקחה ונשלחה לאישור מנהל.", type: "info" });
    } else if (action === "withdraw") {
      await updateDoc(ref, {
        volunteerId: null,
        initiatedBy: null,
        status:      "waiting_for_first_approval",
      });
      setAlertMessage({ message: "הבקשה הוחזרה למאגר הפתוח.", type: "info" });
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
    setMessages([]); // Clear messages when closing chat
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeMatchId) return;
    await addDoc(
      collection(db, "conversations", activeMatchId, "messages"),
      {
        text:      newMsg.trim(),
        senderId:  user.uid,
        timestamp: serverTimestamp(),
      }
    );
    setNewMsg("");
  };

  const openScheduleModal = (match) => {
    setSelectedMatch(match);
    setShowScheduleModal(true);
  };

  const closeScheduleModal = () => {
    setSelectedMatch(null);
    setShowScheduleModal(false);
  };

  const handleScheduleSession = async ({ match, scheduledTime, duration, location, notes, onSuccess, onError }) => {
    try {
      const sessionData = {
        matchId: match.id,
        volunteerId: user.uid,
        requesterId: match.requesterId,
        scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
        durationMinutes: parseInt(duration, 10),
        location: location,
        notes: notes,
        status: "scheduled",
        createdAt: serverTimestamp(),
      };

      const sessionRef = await addDoc(collection(db, "Sessions"), sessionData);

      await updateDoc(doc(db, "Matches", match.id), {
        lastSessionId: sessionRef.id,
        totalSessions: (match.totalSessions || 0) + 1,
      });
      setAlertMessage({ message: "המפגש נקבע בהצלחה!", type: "success" });
      onSuccess();
    } catch (error) {
      console.error("Error scheduling session:", error);
      setAlertMessage({ message: "אירעה שגיאה בקביעת המפגש. אנא נסה שוב.", type: "error" });
      onError(error);
    }
  };
  /* -------- render -------- */
  if (!authChecked || loading) {
    return <LoadingSpinner />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "directRequests":
        return personal ? (
          <Section title="בקשות ישירות" empty="אין בקשות ישירות">
            {direct.map((r) => (
              <RequestCard
                key={r.id}
                req={r}
                variant="direct"
                onAction={handleRequestAction}
              />
            ))}
          </Section>
        ) : null;
      case "openRequests":
        return personal ? (
          <Section title="דפדוף בפונים פתוחים" empty="אין פונים זמינים">
            {pool.map((r) => (
              <RequestCard
                key={r.id}
                req={r}
                variant="pool"
                onAction={handleRequestAction}
              />
            ))}
          </Section>
        ) : null;
      case "adminApproval":
        return (
          <Section title="בקשות ממתינות לאישור מנהל" empty="אין בקשות הממתינות לאישור">
            {adminApprovalRequests.map((r) => (
              <RequestCard
                key={r.id}
                req={r}
                variant="admin_approval"
                onAction={handleRequestAction}
              />
            ))}
          </Section>
        );
      case "activeMatches":
        return (
          <Section title="שיבוצים פעילים" empty="אין שיבוצים פעילים">
            {matches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                onOpenChat={() => openChat(m.id)}
                onCloseChat={closeChat}
                onScheduleSession={() => openScheduleModal(m)}
                activeMatchId={activeMatchId}
                handleScheduleSession={handleScheduleSession}
              />
            ))}
          </Section>
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
          <span className="text-sm text-orange-700">בחירה עצמית</span>
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
          <span className="text-sm text-orange-700">שיוך ע״י מנהל</span>
        </div>
      </div>      {/* Tabs */}
      <Card className="mb-6">
        <div className="flex border-b border-gray-200">
          {personal && (
            <>
              <button
                onClick={() => setActiveTab("directRequests")}
                className={`
                  flex-1 p-4 text-center font-medium text-sm focus:outline-none
                  ${activeTab === "directRequests"
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                בקשות ישירות
              </button>
              <button
                onClick={() => setActiveTab("openRequests")}
                className={`
                  flex-1 p-4 text-center font-medium text-sm focus:outline-none
                  ${activeTab === "openRequests"
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                דפדוף בפונים פתוחים
              </button>
              <button
                onClick={() => setActiveTab("adminApproval")}
                className={`
                  flex-1 p-4 text-center font-medium text-sm focus:outline-none
                  ${activeTab === "adminApproval"
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                בקשות ממתינות לאישור מנהל
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab("activeMatches")}
            className={`
              flex-1 p-4 text-center font-medium text-sm focus:outline-none
              ${activeTab === "activeMatches"
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            שיבוצים פעילים
          </button>
        </div>
      </Card>

      {/* Tab Content */}
      <div className="mt-6">
        {renderTabContent()}
      </div>{/* Chat Panel - Now shown as a floating window */}
      <ChatPanel
        isOpen={!!activeMatchId}
        onClose={closeChat}
        messages={messages}
        newMsg={newMsg}
        setNewMsg={setNewMsg}
        onSend={sendMessage}
        chatPartnerName={matches.find(m => m.id === activeMatchId)?.requester?.fullName || 'שיחה'}
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

function RequestCard({ req, variant, onAction }) {
  const { requester } = req;

  // Helper to format array or string values
  const formatList = (value) => {
    if (!value) return "—";
    if (Array.isArray(value)) {
      return value.filter(v => v !== "אחר").join(", "); // Filter out "אחר"
    }
    return value;
  };

    return (
    <div className="bg-orange-100 border border-orange-100 rounded-lg py-4 px-6 text-orange-700">
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
            <div className="flex items-center gap-4 text-sm text-orange-700">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                גיל: {requester?.age ?? "—"}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                מגדר: {requester?.gender ?? "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reason Section */}
      <div className="mb-4">
        <div className="bg-white/60 rounded-lg p-3 border border-orange-100">
          <h4 className="font-semibold text-orange-800 text-sm mb-1">סיבת הפנייה</h4>
          <p className="text-orange-700 leading-relaxed">
            {requester?.reason ?? "—"}
          </p>
        </div>
      </div>

      {/* Scheduling Info Grid */}
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

        {requester?.chatPref && (
          <div className="bg-white/60 rounded-lg p-3 border border-orange-100 md:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-orange-600" />
              <h4 className="font-semibold text-orange-800 text-sm">העדפת שיחה</h4>
            </div>
            <p className="text-orange-700 text-sm">
              {formatList(requester?.chatPref)}
            </p>
          </div>
        )}
      </div>      {variant === "direct" ? (
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

  // Split sessions into categories: upcoming, past (needing completion), and completed
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

  // Get the count of past sessions that need to be completed
  const pastSessionsNeedingCompletionCount = pastSessions.length;

  return (
    <div className="border border-orange-100 bg-orange-100 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-orange-800 text-lg mb-1">
            {requester?.fullName || "פונה ללא שם"}
          </p>
        </div>
      </div>

      {/* Chat and Schedule Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={isChatOpen ? onCloseChat : onOpenChat}>
          {isChatOpen ? "סגור שיחה" : "💬 פתח שיחה"}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setShowScheduleModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          קבע מפגש
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setShowUpcomingSessionsModal(true)}
          className="flex items-center gap-2"
          disabled={upcomingSessions.length === 0}
        >
          מפגשים מתוכננים ({upcomingSessions.length})
        </Button>
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

      {/* Modals */}        {showScheduleModal && (
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
        />
      )}
      {showPastSessionsModal && (
        <SessionModal
          title="מפגשים להשלמה"
          sessions={pastSessions}
          onClose={() => setShowPastSessionsModal(false)}
          showCompletionButton={true}
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

  const durationOptions = [
    { value: 30, label: "30 דקות" },
    { value: 45, label: "45 דקות" },
    { value: 60, label: "שעה" },
    { value: 90, label: "שעה וחצי" },
  ];

  const locationOptions = [
    { value: "video", label: "שיחת וידאו" },
    { value: "phone", label: "שיחת טלפון" },
    { value: "in_person", label: "פגישה פיזית" },
  ];
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
        <div>
          <label className="block text-sm font-medium text-orange-700 mb-1">
            <Calendar className="inline-block w-4 h-4 ml-1" />
            תאריך ושעה
          </label>
          <input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full rounded-md border border-orange-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-orange-700 mb-1">
            <Clock className="inline-block w-4 h-4 ml-1" />
            משך המפגש
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full rounded-md border border-orange-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            {durationOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-orange-700 mb-1">
            <MessageCircle className="inline-block w-4 h-4 ml-1" />
            אופן המפגש
          </label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-md border border-orange-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            {locationOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-orange-700 mb-1">
            <MessageCircle className="inline-block w-4 h-4 ml-1" />
            הערות למפגש
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-orange-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="הערות או נושאים לדיון..."
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className={isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {isSubmitting ? 'קובע מפגש...' : 'קבע מפגש'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            ביטול
          </Button>
        </div>
      </form>
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
      // Fix: Use "Sessions" (capital S) to match your collection name
      await updateDoc(doc(db, "Sessions", session.id), {
        status: "completed",
        sessionSummary: summary,
        completedAt: serverTimestamp()
      });
      
      console.log("Session marked as completed:", session.id);
      onSubmit?.();
      onClose();
    } catch (error) {
      console.error("Error completing session:", error);
      setError("אירעה שגיאה בעדכון המפגש. נא לנסות שוב.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-4 rounded-lg border border-orange-200 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-orange-800">סיום מפגש</h3>
          <button 
            onClick={onClose}
            className="text-orange-400 hover:text-orange-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-orange-50 rounded-lg">
          <p className="text-sm text-orange-700">
            <strong>מפגש:</strong> {new Date(session.scheduledTime).toLocaleString('he-IL', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <p className="text-sm text-orange-700">
            <strong>משך:</strong> {session.durationMinutes} דקות
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-2 rounded-md mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-1">
              <MessageCircle className="inline-block w-4 h-4 ml-1" />
              סיכום המפגש (לא חובה)
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-orange-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="תאר בקצרה את מה שנעשה במפגש..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className={isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {isSubmitting ? 'מעדכן...' : 'סמן כהושלם'}
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

function SessionModal({ title, sessions, onClose, showCompletionButton = false, readOnly = false }) {
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

  const handleSessionCompletion = () => {
    setSessionToComplete(null); // Reset after completion
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

                {/* Show completion button for past sessions that aren't completed */}
                {showCompletionButton && 
                 session.scheduledTime < now && 
                 session.status !== 'completed' &&
                 !readOnly && (
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