import { EventCard } from "../EventCard/EventCard";
import { useState } from "react";
import { useEffect } from "react";
import { fetchEvents } from "../providers/EventProvider";

export const EventSlider = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [events, setEvents] = useState([]);

    useEffect(() => {
        const loadEvents = async () => {
            try {
                const eventData = await fetchEvents();
                setEvents(eventData);
            } catch (error) {
                console.error("Error:", error);
            }

        };
        loadEvents();
    }, []);
    
    // if no events are provided, return a message
    if (!events || events.length === 0) {
        return <div className="p-4 text-center text-orange-800">אין אירועים להצגה</div>;
    }

    // if only one event is provided, display it without slider functionality
    if (events.length === 1) {
        return (
            <div className="p-4 max-w-7xl mx-auto overflow-hidden">
                <h2 className="text-3xl font-bold text-orange-800 mb-6 text-center">אירועים קרובים</h2>
                <div className="flex justify-center">
                    <div className="w-[600px]">
                        <EventCard event={events[0]} />
                    </div>
                </div>
            </div>
        );
    }

    // Function to get the previous and next indices for the slider
    const getPreviousIndex = () => {
        return currentIndex > 0 ? currentIndex - 1 : events.length - 1;
    };

    const getNextIndex = () => {
        return currentIndex < events.length - 1 ? currentIndex + 1 : 0;
    };

    return (
        <div className="p-4 max-w-7xl mx-auto overflow-hidden">
            <h2 className="text-3xl font-bold text-orange-800 mb-6 text-center">אירועים קרובים</h2>
            <div className="relative">
                <button 
                    onClick={() => setCurrentIndex(getPreviousIndex())}
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 
                             bg-orange-100 text-orange-800 px-4 py-2 rounded-full
                             hover:bg-orange-200 transition-colors duration-200
                             shadow-md"
                >
                    ←
                </button>
                <div className="flex items-center justify-center gap-4">
                    <div 
                        onClick={() => setCurrentIndex(getPreviousIndex())}
                        className="relative w-[300px] opacity-50 blur-sm transform scale-90 transition-all duration-300 cursor-pointer hover:opacity-70"
                    >
                        <EventCard event={events[getPreviousIndex()]} />
                    </div>
                    
                    <div className="relative w-[600px] z-10 transform scale-100 transition-all duration-300">
                        <EventCard event={events[currentIndex]} />
                    </div>
                    
                    <div 
                        onClick={() => setCurrentIndex(getNextIndex())}
                        className="relative w-[300px] opacity-50 blur-sm transform scale-90 transition-all duration-300 cursor-pointer hover:opacity-70"
                    >
                        <EventCard event={events[getNextIndex()]} />
                    </div>
                </div>
                <button 
                    onClick={() => setCurrentIndex(getNextIndex())}
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10
                             bg-orange-100 text-orange-800 px-4 py-2 rounded-full
                             hover:bg-orange-200 transition-colors duration-200
                             shadow-md"
                >
                    →
                </button>
            </div>
        </div>
    );
};