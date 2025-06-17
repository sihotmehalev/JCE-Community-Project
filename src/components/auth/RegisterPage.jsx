import React, { useState } from "react";
import { auth, db } from "../../config/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";

export default function RegisterLayout({ title, additionalFields, role, setRole }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      const userData = {
        email,
        role,
        approved: role === "volunteer" ? false : true,
        createdAt: new Date(),
      };

      await setDoc(doc(db, "users", uid), userData);
      setMessage("נרשמת בהצלחה! תועבר לדשבורד המתאים לאחר התחברות.");
    } catch (error) {
      console.error(error);
      setMessage("שגיאה: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-violet-100">
      <Card className="w-full max-w-md p-6">
        <CardContent>
          <h2 className="text-2xl font-bold text-center mb-4">{title}</h2>
          <form className="space-y-4" onSubmit={handleRegister}>
            <input
              type="email"
              placeholder="אימייל"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-md"
            />
            <input
              type="password"
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-md"
            />
            {additionalFields}
            <Button className="w-full" disabled={loading}>
              {loading ? "נרשם..." : "צור חשבון"}
            </Button>
          </form>
          {message && <p className="mt-4 text-center text-sm text-gray-700">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
