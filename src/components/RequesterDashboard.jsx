import React, { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import { Button } from "./ui/button";
import { doc, getDoc, collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";

export default function RequesterDashboard() {
  const [volunteer, setVolunteer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const fetchMatchAndVolunteer = async () => {
      const matchDoc = await getDoc(doc(db, "matches", user.uid));
      if (matchDoc.exists()) {
        const volunteerId = matchDoc.data().volunteerId;
        const volRef = await getDoc(doc(db, "users", volunteerId));
        if (volRef.exists()) setVolunteer(volRef.data());

        const msgRef = collection(db, "messages", user.uid, volunteerId);
        const q = query(msgRef, orderBy("timestamp"));
        onSnapshot(q, (snapshot) => {
          setMessages(snapshot.docs.map(doc => doc.data()));
        });
      }
    };

    fetchMatchAndVolunteer();
  }, [user]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    const matchDoc = await getDoc(doc(db, "matches", user.uid));
    const volunteerId = matchDoc.data().volunteerId;
    await addDoc(collection(db, "messages", user.uid, volunteerId), {
      text: newMessage,
      senderId: user.uid,
      timestamp: new Date()
    });
    setNewMessage("");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-orange-800">שלום 👋</h1>
      {volunteer ? (
        <div className="mb-6 bg-orange-50/50 p-4 rounded-lg border border-orange-100">
          <h2 className="text-xl font-semibold text-orange-700 mb-3">המתנדב שלך:</h2>
          <div className="space-y-2 text-orange-700">
            <p><span className="font-medium">שם:</span> {volunteer.fullName}</p>
            <p><span className="font-medium">אימייל:</span> {volunteer.email}</p>
            <p><span className="font-medium">טלפון:</span> {volunteer.phone || "לא סופק"}</p>
          </div>
        </div>
      ) : (
        <p className="text-orange-600/80 bg-orange-50/50 p-4 rounded-lg border border-orange-100">לא שובצת עדיין למתנדב.</p>
      )}

      <div className="bg-orange-50/30 rounded-lg p-4 h-64 overflow-y-scroll mb-4 border border-orange-100">
        {messages.map((msg, index) => (
          <div key={index} className={msg.senderId === user.uid ? "text-right" : "text-left"}>
            <span className={`block rounded-lg p-2 my-1 inline-block max-w-[80%] ${
              msg.senderId === user.uid 
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
  );
}
