// RegisterVolunteerPage.jsx - טופס הרשמה למתנדבים ברמה מקצועית
import React, { useState } from "react";
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

export default function RegisterVolunteerPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    location: "",
    age: "",
    gender: "",
    maritalStatus: "",
    profession: "",
    experience: "",
    availability: "",
    strengths: "",
    motivation: "",
    agree: false
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agree) {
      setMessage("יש לאשר את תנאי ההצטרפות כמתנדב.");
      return;
    }
    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCred.user.uid;
      await setDoc(doc(db, "users", uid), {
        ...formData,
        role: "volunteer",
        approved: true,
        createdAt: new Date(),
      });
      setMessage("נרשמת בהצלחה! נבדוק את בקשתך ונאשר בהמשך.");
    } catch (error) {
      console.error(error);
      setMessage("שגיאה: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex justify-center py-8 bg-gradient-to-br from-blue-50 to-violet-100">
      <Card className="w-full max-w-3xl p-6 shadow-xl">
        <CardContent>
          <h2 className="text-2xl font-bold text-center mb-4">הרשמה כמתנדב</h2>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
            <input name="email" type="email" required placeholder="אימייל" value={formData.email} onChange={handleChange} className="border p-2 rounded" />
            <input name="password" type="password" required placeholder="סיסמה" value={formData.password} onChange={handleChange} className="border p-2 rounded" />
            <input name="fullName" required placeholder="שם מלא" value={formData.fullName} onChange={handleChange} className="border p-2 rounded col-span-2" />
            <input name="phone" placeholder="טלפון" value={formData.phone} onChange={handleChange} className="border p-2 rounded" />
            <input name="location" placeholder="מקום מגורים" value={formData.location} onChange={handleChange} className="border p-2 rounded" />
            <input name="age" placeholder="גיל" value={formData.age} onChange={handleChange} className="border p-2 rounded" />
            <input name="gender" placeholder="מגדר" value={formData.gender} onChange={handleChange} className="border p-2 rounded" />
            <input name="maritalStatus" placeholder="מצב משפחתי" value={formData.maritalStatus} onChange={handleChange} className="border p-2 rounded" />
            <input name="profession" placeholder="עיסוק נוכחי / תחום עיסוק" value={formData.profession} onChange={handleChange} className="border p-2 rounded col-span-2" />
            <textarea name="experience" placeholder="ניסיון רלוונטי בעבודה עם אנשים / התנדבות" value={formData.experience} onChange={handleChange} className="border p-2 rounded col-span-2" />
            <textarea name="availability" placeholder="זמינות משוערת לשיחות בשבוע (ימים / שעות)" value={formData.availability} onChange={handleChange} className="border p-2 rounded col-span-2" />
            <textarea name="strengths" placeholder="מהם החוזקות שלך כאדם / כמתנדב?" value={formData.strengths} onChange={handleChange} className="border p-2 rounded col-span-2" />
            <textarea name="motivation" placeholder="מה מביא אותך להתנדב במסגרת כזו?" value={formData.motivation} onChange={handleChange} className="border p-2 rounded col-span-2" />
            <label className="col-span-2">
              <input type="checkbox" name="agree" checked={formData.agree} onChange={handleChange} />
              אני מצהיר/ה כי כל הפרטים נכונים ואני מעוניין/ת להתנדב במסגרת "שיחות מהלב"
            </label>
            <Button className="col-span-2" disabled={loading}>{loading ? "נרשם..." : "הירשם כמתנדב"}</Button>
            {message && <p className="text-center text-sm text-gray-700 col-span-2">{message}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
