import { EventCard } from "./components/EventCard/EventCard";
import { db } from "./firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { useState, useEffect } from "react";

export default function TestEventPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const eventsCollection = collection(db, "Events");
                const eventSnapshot = await getDocs(eventsCollection);
                const eventsList = eventSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setEvents(eventsList);
                console.log("Fetched events:", eventsList); // For debugging
            } catch (err) {
                console.error("Error fetching events:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    if (loading) return <div className="p-4 text-center">טוען אירועים...</div>;
    if (error) return <div className="p-4 text-center text-red-500">שגיאה: {error}</div>;
    if (events.length === 0) return <div className="p-4 text-center">אין אירועים להצגה</div>;

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4 text-center">אירועים קרובים</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map(event => (
                    <EventCard key={event.id} event={event} />
                ))}
            </div>
        </div>
    );
}