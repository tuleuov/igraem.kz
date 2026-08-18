import React, { useState } from 'react';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { Booking } from '../types';
import { formatDateDDMMYYYY } from '../utils/date';

interface BookingsTabProps {
  bookings: Booking[];
  onOpenVenue: (booking: Booking) => void;
  onSelectVenueForBooking?: (venueId: string) => void;
  onRefreshBookings?: () => void;
}

export const BookingsTab: React.FC<BookingsTabProps> = ({
  bookings,
  onOpenVenue,
  onSelectVenueForBooking,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'upcoming' | 'past'>('upcoming');

  // Split bookings into upcoming vs past (sort active booking to top)
  const upcomingBookings = React.useMemo(() => {
    const list = bookings.filter((b) => b.status === 'active' || b.status === 'upcoming');
    return [...list].sort((a, b) => {
      const aActive = a.isOpened || a.status === 'active' ? 1 : 0;
      const bActive = b.isOpened || b.status === 'active' ? 1 : 0;
      return bActive - aActive; // Active booking ALWAYS at top
    });
  }, [bookings]);

  const pastBookings = React.useMemo(() => {
    return bookings.filter((b) => b.status === 'completed');
  }, [bookings]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 text-slate-900 min-w-[360px] animate-fade-in">
      {/* White Panel Header with Segmented Control (Предстоящие & Прошедшие) */}
      <div className="bg-white px-4 pt-3 pb-3 border-b border-slate-200/80 sticky top-0 z-10">
        <div className="relative bg-[#F8FAFC] border border-slate-200/80 p-1 rounded-2xl flex items-center h-11">
          {/* Animated Sliding Pill Indicator */}
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-xs border border-slate-200/60 transition-all duration-300 ease-out ${
              activeSubTab === 'upcoming' ? 'left-1' : 'left-[calc(50%+2px)]'
            }`}
          />

          <button
            type="button"
            onClick={() => setActiveSubTab('upcoming')}
            className={`relative z-10 flex-1 h-9 px-2 text-xs text-center flex items-center justify-center transition-colors duration-200 ${
              activeSubTab === 'upcoming'
                ? 'text-[#00B050] font-semibold'
                : 'text-slate-500 font-semibold hover:text-slate-900'
            }`}
          >
            Предстоящие
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('past')}
            className={`relative z-10 flex-1 h-9 px-2 text-xs text-center flex items-center justify-center transition-colors duration-200 ${
              activeSubTab === 'past'
                ? 'text-[#00B050] font-semibold'
                : 'text-slate-500 font-semibold hover:text-slate-900'
            }`}
          >
            Прошедшие
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {/* Sub-Tab 1: Предстоящие */}
        {activeSubTab === 'upcoming' && (
          <div className="space-y-3.5">
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                У вас нет предстоящих бронирований
              </div>
            ) : (
              upcomingBookings.map((b) => {
                const isActive = b.isOpened || b.status === 'active';
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onOpenVenue(b)}
                    className={`w-full text-left bg-white hover:bg-slate-50/80 border rounded-2xl p-4 shadow-xs space-y-3 transition-all cursor-pointer group active:scale-98 block ${
                      isActive ? 'border-[#00B050]/60 ring-2 ring-[#00B050]/15' : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-900 text-[10px] font-normal border border-slate-200/60">
                          {b.sport === 'football' ? '⚽ Футбол' : '🏀 Баскетбол'}
                        </span>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E8F8F0] text-[#00B050] text-[10px] font-bold border border-[#00B050]/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00B050] animate-pulse" />
                            <span>Активная бронь</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-[#00B050] transition-colors">
                        {b.venueTitle}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">{b.address}</p>
                      <p className="text-xs text-slate-500 font-medium">
                        {formatDateDDMMYYYY(b.date)}, {b.timeSlot}
                      </p>
                    </div>

                    <div className="flex justify-end pt-1">
                      <div className="text-[#00B050] group-hover:text-[#009644] font-bold text-xs flex items-center gap-0.5 transition-colors">
                        <span>Перейти к брони</span>
                        <ChevronRight className="w-4 h-4 stroke-[2.5px] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* Sub-Tab 2: Прошедшие */}
        {activeSubTab === 'past' && (
          <div className="space-y-3.5">
            {pastBookings.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                У вас нет прошедших бронирований
              </div>
            ) : (
              pastBookings.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onSelectVenueForBooking && onSelectVenueForBooking(b.venueId)}
                  className="w-full text-left bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-slate-300 rounded-2xl p-4 shadow-xs space-y-3 transition-all cursor-pointer group active:scale-98 block"
                >
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-900 text-[10px] font-normal border border-slate-200/60">
                      {b.sport === 'football' ? '⚽ Футбол' : '🏀 Баскетбол'}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-[#00B050] transition-colors">
                      {b.venueTitle}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">{b.address}</p>
                    <p className="text-xs text-slate-500 font-medium">
                      {formatDateDDMMYYYY(b.date)}, {b.timeSlot}
                    </p>
                  </div>

                  <div className="flex justify-end pt-1">
                    <div className="text-[#00B050] group-hover:text-[#009644] font-bold text-xs flex items-center gap-1.5 transition-colors">
                      <RotateCcw className="w-3.5 h-3.5 stroke-[2.5px]" />
                      <span>Забронировать снова</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
