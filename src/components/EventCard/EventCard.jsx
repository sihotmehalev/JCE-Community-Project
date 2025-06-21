// EventCard.jsx
import { format } from 'date-fns';

const DEFAULT_IMAGE = '/images/event_default_image.jpg';

export const EventCard = ({ event }) => {
    // Ensure event is defined and has necessary properties
    if (!event) {
        return <div>Loading...</div>;
    }

    // Safe data extraction with fallbacks
    const eventName = event.name || 'אירוע כללי';
    const imageUrl = event.image || DEFAULT_IMAGE;
    const description = event.description || 'No description available';
    const location = event.location || 'Location TBA';
    const phoneNumber = event.Contact_info || event.phoneNumber || event.phone;
    const mail = event.mail || 'No contact email provided';
    
    // Safe date formatting
    const formatEventDate = () => {
        try {
            if (!event.scheduled_time) return 'Date TBA';

            const date = typeof event.scheduled_time.toDate === 'function'
                ? event.scheduled_time.toDate()
                : new Date(event.scheduled_time);

            return format(date, 'PPp');
        } catch (error) {
            console.warn('Error formatting date:', error);
            return 'Invalid date';
        }
    };

    const handleImageError = (e) => {
        e.target.src = DEFAULT_IMAGE;
    };

    return (
        <div className="flex justify-center items-center w-full h-full"> {/* Outer container for centering */}
            <div className="w-full lg:w-[450px] rounded-xl overflow-hidden shadow-lg transform transition-transform duration-200 bg-gradient-to-br from-white to-orange-50">
                <div className="relative h-36">
                    <img 
                        src={imageUrl}
                        alt={description}
                        onError={handleImageError}
                        className="w-full h-full object-cover"
                    />
                    {event.status && (
                        <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1
                            ${event.status === 'scheduled' 
                                ? 'bg-green-100 text-green-800 border border-green-500' 
                                : event.status === 'cancelled'
                                ? 'bg-red-100 text-red-800 border border-red-500'
                                : 'bg-orange-100 text-orange-800'}`}>
                            {event.status}
                            {event.status === 'scheduled' && (
                                <span className="text-green-600">✓</span>
                            )}
                            {event.status === 'cancelled' && (
                                <span className="text-red-600">✕</span>
                            )}
                        </div>
                    )}
                </div>
                <div className="p-4 space-y-2">
                    <h2 className="text-xl font-bold text-orange-800 mb-2">{eventName}</h2>
                    <p className="text-base text-orange-700 mb-3">{description}</p>
                    <div className="space-y-2 text-orange-700 text-base">
                        <p className="flex items-center">
                            <span className="mr-2">📅</span>
                            {formatEventDate()}
                        </p>
                        <p className="flex items-center">
                            <span className="mr-2">📍</span>
                            {location}
                        </p>
                        <p className="flex items-center">
                            <span className="mr-2">📧</span>
                            {mail}
                        </p>
                        {phoneNumber && (
                            <p className="flex items-center">
                                <span className="mr-2">📞</span>
                                {phoneNumber}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};