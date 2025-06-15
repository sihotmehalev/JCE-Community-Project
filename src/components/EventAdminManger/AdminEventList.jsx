import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, query, orderBy, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { ca } from 'date-fns/locale';

export const AdminEventList = () => {
    const [events, setEvents] = useState([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('date');
    const [sortDirection, setSortDirection] = useState('desc');

    const fetchEvents = async () => {
        try {
            const eventsQuery = query(collection(db, "Events"), orderBy("scheduled_time", "desc"));
            const querySnapshot = await getDocs(eventsQuery);
            const eventsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                scheduled_time: doc.data().scheduled_time?.toDate()
            }));
            setEvents(eventsData);
        } catch (error) {
            console.error("Error fetching events:", error);
            alert('שגיאה בטעינת האירועים');
        }
    };

    useEffect(() => {
        const eventsQuery = query(
        collection(db, "Events"),          
        orderBy("scheduled_time", "desc")  
        );

        const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({
                id: doc.id,             
                ...doc.data(),          
                scheduled_time: doc.data().scheduled_time?.toDate() 
            }));

            setEvents(eventsData);
        });
        return () => unsubscribe();
    }, []);

    /*
    const toggleEventStatus = async (eventId, currentStatus) => {
        try {
            const newStatus = currentStatus === 'cancelled' ? 'scheduled' : 'cancelled';
            await updateDoc(doc(db, "Events", eventId), {
                status: newStatus
            });
            await fetchEvents(); // Refresh the list
            alert('סטטוס האירוע עודכן בהצלחה');
        } catch (error) {
            console.error("Error updating event status:", error);
            alert('שגיאה בעדכון סטטוס האירוע');
        }
    };
    */

    const filteredAndSortedEvents = events
        .filter(event => {
            const matchesFilter = filter === 'all' || event.status === filter;
            const matchesSearch = event.name.toLowerCase().includes(search.toLowerCase()) ||
                                event.description.toLowerCase().includes(search.toLowerCase());
            return matchesFilter && matchesSearch;
        })
        .sort((a, b) => {
            if (!sort) return 0;
            
            let comparison = 0;
            if (sort === 'name') {
                comparison = a.name.localeCompare(b.name, 'he');
            } else if (sort === 'date') {
                comparison = new Date(b.scheduled_time) - new Date(a.scheduled_time);
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });

    const formatDate = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleString('he-IL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    const deleteEvent = async (eventId) => {
        try {
            deleteDoc(doc(db, "Events", eventId));
        }
        catch (error) {
            console.error("Error deleting event:", error);
            alert('שגיאה במחיקת האירוע');
        }
    }


    return (
        <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-right">סינון ומיון</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1 text-right">חיפוש</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="חיפוש אירועים..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full p-2 pl-10 border rounded-md bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                                dir="rtl"
                            />
                            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 text-right">סטטוס</label>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full p-2 border rounded-md bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all appearance-none cursor-pointer"
                            dir="rtl"
                        >
                            <option value="all">כל האירועים</option>
                            <option value="scheduled">אירועים מתוכננים</option>
                            <option value="cancelled">אירועים מבוטלים</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 text-right">מיון</label>
                        <div className="flex gap-2">
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value)}
                                className="flex-1 p-2 border rounded-md bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all appearance-none cursor-pointer"
                                dir="rtl"
                            >
                                <option value="">ללא מיון</option>
                                <option value="name">שם</option>
                                <option value="date">תאריך</option>
                            </select>
                            
                            {sort && (
                                <button
                                    onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                                    className="p-2 border rounded-md hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all bg-white"
                                    title={sortDirection === 'asc' ? 'סדר עולה' : 'סדר יורד'}
                                >
                                    {sortDirection === 'asc' ? (
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9M3 12h5M13 12L17 8M17 8L21 12M17 8V20" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9M3 12h5M13 12L17 16M17 16L21 12M17 16V4" />
                                        </svg>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <p className='text-2xl font-bold text-orange-800 mb-3'>לחיצה כפולה על שדה כדי לשנות </p>

            <div className="border rounded-lg">
                <table className="min-w-full table-auto">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            <th className="px-4 py-2 text-right">שם האירוע</th>
                            <th className="px-4 py-2 text-right">תאריך</th>
                            <th className="px-4 py-2 text-right">מיקום</th>
                            <th className="px-4 py-2 text-right">טלפון</th>
                            <th className="px-4 py-2 text-right">דוא"ל</th>
                            <th className="px-4 py-2 text-right">סטטוס</th>
                            <th className="px-4 py-2 text-center">מחיקת אירוע</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedEvents.map((event) => (
                            <tr key={event.id} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-2 text-right">{event.name}</td>
                                <td className="px-4 py-2 text-right">{formatDate(event.scheduled_time)}</td>
                                <td className="px-4 py-2 text-right">{event.location}</td>
                                <td className="px-4 py-2 text-right">
                                    {event.Contact_info && (
                                        <a href={`tel:${event.Contact_info}`} className="text-blue-600 hover:text-blue-800">
                                            {event.Contact_info}
                                        </a>
                                    )}
                                </td>
                                <td className="px-4 py-2 text-right">
                                    <a href={`mailto:${event.mail}`} className="text-blue-600 hover:text-blue-800">
                                        {event.mail}
                                    </a>
                                </td>
                                <td className="px-4 py-2 text-right">
                                    <span className={`px-2 py-1 rounded-full text-sm ${
                                        event.status === 'scheduled' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                        {event.status === 'scheduled' ? 'מתוכנן' : 'מבוטל'}
                                    </span>
                                </td>                                <td className="px-4 py-2 text-center">
                                    <div className="flex justify-center">
                                        <button
                                            onClick={() => deleteEvent(event.id)}
                                            className="p-2 rounded-full text-red-600 hover:text-white hover:bg-red-600 focus:outline-none transition-colors duration-200 inline-flex items-center justify-center"
                                            title="מחק אירוע"
                                        >
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};