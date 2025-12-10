import React from 'react';
import { Booking } from '../types.ts';
import { Calendar, Clock, CheckCircle, Sparkles } from 'lucide-react';

interface BookingsViewProps {
  bookings: Booking[];
}

const BookingsView: React.FC<BookingsViewProps> = ({ bookings }) => {
  return (
    <div className="bg-gradient-to-br from-glam-rose via-pink-600 to-pink-500 text-white p-6 rounded-2xl shadow-xl h-full overflow-y-auto relative border border-white/20">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles className="w-24 h-24 text-white transform rotate-12" />
      </div>

      <div className="flex items-center gap-2 mb-6 relative z-10">
        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-inner">
            <Calendar className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-serif font-bold text-white tracking-wide drop-shadow-sm">Appointments</h2>
      </div>
      
      {bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-white/80 text-center relative z-10">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-3 backdrop-blur-md border border-white/20">
                 <Calendar className="w-8 h-8 text-white/70" />
            </div>
            <p className="text-base font-medium text-white">No bookings yet</p>
            <p className="text-xs mt-1 text-pink-100">Ask Aleeza to schedule one!</p>
        </div>
      ) : (
        <div className="space-y-4 relative z-10">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white/20 backdrop-blur-md p-4 rounded-xl border border-white/30 shadow-lg hover:bg-white/25 transition-all hover:scale-[1.02] duration-200">
              <div className="flex items-start justify-between">
                <div>
                   <h3 className="font-bold text-white text-lg shadow-black/5 drop-shadow-sm">{booking.serviceName}</h3>
                   <p className="text-sm text-pink-50 font-medium">{booking.customerName}</p>
                </div>
                {booking.status === 'confirmed' && (
                    <span className="bg-white/20 text-white text-[10px] px-2 py-1 rounded-full border border-white/40 flex items-center gap-1 font-bold shadow-sm">
                        <CheckCircle className="w-3 h-3" /> Confirmed
                    </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-4 text-xs text-white font-medium">
                <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1.5 rounded-lg border border-white/10">
                    <Calendar className="w-3.5 h-3.5 text-pink-200" />
                    <span>{booking.date}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1.5 rounded-lg border border-white/10">
                    <Clock className="w-3.5 h-3.5 text-pink-200" />
                    <span>{booking.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingsView;
