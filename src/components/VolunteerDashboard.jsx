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
import { Button } from "./ui/button";

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
