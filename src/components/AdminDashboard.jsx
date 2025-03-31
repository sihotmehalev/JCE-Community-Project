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
      <h2 className="text-2xl font-bold">לוח ניהול</h2>

      {/* מתנדבים לא מאושרים */}
      <Card>
        <CardContent>
          <h3 className="font-semibold mb-2">מתנדבים ממתינים לאישור</h3>
          {volunteers.filter(v => !v.approved).length === 0 ? (
            <p>אין מתנדבים בהמתנה.</p>
          ) : (
            <ul className="space-y-2">
              {volunteers.filter(v => !v.approved).map(v => (
                <li key={v.id} className="flex justify-between bg-gray-100 p-2 rounded">
                  <span>{v.fullName} ({v.email})</span>
                  <Button onClick={() => approveVolunteer(v.id)}>אשר</Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* שיוך פונה למתנדב */}
      <Card>
        <CardContent>
          <h3 className="font-semibold mb-2">שיוך פונים למתנדבים</h3>
          <ul className="space-y-4">
            {requesters.map(req => (
              <li key={req.id} className="border p-2 rounded">
                <p><strong>{req.fullName}</strong> ({req.email})</p>
                <select onChange={(e) => matchRequesterToVolunteer(req.id, e.target.value)} defaultValue="">
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
          <h3 className="font-semibold mb-2">משתמשים רשומים</h3>
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-200">
                <th>שם</th>
                <th>אימייל</th>
                <th>תפקיד</th>
                <th>מאושר?</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map(u => (
                <tr key={u.id} className="text-center border-t">
                  <td>{u.fullName}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.approved ? "✔️" : "❌"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
