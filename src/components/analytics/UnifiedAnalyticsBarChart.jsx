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

const DATA_OPTIONS = [
  { label: 'התאמות', value: 'matches' },
  { label: 'שיחות', value: 'sessions' },
  { label: 'פונים', value: 'requesters' },
  { label: 'מתנדבים', value: 'volunteers' },
  { label: 'פונים ומתנדבים', value: 'users' },
  { label: 'אירועים' , value: 'events' }, // Example for events, if you have such data
  // Add more options here if needed
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

export default function UnifiedAnalyticsBarChart() {
  const [loading, setLoading] = useState(true);
  const [timeType, setTimeType] = useState('days');
  const [dataType, setDataType] = useState('matches');
  const [matches, setMatches] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [requesters, setRequesters] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [events, setEvents] = useState([]);
  const [chartData, setChartData] = useState([]);

  // Fetch all data on mount
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);

      // Matches
      const matchesSnap = await getDocs(collection(db, 'Matches'));
      const matchesData = matchesSnap.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          startDate: d.startDate?.toDate ? d.startDate.toDate() : (d.startDate ? new Date(d.startDate) : null)
        };
      }).filter(m => m.startDate);

      // Sessions
      const sessionsSnap = await getDocs(collection(db, 'Sessions'));
      const sessionsData = sessionsSnap.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null)
        };
      }).filter(s => s.createdAt);

      // Requesters
      const reqSnap = await getDocs(collection(db, 'Users', 'Info', 'Requesters'));
      const reqData = reqSnap.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null)
        };
      }).filter(u => u.createdAt);

      // Volunteers
      const volSnap = await getDocs(collection(db, 'Users', 'Info', 'Volunteers'));
      const volData = volSnap.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : (d.createdAt ? new Date(d.createdAt) : null)
        };
      }).filter(u => u.createdAt);

      // Events
      const eventsSnap = await getDocs(collection(db, 'Events'));
      const eventsData = eventsSnap.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          Event_added_time: d.Event_added_time?.toDate ? d.Event_added_time.toDate() : (d.Event_added_time ? new Date(d.Event_added_time) : null)
        };
      }).filter(e => e.Event_added_time);

      // Set all data
      setMatches(matchesData);
      setSessions(sessionsData);
      setRequesters(reqData);
      setVolunteers(volData);
      setEvents(eventsData);
      setLoading(false);
    }
    fetchAll();
  }, []);

  // Aggregate data for chart
  useEffect(() => {
    let items = [];
    let dateField = 'createdAt';
    if (dataType === 'matches') {
      items = matches;
      dateField = 'startDate';
    } else if (dataType === 'sessions') {
      items = sessions;
      dateField = 'createdAt';
    } else if (dataType === 'requesters') {
      items = requesters;
      dateField = 'createdAt';
    } else if (dataType === 'volunteers') {
      items = volunteers;
      dateField = 'createdAt';
    } else if (dataType === 'users') {
      items = [...requesters, ...volunteers];
      dateField = 'createdAt';
    } else if (dataType === 'events') {
      items = events;
      dateField = 'Event_added_time';
    }
    if (!items.length) {
      setChartData([]);
      return;
    }

    let data = [];
    const now = new Date();

    if (timeType === 'days') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const xLabel = formatDate(d, 'days');
        const count = items.filter(item =>
          item[dateField] &&
          item[dateField].getFullYear() === d.getFullYear() &&
          item[dateField].getMonth() === d.getMonth() &&
          item[dateField].getDate() === d.getDate()
        ).length;
        data.push({ label: xLabel, count });
      }
    } else if (timeType === 'weeks') {
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i * 7);
        const week = getWeekNumber(d);
        const year = d.getFullYear();
        const xLabel = formatDate(d, 'weeks');
        const count = items.filter(item => {
          const itemWeek = getWeekNumber(item[dateField]);
          return item[dateField] && item[dateField].getFullYear() === year && itemWeek === week;
        }).length;
        data.push({ label: xLabel, count });
      }
    } else if (timeType === 'months') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(now.getMonth() - i);
        const xLabel = formatDate(d, 'months');
        const count = items.filter(item =>
          item[dateField] &&
          item[dateField].getFullYear() === d.getFullYear() &&
          item[dateField].getMonth() === d.getMonth()
        ).length;
        data.push({ label: xLabel, count });
      }
    } else if (timeType === 'years') {
      const years = items.map(item => item[dateField].getFullYear());
      const minYear = Math.min(...years);
      const maxYear = now.getFullYear();
      for (let y = minYear; y <= maxYear; y++) {
        const xLabel = y.toString();
        const count = items.filter(item => item[dateField] && item[dateField].getFullYear() === y).length;
        data.push({ label: xLabel, count });
      }
    }
    setChartData(data);
  }, [matches, sessions, requesters, volunteers, events, timeType, dataType]);

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
        {DATA_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setDataType(opt.value)}
            className={`px-3 py-1 rounded ${dataType === opt.value ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-800'}`}
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
            <Bar dataKey="count" fill="#f97316" name="כמות" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}