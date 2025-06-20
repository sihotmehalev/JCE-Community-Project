import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

const TIME_OPTIONS = [
  { label: 'ימים (שבוע אחרון)', value: 'days' },
  { label: 'שבועות (חודש אחרון)', value: 'weeks' },
  { label: 'חודשים (שנה אחרונה)', value: 'months' },
  { label: 'שנים (כל השנים)', value: 'years' },
];

const USER_TYPE_OPTIONS = [
  { label: 'פונים ומתנדבים', value: 'both' },
  { label: 'פונים בלבד', value: 'requesters' },
  { label: 'מתנדבים בלבד', value: 'volunteers' },
];

function formatDate(date, type) {
  if (type === 'days') return date.toLocaleDateString('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit' });
  if (type === 'weeks') {
    const week = getWeekNumber(date);
    return `שבוע ${week} ${date.getFullYear()}`;
  }
  if (type === 'months') return date.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' });
  if (type === 'years') return date.getFullYear().toString();
  return '';
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

export default function UsersCreatedBarChart() {
  const [requesters, setRequesters] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeType, setTimeType] = useState('days');
  const [userType, setUserType] = useState('both');
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      // Fetch requesters
      const reqSnap = await getDocs(collection(db, 'Users', 'Info', 'Requesters'));
      const reqData = reqSnap.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null)
        };
      }).filter(u => u.createdAt);

      // Fetch volunteers
      const volSnap = await getDocs(collection(db, 'Users', 'Info', 'Volunteers'));
      const volData = volSnap.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null)
        };
      }).filter(u => u.createdAt);

      setRequesters(reqData);
      setVolunteers(volData);
      setLoading(false);
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    let users = [];
    if (userType === 'both') users = [...requesters, ...volunteers];
    else if (userType === 'requesters') users = requesters;
    else if (userType === 'volunteers') users = volunteers;

    if (!users.length) {
      setChartData([]);
      return;
    }

    let data = [];
    const now = new Date();

    if (timeType === 'days') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const label = formatDate(d, 'days');
        const count = users.filter(u =>
          u.createdAt &&
          u.createdAt.getFullYear() === d.getFullYear() &&
          u.createdAt.getMonth() === d.getMonth() &&
          u.createdAt.getDate() === d.getDate()
        ).length;
        data.push({ label, count });
      }
    } else if (timeType === 'weeks') {
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i * 7);
        const week = getWeekNumber(d);
        const year = d.getFullYear();
        const label = formatDate(d, 'weeks');
        const count = users.filter(u => {
          const uWeek = getWeekNumber(u.createdAt);
          return u.createdAt && u.createdAt.getFullYear() === year && uWeek === week;
        }).length;
        data.push({ label, count });
      }
    } else if (timeType === 'months') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(now.getMonth() - i);
        const label = formatDate(d, 'months');
        const count = users.filter(u =>
          u.createdAt &&
          u.createdAt.getFullYear() === d.getFullYear() &&
          u.createdAt.getMonth() === d.getMonth()
        ).length;
        data.push({ label, count });
      }
    } else if (timeType === 'years') {
      const years = users.map(u => u.createdAt.getFullYear());
      const minYear = Math.min(...years);
      const maxYear = now.getFullYear();
      for (let y = minYear; y <= maxYear; y++) {
        const label = y.toString();
        const count = users.filter(u => u.createdAt && u.createdAt.getFullYear() === y).length;
        data.push({ label, count });
      }
    }
    setChartData(data);
  }, [requesters, volunteers, timeType, userType]);

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {TIME_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setTimeType(opt.value)}
            className={`px-3 py-1 rounded ${timeType === opt.value ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-800'}`}
          >
            {opt.label}
          </button>
        ))}
        <span className="mx-2" />
        {USER_TYPE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setUserType(opt.value)}
            className={`px-3 py-1 rounded ${userType === opt.value ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-800'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="text-center text-orange-700">טוען נתונים...</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#f97316" name="משתמשים חדשים" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}