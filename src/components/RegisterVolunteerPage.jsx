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
    <div className="flex justify-center py-8">
      <Card className="w-full max-w-3xl shadow-xl">
        <CardContent>
          <h2 className="text-2xl font-bold text-center mb-6 text-orange-800">הרשמה כמתנדב</h2>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
            <input 
              name="email" 
              type="email" 
              required 
              placeholder="אימייל" 
              value={formData.email} 
              onChange={handleChange} 
              className="border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" 
            />
            <input 
              name="password" 
              type="password" 
              required 
              placeholder="סיסמה" 
              value={formData.password} 
              onChange={handleChange} 
              className="border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" 
            />
            <input 
              name="fullName" 
              required 
              placeholder="שם מלא" 
              value={formData.fullName} 
              onChange={handleChange} 
              className="border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none col-span-2" 
            />
            
            {/* Personal Information */}
            <div className="col-span-2 bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
              <h3 className="font-semibold text-orange-800 mb-2">פרטים אישיים</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="phone" placeholder="טלפון" value={formData.phone} onChange={handleChange} className="border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" />
                <input name="location" placeholder="מקום מגורים" value={formData.location} onChange={handleChange} className="border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" />
                <input name="age" placeholder="גיל" value={formData.age} onChange={handleChange} className="border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" />
                <input name="gender" placeholder="מגדר" value={formData.gender} onChange={handleChange} className="border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" />
                <input name="maritalStatus" placeholder="מצב משפחתי" value={formData.maritalStatus} onChange={handleChange} className="border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" />
                <input name="profession" placeholder="עיסוק נוכחי / תחום עיסוק" value={formData.profession} onChange={handleChange} className="border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" />
              </div>
            </div>

            {/* Experience and Availability */}
            <div className="col-span-2 bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
              <h3 className="font-semibold text-orange-800 mb-2">ניסיון וזמינות</h3>
              <textarea name="experience" placeholder="ניסיון רלוונטי בעבודה עם אנשים / התנדבות" value={formData.experience} onChange={handleChange} className="w-full border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" />
              <textarea name="availability" placeholder="זמינות משוערת לשיחות בשבוע (ימים / שעות)" value={formData.availability} onChange={handleChange} className="w-full border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" />
            </div>

            {/* Motivation */}
            <div className="col-span-2 bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
              <h3 className="font-semibold text-orange-800 mb-2">מוטיבציה וחוזקות</h3>
              <textarea name="strengths" placeholder="מהם החוזקות שלך כאדם / כמתנדב?" value={formData.strengths} onChange={handleChange} className="w-full border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" />
              <textarea name="motivation" placeholder="מה מביא אותך להתנדב במסגרת כזו?" value={formData.motivation} onChange={handleChange} className="w-full border border-orange-200 p-2 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none" />
            </div>

            <label className="col-span-2 flex items-start gap-2 text-orange-700">
              <input type="checkbox" name="agree" checked={formData.agree} onChange={handleChange} className="mt-1" />
              <span>אני מצהיר/ה כי כל הפרטים נכונים ואני מעוניין/ת להתנדב במסגרת "שיחות מהלב"</span>
            </label>
            
            <Button className="col-span-2" disabled={loading}>
              {loading ? "נרשם..." : "הירשם כמתנדב"}
            </Button>
            
            {message && (
              <p className={`text-center text-sm col-span-2 ${message.includes("בהצלחה") ? "text-orange-600" : "text-red-600"}`}>
                {message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
