// RegisterVolunteerPage.jsx - טופס הרשמה למתנדבים ברמה מקצועית
import React, { useState } from "react";
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import RegisterLayout from "./RegisterLayout";

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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = userCred.user.uid;
      await setDoc(doc(db, "users", uid), {
        ...formData,
        role: "volunteer",
        approved: false,
        createdAt: new Date(),
      });
      setMessage("נרשמת בהצלחה! בקשתך תיבדק על ידי מנהל המערכת.");
    } catch (error) {
      console.error(error);
      setMessage("שגיאה: " + error.message);
    }
    setLoading(false);
  };

  const inputClassName = "w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 outline-none text-sm transition-all duration-200 bg-white/70 backdrop-blur-sm hover:border-orange-300";

  return (
    <RegisterLayout
      title="הרשמה כמתנדב"
      onSubmit={handleSubmit}
      loading={loading}
      message={message}
    >
      <div className="max-w-[400px] mx-auto space-y-4">
        {/* Basic Information */}
        <div className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="אימייל"
            value={formData.email}
            onChange={handleChange}
            required
            className={inputClassName}
          />
          <input
            type="password"
            name="password"
            placeholder="סיסמה"
            value={formData.password}
            onChange={handleChange}
            required
            className={inputClassName}
          />
          <input
            type="text"
            name="fullName"
            placeholder="שם מלא"
            value={formData.fullName}
            onChange={handleChange}
            required
            className={inputClassName}
          />
        </div>

        {/* Personal Information */}
        <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
          <h3 className="font-semibold text-orange-800 mb-2">פרטים אישיים</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="tel"
              name="phone"
              placeholder="טלפון"
              value={formData.phone}
              onChange={handleChange}
              className={inputClassName}
            />
            <input
              name="location"
              placeholder="מקום מגורים"
              value={formData.location}
              onChange={handleChange}
              className={inputClassName}
            />
            <input
              name="age"
              placeholder="גיל"
              value={formData.age}
              onChange={handleChange}
              className={inputClassName}
            />
            <input
              name="gender"
              placeholder="מגדר"
              value={formData.gender}
              onChange={handleChange}
              className={inputClassName}
            />
            <input
              name="maritalStatus"
              placeholder="מצב משפחתי"
              value={formData.maritalStatus}
              onChange={handleChange}
              className={inputClassName}
            />
            <input
              name="profession"
              placeholder="עיסוק נוכחי / תחום עיסוק"
              value={formData.profession}
              onChange={handleChange}
              className={inputClassName}
            />
          </div>
        </div>

        {/* Experience and Availability */}
        <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
          <h3 className="font-semibold text-orange-800 mb-2">ניסיון וזמינות</h3>
          <textarea
            name="experience"
            placeholder="ניסיון רלוונטי בעבודה עם אנשים / התנדבות"
            value={formData.experience}
            onChange={handleChange}
            rows="4"
            className={inputClassName}
          />
          <textarea
            name="availability"
            placeholder="זמינות משוערת לשיחות בשבוע (ימים / שעות)"
            value={formData.availability}
            onChange={handleChange}
            rows="2"
            className={inputClassName}
          />
        </div>

        {/* Motivation and Strengths */}
        <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
          <h3 className="font-semibold text-orange-800 mb-2">מוטיבציה וחוזקות</h3>
          <textarea
            name="strengths"
            placeholder="מהם החוזקות שלך כאדם / כמתנדב?"
            value={formData.strengths}
            onChange={handleChange}
            rows="3"
            className={inputClassName}
          />
          <textarea
            name="motivation"
            placeholder="מה מביא אותך להתנדב במסגרת כזו?"
            value={formData.motivation}
            onChange={handleChange}
            rows="3"
            className={inputClassName}
          />
        </div>

        <label className="flex items-start gap-2 text-orange-700">
          <input
            type="checkbox"
            name="agree"
            checked={formData.agree}
            onChange={handleChange}
            className="mt-1 rounded border-orange-300 text-orange-600 focus:ring-orange-400"
          />
          <span className="text-sm">
            אני מצהיר/ה כי כל הפרטים נכונים ואני מעוניין/ת להתנדב במסגרת "שיחות מהלב"
          </span>
        </label>
      </div>
    </RegisterLayout>
  );
}
