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

export default function SessionsCreatedBarChart() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeType, setTimeType] = useState('days');
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'Sessions'));
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null)
        };
      });
      setSessions(data.filter(s => s.createdAt));
      setLoading(false);
    }
    fetchSessions();
  }, []);

  useEffect(() => {
    if (!sessions.length) return;
    let data = [];
    const now = new Date();

    if (timeType === 'days') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const label = formatDate(d, 'days');
        const count = sessions.filter(s =>
          s.createdAt &&
          s.createdAt.getFullYear() === d.getFullYear() &&
          s.createdAt.getMonth() === d.getMonth() &&
          s.createdAt.getDate() === d.getDate()
        ).length;
        data.push({ label, count });
      }
    } else if (timeType === 'weeks') {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i * 7);
        const week = getWeekNumber(d);
        const year = d.getFullYear();
        const label = formatDate(d, 'weeks');
        const count = sessions.filter(s => {
          const sWeek = getWeekNumber(s.createdAt);
          return s.createdAt && s.createdAt.getFullYear() === year && sWeek === week;
        }).length;
        data.push({ label, count });
      }
    } else if (timeType === 'months') {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(now.getMonth() - i);
        const label = formatDate(d, 'months');
        const count = sessions.filter(s =>
          s.createdAt &&
          s.createdAt.getFullYear() === d.getFullYear() &&
          s.createdAt.getMonth() === d.getMonth()
        ).length;
        data.push({ label, count });
      }
    } else if (timeType === 'years') {
      // From first session year to current year
      const years = sessions.map(s => s.createdAt.getFullYear());
      const minYear = Math.min(...years);
      const maxYear = now.getFullYear();
      for (let y = minYear; y <= maxYear; y++) {
        const label = y.toString();
        const count = sessions.filter(s => s.createdAt && s.createdAt.getFullYear() === y).length;
        data.push({ label, count });
      }
    }
    setChartData(data);
  }, [sessions, timeType]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {TIME_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setTimeType(opt.value)}
            className={`px-3 py-1 rounded ${timeType === opt.value ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-800'}`}
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
            <Bar dataKey="count" fill="#f97316" name="שיחות חדשות" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}