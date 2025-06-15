import React, { useEffect } from 'react';
import Navbar from './Navbar';
import { EventSlider } from "./EventSlider/EventSlider";
import { fetchEvents } from "./providers/eventProvider";
import { useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function Layout({ children },) {

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const showEventsPages = ['/', '/requester-dashboard', '/volunteer-dashboard'];
    const shouldShowEvents = showEventsPages.includes(location.pathname);

    useEffect(() => {
        const loadEvents = async () => {
            if (!shouldShowEvents) return;

            try {
                const eventData = await fetchEvents("requester");
                setEvents(eventData);
            } catch (error) {
                console.error("Error:", error);
            } finally {
                setLoading(false);
            }
        };

        loadEvents();
    }, [location.pathname, shouldShowEvents]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-200 via-orange-200 to-red-300">
            <Navbar />

            <main className="container mx-auto px-4 py-4 mt-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-xl p-6">
                    {children}
                </div>
            </main>

            <footer className="bg-orange-100/30 backdrop-blur-sm py-4 mt-auto">
                { shouldShowEvents && (
                    <div>
                        <section className="mt-8">
                            {loading ? (
                                <div>טוען אירועים...</div>
                            ) : (
                                <EventSlider events={events} />
                            )}
                        </section>
                    </div>
                )}
                <div className="container mx-auto px-4 text-center text-orange-800">
                    <p>© 2024 Talks from the Heart. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}