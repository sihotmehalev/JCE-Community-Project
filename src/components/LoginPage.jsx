import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) throw new Error("User record not found");

      const data = userSnap.data();
      if (data.role === "admin") {
        navigate("/admin");
      } else if (data.role === "requester") {
        navigate("/requester-dashboard");
      } else if (data.role === "volunteer") {
        if (!data.approved) {
          setMessage("הבקשה שלך עדיין ממתינה לאישור מנהל.");
        } else {
          navigate("/volunteer-dashboard");
        }
      }
    } catch (err) {
      console.error(err);
      setMessage("שגיאה: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center p-6">
      <Card className="w-[400px] shadow-lg bg-gradient-to-br from-white to-orange-50/80">
        <CardContent className="px-8 py-6">
          <h2 className="text-2xl font-bold text-center mb-8 text-orange-800">התחברות</h2>
          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="max-w-[300px] mx-auto">
              <div className="relative">
                <input
                  type="email"
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
                <input
                  type="password"
                  placeholder="סיסמה"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none text-sm transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-orange-300"
                />
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
