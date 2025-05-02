import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
      <Card className="w-full max-w-md shadow-lg">
        <CardContent>
          <h2 className="text-2xl font-bold text-center mb-4 text-orange-800">התחברות</h2>
          <form className="space-y-4" onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-orange-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none"
            />
            <input
              type="password"
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-orange-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none"
            />
            <Button className="w-full" disabled={loading}>
              {loading ? "מתחבר..." : "התחבר"}
            </Button>
          </form>
          {message && <p className="mt-4 text-center text-sm text-orange-600">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
