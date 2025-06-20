// EventSlider.jsx
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
                    <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:w-[600px]"> {/* Responsive width for single event */}
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

        // Responsive card container width
        const cardContainerWidthClass = "w-full max-w-[300px] sm:max-w-[350px] md:max-w-[400px] lg:w-[450px]";

        // Responsive translateX offsets (relative to the center of the slider)
        // Mobile-first (default) values, then overridden for larger screens (lg:)
        const currentTranslateXOffset = "0 lg:-translate-x-[200px]"; // Original PC value was -200px
        const prevTranslateXOffset = "-translate-x-[100%] sm:-translate-x-[120%] md:-translate-x-[140%] lg:-translate-x-[600px]"; // Original PC value was -600px
        const nextTranslateXOffset = "translate-x-[100%] sm:translate-x-[120%] md:translate-x-[140%] lg:translate-x-[200px]"; // Original PC value was 200px

        // Rotation values (can be less aggressive on smaller screens)
        const prevRotateY = "rotate-y-[-40deg] sm:rotate-y-[-45deg] lg:rotate-y-[-55deg]";
        const nextRotateY = "rotate-y-[40deg] sm:rotate-y-[45deg] lg:rotate-y-[55deg]";

        let transformValue = '';
        let opacityValue = 'opacity-0';
        let zIndexValue = 'z-0';
        let scaleValue = 'scale-50';
        
        if (isCurrent) {
            transformValue = `${currentTranslateXOffset} rotate-y-0`; // Apply responsive offset
            opacityValue = 'opacity-100';
            zIndexValue = 'z-10';
            scaleValue = 'scale-100';
        } else if (isPrev) {
            transformValue = `${prevTranslateXOffset} ${prevRotateY}`; // Apply responsive offset and rotation
            opacityValue = 'opacity-50';
            zIndexValue = 'z-0';
            scaleValue = 'scale-90';
        } else if (isNext) {
            transformValue = `${nextTranslateXOffset} ${nextRotateY}`; // Apply responsive offset and rotation
            opacityValue = 'opacity-50';
            zIndexValue = 'z-0';
            scaleValue = 'scale-90';
        }

        return `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${cardContainerWidthClass} h-[400px] cursor-pointer backface-hidden transition-all duration-700 ease-in-out
                ${opacityValue} transform ${scaleValue} ${transformValue} ${zIndexValue}`;
    };

    return (
        <div className="p-4 max-w-7xl mx-auto overflow-hidden">
            <h2 className="text-3xl font-bold text-orange-800 mb-6 text-center">אירועים קרובים</h2>
            <div className="relative flex items-center justify-center h-[500px] perspective-1000 z-0">
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
