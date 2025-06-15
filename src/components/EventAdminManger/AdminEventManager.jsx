import { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { fetchEvents } from '../providers/eventProvider';

export const AdminEventManager = () => {

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'all',
        timeFrame: 'all',
        searchQuery: ''
    });
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        location: '',
        Contact_info: '',
        scheduled_time: '',
        status: 'scheduled',
        image: ''
    });

    const statusOptions = ['all', 'scheduled', 'cancelled'];
    const timeFrameOptions = ['all', 'upcoming', 'past'];

    // Used to filter events based on the current filters
    const getFilteredEvents = () => {
        return events.filter(event => {

            if (filters.status !== 'all' && event.status !== filters.status) {
                return false;
            }

            if (filters.timeFrame !== 'all') {
                const eventDate = event.scheduled_time.toDate();
                const now = new Date();
                if (filters.timeFrame === 'upcoming' && eventDate < now) {
                    return false;
                }
                if (filters.timeFrame === 'past' && eventDate > now) {
                    return false;
                }
            }

            if (filters.searchQuery) {
                const query = filters.searchQuery.toLowerCase();
                return (
                    event.name?.toLowerCase().includes(query) ||
                    event.description?.toLowerCase().includes(query) ||
                    event.location?.toLowerCase().includes(query)
                );
            }

            return true;
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.description) {
            alert('יש למלא את שם האירוע ואת התיאור');
            return;
        }
        try {
            const eventData = {
                ...formData,
                status: 'scheduled',
                Event_added_time: Timestamp.now(),
                scheduled_time: Timestamp.fromDate(new Date(formData.scheduled_time))
            };
            await addDoc(collection(db, "Events"), eventData);
            alert('אירוע נוצר בהצלחה!');
  
            setFormData({
                name: '',
                description: '',
                location: '',
                Contact_info: '',
                scheduled_time: '',
                status: 'scheduled',
                image: ''
            });
            const updatedEvents = await fetchEvents();
            setEvents(updatedEvents);
        } catch (error) {
            console.error("Error creating event:", error);
            alert('שגיאה ביצירת האירוע');
        }
    };

    const handleUncancelEvent = async (eventId) => {
        try {
            await updateDoc(doc(db, "Events", eventId), {
                status: 'scheduled'
            });
            const updatedEvents = await fetchEvents();
            setEvents(updatedEvents);
            alert('האירוע הוחזר בהצלחה');
        } catch (error) {
            console.error("Error uncancelling event:", error);
            alert('שגיאה בהחזרת האירוע');
        }
    };

    const handleCancelEvent = async (eventId) => {
        try {
            await updateDoc(doc(db, "Events", eventId), {
                status: 'cancelled'
            });
            const updatedEvents = await fetchEvents();
            setEvents(updatedEvents);
            alert('האירוע בוטל בהצלחה');
        } catch (error) {
            console.error("Error cancelling event:", error);
            alert('שגיאה בביטול האירוע');
        }
    };

    useEffect(() => {
        const loadEvents = async () => {
            try {
                const eventData = await fetchEvents();
                setEvents(eventData);
            } catch (error) {
                console.error("Error loading events:", error);
            } finally {
                setLoading(false);
            }
        };
        loadEvents();
    }, []);

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h2 className="text-2xl font-bold text-orange-800 mb-6">ניהול אירועים</h2>
            
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h3 className="text-xl font-semibold text-orange-700 mb-4">יצירת אירוע חדש</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        name="name"
                        placeholder="שם האירוע"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        required
                    />
                    <input
                        type="text"
                        name="description"
                        placeholder="תיאור האירוע"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        required
                    />
                    <input
                        type="text"
                        name="location"
                        placeholder="מיקום"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        required
                    />
                    <input
                        type="text"
                        name="Contact_info"
                        placeholder="פרטי קשר"
                        value={formData.Contact_info}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        required
                    />
                    <input
                        type="datetime-local"
                        name="scheduled_time"
                        placeholder="זמן מתוכנן"
                        value={formData.scheduled_time}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        required
                    />
                    <div className="flex gap-4">
                        <button
                            type="submit"
                            className="bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700"
                        >
                            שמור אירוע
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h3 className="text-xl font-semibold text-orange-700 mb-4">סינון אירועים</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="p-2 border rounded"
                    >
                        <option value="all">כל הסטטוסים</option>
                        <option value="scheduled">מתוכננים</option>
                        <option value="cancelled">מבוטלים</option>
                    </select>

                    <select
                        value={filters.timeFrame}
                        onChange={(e) => setFilters(prev => ({ ...prev, timeFrame: e.target.value }))}
                        className="p-2 border rounded"
                    >
                        <option value="all">כל הזמנים</option>
                        <option value="upcoming">אירועים עתידיים</option>
                        <option value="past">אירועים שעברו</option>
                    </select>

                    <input
                        type="text"
                        placeholder="חיפוש לפי תיאור או מיקום"
                        value={filters.searchQuery}
                        onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                        className="p-2 border rounded"
                    />
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-orange-700 mb-4">רשימת אירועים</h3>                {loading ? (
                    <p>טוען אירועים...</p>
                ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {getFilteredEvents().map(event => (
                            <div key={event.id} className="border p-4 rounded">
                                <h4 className="font-semibold"> שם: {event.name} </h4>
                                <p>מיקום: {event.location}</p>
                                <p>סטטוס: {event.status}</p>
                                <p>תיאור: {event.description}</p>
                                <div className="mt-2 space-x-2">
                                    {event.status === 'scheduled' ? (
                                        <button
                                            onClick={() => handleCancelEvent(event.id)}
                                            className="bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700"
                                        >
                                            בטל אירוע
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleUncancelEvent(event.id)}
                                            className="bg-green-600 text-white py-1 px-3 rounded hover:bg-green-700"
                                        >
                                            החזר אירוע
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};