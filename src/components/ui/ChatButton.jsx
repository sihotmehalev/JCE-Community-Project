import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

export default function ChatButton({
  conversationId,
  onClick,
  children,
  currentUserId,
  otherUserId,
  variant, // Prop for styling (e.g., "outline")
  className = ""
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  // This log will run on every render
  console.log("ChatButton Props:", { conversationId, currentUserId, otherUserId });

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
      console.log(`Unread count for ${conversationId}: ${snapshot.size}`); // Let's log when we get data
      setUnreadCount(snapshot.size);
    }, (error) => {
        console.error(`Error fetching unread count for convo ${conversationId}:`, error);
        setUnreadCount(0);
    });

    return () => unsubscribe();
  }, [conversationId, currentUserId, otherUserId]);

  return (
    <Button onClick={onClick} variant={variant} className={`relative ${className}`}>
      {children}
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Button>
  );
}