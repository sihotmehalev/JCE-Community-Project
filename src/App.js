import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./components/HomePage";
import RegisterVolunteerPage from "./components/RegisterVolunteerPage";
import RegisterRequesterPage from "./components/RegisterRequesterPage";
import LoginPage from "./components/LoginPage";
import RequesterDashboard from "./components/RequesterDashboard";
import VolunteerDashboard from "./components/VolunteerDashboard";
import AdminDashboard from "./components/AdminDashboard";
import AboutPage from "./components/AboutPage";
import ProfilePage from "./components/ProfilePage";
import Navbar from "./components/Navbar";
import { auth, db } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import LoadingSpinner from "./components/LoadingSpinner";

function ProtectedRoute({ children, allowedRoles }) {
  const [user, setUser] = React.useState(null);
  const [role, setRole] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAdminRole = async (uid) => {
      // Check FirstLevel admins
      const firstLevelRef = doc(db, "Users", "Info", "Admins", "Level", "FirstLevel", uid);
      let snapFirst = await getDoc(firstLevelRef);
      if (snapFirst.exists()) return "admin-first";

      // Check SecondLevel admins
      const secondLevelRef = doc(db, "Users", "Info", "Admins", "Level", "SecondLevel", uid);
      let snapSecond = await getDoc(secondLevelRef);
      if (snapSecond.exists()) return "admin-second";

      return null;
    };

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setUser(currentUser);
      
      // First check if user is an admin
      const adminRole = await checkAdminRole(currentUser.uid);
      if (adminRole) {
        setRole(adminRole);
        setLoading(false);
        return;
      }

      // Check other roles
      const roles = {
        volunteer: "Volunteers",
        requester: "Requesters"
      };

      for (const [roleType, collection] of Object.entries(roles)) {
        const docRef = doc(db, "Users", "Info", collection, currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRole(roleType);
          break;
        }
      }

      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingSpinner />;
  
  // Modify the role check to handle admin levels
  const hasAllowedRole = allowedRoles.some(allowedRole => {
    if (allowedRole === "admin") {
      return role === "admin-first" || role === "admin-second";
    }
    return role === allowedRole;
  });
  
  if (!user || !hasAllowedRole) return <Navigate to="/login" />;

  return children;
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register-volunteer" element={<RegisterVolunteerPage />} />
          <Route path="/register-requester" element={<RegisterRequesterPage />} />
          <Route path="/about" element={<AboutPage />} />

          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin-first", "admin-second"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/requester-dashboard"
            element={
              <ProtectedRoute allowedRoles={["requester"]}>
                <RequesterDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/volunteer-dashboard"
            element={
              <ProtectedRoute allowedRoles={["volunteer"]}>
                <VolunteerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={["requester", "volunteer", "admin-first", "admin-second"]}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;