import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { User, Calendar, Clock, MessageCircle, Plus, X, Phone, Heart } from "lucide-react";
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
  arrayUnion,
} from "firebase/firestore";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import LoadingSpinner from "../ui/LoadingSpinner";
import ChatPanel from "../ui/ChatPanel";
import CustomAlert from "../ui/CustomAlert";

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

    if (personal) {
      unsubDirect.current = onSnapshot(query(collection(db, "Requests"), where("volunteerId", "==", user.uid), where("status", "==", "waiting_for_first_approval")), async (snap) => {
        const arr = await Promise.all(snap.docs.map(async d => {
          const rqData = d.data();
          if (rqData.declinedVolunteers?.includes(user.uid)) return null;
          const rqUser = await fetchRequester(rqData.requesterId);
          return (rqUser && rqUser.personal === true) ? { id: d.id, ...rqData, requester: rqUser } : null;
        }));
        setDirect(arr.filter(Boolean));
      });
      unsubAdminApproval.current = onSnapshot(query(collection(db, "Requests"), where("volunteerId", "==", user.uid), where("status", "==", "waiting_for_admin_approval")), async (snap) => {
        const arr = await Promise.all(snap.docs.map(async d => {
          const rqData = d.data();
          const rqUser = await fetchRequester(rqData.requesterId);
          return rqUser ? { id: d.id, ...rqData, requester: rqUser } : null;
        }));
        setAdminApprovalRequests(arr.filter(Boolean));
      });
      unsubPool.current = onSnapshot(query(collection(db, "Requests"), where("volunteerId", "==", null), where("status", "==", "waiting_for_first_approval")), async (snap) => {
        const arr = await Promise.all(snap.docs.map(async d => {
          const rqData = d.data();
          if (rqData.declinedVolunteers?.includes(user.uid)) return null;
          const rqUser = await fetchRequester(rqData.requesterId);
          return (rqUser && rqUser.personal === false) ? { id: d.id, ...rqData, requester: rqUser } : null;
        }));
        setPool(arr.filter(Boolean));
      });
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
        setAlertMessage({ message: "הבקשה התקבלה בהצלחה", type: "success" });
        setDirect(direct.filter(r => r.id !== req.id));
        setAdminApprovalRequests([...adminApprovalRequests, { ...req, status: "waiting_for_admin_approval" }]);
      } else if (action === "decline") {
        await updateDoc(ref, { declinedVolunteers: arrayUnion(user.uid), volunteerId: null, initiatedBy: null, });
        setAlertMessage({ message: "הבקשה נדחתה בהצלחה", type: "success" });
        setDirect(direct.filter(r => r.id !== req.id));
      } else if (action === "take") {
        await updateDoc(ref, { volunteerId: user.uid, initiatedBy: user.uid, status: "waiting_for_admin_approval", });
        setAlertMessage({ message: "הבקשה נלקחה בהצלחה", type: "success" });
        setPool(pool.filter(r => r.id !== req.id));
        setAdminApprovalRequests([...adminApprovalRequests, { ...req, volunteerId: user.uid, initiatedBy: user.uid, status: "waiting_for_admin_approval" }]);
      } else if (action === "withdraw") {
        await updateDoc(ref, { declinedVolunteers: arrayUnion(user.uid), volunteerId: null, initiatedBy: null, status: "waiting_for_first_approval", });
        setAlertMessage({ message: "הבקשה בוטלה בהצלחה", type: "success" });
        setAdminApprovalRequests(adminApprovalRequests.filter(r => r.id !== req.id));
      }
    } catch (error) {
      console.error("[DEBUG] Error in handleRequestAction:", error);
      setAlertMessage({ message: "אירעה שגיאה בביצוע הפעולה. אנא נסה שוב", type: "error" });
    }
  };

  const openChat = (matchId) => {
    setActiveMatchId(matchId);
    unsubChat.current?.();
    unsubChat.current = onSnapshot(
      query(
        collection(db, "conversations", matchId, "messages"),
        orderBy("createdAt", "asc")
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
    setSelectedMatch(null);
    setShowScheduleModal(false);
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
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-orange-800">שלום {userData?.fullName?.split(' ')[0] || ''} 👋</h1>
        <Button variant="outline" className="mr-2" onClick={() => window.location.href = '/profile'}>הפרופיל שלי</Button>
        <div className="flex-1" />
        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm text-orange-700">זמין</span>
          <button onClick={toggleAvailability} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none ring-2 ring-orange-400 ring-offset-2 ${isAvailable ? 'bg-green-600 border-green-400' : 'bg-gray-200 border-orange-400'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform border-2 border-orange-400 ${isAvailable ? '-translate-x-1' : '-translate-x-6'}`} />
          </button>
          <span className="text-sm text-orange-700">לא זמין</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-orange-700">בחירה עצמית</span>
          <button onClick={flipPersonal} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none ring-2 ring-orange-400 ring-offset-2 ${personal ? 'bg-orange-600 border-orange-400' : 'bg-gray-200 border-orange-400'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform border-2 border-orange-400 ${personal ? '-translate-x-1' : '-translate-x-6'}`} />
          </button>
          <span className="text-sm text-orange-700">שיוך ע״י מנהל</span>
        </div>
      </div>
      <Card className="mb-6">
        <div className="flex border-b border-gray-200">
          {personal && (
            <>
              <button onClick={() => setActiveTab("directRequests")} className={`flex-1 p-4 text-center font-medium text-sm focus:outline-none ${activeTab === "directRequests" ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>בקשות ישירות ({direct.length})</button>
              <button onClick={() => setActiveTab("openRequests")} className={`flex-1 p-4 text-center font-medium text-sm focus:outline-none ${activeTab === "openRequests" ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>דפדוף בפונים פתוחים ({pool.length})</button>
              <button onClick={() => setActiveTab("adminApproval")} className={`flex-1 p-4 text-center font-medium text-sm focus:outline-none ${activeTab === "adminApproval" ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>בקשות ממתינות לאישור מנהל ({adminApprovalRequests.length})</button>
            </>
          )}
          <button onClick={() => setActiveTab("activeMatches")} className={`flex-1 p-4 text-center font-medium text-sm focus:outline-none ${activeTab === "activeMatches" ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>שיבוצים פעילים ({matches.length})</button>
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
      />
      {showScheduleModal && selectedMatch && (<SessionScheduler match={selectedMatch} onClose={closeScheduleModal} handleScheduleSession={handleScheduleSession} />)}
      <CustomAlert message={alertMessage?.message} onClose={() => setAlertMessage(null)} type={alertMessage?.type} />
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
    if (Array.isArray(value)) return value.filter(v => v !== "אחר").join(", ");
    return value;
  };
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
        <div className="bg-white/60 rounded-lg p-3 border border-orange-100"><div className="flex items-center gap-2 mb-2"><Calendar className="w-4 h-4 text-orange-600" /><h4 className="font-semibold text-orange-800 text-sm">תדירות</h4></div><p className="text-orange-700 text-sm">{formatList(requester?.frequency)}</p></div>
        <div className="bg-white/60 rounded-lg p-3 border border-orange-100"><div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-orange-600" /><h4 className="font-semibold text-orange-800 text-sm">זמנים מועדפים</h4></div><p className="text-orange-700 text-sm">{formatList(requester?.preferredTimes)}</p></div>
        <div className="bg-white/60 rounded-lg p-3 border border-orange-100"><div className="flex items-center gap-2 mb-2"><Phone className="w-4 h-4 text-orange-600" /><h4 className="font-semibold text-orange-800 text-sm">העדפת שיחה</h4></div><p className="text-orange-700 text-sm">{formatList(requester?.chatPref)}</p></div>
        <div className="bg-white/60 rounded-lg p-3 border border-orange-100"><div className="flex items-center gap-2 mb-2"><Heart className="w-4 h-4 text-orange-600" /><h4 className="font-semibold text-orange-800 text-sm">העדפה למתנדב</h4></div><p className="text-orange-700 text-sm">{formatList(requester?.volunteerPrefs)}</p></div>
      </div>
      {variant === "direct" ? <div className="flex gap-2 mt-4 pt-4 border-t border-orange-200"><Button onClick={() => onAction(req, "accept")}>אשר</Button><Button variant="outline" onClick={() => onAction(req, "decline")}>דחה</Button></div> : variant === "admin_approval" ? <div className="flex gap-2 mt-4 pt-4 border-t border-orange-200"><Button variant="destructive" onClick={() => onAction(req, "withdraw")}>בטל בקשה</Button></div> : <div className="mt-4 pt-4 border-t border-orange-200"><Button onClick={() => onAction(req, "take")}>קח פונה זה</Button></div>}
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
    return onSnapshot(query(sessionsRef, where("matchId", "==", match.id), orderBy("scheduledTime", "asc")), (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), scheduledTime: doc.data().scheduledTime?.toDate() })));
    });
  }, [match.id]);

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
      <div className="flex items-start justify-between mb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center"><User className="w-6 h-6 text-orange-600" /></div><div><h3 className="font-bold text-orange-900 text-xl mb-1">{requester?.fullName || "פונה ללא שם"}</h3><div className="flex items-center gap-4 text-sm text-orange-700"><span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-400 rounded-full"></span>גיל: {requester?.age ?? "—"}</span><span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-400 rounded-full"></span>מגדר: {requester?.gender ?? "—"}</span><span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-400 rounded-full"></span>טלפון: {requester?.phone ?? "—"}</span></div></div></div></div>
      <div className="flex gap-2 flex-wrap">
        <Button onClick={isChatOpen ? onCloseChat : onOpenChat}>{isChatOpen ? "סגור שיחה" : "💬 פתח שיחה"}</Button>
        <Button variant="outline" onClick={() => setShowScheduleModal(true)} className="flex items-center gap-2"><Plus className="w-4 h-4" />קבע מפגש</Button>
        {upcomingSessions.length > 0 && (<Button variant="outline" onClick={() => setShowUpcomingSessionsModal(true)} className="flex items-center gap-2">מפגשים מתוכננים ({upcomingSessions.length})</Button>)}
        {pastSessionsNeedingCompletionCount > 0 && (<Button variant="outline" onClick={() => setShowPastSessionsModal(true)} className="flex items-center gap-2 border-orange-500 text-orange-600 hover:bg-orange-50">מפגשים להשלמה ({pastSessionsNeedingCompletionCount})</Button>)}
        {completedSessions.length > 0 && (<Button variant="outline" onClick={() => setShowCompletedSessionsModal(true)} className="flex items-center gap-2">מפגשים שהושלמו ({completedSessions.length})</Button>)}
      </div>
      {showScheduleModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><SessionScheduler match={match} onClose={() => setShowScheduleModal(false)} handleScheduleSession={handleScheduleSession} /></div>)}
      {showUpcomingSessionsModal && (<SessionModal title="מפגשים מתוכננים" sessions={upcomingSessions} onClose={() => setShowUpcomingSessionsModal(false)} />)}
      {showPastSessionsModal && (<SessionModal title="מפגשים להשלמה" sessions={pastSessions} onClose={() => setShowPastSessionsModal(false)} showCompletionButton={true} />)}
      {showCompletedSessionsModal && (<SessionModal title="מפגשים שהושלמו" sessions={completedSessions} onClose={() => setShowCompletedSessionsModal(false)} readOnly={true} />)}
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
    if (!scheduledTime) { setError("נא לבחור זמן למפגש"); return; }
    setIsSubmitting(true);
    setError(null);
    await handleScheduleSession({ match, scheduledTime, duration, location, notes, onSuccess: () => onClose(), onError: (error) => { setError("אירעה שגיאה בקביעת המפגש. נא לנסות שוב."); console.error(error); } });
    setIsSubmitting(false);
  };

  const durationOptions = [{ value: 30, label: "30 דקות" }, { value: 45, label: "45 דקות" }, { value: 60, label: "שעה" }, { value: 90, label: "שעה וחצי" }];
  const locationOptions = [{ value: "video", label: "שיחת וידאו" }, { value: "phone", label: "שיחת טלפון" }, { value: "in_person", label: "פגישה פיזית" }];

  return (
    <div className="bg-white p-6 rounded-lg border border-orange-200 shadow-lg max-w-md w-full">
      <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-semibold text-orange-800">קביעת מפגש חדש</h3><button onClick={onClose} className="text-orange-400 hover:text-orange-600"><X className="w-5 h-5" /></button></div>
      {error && <div className="bg-red-50 text-red-600 p-2 rounded-md mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium text-orange-700 mb-1"><Calendar className="inline-block w-4 h-4 ml-1" />תאריך ושעה</label><input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full rounded-md border border-orange-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-400" required /></div>
        <div><label className="block text-sm font-medium text-orange-700 mb-1"><Clock className="inline-block w-4 h-4 ml-1" />משך המפגש</label><select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full rounded-md border border-orange-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-400">{durationOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-orange-700 mb-1"><MessageCircle className="inline-block w-4 h-4 ml-1" />אופן המפגש</label><select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-md border border-orange-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-400">{locationOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-orange-700 mb-1"><MessageCircle className="inline-block w-4 h-4 ml-1" />הערות למפגש</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-md border border-orange-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="הערות או נושאים לדיון..." /></div>
        <div className="flex gap-2 pt-2"><Button type="submit" disabled={isSubmitting} className={isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}>{isSubmitting ? 'קובע מפגש...' : 'קבע מפגש'}</Button><Button type="button" variant="outline" onClick={onClose}>ביטול</Button></div>
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
      await updateDoc(doc(db, "Sessions", session.id), { status: "completed", sessionSummary: summary, completedAt: serverTimestamp() });
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
        <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-semibold text-orange-800">סיום מפגש</h3><button onClick={onClose} className="text-orange-400 hover:text-orange-600"><X className="w-5 h-5" /></button></div>
        <div className="mb-4 p-3 bg-orange-50 rounded-lg"><p className="text-sm text-orange-700"><strong>מפגש:</strong> {new Date(session.scheduledTime).toLocaleString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p><p className="text-sm text-orange-700"><strong>משך:</strong> {session.durationMinutes} דקות</p></div>
        {error && <div className="bg-red-50 text-red-600 p-2 rounded-md mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-orange-700 mb-1"><MessageCircle className="inline-block w-4 h-4 ml-1" />סיכום המפגш (לא חובה)</label><textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} className="w-full rounded-md border border-orange-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="תאר בקצרה את מה שנעשה במפגש..." /></div>
          <div className="flex gap-2 pt-2"><Button type="submit" disabled={isSubmitting} className={isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}>{isSubmitting ? 'מעדכן...' : 'סמן כהושלם'}</Button><Button type="button" variant="outline" onClick={onClose}>ביטול</Button></div>
        </form>
      </div>
    </div>
  );
}

function SessionModal({ title, sessions, onClose, showCompletionButton = false, readOnly = false }) {
  const [sessionToComplete, setSessionToComplete] = useState(null);
  const now = new Date();
  const formatSessionTime = (date) => date ? new Date(date).toLocaleString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "—";
  const getSessionStatusColor = (session) => {
    if (session.status === 'completed') return 'bg-green-50 border-green-100';
    if (session.scheduledTime < now && session.status !== 'completed') return 'bg-orange-100 border-orange-200';
    return 'bg-orange-50 border-orange-100';
  };
  const getLocationIcon = (location) => {
    switch (location) {
      case 'video': return '🎥';
      case 'phone': return '📱';
      case 'in_person': return '🤝';
      default: return '📅';
    }
  };
  const handleSessionCompletion = () => setSessionToComplete(null);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-4 rounded-lg border border-orange-200 max-w-md w-full">
        <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-semibold text-orange-800">{title}</h3><button onClick={onClose} className="text-orange-400 hover:text-orange-600"><X className="w-5 h-5" /></button></div>
        {sessions.length === 0 ? <p className="text-center text-orange-500 py-4">אין מפגשים זמינים להצגה.</p> : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {sessions.map(session => (
              <div key={session.id} className={`p-3 rounded-md text-sm transition-colors ${getSessionStatusColor(session)}`}>
                <div className="font-medium text-orange-800 flex items-center justify-between"><span>{formatSessionTime(session.scheduledTime)}</span>{session.status === 'completed' && <span className="text-green-600 text-xs bg-green-100 px-2 py-1 rounded-full">הושלם</span>}</div>
                <div className="text-orange-600 mt-1">{getLocationIcon(session.location)}{' '}{session.location === 'video' ? 'שיחת וידאו' : session.location === 'phone' ? 'שיחת טלפון' : 'פגישה פיזית'}{' • '}{session.durationMinutes} דקות</div>
                {session.notes && <div className="mt-2 text-orange-500 bg-white/50 p-2 rounded"><strong>הערות:</strong> {session.notes}</div>}
                {session.status === 'completed' && session.sessionSummary && <div className="mt-2 text-gray-600 bg-white/80 p-2 rounded border border-orange-100"><strong>סיכום המפגש:</strong> {session.sessionSummary}</div>}
                {showCompletionButton && session.scheduledTime < now && session.status !== 'completed' && !readOnly && <div className="mt-2"><Button variant="outline" onClick={() => setSessionToComplete(session)} className="w-full border-orange-400 text-orange-600 hover:bg-orange-50">סמן כהושלם והוסף סיכום</Button></div>}
              </div>
            ))}
          </div>
        )}
        {sessionToComplete && <SessionCompletionModal session={sessionToComplete} onClose={() => setSessionToComplete(null)} onSubmit={handleSessionCompletion} />}
      </div>
    </div>
  );
}