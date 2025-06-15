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
            <div className="w-[600px] rounded-2xl overflow-hidden shadow-lg transform transition-transform duration-200 bg-gradient-to-br from-white to-orange-50">
                <div className="relative h-72">
                    <img 
                        src={imageUrl}
                        alt={description}
                        onError={handleImageError}
                        className="w-full h-full object-cover"
                    />
                    {event.status && event.status !== 'over' && (
                        <div className={`absolute top-4 right-4 px-4 py-2 rounded-full text-lg font-semibold flex items-center gap-2
                            ${event.status === 'scheduled' 
                                ? 'bg-green-100 text-green-800 border-2 border-green-500' 
                                : 'bg-orange-100 text-orange-800'}`}>
                            {event.status}
                            {event.status === 'scheduled' && (
                                <span className="text-green-600">✓</span>
                            )}
                        </div>
                    )}
                </div>
                <div className="p-8 space-y-4">
                    <h2 className="text-2xl font-bold text-orange-800 mb-3">{description}</h2>
                    <div className="space-y-3 text-orange-700 text-lg">
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