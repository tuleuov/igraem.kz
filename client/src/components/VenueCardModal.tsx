import React, { useState, useRef } from 'react';
import { Heart, Check, Star } from 'lucide-react';
import { Venue, TimeSlot } from '../types';
import { calculateDistanceMeters, formatDistance } from '../utils/geo';

interface VenueCardModalProps {
  venue: Venue | null;
  userCoords?: { lat: number; lng: number } | null;
  onClose: () => void;
  onBook: (venue: Venue, date: string, slot: TimeSlot) => void;
  isFavorite: boolean;
  onToggleFavorite: (venueId: string) => void;
}

const getUpcomingDays = () => {
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const days = [];
  const today = new Date();

  for (let i = 0; i < 6; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const yearStr = d.getFullYear();
    const formattedDDMMYYYY = `${dayStr}.${monthStr}.${yearStr}`;

    days.push({
      day: dayNames[d.getDay()],
      num: String(d.getDate()),
      fullDateStr: formattedDDMMYYYY,
      label: `${dayNames[d.getDay()]}, ${formattedDDMMYYYY}`,
    });
  }
  return days;
};

const TIME_SLOTS_GRID = [
  { time: '08:00 – 09:00', status: 'available' },
  { time: '09:00 – 10:00', status: 'available' },
  { time: '10:00 – 11:00', status: 'available' },
  { time: '11:00 – 12:00', status: 'available' },
  { time: '12:00 – 13:00', status: 'available' },
  { time: '13:00 – 14:00', status: 'available' },
  { time: '14:00 – 15:00', status: 'available' },
  { time: '15:00 – 16:00', status: 'available' },
  { time: '16:00 – 17:00', status: 'available' },
  { time: '17:00 – 18:00', status: 'available' },
  { time: '18:00 – 19:00', status: 'available' },
  { time: '19:00 – 20:00', status: 'available' },
  { time: '20:00 – 21:00', status: 'available' },
  { time: '21:00 – 22:00', status: 'available' },
  { time: '22:00 – 23:00', status: 'available' },
];

export const VenueCardModal: React.FC<VenueCardModalProps> = ({
  venue,
  userCoords,
  onClose,
  onBook,
  isFavorite,
  onToggleFavorite,
}) => {
  if (!venue) return null;

  // Calculate real GPS distance in meters/km if user geolocation is enabled
  const distanceText = React.useMemo(() => {
    if (!userCoords || !venue || !userCoords.lat || !userCoords.lng) return null;
    const meters = calculateDistanceMeters(userCoords.lat, userCoords.lng, venue.lat, venue.lng);
    return formatDistance(meters);
  }, [userCoords, venue]);

  const upcomingDays = React.useMemo(() => getUpcomingDays(), []);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedSlotTimes, setSelectedSlotTimes] = useState<string[]>([]);
  const [isJoinSuccessModalOpen, setIsJoinSuccessModalOpen] = useState(false);
  const [maxSlotsWarning, setMaxSlotsWarning] = useState(false);
  const touchStartY = useRef<number | null>(null);

  // Toggle multi-slot selection up to 3 hours (3 slots max)
  const handleSlotClick = (slotTime: string) => {
    setMaxSlotsWarning(false);
    if (selectedSlotTimes.includes(slotTime)) {
      const filtered = selectedSlotTimes.filter((s) => s !== slotTime);
      setSelectedSlotTimes(filtered);
    } else {
      if (selectedSlotTimes.length >= 3) {
        setMaxSlotsWarning(true);
        // Start fresh selection with newly clicked slot
        setSelectedSlotTimes([slotTime]);
        return;
      }
      const sorted = [...selectedSlotTimes, slotTime].sort((a, b) => a.localeCompare(b));
      setSelectedSlotTimes(sorted);
    }
  };

  // Check if any selected slot is occupied
  const isSlotOccupied = (slotTime: string, dateIdx: number = selectedDateIdx) => {
    const times = slotTime.split('–').map((t) => t.trim());
    const slotStart = times[0] || '08:00';
    const slotEnd = times[1] || '09:00';
    const activeDay = upcomingDays[dateIdx] || upcomingDays[0];
    const isOccupiedInDb = venue.occupiedSlots?.some((occ) => {
      if (occ.booking_date !== activeDay.fullDateStr) return false;
      return occ.start_time < slotEnd && occ.end_time > slotStart;
    });
    const venueSlot = venue.slots?.find((s) => s.time === slotTime);
    const isSlotUnavailableInVenue = venueSlot ? !venueSlot.isAvailable : false;
    return isSlotUnavailableInVenue || Boolean(isOccupiedInDb) || slotTime === '19:00 – 20:00';
  };

  const isSelectedSlotOccupied = selectedSlotTimes.some((timeStr) => isSlotOccupied(timeStr));

  // Compute overall time range for booking
  const sortedSelected = [...selectedSlotTimes].sort((a, b) => a.localeCompare(b));
  const startTime = sortedSelected[0] ? sortedSelected[0].split('–')[0]?.trim() : '';
  const endTime = sortedSelected[sortedSelected.length - 1] ? sortedSelected[sortedSelected.length - 1].split('–')[1]?.trim() : '';
  const totalHours = selectedSlotTimes.length;

  const handleActionClick = () => {
    if (selectedSlotTimes.length > 0 && startTime && endTime) {
      if (isSelectedSlotOccupied) {
        setIsJoinSuccessModalOpen(true);
      } else {
        const activeDay = upcomingDays[selectedDateIdx] || upcomingDays[0];
        const slotObj: TimeSlot = {
          id: `slot-${startTime}-${endTime}`,
          time: `${startTime} – ${endTime}`,
          isAvailable: true,
        };
        onBook(venue, activeDay.fullDateStr, slotObj);
      }
    }
  };

  // Touch swipe down handlers to close modal
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current !== null) {
      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchEndY - touchStartY.current;
      if (deltaY > 60) {
        onClose(); // Swipe down detected -> close modal
      }
      touchStartY.current = null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs animate-fade-in min-w-[360px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[800px] min-w-[360px] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up p-5"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top Tag & Heart Button */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100/90 text-slate-800 text-xs font-semibold">
            <span>{venue.sport === 'football' ? '⚽ Футбол' : '🏀 Баскетбол'}</span>
          </div>

          <button
            type="button"
            onClick={() => onToggleFavorite(venue.id)}
            className="p-1 rounded-full text-slate-400 hover:text-rose-500 transition-colors"
          >
            <Heart className={`w-6 h-6 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'stroke-[1.8px]'}`} />
          </button>
        </div>

        {/* Title & Address */}
        <div className="mt-2">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {venue.title}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {venue.address}{distanceText ? ` • ${distanceText}` : ''}
          </p>
        </div>

        {/* Section Subheader & Max Slots Hint */}
        <div className="flex items-center justify-between mt-4 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Выберите время</h3>
            <p className="text-xs font-normal text-slate-500">
              Можно забронировать не более трёх часов в день
            </p>
          </div>
          {totalHours > 0 && (
            <span className="text-xs font-bold text-[#00B050] bg-[#E8F8F0] px-2.5 py-1 rounded-full shrink-0">
              Выбрано: {totalHours} {totalHours === 1 ? 'час' : totalHours <= 4 ? 'часа' : 'часов'}
            </span>
          )}
        </div>

        {/* Horizontal Date Pills Grid (6 columns) */}
        <div className="grid grid-cols-6 gap-2 mb-4">
          {upcomingDays.map((item, idx) => {
            const isSelected = selectedDateIdx === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDateIdx(idx)}
                className={`py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-[#E8F8F0] border-2 border-[#00B050] text-slate-900 shadow-xs'
                    : 'bg-[#F8FAFC] border border-slate-100 text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="text-[11px] font-semibold text-slate-500">{item.day}</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5">{item.num}</span>
              </button>
            );
          })}
        </div>

        {/* Time Slots Grid with multi-select support & interactive occupied slots badge */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4 max-h-[340px] overflow-y-auto pr-0.5">
          {TIME_SLOTS_GRID.map((slotItem, idx) => {
            const isSelected = selectedSlotTimes.includes(slotItem.time);
            
            // Extract start and end time of candidate slot
            const times = slotItem.time.split('–').map((t) => t.trim());
            const slotStart = times[0] || '08:00';
            // Check if slot is in the past for Today
            const now = new Date();
            const currentHours = String(now.getHours()).padStart(2, '0');
            const currentMins = String(now.getMinutes()).padStart(2, '0');
            const currentTimeStr = `${currentHours}:${currentMins}`;
            const isPast = selectedDateIdx === 0 && slotStart <= currentTimeStr;

            const isOccupied = isSlotOccupied(slotItem.time, selectedDateIdx);
            const isDisabled = slotItem.status === 'disabled' || isPast;

            if (isPast) {
              return (
                <div
                  key={idx}
                  className="py-3 px-3.5 rounded-2xl text-xs bg-[#F4F4F6] border border-slate-100 text-slate-400 font-medium cursor-not-allowed flex items-center justify-between select-none opacity-60"
                  title="Время уже прошло"
                >
                  <span>{slotItem.time}</span>
                </div>
              );
            }

            if (isOccupied) {
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSlotClick(slotItem.time)}
                  className={`py-3 px-3.5 rounded-2xl text-xs transition-all flex items-center justify-between font-bold cursor-pointer ${
                    isSelected
                      ? 'bg-[#FFF4E5] border-2 border-[#D97706] text-[#D97706] shadow-xs'
                      : 'bg-[#FFF4E5] border border-[#FDE68A]/60 text-[#D97706] hover:bg-[#FFE8CC]'
                  }`}
                  title="Нажмите, чтобы отправить запрос на присоединение"
                >
                  <span>{slotItem.time}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 stroke-[2.5px] text-[#D97706]" />
                  )}
                </button>
              );
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSlotClick(slotItem.time)}
                className={`py-3 px-3.5 rounded-2xl text-xs transition-all flex items-center justify-between ${
                  isDisabled
                    ? 'bg-[#F8FAFC] text-slate-400 font-medium cursor-not-allowed border border-slate-100 opacity-60'
                    : isSelected
                    ? 'bg-[#E8F8F0] border-2 border-[#00B050] text-slate-900 font-bold shadow-xs'
                    : 'bg-[#F8FAFC] hover:bg-slate-100 text-slate-900 font-semibold border border-slate-100'
                }`}
              >
                <span>{slotItem.time}</span>
                {isSelected && (
                  <Check className="w-4 h-4 stroke-[2.5px] text-[#00B050]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Warning Toast if user exceeds 3 hours */}
        {maxSlotsWarning && (
          <div className="text-xs text-amber-700 font-semibold text-center mb-3 bg-amber-50 p-2.5 rounded-xl border border-amber-200 animate-fade-in">
            ⚠️ Максимальное время бронирования — 3 часа в день
          </div>
        )}

        {/* Yellow Alert when an occupied slot is selected */}
        {isSelectedSlotOccupied && (
          <div className="text-xs text-[#D97706] font-semibold text-center mb-3 bg-[#FFF4E5] p-3 rounded-2xl border border-[#FDE68A] animate-fade-in">
            Этот слот занят, но вы можете отправить запрос чтобы присоединиться к этой игре
          </div>
        )}

        {/* Bottom Action Area */}
        <div className="pt-3 border-t border-slate-100">
          <button
            type="button"
            disabled={selectedSlotTimes.length === 0}
            onClick={handleActionClick}
            className="w-full bg-[#00B050] hover:bg-[#009644] text-white font-bold py-4 rounded-2xl flex items-center justify-center shadow-md shadow-[#00B050]/20 transition-all text-base disabled:opacity-40"
          >
            <span>
              {isSelectedSlotOccupied
                ? 'Присоединиться к игре'
                : totalHours > 0
                ? `Забронировать (${startTime} – ${endTime} • ${totalHours} ${totalHours === 1 ? 'час' : 'часа'})`
                : 'Забронировать'}
            </span>
          </button>
        </div>
      </div>

      {/* Join Request Success Modal Popup matching prompt */}
      {isJoinSuccessModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => {
            setIsJoinSuccessModalOpen(false);
            onClose();
          }}
        >
          <div
            className="w-full max-w-[380px] bg-white rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-fade-in text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Checkmark Circle */}
            <div className="w-14 h-14 mx-auto rounded-full bg-[#E8F8F0] text-[#00B050] flex items-center justify-center">
              <Check className="w-7 h-7 stroke-[2.5px]" />
            </div>

            {/* Title & Body matching user prompt */}
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Запрос отправлен</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Ваш запрос отправлен. Как только он будет одобрен, вы получите уведомление
              </p>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setIsJoinSuccessModalOpen(false);
                onClose();
              }}
              className="w-full bg-[#00B050] hover:bg-[#009644] text-white font-bold py-3.5 rounded-2xl text-xs transition-all shadow-md shadow-[#00B050]/20"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
