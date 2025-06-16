import { useState, useEffect } from 'react';
import { collection, updateDoc, doc, query, orderBy, deleteDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export const AdminEventList = () => {
    const [events, setEvents] = useState([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('date');
    const [sortDirection, setSortDirection] = useState('desc');
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [validationErrors, setValidationErrors] = useState({});

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
                if (!value.trim()) {
                    errors.mail = 'מייל הוא שדה חובה';
                } else if (!emailRegex.test(value)) {
                    errors.mail = 'כתובת מייל לא תקינה';
                }
                break;
                
            case 'Contact_info':
                const phoneRegex = /^0\d{1,2}-?\d{7}$/; // Israeli phone format
                if (!value.trim()) {
                    errors.Contact_info = 'טלפון הוא שדה חובה';
                } else if (!phoneRegex.test(value.replace(/\s/g, ''))) {
                    errors.Contact_info = 'מספר טלפון לא תקין (צריך להיות 9-10 ספרות)';
                }
                break;
                
            case 'name':
                if (!value.trim()) {
                    errors.name = 'שם האירוע הוא שדה חובה';
                } else if (value.trim().length < 2) {
                    errors.name = 'שם האירוע חייב להכיל לפחות 2 תווים';
                }
                break;

            case 'location':
                if (!value.trim()) {
                    errors.location = 'מיקום הוא שדה חובה';
                } else if (value.trim().length < 2) {
                    errors.location = 'מיקום חייב להכיל לפחות 2 תווים';
                }
                break;

            case 'description':
                if (!value.trim()) {
                    errors.description = 'תיאור הוא שדה חובה';
                } else if (value.trim().length < 5) {
                    errors.description = 'תיאור חייב להכיל לפחות 5 תווים';
                }
                break;
        }
        
        return errors;
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
    }

    const closeModal = () => {
        setShowEditModal(false);
        setEditForm({});
        setValidationErrors({});
    }

    const updateForm = (field, value) => {
        setValidationErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
        });

        if (field === 'scheduled_time') {
            const newDate = new Date(value);
            if (field === 'scheduled_time' && newDate.getTime() < Date.now()) {
                alert('יש לבחור זמן עתידי לאירוע');
                return;
            }
            if (!isNaN(newDate.getTime())) {
                setEditForm(prev => ({
                    ...prev,
                    scheduled_time: Timestamp.fromDate(newDate)
                }));
            }
        }
        else {
            setEditForm(prev => ({ ...prev, [field]: value }));
        }
    }

    const updateEvent = async () => {
        if (!editForm || !editForm.id) {
            console.error("No event data to update");
            alert('שגיאה: לא נמצאו נתונים לעדכון');
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
            alert('יש שגיאות בטופס, אנא תקן אותן לפני השמירה');
            return;
        }

        const eventData = {
            ...editForm,
            scheduled_time: editForm.scheduled_time instanceof Timestamp 
            ? editForm.scheduled_time 
            : Timestamp.fromDate(new Date(editForm.scheduled_time))
        };
        
        try {
            const eventRef = doc(db, "Events", editForm.id);
            await updateDoc(eventRef, eventData);
            setEvents(events.map(event => event.id === eventData.id ? eventData : event));
            closeModal();
            alert('האירוע עודכן בהצלחה!');
        } catch (error) {
            console.error("Error updating event:", error);
            alert('שגיאה בעדכון האירוע');
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
                            <th className="px-4 py-2 text-center">עריכה</th>
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
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <button
                                        onClick={() => openEditModal(event)}
                                        className="p-2 rounded-full text-blue-600 hover:text-white hover:bg-blue-600 focus:outline-none transition-colors duration-200 inline-flex items-center justify-center"
                                        title="ערוך אירוע"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </td>
                                <td className="px-4 py-2 text-center">
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

            {showEditModal && (
                <div 
                    className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-start justify-center z-50 pt-8"
                    onClick={() => closeModal()}
                >
                    <div 
                        className="bg-white rounded-xl w-[600px] max-h-[85vh] overflow-hidden shadow-2xl mx-4 relative border border-orange-100 flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Sticky Header */}
                        <div className="sticky top-0 bg-white py-4 px-6 border-b border-orange-100 flex justify-between items-center z-10">
                            <h3 className="text-xl font-semibold text-orange-800">ערוך אירוע</h3>
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 p-1"
                                title="סגור"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">שם האירוע <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={editForm.name || ''}
                                    onChange={(e) => updateForm('name', e.target.value)}
                                    className={`w-full p-2 border rounded-md bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all ${
                                        validationErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
                                    }`}
                                    dir="rtl"
                                />
                                {validationErrors.name && (
                                    <p className="text-red-500 text-sm mt-1 text-right">{validationErrors.name}</p>
                                )}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">זמן האירוע <span className="text-red-500">*</span></label>
                                <input
                                    type="datetime-local"
                                    value={editForm.scheduled_time instanceof Timestamp
                                        ? editForm.scheduled_time.toDate().toISOString().slice(0, 16)
                                        : editForm.scheduled_time || ''}
                                    onChange={(e) => updateForm('scheduled_time', e.target.value)}
                                    className={`w-full p-2 border rounded-md bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all ${
                                        validationErrors.scheduled_time ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
                                    }`}
                                    dir="ltr"
                                />
                                {validationErrors.scheduled_time && (
                                    <p className="text-red-500 text-sm mt-1 text-right">{validationErrors.scheduled_time}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">מיקום האירוע <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={editForm.location || ''}
                                    onChange={(e) => updateForm('location', e.target.value)}
                                    className={`w-full p-2 border rounded-md bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all ${
                                        validationErrors.location ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
                                    }`}
                                    dir="rtl"
                                />
                                {validationErrors.location && (
                                    <p className="text-red-500 text-sm mt-1 text-right">{validationErrors.location}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">תיאור <span className="text-red-500">*</span></label>
                                <textarea
                                    value={editForm.description || ''}
                                    onChange={(e) => updateForm('description', e.target.value)}
                                    className={`w-full p-2 border rounded-md bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all ${
                                        validationErrors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
                                    }`}
                                    rows="3"
                                    dir="rtl"
                                />
                                {validationErrors.description && (
                                    <p className="text-red-500 text-sm mt-1 text-right">{validationErrors.description}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">טלפון <span className="text-red-500">*</span></label>
                                <input
                                    type="tel"
                                    value={editForm.Contact_info || ''}
                                    onChange={(e) => updateForm('Contact_info', e.target.value)}
                                    className={`w-full p-2 border rounded-md bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all ${
                                        validationErrors.Contact_info ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
                                    }`}
                                    dir="ltr"
                                    placeholder="050-1234567"
                                />
                                {validationErrors.Contact_info && (
                                    <p className="text-red-500 text-sm mt-1 text-right">{validationErrors.Contact_info}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">מייל <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    value={editForm.mail || ''}
                                    onChange={(e) => updateForm('mail', e.target.value)}
                                    className={`w-full p-2 border rounded-md bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all ${
                                        validationErrors.mail ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
                                    }`}
                                    dir="ltr"
                                    placeholder="example@domain.com"
                                />
                                {validationErrors.mail && (
                                    <p className="text-red-500 text-sm mt-1 text-right">{validationErrors.mail}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">סטטוס</label>
                                <select
                                    value={editForm.status || 'scheduled'}
                                    onChange={(e) => updateForm('status', e.target.value)}
                                    className="w-full p-2 border rounded-md bg-white hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all appearance-none cursor-pointer"
                                    dir="rtl"
                                >
                                    <option value="scheduled">מתוכנן</option>
                                    <option value="cancelled">מבוטל</option>
                                </select>
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-white py-4 px-6 border-t border-orange-100">
                            <div className="flex justify-end gap-4">
                                <button
                                    onClick={closeModal}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                                >
                                    ביטול
                                </button>
                                <button
                                    onClick={updateEvent}
                                    className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 focus:ring-2 focus:ring-orange-200 transition-colors"
                                >
                                    שמור שינויים
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};