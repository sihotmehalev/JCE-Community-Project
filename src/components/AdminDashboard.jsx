// AdminDashboard.jsx - ניהול מתנדבים ופונים
import React, { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { collection, getDocs, updateDoc, doc, setDoc } from "firebase/firestore";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

export default function AdminDashboard() {
  const [volunteers, setVolunteers] = useState([]);
  const [requesters, setRequesters] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  const fetchData = async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    const all = [], v = [], r = [];
    querySnapshot.forEach(docSnap => {
      const data = { id: docSnap.id, ...docSnap.data() };
      all.push(data);
      if (data.role === "volunteer") v.push(data);
      if (data.role === "requester") r.push(data);
    });
    setAllUsers(all);
    setVolunteers(v);
    setRequesters(r);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const approveVolunteer = async (id) => {
    await updateDoc(doc(db, "users", id), { approved: true });
    fetchData();
  };

  const matchRequesterToVolunteer = async (requesterId, volunteerId) => {
    await setDoc(doc(db, "matches", requesterId), { volunteerId });
    alert("שויך בהצלחה!");
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-orange-800">לוח ניהול</h2>

      {/* מתנדבים לא מאושרים */}
      <Card>
        <CardContent>
          <h3 className="font-semibold mb-2 text-orange-700">מתנדבים ממתינים לאישור</h3>
          {volunteers.filter(v => !v.approved).length === 0 ? (
            <p className="text-orange-600/80">אין מתנדבים בהמתנה.</p>
          ) : (
            <ul className="space-y-2">
              {volunteers.filter(v => !v.approved).map(v => (
                <li key={v.id} className="flex justify-between bg-orange-50/50 p-2 rounded border border-orange-100">
                  <span className="text-orange-800">{v.fullName} ({v.email})</span>
                  <Button variant="outline">אשר</Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* שיוך פונה למתנדב */}
      <Card>
        <CardContent>
          <h3 className="font-semibold mb-2 text-orange-700">שיוך פונים למתנדבים</h3>
          <ul className="space-y-4">
            {requesters.map(req => (
              <li key={req.id} className="border border-orange-100 bg-orange-50/50 p-4 rounded-lg">
                <p className="mb-2"><strong className="text-orange-800">{req.fullName}</strong> <span className="text-orange-600">({req.email})</span></p>
                <select 
                  onChange={(e) => matchRequesterToVolunteer(req.id, e.target.value)} 
                  defaultValue=""
                  className="w-full p-2 border border-orange-200 rounded-md bg-white text-orange-800 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 outline-none"
                >
                  <option disabled value="">בחר מתנדב לשיוך</option>
                  {volunteers.filter(v => v.approved).map(v => (
                    <option key={v.id} value={v.id}>{v.fullName}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* כל המשתמשים */}
      <Card>
        <CardContent>
          <h3 className="font-semibold mb-2 text-orange-700">משתמשים רשומים</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-orange-50">
                  <th className="border border-orange-100 p-2 text-orange-800">שם</th>
                  <th className="border border-orange-100 p-2 text-orange-800">אימייל</th>
                  <th className="border border-orange-100 p-2 text-orange-800">תפקיד</th>
                  <th className="border border-orange-100 p-2 text-orange-800">מאושר?</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map(u => (
                  <tr key={u.id} className="hover:bg-orange-50/50">
                    <td className="border border-orange-100 p-2 text-orange-700">{u.fullName}</td>
                    <td className="border border-orange-100 p-2 text-orange-700">{u.email}</td>
                    <td className="border border-orange-100 p-2 text-orange-700">{u.role}</td>
                    <td className="border border-orange-100 p-2 text-center">{u.approved ? "✔️" : "❌"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
