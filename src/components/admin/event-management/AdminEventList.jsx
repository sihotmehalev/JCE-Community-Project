// c/Users/moti/Desktop/talksfromtheheart/18.6/JCE-Community-Project/src/components/admin/event-management/AdminEventList.jsx
import { useState, useEffect } from 'react';
import { collection, updateDoc, doc, query, orderBy, deleteDoc, onSnapshot, Timestamp, where, getDocs, writeBatch, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import { Card, CardContent } from '../../../components/ui/card';
import CustomAlert from "../../ui/CustomAlert";

// Helper function to create notifications for all users
const notifyAllUsers = async (message, eventId) => { // Added eventId parameter
    const batch = writeBatch(db);
    const volunteersQuery = query(collection(db, "Users", "Info", "Volunteers"));
    const requestersQuery = query(collection(db, "Users", "Info", "Requesters"));

    try {
        const [volunteersSnapshot, requestersSnapshot] = await Promise.all([
            getDocs(volunteersQuery),
            getDocs(requestersQuery)
        ]);

        const notificationData = {
            message,
            link: `/events?eventId=${eventId}`, // Use eventId to construct the link
            createdAt: serverTimestamp(),
            read: false
        };

        volunteersSnapshot.forEach(userDoc => {
            const notificationRef = doc(collection(db, "notifications"));
            batch.set(notificationRef, { ...notificationData, userId: userDoc.id });
        });

        requestersSnapshot.forEach(userDoc => {
            const notificationRef = doc(collection(db, "notifications"));
            batch.set(notificationRef, { ...notificationData, userId: userDoc.id });
        });

        await batch.commit();
    } catch (error) {
        console.error("Error sending notifications to all users:", error);
    }
};


export const AdminEventList = () => {
    const [events, setEvents] = useState([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [sortColumn, setSortColumn] = useState('scheduled_time');
    const [sortDirection, setSortDirection] = useState('desc');
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [validationErrors, setValidationErrors] = useState({});
    const [alertMessage, setAlertMessage] = useState(null);

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
        
        cleanupOldEvents();

        return () => unsubscribe();
    }, []);

    const cleanupOldEvents = async () => {
        const now = new Date();
        const q = query(
            collection(db, "Events"),
            where("scheduled_time", "<", Timestamp.fromDate(now)),
            orderBy("scheduled_time", "desc") // Order by time to keep newest first
        );

        try {
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            let passedEvents = [];

            querySnapshot.forEach((docSnap) => {
                const eventData = docSnap.data();
                if (eventData.status !== "Passed") {
                    batch.update(docSnap.ref, { status: "Passed" });
                }
                passedEvents.push({ id: docSnap.id, ...eventData, ref: docSnap.ref });
            });

            // Keep the 6 most recent "Passed" events, delete the rest
            const eventsToDelete = passedEvents.slice(6);

            if (eventsToDelete.length > 0) {
                eventsToDelete.forEach(event => {
                    batch.delete(event.ref);
                });
                setAlertMessage({ message: `נמחקו ${eventsToDelete.length} אירועים ישנים שעברו את ה-6 האחרונים.`, type: "success" });
            }
            await batch.commit();

        } catch (error) {
            console.error("Error cleaning up old events:", error);
            setAlertMessage({ message: "שגיאה בניקוי אירועים ישנים.", type: "error" });
        }
    };

    const handleSort = (columnName) => {
        if (sortColumn === columnName) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(columnName);
            setSortDirection('asc');
        }
    };

    const filteredAndSortedEvents = events
        .filter(event => {
            const matchesFilter = filter === 'all' || event.status === filter;
            const matchesSearch = event.name.toLowerCase().includes(search.toLowerCase()) ||
                                event.description.toLowerCase().includes(search.toLowerCase());
            return matchesFilter && matchesSearch;
        })
        .sort((a, b) => {
            if (!sortColumn) return 0;
            
            let comparison = 0;
            switch (sortColumn) {
                case 'name':
                    comparison = a.name.localeCompare(b.name, 'he');
                    break;
                case 'scheduled_time':
                    comparison = new Date(b.scheduled_time) - new Date(a.scheduled_time);
                    break;
                case 'location':
                    comparison = a.location.localeCompare(b.location, 'he');
                    break;
                case 'Contact_info':
                    comparison = a.Contact_info.localeCompare(b.Contact_info);
                    break;
                case 'mail':
                    comparison = a.mail.localeCompare(b.mail);
                    break;
                case 'status':
                    comparison = a.status.localeCompare(b.status);
                    break;
                default:
                    comparison = 0;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });

    const formatDate = (date) => {
        if (date instanceof Timestamp) {
            date = date.toDate();
        }
        if (date instanceof Date && !isNaN(date.getTime())) {
            return new Intl.DateTimeFormat('he-IL', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        }
        return 'תאריך לא תקין';
    };

    const validateField = (field, value) => {
        const errors = {};
        switch (field) {
            case 'mail':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!value.trim()) errors.mail = 'מייל הוא שדה חובה';
                else if (!emailRegex.test(value)) errors.mail = 'כתובת מייל לא תקינה';
                break;
            case 'Contact_info':
                const cleanedValue = value.replace(/\D/g, ''); // Remove all non-digits
                if (!cleanedValue.trim()) {
                    errors.Contact_info = 'טלפון הוא שדה חובה';
                } else if (cleanedValue.length < 9 || cleanedValue.length > 10) {
                    errors.Contact_info = 'מספר טלפון לא תקין (צריך להיות 9-10 ספרות)';
                } else if (!cleanedValue.startsWith('0')) {
                    errors.Contact_info = 'מספר טלפון לא תקין (צריך להתחיל ב-0)';
                }
                break;
            case 'name':
                if (!value.trim()) errors.name = 'שם האירוע הוא שדה חובה';
                else if (value.trim().length < 2) errors.name = 'שם האירוע חייב להכיל לפחות 2 תווים';
                break;
            case 'location':
                if (!value.trim()) errors.location = 'מיקום הוא שדה חובה';
                else if (value.trim().length < 2) errors.location = 'מיקום חייב להכיל לפחות 2 תווים';
                break;
            case 'description':
                if (!value.trim()) errors.description = 'תיאור הוא שדה חובה';
                else if (value.trim().length < 5) errors.description = 'תיאור חייב להכיל לפחות 5 תווים';
                break;
            default:
                break;
        }
        return errors;
    };
    
    const deleteEvent = async (eventId) => {
        try {
            const eventRef = doc(db, "Events", eventId);
            const eventSnap = await getDoc(eventRef);
            const eventName = eventSnap.exists() ? eventSnap.data().name : 'אירוע';

            await deleteDoc(eventRef);

            // Pass eventId to notifyAllUsers for the link
            await notifyAllUsers(`האירוע '${eventName}' בוטל.`, eventId); //
            
            setAlertMessage({ message: 'האירוע נמחק בהצלחה', type: 'success' });

        } catch (error) {
            console.error("Error deleting event:", error);
            setAlertMessage({ message: 'שגיאה במחיקת האירוע', type: 'error' });
        }
    };

    const openEditModal = (event) => {
        const formattedEvent = {
            ...event,
            scheduled_time: event.scheduled_time instanceof Timestamp 
                ? event.scheduled_time
                : event.scheduled_time instanceof Date
                    ? Timestamp.fromDate(event.scheduled_time)
                    : Timestamp.now()
        };
        setEditForm(formattedEvent);
        setValidationErrors({}); 
        setShowEditModal(true);
    };

    const closeModal = () => {
        setShowEditModal(false);
        setEditForm({});
        setValidationErrors({});
    };

    const updateForm = (field, value) => {
        setValidationErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });
        if (field === 'scheduled_time') {
            const newDate = new Date(value);
            if (field === 'scheduled_time' && newDate.getTime() < Date.now()) {
                setAlertMessage({ message: 'יש לבחור זמן עתידי לאירוע', type: 'error' });
                return;
            }
            if (!isNaN(newDate.getTime())) {
                setEditForm(prev => ({ ...prev, scheduled_time: Timestamp.fromDate(newDate) }));
            }
        } else {
            setEditForm(prev => ({ ...prev, [field]: value }));
        }
    };

    const updateEvent = async () => {
        if (!editForm || !editForm.id) {
            console.error("No event data to update");
            setAlertMessage({ message: 'שגיאה: לא נמצאו נתונים לעדכון', type: 'error' });
            return;
        }

        const allErrors = {};
        const fieldsToValidate = ['name', 'mail', 'Contact_info', 'location', 'description'];
        fieldsToValidate.forEach(field => {
            const fieldErrors = validateField(field, editForm[field] || '');
            Object.assign(allErrors, fieldErrors);
        });
        if (!editForm.scheduled_time) {
            allErrors.scheduled_time = 'זמן האירוע הוא שדה חובה';
        }
        if (Object.keys(allErrors).length > 0) {
            setValidationErrors(allErrors);
            setAlertMessage({ message: 'יש שגיאות בטופס, אנא תקן אותן לפני השמירה', type: 'error' });
            return;
        }

        const eventData = {
            ...editForm,
            scheduled_time: editForm.scheduled_time instanceof Timestamp ? editForm.scheduled_time : Timestamp.fromDate(new Date(editForm.scheduled_time))
        };
        
        try {
            const eventRef = doc(db, "Events", editForm.id);
            await updateDoc(eventRef, eventData);

            const message = eventData.status === 'cancelled' 
                ? `האירוע '${eventData.name}' בוטל.`
                : `האירוע '${eventData.name}' עודכן. בדקו את הפרטים החדשים.`;
            // Pass eventId to notifyAllUsers for the link
            await notifyAllUsers(message, editForm.id); //
            
            closeModal();
            setAlertMessage({ message: 'האירוע עודכן בהצלחה!', type: 'success' });
        } catch (error) {
            console.error("Error updating event:", error);
            setAlertMessage({ message: 'שגיאה בעדכון האירוע', type: 'error' });
        }
    };

    return (
        <Card>
            <CardContent>
                <h3 className="font-semibold mb-4 text-orange-700">רשימת אירועים</h3>
                
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="חיפוש אירועים..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full p-2 border rounded-md border-orange-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                                dir="rtl"
                            />
                        </div>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="p-2 border rounded-md border-orange-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                            dir="rtl"
                        >
                            <option value="all">כל האירועים</option>
                            <option value="scheduled">אירועים מתוכננים</option>
                            <option value="cancelled">אירועים מבוטלים</option>
                            <option value="Passed">אירועים שהסתיימו</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-orange-50">
                                    <th className="border border-orange-100 p-1 sm:p-2 text-orange-800 cursor-pointer text-right" onClick={() => handleSort('name')}>שם האירוע {sortColumn === 'name' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}</th>
                                    <th className="border border-orange-100 p-1 sm:p-2 text-orange-800 cursor-pointer text-right hidden md:table-cell" onClick={() => handleSort('scheduled_time')}>תאריך {sortColumn === 'scheduled_time' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}</th>
                                    <th className="border border-orange-100 p-1 sm:p-2 text-orange-800 cursor-pointer text-right hidden lg:table-cell" onClick={() => handleSort('location')}>מיקום {sortColumn === 'location' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}</th>
                                    <th className="border border-orange-100 p-1 sm:p-2 text-orange-800 cursor-pointer text-right hidden lg:table-cell" onClick={() => handleSort('Contact_info')}>טלפון {sortColumn === 'Contact_info' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}</th>
                                    <th className="border border-orange-100 p-1 sm:p-2 text-orange-800 cursor-pointer text-right hidden lg:table-cell" onClick={() => handleSort('mail')}>דוא"ל {sortColumn === 'mail' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}</th>
                                    <th className="border border-orange-100 p-1 sm:p-2 text-orange-800 cursor-pointer text-right" onClick={() => handleSort('status')}>סטטוס {sortColumn === 'status' && (sortDirection === 'asc' ? ' ▲' : ' ▼')}</th>
                                    <th className="border border-orange-100 p-1 sm:p-2 text-orange-800 text-center">עריכה</th>
                                    <th className="border border-orange-100 p-1 sm:p-2 text-orange-800 text-center">מחיקה</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedEvents.map((event) => (
                                    <tr key={event.id} className="hover:bg-orange-50/50">
                                        <td className="border border-orange-100 p-1 sm:p-2 text-orange-700">{event.name}</td>
                                        <td className="border border-orange-100 p-1 sm:p-2 text-orange-700 hidden md:table-cell">{formatDate(event.scheduled_time)}</td>
                                        <td className="border border-orange-100 p-1 sm:p-2 text-orange-700 hidden lg:table-cell">{event.location}</td>
                                        <td className="border border-orange-100 p-1 sm:p-2 text-orange-700 hidden lg:table-cell">{event.Contact_info && (<a href={`tel:${event.Contact_info}`} className="text-blue-600 hover:text-blue-800">{event.Contact_info}</a>)}</td>
                                        <td className="border border-orange-100 p-1 sm:p-2 text-orange-700 hidden lg:table-cell"><a href={`mailto:${event.mail}`} className="text-blue-600 hover:text-blue-800">{event.mail}</a></td>
                                        <td className="border border-orange-100 p-1 sm:p-2 text-right"><span className={`px-2 py-1 rounded-full text-xs sm:text-sm ${event.status === 'scheduled' ? 'bg-green-100 text-green-800' : event.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{event.status === 'scheduled' ? 'מתוכנן' : event.status === 'cancelled' ? 'מבוטל' : 'אירוע שהסתיים'}</span></td>
                                        <td className="border border-orange-100 p-1 sm:p-2 text-center">
                                            <button onClick={() => openEditModal(event)} className="p-2 rounded-full text-blue-600 hover:text-white hover:bg-blue-600 focus:outline-none transition-colors duration-200 inline-flex items-center justify-center" title="ערוך אירוע">
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                            </button>
                                        </td>
                                        <td className="border border-orange-100 p-1 sm:p-2 text-center">
                                            <button onClick={() => deleteEvent(event.id)} className="p-2 rounded-full text-red-600 hover:text-white hover:bg-red-600 focus:outline-none transition-colors duration-200 inline-flex items-center justify-center" title="מחק אירוע">
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {showEditModal && (
                    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-start justify-center z-50 pt-8" onClick={() => closeModal()}>
                        <div className="bg-white rounded-xl w-[600px] max-h-[85vh] overflow-hidden shadow-2xl mx-4 relative border border-orange-100 flex flex-col" onClick={(e) => e.stopPropagation()}>
                            <div className="sticky top-0 bg-white py-4 px-6 border-b border-orange-100 flex justify-between items-center z-10">
                                <h3 className="text-xl font-semibold text-orange-800">ערוך אירוע</h3>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 p-1" title="סגור">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">שם האירוע <span className="text-red-500">*</span></label>
                                    <input type="text" value={editForm.name || ''} onChange={(e) => updateForm('name', e.target.value)} className={`w-full p-2 border rounded-md bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all ${validationErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`} dir="rtl" />
                                    {validationErrors.name && (<p className="text-red-500 text-sm mt-1 text-right">{validationErrors.name}</p>)}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">זמן האירוע <span className="text-red-500">*</span></label>
                                    <input type="datetime-local" value={editForm.scheduled_time instanceof Timestamp ? editForm.scheduled_time.toDate().toISOString().slice(0, 16) : editForm.scheduled_time || ''} onChange={(e) => updateForm('scheduled_time', e.target.value)} className={`w-full p-2 border rounded-md bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all ${validationErrors.scheduled_time ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`} dir="ltr" />
                                    {validationErrors.scheduled_time && (<p className="text-red-500 text-sm mt-1 text-right">{validationErrors.scheduled_time}</p>)}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">מיקום האירוע <span className="text-red-500">*</span></label>
                                    <input type="text" value={editForm.location || ''} onChange={(e) => updateForm('location', e.target.value)} className={`w-full p-2 border rounded-md bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all ${validationErrors.location ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`} dir="rtl" />
                                    {validationErrors.location && (<p className="text-red-500 text-sm mt-1 text-right">{validationErrors.location}</p>)}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">תיאור <span className="text-red-500">*</span></label>
                                    <textarea value={editForm.description || ''} onChange={(e) => updateForm('description', e.target.value)} className={`w-full p-2 border rounded-md bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all ${validationErrors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`} rows="3" dir="rtl" />
                                    {validationErrors.description && (<p className="text-red-500 text-sm mt-1 text-right">{validationErrors.description}</p>)}
                                </div>

                                {/* Image Link Field (single image) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">קישור לתמונה (תמונה אחת בלבד)</label>
                                    <input
                                        type="text"
                                        value={editForm.image || ''}
                                        onChange={(e) => updateForm('image', e.target.value)}
                                        className="w-full p-2 border rounded-md bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                                        dir="ltr"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                    <a
                                        href="https://imgbb.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline text-sm text-right block mt-1"
                                    >
                                        העלה תמונה לשרת (imgbb.com) לקבלת קישור
                                    </a>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">טלפון <span className="text-red-500">*</span></label>
                                    <input type="tel" value={editForm.Contact_info || ''} onChange={(e) => updateForm('Contact_info', e.target.value)} className={`w-full p-2 border rounded-md bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all ${validationErrors.Contact_info ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`} dir="ltr" placeholder="050-1234567" />
                                    {validationErrors.Contact_info && (<p className="text-red-500 text-sm mt-1 text-right">{validationErrors.Contact_info}</p>)}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">מייל <span className="text-red-500">*</span></label>
                                    <input type="email" value={editForm.mail || ''} onChange={(e) => updateForm('mail', e.target.value)} className={`w-full p-2 border rounded-md bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all ${validationErrors.mail ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`} dir="ltr" placeholder="example@domain.com" />
                                    {validationErrors.mail && (<p className="text-red-500 text-sm mt-1 text-right">{validationErrors.mail}</p>)}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">סטטוס</label>
                                    <select value={editForm.status || 'scheduled'} onChange={(e) => updateForm('status', e.target.value)} className="w-full p-2 border rounded-md bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all appearance-none cursor-pointer" dir="rtl">
                                        <option value="scheduled">מתוכנן</option>
                                        <option value="cancelled">מבוטל</option>
                                        <option value="Passed">הסתיים</option>
                                    </select>
                                </div>
                            </div>
                            <div className="sticky bottom-0 bg-white py-4 px-6 border-t border-orange-100">
                                <div className="flex justify-end gap-4">
                                    <button onClick={closeModal} className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors">ביטול</button>
                                    <button onClick={updateEvent} className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 focus:ring-2 focus:ring-orange-200 transition-colors">שמור שינויים</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
            <CustomAlert
                message={alertMessage?.message}
                onClose={() => setAlertMessage(null)}
                type={alertMessage?.type}
            />
        </Card>
    );
};