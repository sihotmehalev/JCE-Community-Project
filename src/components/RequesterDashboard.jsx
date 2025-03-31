import React, { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
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
      <h1 className="text-2xl font-bold mb-4">שלום 👋</h1>
      {volunteer ? (
        <div className="mb-6">
          <h2 className="text-xl font-semibold">המתנדב שלך:</h2>
          <p>שם: {volunteer.fullName}</p>
          <p>אימייל: {volunteer.email}</p>
          <p>טלפון: {volunteer.phone || "לא סופק"}</p>
        </div>
      ) : (
        <p>לא שובצת עדיין למתנדב.</p>
      )}

      <div className="bg-gray-100 rounded p-4 h-64 overflow-y-scroll mb-4">
        {messages.map((msg, index) => (
          <div key={index} className={msg.senderId === user.uid ? "text-right" : "text-left"}>
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
        <button onClick={handleSend} className="bg-blue-600 text-white px-4 py-2 rounded">
          שלח
        </button>
      </div>
    </div>
  );
}
