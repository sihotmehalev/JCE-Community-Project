import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { auth, db } from "../../config/firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  getDocs // Import getDocs for the clear all function
} from "firebase/firestore";
import { Bell } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setRole(null);
      if (firebaseUser) {
        const uid = firebaseUser.uid;
        let userRef = doc(db, "Users", "Info", "Admins", "Level", "FirstLevel", uid);
        let snap = await getDoc(userRef);
        if (snap.exists()) { setRole("admin-first"); return; }
        
        userRef = doc(db, "Users", "Info", "Admins", "Level", "SecondLevel", uid);
        snap = await getDoc(userRef);
        if (snap.exists()) { setRole("admin-second"); return; }
        
        userRef = doc(db, "Users", "Info", "Volunteers", uid);
        snap = await getDoc(userRef);
        if (snap.exists()) { setRole("volunteer"); return; }
        
        userRef = doc(db, "Users", "Info", "Requesters", uid);
        snap = await getDoc(userRef);
        if (snap.exists()) { setRole("requester"); return; }
      }
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setRole(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) {
        setNotifications([]); // Clear notifications on logout
        return;
    };
    const q = query(collection(db, "notifications"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsubscribeNotif = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Error listening to notifications:", error));
    return () => unsubscribeNotif();
  }, [user]);

  const markAllRead = async () => {
    if (notifications.filter(n => !n.read).length === 0) return;
    const batch = writeBatch(db);
    notifications.filter((n) => !n.read).forEach((n) => {
      batch.update(doc(db, "notifications", n.id), { read: true });
    });
    await batch.commit();
  };

  const clearAllNotifications = async () => {
    if (!user || notifications.length === 0) return;

    const batch = writeBatch(db);
    const q = query(collection(db, "notifications"), where("userId", "==", user.uid));
    
    try {
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        setNotifOpen(false); // Close dropdown after clearing
    } catch (error) {
        console.error("Error clearing all notifications:", error);
    }
  };

  let dashboardLink = "/";
  if (role === "admin-first" || role === "admin-second") dashboardLink = "/admin-dashboard";
  else if (role === "volunteer") dashboardLink = "/volunteer-dashboard";
  else if (role === "requester") dashboardLink = "/requester-dashboard";

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <nav className="bg-white/20 backdrop-blur-sm shadow-lg px-4 py-2 flex-row-reverse justify-between items-center sticky top-0 z-50 flex">
      <div className="flex items-start gap-4">
        {user && (
          <div className="relative mt-6" ref={notifRef}>
            <button onClick={() => { setNotifOpen(!notifOpen); if(!notifOpen) markAllRead(); }} className="text-orange-600 hover:text-orange-700 focus:outline-none">
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-4 h-4 flex items-center justify-center">{unreadCount}</span>}
            </button>
            {notifOpen && (
              <div className="absolute left-0 mt-2 bg-white shadow-lg rounded-md p-2 z-[9999] w-60 max-h-80 overflow-y-auto flex flex-col">
                {notifications.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">אין התראות</div>
                ) : (
                  <>
                    <div className="flex-grow overflow-y-auto">
                      {notifications.map((n) => (
                        <Link
                          key={n.id}
                          to={n.link || '#'}
                          onClick={() => setNotifOpen(false)}
                          className="block py-2 px-3 hover:bg-gray-100 rounded-md cursor-pointer"
                        >
                          <p className="text-sm">{n.message}</p>
                          <p className="text-xs text-gray-400">
                            {n.createdAt?.toDate() ? new Date(n.createdAt.toDate()).toLocaleString("he-IL") : ""}
                          </p>
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-gray-200 mt-2 pt-2">
                      <div
                        onClick={clearAllNotifications}
                        className="text-center text-red-500 hover:bg-red-50 rounded-md py-1 text-sm cursor-pointer"
                      >
                        נקה הכל
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        <Link to="/" className="flex-shrink-0 flex items-center space-x-2 rtl:space-x-reverse">
          <img src="/images/logo.png" alt="שיחות מהלב Logo" className="h-16" />
        </Link>
      </div>

      <div className="space-x-4 rtl:space-x-reverse flex items-center">
        {!user ? (
          <>
            <Link to="/login" className="px-4 py-2 rounded-md border-2 border-orange-600 hover:bg-orange-600 hover:text-white transition-all duration-200">התחברות</Link>
            <div className="relative inline-block" ref={dropdownRef}>
              <button onClick={() => setIsOpen(!isOpen)} className="px-4 py-2 rounded-md border-2 border-orange-600 hover:bg-orange-600 hover:text-white transition-all duration-200">הרשמה</button>
              {isOpen && (
                <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md p-2 z-[9999] min-w-[150px]">
                  <Link to="/register-requester" className="block px-4 py-2 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200 rounded-md whitespace-nowrap" onClick={() => setIsOpen(false)}>הרשמה כפונה</Link>
                  <div className="my-1 border-t border-orange-200/60" />
                  <Link to="/register-volunteer" className="block px-4 py-2 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200 rounded-md whitespace-nowrap" onClick={() => setIsOpen(false)}>הרשמה כמתנדב</Link>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to={dashboardLink} className="px-4 py-2 rounded-md border-2 border-orange-600 hover:bg-orange-600 hover:text-white transition-all duration-200">לוח בקרה</Link>
            <Link to="/profile" className="px-4 py-2 rounded-md border-2 border-orange-600 hover:bg-orange-600 hover:text-white transition-all duration-200">פרופיל</Link>
            <button onClick={handleLogout} className="px-4 py-2 rounded-md border-2 border-orange-600 hover:bg-orange-600 hover:text-white transition-all duration-200">התנתקות</button>
          </>
        )}
        <Link to="/about" className="px-4 py-2 rounded-md border-2 border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200">אודות</Link>
        <a href="https://chat.whatsapp.com/L5kE8M2lzSj0Spr7gJKcV6" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-md border-2 border-green-600 text-green-700 hover:bg-green-600 hover:text-white transition-all duration-200"><FontAwesomeIcon icon={faWhatsapp} size="lg" /></a>
      </div>
    </nav>
  );
}