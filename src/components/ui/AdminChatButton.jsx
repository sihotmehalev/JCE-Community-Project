import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

export default function AdminChatButton({
  conversationId,
  onClick,
  currentUserId,
  otherUserId,
  isDisabled = false,
  className = ""
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!conversationId || !currentUserId || !otherUserId) {
        setUnreadCount(0);
        return;
    }

    const messagesRef = collection(db, "conversations", conversationId, "messages");

    const q = query(
      messagesRef,
      where("senderId", "==", otherUserId),
      where("seenByOther", "==", false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (error) => {
        console.error("Error fetching unread count for admin chat:", error);
        setUnreadCount(0);
    });

    return () => unsubscribe();
  }, [conversationId, currentUserId, otherUserId]);

  const buttonClasses = `relative p-2 rounded-full focus:outline-none transition-colors duration-200 flex items-center justify-center mx-auto ${isDisabled ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "text-blue-600 hover:text-white hover:bg-blue-600"} ${className}`;

  return (
    <button onClick={onClick} className={buttonClasses} disabled={isDisabled} title="פתח צ'אט עם המשתמש">
        {/* Envelope (letter) icon for chat */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center min-w-[16px]">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
} 