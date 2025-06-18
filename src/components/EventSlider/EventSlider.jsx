import { EventCard } from "../EventCard/EventCard";
import { useState, useEffect } from "react";
import { fetchEvents } from "../../providers/EventProvider";

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

    const handlePrevClick = () => {
        setCurrentIndex(getPreviousIndex());
    };

    const handleNextClick = () => {
        setCurrentIndex(getNextIndex());
    };

    const getCardStyles = (index) => {
        const isCurrent = index === currentIndex;
        const isPrev = index === getPreviousIndex();
        const isNext = index === getNextIndex();

        let transformValue = '';
        let opacityValue = 'opacity-0';
        let zIndexValue = 'z-0';
        let scaleValue = 'scale-50';

        if (isCurrent) {
            transformValue = 'translate-x-[-200px] rotate-y-0';
            opacityValue = 'opacity-100';
            zIndexValue = 'z-20';
            scaleValue = 'scale-100';
        } else if (isPrev) {
            // Position to the left of the current card, rotated left (turning away from center)
            transformValue = '-translate-x-[600px] rotate-y-[-55deg]'; 
            opacityValue = 'opacity-50';
            zIndexValue = 'z-10';
            scaleValue = 'scale-90';
        } else if (isNext) {
            // Position to the right of the current card, rotated right (turning away from center)
            transformValue = 'translate-x-[200px] rotate-y-[55deg]'; 
            opacityValue = 'opacity-50';
            zIndexValue = 'z-10';
            scaleValue = 'scale-90';
        }

        return `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[400px] cursor-pointer backface-hidden transition-all duration-700 ease-in-out
                ${opacityValue} transform ${scaleValue} ${transformValue} ${zIndexValue}`;
    };

    return (
        <div className="p-4 max-w-7xl mx-auto overflow-hidden">
            <h2 className="text-3xl font-bold text-orange-800 mb-6 text-center">אירועים קרובים</h2>
            <div className="relative flex items-center justify-center h-[500px] perspective-1000">
                <div className="relative w-full h-full">
                    {events.map((event, index) => (
                        <div
                            key={index}
                            className={getCardStyles(index)}
                            onClick={() => {
                                if (index === getPreviousIndex()) {
                                    handlePrevClick();
                                } else if (index === getNextIndex()) {
                                    handleNextClick();
                                }
                            }}
                        >
                            <EventCard event={event} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};