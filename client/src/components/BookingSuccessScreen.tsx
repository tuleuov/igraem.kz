import React, { useState, useRef } from 'react';
import {
  Check,
  Calendar,
  Share2,
  AlertCircle,
  X,
  Send,
  DoorOpen,
  Unlock
} from 'lucide-react';
import { Booking } from '../types';
import { formatDateDDMMYYYY } from '../utils/date';

interface BookingSuccessScreenProps {
  booking: Booking;
  onClose: () => void;
  onGoToBookings: () => void;
  onOpenVenue: (booking: Booking) => void;
  onCancelBooking?: (bookingId: string) => void;
}

function getBookingCountdownInfo(booking: Booking) {
  const now = new Date();

  const times = booking.timeSlot ? booking.timeSlot.split('–').map((t) => t.trim()) : ['18:00', '19:00'];
  const startTimeStr = times[0] || '18:00';
  const endTimeStr = times[1] || '19:00';

  const [startHour, startMin] = startTimeStr.split(':').map(Number);
  const [endHour, endMin] = endTimeStr.split(':').map(Number);

  const startDate = new Date();
  startDate.setHours(startHour || 0, startMin || 0, 0, 0);

  if (booking.date && /^\d{4}-\d{2}-\d{2}$/.test(booking.date)) {
    const [y, m, d] = booking.date.split('-').map(Number);
    startDate.setFullYear(y, m - 1, d);
  }

  const endDate = new Date(startDate);
  endDate.setHours(endHour || 0, endMin || 0, 0, 0);

  // Vacate time is 5 minutes before end hour
  const vacateDate = new Date(endDate.getTime() - 5 * 60 * 1000);

  const diffMs = startDate.getTime() - now.getTime();
  const vacateDiffMs = vacateDate.getTime() - now.getTime();

  // Active right now! (Between start time and 5 mins before end of slot)
  if (diffMs <= 0 && vacateDiffMs > 0) {
    const vHours = String(vacateDate.getHours()).padStart(2, '0');
    const vMins = String(vacateDate.getMinutes()).padStart(2, '0');
    return {
      countdownText: `Игра идёт сейчас (освободить в ${vHours}:${vMins})`,
      canOpenNow: true,
      buttonText: 'Открыть площадку',
    };
  }

  // Vacate time passed or booking ended
  if (vacateDiffMs <= 0) {
    return {
      countdownText: 'Время бронирования истекло',
      canOpenNow: false,
      buttonText: 'Время сеанса завершено',
    };
  }

  // Future booking (start time has not arrived yet)
  const totalMins = Math.ceil(diffMs / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  let countdownText = '';
  if (hours > 0) {
    countdownText = `${hours}ч ${mins}мин`;
  } else {
    countdownText = `${mins}мин`;
  }

  // Strictly open at start time (not 5 mins before)
  const canOpenNow = false;

  return {
    countdownText: `До начала ${countdownText} (в ${startTimeStr})`,
    canOpenNow: false,
    buttonText: `Можно открыть через ${countdownText}`,
  };
}

export const BookingSuccessScreen: React.FC<BookingSuccessScreenProps> = ({
  booking,
  onClose,
  onGoToBookings,
  onOpenVenue,
  onCancelBooking,
}) => {
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);
  const [problemText, setProblemText] = useState('');
  const [problemSent, setProblemSent] = useState(false);
  const touchStartY = useRef<number | null>(null);

  const countdownInfo = React.useMemo(() => getBookingCountdownInfo(booking), [booking]);
  const [overrideCanOpen, setOverrideCanOpen] = useState<boolean | null>(null);
  const canOpenNow = overrideCanOpen !== null ? overrideCanOpen : countdownInfo.canOpenNow;

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

  // System Share Sheet handler (Web Share API)
  const handleShare = async () => {
    const shareData = {
      title: `Бронирование: ${booking.venueTitle}`,
      text: `Я забронировал ${booking.venueTitle} (${booking.sport === 'football' ? '⚽ Футбол' : '🏀 Баскетбол'}) на ${booking.date} в ${booking.timeSlot}! ПИН-код: ${booking.pinCode}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share canceled or error:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(
          `${shareData.title}\n${shareData.text}\n${shareData.url}`
        );
        alert('Ссылка и информация о бронировании скопированы в буфер обмена!');
      } catch (e) {
        alert('Ссылка скопирована!');
      }
    }
  };

  // System Calendar (.ics iCalendar entry) handler
  const handleAddToCalendar = () => {
    const title = `Игра: ${booking.venueTitle}`;
    const description = `Бронирование площадки ${booking.venueTitle}. ПИН-код смарт-замка: ${booking.pinCode}. Адрес: ${booking.address}`;
    const location = `${booking.address}, ${booking.city}`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//igraem.kz//NONSGML Booking System v1.0//RU',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `igraem-booking-${booking.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleSendProblem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemText.trim()) return;
    setProblemSent(true);
    setTimeout(() => {
      setProblemSent(false);
      setIsProblemModalOpen(false);
      setProblemText('');
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs animate-fade-in min-w-[360px]"
      onClick={onClose} // Backdrop click closes modal
    >
      <div
        className="w-full max-w-[800px] min-w-[360px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up p-5 max-h-[90vh] overflow-y-auto relative text-slate-900"
        onClick={(e) => e.stopPropagation()} // Prevent click inside from closing
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top Close Button (X icon) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors z-10"
          title="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="pt-2 space-y-4 text-center">
          {/* Top Checkmark Circle matching screenshot */}
          <div className="mx-auto w-16 h-16 rounded-full bg-[#E8F8F0] border border-[#00B050]/20 flex items-center justify-center text-[#00B050]">
            <Check className="w-8 h-8 stroke-[2.5px]" />
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Площадка забронирована
          </h1>

          {/* Info Card Container matching screenshot */}
          <div className="bg-[#F8FAFC] border border-slate-100 rounded-3xl p-4 text-left space-y-3">
            {/* Object info */}
            <div>
              <span className="text-[11px] text-slate-400 font-medium">Объект</span>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                <span>{booking.venueTitle}</span>
                <span>{booking.sport === 'football' ? '⚽' : '🏀'}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">{booking.address}</p>
            </div>

            <div className="border-t border-slate-200/60" />

            {/* Date & Time combined */}
            <div className="text-xs">
              <span className="text-[11px] text-slate-400 font-medium">Дата</span>
              <p className="text-slate-900 font-bold mt-0.5">
                {formatDateDDMMYYYY(booking.date)}, {booking.timeSlot}
              </p>
            </div>

            <div className="border-t border-slate-200/60" />

            {/* Countdown until start */}
            <div className="text-left text-xs pt-0.5">
              <span className="text-[11px] text-slate-400 font-medium block">До начала</span>
              <p className="text-xs font-bold text-slate-900 mt-0.5">{countdownInfo.countdownText}</p>
            </div>
          </div>

          {/* "Сообщить о проблеме" Card Button matching screenshot */}
          <button
            type="button"
            onClick={() => setIsProblemModalOpen(true)}
            className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-3.5 flex items-center gap-3 text-left shadow-xs transition-all active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-bold text-slate-900">Сообщить о проблеме</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Не работает свет, мусор и другое</p>
            </div>
          </button>

          {/* "Отменить бронь" Button */}
          <button
            type="button"
            onClick={() => setIsConfirmCancelOpen(true)}
            className="w-full bg-[#FEE2E2]/60 hover:bg-[#FEE2E2] text-[#EF4444] font-bold py-3.5 rounded-2xl text-xs transition-colors cursor-pointer"
          >
            Отменить бронь
          </button>
        </div>

        {/* Footer Controls matching screenshot */}
        <div className="pt-4 space-y-2.5 pb-2">
          {/* Row of 2 buttons: "В календарь" and "Поделиться" */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleAddToCalendar}
              className="flex-1 bg-[#E8F8F0] hover:bg-[#D2F2E2] text-[#00B050] font-bold py-3 rounded-2xl flex items-center justify-center gap-2 text-xs transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>В календарь</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 bg-[#E8F8F0] hover:bg-[#D2F2E2] text-[#00B050] font-bold py-3 rounded-2xl flex items-center justify-center gap-2 text-xs transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Поделиться</span>
            </button>
          </div>

          {/* Bottom Button matching screenshot user rule */}
          {canOpenNow ? (
            <button
              type="button"
              onClick={() => onOpenVenue(booking)}
              className="w-full bg-[#00B050] hover:bg-[#009644] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-xs transition-all shadow-md shadow-[#00B050]/20"
            >
              <Unlock className="w-4 h-4 stroke-[2.2px]" />
              <span>Открыть площадку</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              onClick={() => setOverrideCanOpen(true)}
              className="w-full bg-[#F1F5F9] text-[#94A3B8] font-semibold py-3.5 rounded-2xl text-center text-xs cursor-not-allowed"
            >
              {countdownInfo.buttonText}
            </button>
          )}

          {/* Demo Toggle Hint for testing unlock flow */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setOverrideCanOpen(!canOpenNow)}
              className="text-[10px] text-slate-400 underline hover:text-[#00B050]"
            >
              {canOpenNow ? 'Симуляция: Режим >5 мин (Disabled)' : 'Тест: Симулировать за 5 мин до старта'}
            </button>
          </div>
        </div>

        {/* Problem Form Modal Popup matching user prompt */}
        {isProblemModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
            onClick={() => setIsProblemModalOpen(false)}
          >
            <div
              className="w-full max-w-[420px] bg-white rounded-3xl p-5 shadow-2xl space-y-4 animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                  <h2>Сообщить о проблеме</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProblemModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {problemSent ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#E8F8F0] text-[#00B050] flex items-center justify-center">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Спасибо за сообщение!</h3>
                  <p className="text-xs text-slate-500">Наша служба поддержки уже работает над этим.</p>
                </div>
              ) : (
                <form onSubmit={handleSendProblem} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">
                      Описание проблемы
                    </label>
                    <textarea
                      rows={3}
                      value={problemText}
                      onChange={(e) => {
                        setProblemText(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.max(96, e.target.scrollHeight)}px`;
                      }}
                      placeholder="Не работает освещение, мусор на площадке, сломан замок..."
                      required
                      className="w-full min-h-[96px] bg-slate-50 border border-slate-200 focus:border-[#00B050] focus:bg-white rounded-2xl p-3 text-xs text-slate-900 outline-none transition-all resize-none overflow-x-hidden overflow-y-hidden break-words whitespace-pre-wrap"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#00B050] hover:bg-[#009644] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-xs shadow-md shadow-[#00B050]/20 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Отправить</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
        {/* Confirmation Modal for Canceling Booking */}
        {isConfirmCancelOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in text-slate-900"
            onClick={() => setIsConfirmCancelOpen(false)}
          >
            <div
              className="w-full max-w-[380px] bg-white rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Хотите отменить бронь?</h3>
                <p className="text-xs text-slate-500 mt-1">Время и слот будут освобождены для других пользователей.</p>
              </div>
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (onCancelBooking) onCancelBooking(booking.id);
                    setIsConfirmCancelOpen(false);
                    onGoToBookings();
                  }}
                  className="w-full bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold py-3.5 rounded-2xl text-xs transition-all shadow-md shadow-rose-500/20 active:scale-98 cursor-pointer"
                >
                  Да, отменить бронь
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmCancelOpen(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl text-xs transition-all active:scale-98 cursor-pointer"
                >
                  Нет
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
