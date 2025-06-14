import { format } from 'date-fns';

const DEFAULT_IMAGE = '/images/event-photo.jpg';

export const EventCard = ({ event }) => {
    if (!event) {
        return <div>Loading...</div>;
    }

    if (event.status === 'cancelled') {
        return (
            <div>
                <div>Event Cancelled</div>
                <div>{event.description || 'This event has been cancelled.'}</div>
            </div>
        );
    }

    // Safe data extraction with fallbacks
    const imageUrl = event.image || DEFAULT_IMAGE;
    const description = event.description || 'No description available';
    const location = event.location || 'Location TBA';
    const phoneNumber = event.Contact_info || event.phoneNumber || event.phone;
    
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
        <div className="flex justify-center items-center w-full">
            <div className="max-w-sm rounded-2xl overflow-hidden shadow-lg transform hover:scale-105 transition-transform duration-200 bg-gradient-to-br from-white to-orange-50">
                <div className="relative h-48">
                    <img 
                        src={imageUrl}
                        alt={description}
                        onError={handleImageError}
                        className="w-full h-full object-cover"
                    />
                    {event.status && event.status !== 'over' && (
                        <div className="absolute top-2 right-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
                            {event.status}
                        </div>
                    )}
                </div>
                <div className="p-6 space-y-3">
                    <h2 className="text-xl font-bold text-orange-800 mb-2">{description}</h2>
                    <div className="space-y-2 text-orange-700">
                        <p className="flex items-center">
                            <span className="mr-2">📅</span>
                            {formatEventDate()}
                        </p>
                        <p className="flex items-center">
                            <span className="mr-2">📍</span>
                            {location}
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