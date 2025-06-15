import { db } from "./firebaseConfig";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { useState, useEffect } from "react";
import { EventSlider } from "./components/EventSlider/EventSlider";


const handleAddEvent = async () => {
    try {
      console.log("Adding second event...");
      await addDoc(collection(db, "Events"), {
        Contact_info: "054-9876-333",
        Event_added_time: Timestamp.fromDate(new Date("2025-06-15T15:00:00+03:00")),
        description: "third test event.",
        image: "",
        location: "Whatsup",
        scheduled_time: Timestamp.fromDate(new Date("2025-08-29T20:00:00+03:00")),
        status: "cancelled"
      });
      alert("Event added successfully!");
    } catch (error) {
      console.error("Error adding event:", error);
    }
};

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
            <h1 className="text-2xl font-bold mb-4">אירועים</h1>
            <EventSlider events={events} />
            <div>
                <button onClick={handleAddEvent}>Add Second Event</button>
            </div>
        </div>

    );
}