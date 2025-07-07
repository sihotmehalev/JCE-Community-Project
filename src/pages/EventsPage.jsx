import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../config/firebaseConfig';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { EventCard } from '../components/EventCard/EventCard';
import { Heart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const EventsPage = () => {
    const [allEvents, setAllEvents] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [interactingState, setInteractingState] = useState(null);
    const [highlightedEventId, setHighlightedEventId] = useState(null);
    const [scrollingToEvent, setScrollingToEvent] = useState(false);
    const eventRefs = useRef({});
    const location = useLocation();
    const navigate = useNavigate();
    
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        const q = query(collection(db, "Events"));
        const unsubscribeEvents = onSnapshot(q, (snapshot) => {
            const eventData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                scheduled_time: doc.data().scheduled_time?.toDate ? doc.data().scheduled_time.toDate() : null,
            }));
            setAllEvents(eventData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching events in real-time:", err);
            setError("שגיאה בטעינת האירועים. אנא נסה/י שוב מאוחר יותר.");
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeEvents();
        };
    }, []);

    

    // Effect to handle URL parameter for event highlighting and scrolling with debugging
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const eventIdFromUrl = searchParams.get('eventId');
        
        // Debug logging
        console.log('=== EventsPage Debug Info ===');
        console.log('Current URL:', location.pathname + location.search);
        console.log('Event ID from URL:', eventIdFromUrl);
        console.log('All events loaded:', allEvents.length);
        console.log('Event IDs available:', allEvents.map(e => e.id));

        if (eventIdFromUrl && allEvents.length > 0) {
            setScrollingToEvent(true);
            const targetEvent = allEvents.find(event => event.id === eventIdFromUrl);
            console.log('Target event found:', targetEvent);
            
            if (targetEvent) {
                if (eventRefs.current[eventIdFromUrl]) {
                    console.log('Event ref found, scrolling...');
                    // Small delay for smoothness
                    setTimeout(() => {
                        eventRefs.current[eventIdFromUrl].scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setHighlightedEventId(eventIdFromUrl);
                        setScrollingToEvent(false);
                        console.log('Scrolled to event and highlighted');
                    }, 300);

                    const removeHighlightTimeout = setTimeout(() => {
                        setHighlightedEventId(null);
                        navigate('/events', { replace: true });
                        console.log('Highlight removed and URL cleaned');
                    }, 3300);

                    return () => clearTimeout(removeHighlightTimeout);
                } else {
                    console.log('Event ref not found yet, retrying in 500ms...');
                    const retryScroll = setTimeout(() => {
                        if (eventRefs.current[eventIdFromUrl]) {
                            console.log('Event ref found on retry, scrolling...');
                            eventRefs.current[eventIdFromUrl].scrollIntoView({ behavior: 'smooth', block: 'center' });
                            setHighlightedEventId(eventIdFromUrl);
                            setScrollingToEvent(false);
                            setTimeout(() => {
                                setHighlightedEventId(null);
                                navigate('/events', { replace: true });
                                console.log('Highlight removed and URL cleaned (after retry)');
                            }, 3000);
                        } else {
                            console.log('Event ref still not found after retry');
                            setScrollingToEvent(false);
                        }
                    }, 500);
                    return () => clearTimeout(retryScroll);
                }
            } else {
                console.log('Event not found in the events list');
                setScrollingToEvent(false);
            }
        }
        // eslint-disable-next-line
    }, [location.search, allEvents, navigate]);

    const handleInterest = async (eventId) => {
        if (!user) {
            alert("יש להתחבר כדי להביע התעניינות באירוע.");
            return;
        }
        setInteractingState(eventId);

        const eventRef = doc(db, "Events", eventId);
        const eventToUpdate = allEvents.find(e => e.id === eventId);
        const isInterested = eventToUpdate.interestedUsers?.includes(user.uid);

        try {
            await updateDoc(eventRef, {
                interestedUsers: isInterested ? arrayRemove(user.uid) : arrayUnion(user.uid)
            });
        } catch (e) {
            console.error("Error updating interest:", e);
            alert("שגיאה בעדכון ההתעניינות. נסה/י שוב.");
        } finally {
            setInteractingState(null);
        }
    };

    const upcomingEvents = allEvents
        .filter(event => event.scheduled_time && event.scheduled_time >= new Date())
        .sort((a, b) => a.scheduled_time - b.scheduled_time);

    const pastEvents = allEvents
        .filter(event => event.scheduled_time && event.scheduled_time < new Date())
        .sort((a, b) => b.scheduled_time - a.scheduled_time);

    const renderEvent = (event) => {
        const isInterested = user && event.interestedUsers?.includes(user.uid);
        const interestCount = event.interestedUsers?.length || 0;
        const isCurrentlyHighlighted = highlightedEventId === event.id;

        return (
            <div 
                key={event.id} 
                ref={el => {
                    eventRefs.current[event.id] = el;
                    if (el && event.id === highlightedEventId) {
                        console.log('Ref set for highlighted event:', event.id);
                    }
                }}
                className={`flex flex-col h-full transition-all duration-500 ease-in-out transform
                            ${isCurrentlyHighlighted ? 'ring-4 ring-orange-500 shadow-2xl scale-[1.02] bg-orange-50/20' : ''}`}
            >
                <div className="flex-grow">
                    <EventCard event={event} />
                </div>
                <div className="p-3 flex items-center justify-between gap-4">
                    <button
                        onClick={() => handleInterest(event.id)}
                        disabled={!user || interactingState === event.id}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 w-full
                            ${isInterested 
                                ? 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200' 
                                : 'bg-orange-100 text-orange-800 border border-orange-200 hover:bg-orange-200'}
                            ${!user ? 'opacity-50 cursor-not-allowed' : ''}
                            ${interactingState === event.id ? 'animate-pulse' : ''}
                        `}
                    >
                        <Heart className={`w-4 h-4 ${isInterested ? 'fill-current' : ''}`} />
                        {interactingState === event.id ? 'מעדכן...' : (isInterested ? 'הסר התעניינות' : 'מעוניין להגיע')}
                    </button>
                    <div className="flex-shrink-0 text-sm text-gray-600 whitespace-nowrap">
                        <strong>{interestCount}</strong> {interestCount === 1 ? 'מתעניין' : 'מתעניינים'}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            {scrollingToEvent && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-6 py-3 rounded-full shadow-lg z-50 animate-pulse">
                    מעבר לאירוע...
                </div>
            )}
            
            <h1 className="text-4xl font-bold text-orange-800 mb-8 text-center">אירועים קהילתיים</h1>

            {loading ? (
                <LoadingSpinner />
            ) : error ? (
                <p className="text-center text-red-500">{error}</p>
            ) : (
                <>
                    <section>
                        <h2 className="text-3xl font-semibold text-gray-700 mb-6 border-b-2 border-orange-500 pb-2">אירועים קרובים</h2>
                        {upcomingEvents.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {upcomingEvents.map(renderEvent)}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-8">אין אירועים קרובים. בדקו שוב מאוחר יותר!</p>
                        )}
                    </section>

                    <section className="mt-16">
                        <h2 className="text-3xl font-semibold text-gray-700 mb-6 border-b-2 border-gray-300 pb-2">אירועי עבר</h2>
                        {pastEvents.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {pastEvents.map(renderEvent)}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-8">אין אירועי עבר להצגה.</p>
                        )}
                    </section>
                </>
            )}
        </div>
    );
};

export default EventsPage;