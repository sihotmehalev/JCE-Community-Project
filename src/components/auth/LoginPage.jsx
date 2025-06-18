import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";
import { Card, CardContent } from "../ui/card";
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const checkUserRole = async (uid) => {
    // Check FirstLevel admins
    const firstLevelRef = doc(db, "Users", "Info", "Admins", "Level", "FirstLevel", uid);
    let snapFirst = await getDoc(firstLevelRef);
    if (snapFirst.exists()) return { role: "admin-first", data: snapFirst.data() };

    // Check SecondLevel admins
    const secondLevelRef = doc(db, "Users", "Info", "Admins", "Level", "SecondLevel", uid);
    let snapSecond = await getDoc(secondLevelRef);
    if (snapSecond.exists()) return { role: "admin-second", data: snapSecond.data() };

    // Check Volunteers
    const volunteerRef = doc(db, "Users", "Info", "Volunteers", uid);
    let snapVolunteer = await getDoc(volunteerRef);
    if (snapVolunteer.exists()) return { role: "volunteer", data: snapVolunteer.data() };

    // Check Requesters
    const requesterRef = doc(db, "Users", "Info", "Requesters", uid);
    let snapRequester = await getDoc(requesterRef);
    if (snapRequester.exists()) return { role: "requester", data: snapRequester.data() };

    return null;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;
      const userInfo = await checkUserRole(uid);

      if (!userInfo) {
        throw new Error("User record not found");
      }

      const { role, data } = userInfo;

      // Determine the correct Firestore collection path for the user's role
      let userDocPath;
      if (role === "volunteer") {
        userDocPath = doc(db, "Users", "Info", "Volunteers", uid);
      } else if (role === "requester") {
        userDocPath = doc(db, "Users", "Info", "Requesters", uid);
      } else if (role === "admin-first") {
        userDocPath = doc(db, "Users", "Info", "Admins", "Level", "FirstLevel", uid);
      } else if (role === "admin-second") {
        userDocPath = doc(db, "Users", "Info", "Admins", "Level", "SecondLevel", uid);
      }

      // Update lastActivity timestamp in Firestore
      if (userDocPath) {
        await updateDoc(userDocPath, {
          lastActivity: serverTimestamp()
        });
      }

      switch (role) {
        case "admin-first":
        case "admin-second":
          navigate("/admin-dashboard");
          break;
        case "requester":
          navigate("/requester-dashboard");
          break;
        case "volunteer":
          if (data.approved !== "true") {
            setMessage("הבקשה שלך עדיין ממתינה לאישור מנהל.");
          } else {
            navigate("/volunteer-dashboard");
          }
          break;
        default:
          throw new Error("Invalid user role");
      }
    } catch (err) {
      console.error(err);
      setMessage("שגיאה: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center p-6">
      <Card className="w-[400px] bg-gradient-to-br from-white to-orange-50/80">
        <CardContent className="px-8 py-6">
          <h2 className="text-2xl font-bold text-center mb-8 text-orange-800">התחברות</h2>
          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="max-w-[300px] mx-auto">
              <div className="relative">
                <label htmlFor="email" className="text-orange-700">אימייל</label>
                <input
                  type="email"
                  id="email"
                  placeholder="אימייל"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none text-sm transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-orange-300"
                />
              </div>
            </div>
            <div className="max-w-[300px] mx-auto">
              <div className="relative">
                <label htmlFor="password" className="text-orange-700">סיסמה</label>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="סיסמה"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none text-sm transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-orange-300 pl-10"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-12 left-0 pl-3 flex items-center text-gray-500 opacity-40 hover:opacity-80 transition-opacity duration-200"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div className="max-w-[300px] mx-auto pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg font-medium text-white shadow-lg
                  bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600
                  hover:from-orange-500 hover:via-orange-600 hover:to-orange-700
                  focus:ring-2 focus:ring-orange-400/50 focus:ring-offset-2
                  transform hover:scale-[1.02] active:scale-[0.98]
                  transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "מתחבר..." : "התחבר"}
              </button>
            </div>
          </form>
          {message && <p className="mt-4 text-center text-sm text-orange-600">{message}</p>}
          <p className="mt-6 text-center text-sm text-orange-700">
            אין לך חשבון עדיין?{" "}
            <Link to="/register-requester" className="text-orange-600 hover:text-orange-700 underline font-medium">
              לחץ כאן להרשמה
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
