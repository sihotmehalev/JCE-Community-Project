// VolunteerDashboard.jsx
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
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { Button } from "./ui/button";

/* ────────────────────────── helpers ────────────────────────── */

// one-shot fetch of a requester's public profile
const fetchRequester = async (uid) => {
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
  const [volProfile, setVolProfile]   = useState({});
  const [personal, setPersonal]       = useState(true);
  const [direct, setDirect]           = useState([]);
  const [pool, setPool]               = useState([]);
  const [matches, setMatches]         = useState([]);
  const [activeMatchId, setActiveMatchId] = useState(null);
  const [messages, setMessages]       = useState([]);
  const [newMsg, setNewMsg]           = useState("");
  const [userData, setUserData]        = useState(null);

  /* listener refs */
  const unsubDirect = useRef(null);
  const unsubPool   = useRef(null);
  const unsubMatch  = useRef(null);
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
            approved: false,
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
        collection(db, "matches"),
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

      // open pool
      unsubPool.current = onSnapshot(
        query(
          collection(db, "Requests"),
          where("volunteerId", "in", [null, ""]),
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
          setPool(arr);
        }
      );
    } else {
      unsubDirect.current?.(); unsubDirect.current = null; setDirect([]);
      unsubPool.current?.();   unsubPool.current   = null; setPool([]);
    }

    return () => {
      unsubMatch.current?.();
      unsubDirect.current?.();
      unsubPool.current?.();
    };
  }, [personal, loading, user]);

  /* -------- handlers -------- */
  const flipPersonal = async () => {
    if (!user) return;
    const newVal = !personal;
    setPersonal(newVal); // optimistic
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
    } else if (action === "decline") {
      await updateDoc(ref, { status: "declined" });
    } else if (action === "take") {
      await updateDoc(ref, {
        volunteerId: user.uid,
        senderRole:  "volunteer",
        status:      "waiting_for_admin_approval",
      });
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

  /* -------- render -------- */
  if (!authChecked || loading) {
    return <p className="p-6 text-orange-700">…טוען לוח מתנדב</p>;
  }

  return (
    <div className="p-6">
      {/* header + toggle */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-orange-800">
          שלום {userData?.fullName?.split(' ')[0] || ''} 👋
        </h1>
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
      </div>

      {/* personal mode */}
      {personal && (
        <>
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
        </>
      )}

      {/* matches */}
      <Section title="שיבוצים פעילים" empty="אין שיבוצים פעילים">
        {matches.map((m) => (
          <MatchCard
            key={m.id}
            match={m}
            onOpenChat={() => openChat(m.id)}
          />
        ))}
      </Section>

      {/* chat */}
      {activeMatchId && (
        <ChatPanel
          messages={messages}
          newMsg={newMsg}
          setNewMsg={setNewMsg}
          onSend={sendMessage}
        />
      )}
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
  return (
    <div className="border border-orange-100 bg-orange-100 rounded-lg p-4">
      <p className="font-semibold text-orange-800 text-lg mb-1">
        {requester?.fullName || "פונה ללא שם"}
      </p>
      <p className="text-orange-700 text-sm mb-2">
        גיל: {requester?.age ?? "—"} · מגדר: {requester?.gender ?? "—"}
      </p>
      <p className="text-orange-700 mb-3 truncate">
        סיבה: {requester?.reason ?? "—"}
      </p>

      {variant === "direct" ? (
        <div className="flex gap-2">
          <Button onClick={() => onAction(req, "accept")}>אשר</Button>
          <Button variant="outline" onClick={() => onAction(req, "decline")}>
            דחה
          </Button>
        </div>
      ) : (
        <Button onClick={() => onAction(req, "take")}>קח פונה זה</Button>
      )}
    </div>
  );
}

function MatchCard({ match, onOpenChat }) {
  const { requester } = match;
  return (
    <div className="border border-orange-100 bg-white rounded-lg p-4 flex justify-between items-center">
      <div>
        <p className="font-semibold text-orange-800 text-lg mb-1">
          {requester?.fullName || "פונה ללא שם"}
        </p>
        <p className="text-orange-700 text-sm">
          סשנים שהושלמו: {match.totalSessions ?? 0}
        </p>
      </div>
      <Button onClick={onOpenChat}>💬 פתח שיחה</Button>
    </div>
  );
}

function ChatPanel({ messages, newMsg, setNewMsg, onSend }) {
  const bottomRef = useRef(null);

  // auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="mt-8 border-t border-orange-200 pt-4">
      <h2 className="text-xl font-bold mb-3 text-orange-800">שיחה</h2>

      <div className="h-64 overflow-y-scroll bg-orange-100 border border-orange-100 rounded-lg p-3 mb-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.senderId === auth.currentUser.uid ? "text-right" : "text-left"
            }
          >
            <span
              className={`inline-block rounded-lg px-3 py-1 my-1 max-w-[80%] ${
                m.senderId === auth.currentUser.uid
                  ? "bg-orange-600 text-white"
                  : "bg-white border border-orange-100"
              }`}
            >
              {m.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border border-orange-200 rounded-md px-3 py-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
          placeholder="כתוב הודעה..."
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
        />
        <Button onClick={onSend}>שלח</Button>
      </div>
    </div>
  );
}
