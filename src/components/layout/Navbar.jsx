import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  getDocs
} from "firebase/firestore";
import { Bell, Menu, X } from "lucide-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

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
      if (isMobileMenuOpen && !e.target.closest('nav')) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen]);

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

  // Handler for notification click - now with a slight delay for navigation
  const handleNotificationClick = (link) => {
    setNotifOpen(false); // Close notification dropdown immediately
    // Add a small delay before navigating to ensure the dropdown UI has time to update/close
    setTimeout(() => {
      if (link) {
        navigate(link); // Use navigate for programmatic routing
      }
    }, 50); // A small delay, e.g., 50ms, can be adjusted
  };

  return (
    <nav className="bg-white/20 backdrop-blur-sm shadow-lg sticky top-0 z-50" dir="rtl">
      <div className="container mx-auto px-4 flex justify-between items-center py-2">
        {/* Right side: Desktop Nav (appears on the right due to dir="rtl" on parent, content is RTL) */}
        <div className="hidden md:flex items-center space-x-4 rtl:space-x-reverse">
          {/* Order these from right to left in JSX to achieve desired visual order from right to left */}
          {!user ? (
            <>
              {/* Login is the rightmost item */}
              <Link to="/login" className="px-4 py-2 rounded-md border-2 border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200">התחברות</Link>
              {/* Register is next */}
              <div className="relative inline-block" ref={dropdownRef}>
                <button onClick={() => setIsOpen(!isOpen)} className="px-4 py-2 rounded-md border-2 border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200">הרשמה</button>
                {isOpen && (
                  <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-md p-2 z-[9999] min-w-[150px]" dir="rtl">
                    <Link to="/register-requester" className="block px-4 py-2 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200 rounded-md whitespace-nowrap" onClick={() => setIsOpen(false)}>הרשמה כפונה</Link>
                    <div className="my-1 border-t border-orange-200/60" />
                    <Link to="/register-volunteer" className="block px-4 py-2 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200 rounded-md whitespace-nowrap" onClick={() => setIsOpen(false)}>הרשמה כמתנדב</Link>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Dashboard is the rightmost item */}
              <Link to={dashboardLink} className="px-4 py-2 rounded-md border-2 border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200">לוח בקרה</Link>
              {/* Logout is next */}
              <button onClick={handleLogout} className="px-4 py-2 rounded-md border-2 border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200">התנתקות</button>
            </>
          )}
          {/* About is next */}
          <Link to="/about" className="px-4 py-2 rounded-md border-2 border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200">אודות</Link>
          {/* Events is next */}
          <Link to="/events" className="px-4 py-2 rounded-md border-2 border-orange-600 text-orange-700 hover:bg-orange-600 hover:text-white transition-all duration-200">אירועים</Link>
          {/* Whatsapp is the leftmost item */}
          <a href="https://chat.whatsapp.com/L5kE8M2lzSj0Spr7gJKcV6" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-md border-2 border-green-600 text-green-700 hover:bg-green-600 hover:text-white transition-all duration-200"><FontAwesomeIcon icon={faWhatsapp} size="lg" /></a>
        </div>

        {/* Left side: Logo + Notifications (desktop) - Appears on the left due to dir="rtl" on parent */}
        <div className="flex items-center gap-4" dir="ltr">
          <Link to="/" className="flex-shrink-0">
            <img src="/images/logo.png" alt="שיחות מהלב Logo" className="h-16" />
          </Link>
          {user && (
            <div className="relative hidden md:block" ref={notifRef} dir="ltr">
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
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n.link)} // Use new handler
                            className="block py-2 px-3 hover:bg-gray-100 rounded-md cursor-pointer"
                          >
                            <p className="text-sm">{n.message}</p>
                            <p className="text-xs text-gray-400">
                              {n.createdAt?.toDate() ? new Date(n.createdAt.toDate()).toLocaleString("he-IL") : ""}
                            </p>
                          </div>
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
        </div>

        {/* Mobile Hamburger & Bell (always on the left for mobile) */}
        <div className="md:hidden flex items-center gap-4" dir="ltr">
          {user && (
            <div className="relative" ref={notifRef}>
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
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n.link)} // Use new handler
                            className="block py-2 px-3 hover:bg-gray-100 rounded-md cursor-pointer"
                          >
                            <p className="text-sm">{n.message}</p>
                            <p className="text-xs text-gray-400">
                              {n.createdAt?.toDate() ? new Date(n.createdAt.toDate()).toLocaleString("he-IL") : ""}
                            </p>
                          </div>
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
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-orange-600 hover:text-orange-700 focus:outline-none">
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden" dir="rtl">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 text-right">
            {!user ? (
              <>
                <Link to="/login" className="block px-3 py-2 rounded-md text-base font-medium text-orange-700 hover:text-white hover:bg-orange-600" onClick={() => setIsMobileMenuOpen(false)}>התחברות</Link>
                <Link to="/register-requester" className="block px-3 py-2 rounded-md text-base font-medium text-orange-700 hover:text-white hover:bg-orange-600" onClick={() => setIsMobileMenuOpen(false)}>הרשמה כפונה</Link>
                <Link to="/register-volunteer" className="block px-3 py-2 rounded-md text-base font-medium text-orange-700 hover:text-white hover:bg-orange-600" onClick={() => setIsMobileMenuOpen(false)}>הרשמה כמתנדב</Link>
              </>
            ) : (
              <>
                <Link to={dashboardLink} className="block px-3 py-2 rounded-md text-base font-medium text-orange-700 hover:text-white hover:bg-orange-600" onClick={() => setIsMobileMenuOpen(false)}>לוח בקרה</Link>
                <button onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="block w-full text-right px-3 py-2 rounded-md text-base font-medium text-orange-700 hover:text-white hover:bg-orange-600">התנתקות</button>
              </>
            )}
            <Link to="/about" className="block px-3 py-2 rounded-md text-base font-medium text-orange-700 hover:text-white hover:bg-orange-600" onClick={() => setIsMobileMenuOpen(false)}>אודות</Link>
            <Link to="/events" className="block px-3 py-2 rounded-md text-base font-medium text-orange-700 hover:text-white hover:bg-orange-600" onClick={() => setIsMobileMenuOpen(false)}>אירועים</Link>
            <a href="https://chat.whatsapp.com/L5kE8M2lzSj0Spr7gJKcV6" target="_blank" rel="noopener noreferrer" className="flex items-center justify-end gap-2 px-3 py-2 rounded-md text-base font-medium text-green-700 hover:text-white hover:bg-green-600" onClick={() => setIsMobileMenuOpen(false)}>
              <span>קהילת וואטסאפ</span>
              <FontAwesomeIcon icon={faWhatsapp} size="lg" />
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}