import React, { useState, useEffect, useRef } from 'react';
import { Button } from './button';

export default function ChatWindow({ volunteer, messages, onSendMessage, isMinimized, onToggleMinimize }) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage("");
    }
  };

  if (!volunteer) {
    return (
      <div className="fixed bottom-4 left-4 w-72 bg-white rounded-t-lg shadow-lg">
        <div className="bg-blue-600 text-white p-3 rounded-t-lg flex justify-between items-center">
          <span>צ'אט תמיכה</span>
        </div>
        <div className="p-4 text-center text-gray-500">
          אין התאמה עדיין
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 left-4 w-72 bg-white rounded-t-lg shadow-lg transition-all duration-300 ${isMinimized ? 'h-12' : 'h-96'}`}>
      <div 
        className="bg-blue-600 text-white p-3 rounded-t-lg flex justify-between items-center cursor-pointer"
        onClick={onToggleMinimize}
      >
        <span>{volunteer.fullName}</span>
        <button className="text-white hover:text-gray-200">
          {isMinimized ? '△' : '▽'}
        </button>
      </div>

      {!isMinimized && (
        <>
          <div className="h-72 overflow-y-auto p-3 bg-gray-50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-2 ${
                  msg.isRequester ? 'text-right' : 'text-left'
                }`}
              >
                <span
                  className={`inline-block rounded-lg px-3 py-2 text-sm ${
                    msg.isRequester
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {msg.text}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-2 border-t flex">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="הקלד הודעה..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm ml-2"
            />
            <Button type="submit" className="px-3 py-2 text-sm">
              שלח
            </Button>
          </form>
        </>
      )}
    </div>
  );
}