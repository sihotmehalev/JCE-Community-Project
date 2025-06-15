import { EventCard } from "../EventCard/EventCard";
import { useState } from "react";

export const EventSlider = ({ events }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    
    if (!events || events.length === 0) {
        return <div className="p-4 text-center text-orange-800">אין אירועים להצגה</div>;
    }

    const goToPrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        } else {
            setCurrentIndex(events.length - 1);
        }
    };

    const goToNext = () => {
        if (currentIndex < events.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setCurrentIndex(0);
        }
    };

    return (
        <div className="p-4 max-w-7xl mx-auto overflow-hidden">
            <h2 className="text-3xl font-bold text-orange-800 mb-6 text-center">אירועים קרובים</h2>
            <div className="relative">
                <button 
                    onClick={goToPrevious}
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 
                             bg-orange-100 text-orange-800 px-4 py-2 rounded-full
                             hover:bg-orange-200 transition-colors duration-200
                             shadow-md"
                >
                    ←
                </button>
                <div className="flex items-center justify-center gap-4">
                    <div 
                        onClick={goToPrevious}
                        className="relative w-[300px] opacity-50 blur-sm transform scale-90 transition-all duration-300 cursor-pointer hover:opacity-70"
                    >
                        {currentIndex > 0 && (
                            <EventCard event={events[currentIndex - 1]} />
                        )}
                    </div>
                    
                    <div className="relative w-[600px] z-10 transform scale-100 transition-all duration-300">
                        <EventCard event={events[currentIndex]} />
                    </div>
                    
                    <div 
                        onClick={goToNext}
                        className="relative w-[300px] opacity-50 blur-sm transform scale-90 transition-all duration-300 cursor-pointer hover:opacity-70"
                    >
                        {currentIndex < events.length - 1 && (
                            <EventCard event={events[currentIndex + 1]} />
                        )}
                    </div>
                </div>
                <button 
                    onClick={goToNext}
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