import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { auth } from "../../firebaseConfig";

export default function ChatPanel({ isOpen, onClose, messages, newMsg, setNewMsg, onSend, chatPartnerName }) {
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[340px] flex flex-col">
      {/* Chat Window */}
      <div className="bg-white rounded-lg shadow-lg border border-orange-200 flex flex-col overflow-hidden" style={{ height: '440px' }}>
        {/* Chat Header */}
        <div className="flex justify-between items-center px-4 py-3 bg-orange-50 border-b border-orange-200">
          <h2 className="text-sm font-medium text-orange-800">
            {chatPartnerName}
          </h2>
          <button 
            onClick={onClose}
            className="text-orange-400 hover:text-orange-600 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages Area - fixed height */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-3"
          style={{ height: '350px', maxHeight: '350px' }}
        >
          <div className="space-y-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.senderId === auth.currentUser.uid ? "text-right" : "text-left"
                }
              >
                <span
                  className={`inline-block rounded-lg px-3 py-1.5 text-sm my-1 max-w-[85%] ${
                    m.senderId === auth.currentUser.uid
                      ? "bg-orange-600 text-white"
                      : "bg-gray-100 border border-gray-200"
                  }`}
                >
                  {m.text}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-orange-100 p-3 mt-auto">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              className="flex-1 border border-orange-200 rounded-md px-3 py-1.5 text-sm focus:ring-1 focus:ring-orange-400 focus:border-orange-400 outline-none"
              placeholder="כתוב הודעה..."
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSend()}
            />
            <Button 
              onClick={onSend} 
              size="sm"
              className="px-4"
            >
              שלח
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
