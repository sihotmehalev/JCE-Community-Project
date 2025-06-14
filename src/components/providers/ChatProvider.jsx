import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import ChatWindow from '../ui/ChatWindow';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [volunteer, setVolunteer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setUserRole(userDoc.data().role);
      }
    };

    const fetchMatchAndVolunteer = async () => {
      const matchDoc = await getDoc(doc(db, "matches", user.uid));
      if (matchDoc.exists()) {
        const volunteerId = matchDoc.data().volunteerId;
        const volRef = await getDoc(doc(db, "users", volunteerId));
        if (volRef.exists()) setVolunteer(volRef.data());

        const msgRef = collection(db, "messages", user.uid, volunteerId);
        const q = query(msgRef, orderBy("timestamp"));
        onSnapshot(q, (snapshot) => {
          setMessages(snapshot.docs.map(doc => ({
            ...doc.data(),
            isRequester: doc.data().senderId === user.uid
          })));
        });
      }
    };

    fetchUserData();
    fetchMatchAndVolunteer();
  }, [user]);

  const handleSendMessage = async (text) => {
    if (!volunteer || !user) return;
    const matchDoc = await getDoc(doc(db, "matches", user.uid));
    const volunteerId = matchDoc.data().volunteerId;
    await addDoc(collection(db, "messages", user.uid, volunteerId), {
      text,
      senderId: user.uid,
      timestamp: new Date()
    });
  };

  const value = {
    volunteer,
    messages,
    isChatMinimized,
    setIsChatMinimized
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
      {user && userRole === 'requester' && (
        <ChatWindow
          volunteer={volunteer}
          messages={messages}
          onSendMessage={handleSendMessage}
          isMinimized={isChatMinimized}
          onToggleMinimize={() => setIsChatMinimized(!isChatMinimized)}
        />
      )}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};