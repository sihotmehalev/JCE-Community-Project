import React, { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
  orderBy,
} from "firebase/firestore";

export default function VolunteerDashboard() {
  const [requesters, setRequesters] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    const fetchMatches = async () => {
      const q = query(
        collection(db, "matches"),
        where("volunteerId", "==", auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const requesterIds = querySnapshot.docs.map((doc) => doc.id);

      const requesterData = [];
      for (let id of requesterIds) {
        const userSnap = await getDoc(doc(db, "users", id));
        if (userSnap.exists()) {
          requesterData.push({ id, ...userSnap.data() });
        }
      }
      setRequesters(requesterData);
    };

    fetchMatches();
  }, []);

  const openChat = (requesterId) => {
    setActiveChat(requesterId);
    const q = query(
      collection(db, "messages", requesterId, auth.currentUser.uid),
      orderBy("timestamp")
    );
    onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => doc.data()));
    });
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeChat) return;

    await addDoc(collection(db, "messages", activeChat, auth.currentUser.uid), {
      text: newMessage,
      senderId: auth.currentUser.uid,
      timestamp: new Date(),
    });

    setNewMessage("");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">שלום מתנדב 🙋‍♂️</h1>

      {requesters.length === 0 ? (
        <p>לא שובצת לפונים עדיין.</p>
      ) : (
        requesters.map((r) => (
          <div
            key={r.id}
            className="border p-4 rounded mb-4 bg-white shadow flex flex-col gap-2"
          >
            <div>
              <h2 className="font-semibold text-lg">{r.fullName || "פונה ללא שם"}</h2>
              <p>אימייל: {r.email}</p>
              <p>טלפון: {r.phone || "לא סופק"}</p>
              <p>מגדר: {r.gender}</p>
              <p>גיל: {r.age}</p>
              <p>סיבת פנייה: {r.reason}</p>
            </div>
            <button
              onClick={() => openChat(r.id)}
              className="self-start bg-blue-600 text-white px-4 py-2 rounded"
            >
              💬 פתח שיחה
            </button>
          </div>
        ))
      )}

      {activeChat && (
        <div className="mt-6 border-t pt-4">
          <h2 className="text-xl font-bold mb-2">שיחה עם פונה</h2>
          <div className="bg-gray-100 rounded p-4 h-64 overflow-y-scroll mb-4">
            {messages.map((msg, index) => (
              <div key={index} className={msg.senderId === auth.currentUser.uid ? "text-right" : "text-left"}>
                <span className="block bg-white rounded p-2 my-1 inline-block">{msg.text}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="כתוב הודעה..."
              className="flex-1 border rounded px-3 py-2"
            />
            <button
              onClick={handleSend}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              שלח
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
