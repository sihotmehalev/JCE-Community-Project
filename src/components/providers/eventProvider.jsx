import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../../firebaseConfig";

// This function fetches all events from the Firestore database
export const fetchEvents = async () => {
    try {
        const eventsRef = collection(db, "Events");
        const q = query(
            eventsRef,
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching events:", error);
        throw error;
    }
};