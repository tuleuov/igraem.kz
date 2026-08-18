import React, { useState, useEffect } from 'react';
import {
  Unlock,
  ChevronLeft,
  Info,
  AlertCircle,
  DoorOpen,
  Check,
  X,
  Send,
  ShieldCheck,
  Users,
  ChevronRight,
  UserCheck,
  ShieldAlert,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { Booking } from '../types';

interface VenueOpenedScreenProps {
  booking: Booking;
  onBackToMap: () => void;
  onFinishBooking?: (bookingId: string) => void;
}

export const VenueOpenedScreen: React.FC<VenueOpenedScreenProps> = ({
  booking,
  onBackToMap,
  onFinishBooking,
}) => {
  const TOTAL_SESSION_SECONDS = 55 * 60; // 55 minutes active play (vacate 5 min before hour end)
  const [secondsRemaining, setSecondsRemaining] = useState(50 * 60); // Initial demo value

  // Participant role detection (owner vs participant)
  const [isParticipant, setIsParticipant] = useState(Boolean(booking.isParticipant));

  // Modals & Extension state
  const [activeModal, setActiveModal] = useState<'rules' | 'problem' | 'doorOpened' | 'confirmFinish' | 'players' | null>(null);
  const [problemText, setProblemText] = useState('');
  const [problemSent, setProblemSent] = useState(false);
  const [isNextSlotAvailable, setIsNextSlotAvailable] = useState(true);
  const [extensionCount, setExtensionCount] = useState(0); // Max 2 extensions (2 hours max)
  const [extendSuccessToast, setExtendSuccessToast] = useState(false);

  // Participants list matching screenshot requirements (pending, entered, approved)
  const [participantsList, setParticipantsList] = useState<Array<{ id: string; name: string; status: 'pending' | 'approved' | 'entered' }>>([
    { id: 'p1', name: 'Матвей Матвеев', status: 'pending' },
    { id: 'p2', name: 'Абдурахманкурбамбез Карабасбарабасулы', status: 'pending' },
    { id: 'p3', name: 'Иван Иванов', status: 'entered' },
    { id: 'p4', name: 'Иван Иванов', status: 'entered' },
    { id: 'p5', name: 'Петр Петров', status: 'approved' },
  ]);

  const handleApproveParticipant = (id: string) => {
    setParticipantsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'approved' } : item))
    );
  };

  const handleDeclineParticipant = (id: string) => {
    setParticipantsList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleExtendBooking = () => {
    if (!isNextSlotAvailable || extensionCount >= 2) return;
    setSecondsRemaining((prev) => prev + 3600); // Add 1 hour (3600s)
    setExtensionCount((prev) => prev + 1);
    setExtendSuccessToast(true);
    setTimeout(() => setExtendSuccessToast(false), 3000);
  };

  // Realtime 1-second countdown timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate progress percentage as time elapses (fills up from 0% to 100%)
  const elapsedSeconds = TOTAL_SESSION_SECONDS - secondsRemaining;
  const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / TOTAL_SESSION_SECONDS) * 100));

  // When less than 10 minutes (600s) remain, progress bar turns orange!
  const isUrgent = secondsRemaining < 600;

  // Format display text: Show SECONDS when < 1 minute (60s) remains!
  const displayTimeText =
    secondsRemaining < 60
      ? `${secondsRemaining} сек`
      : `${Math.ceil(secondsRemaining / 60)} мин`;

  const handleSendProblem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemText.trim()) return;
    setProblemSent(true);
    setTimeout(() => {
      setProblemSent(false);
      setActiveModal(null);
      setProblemText('');
    }, 1200);
  };

  const handleCompleteBooking = () => {
    if (onFinishBooking) onFinishBooking(booking.id);
    setActiveModal(null);
    onBackToMap();
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-4 bg-white text-slate-900 animate-fade-in min-h-screen sm:min-h-0 relative overflow-y-auto min-w-[360px]">
      {/* Extension Success Toast */}
      {extendSuccessToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#00B050] text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Бронирование успешно продлено на 1 час! 🎉</span>
        </div>
      )}

      <div className="pt-2 space-y-4">
        {/* Header Top Bar matching user request (Title strictly centered) */}
        <div className="relative flex items-center justify-center w-full min-h-[36px]">
          <button
            type="button"
            onClick={onBackToMap}
            className="absolute left-0 bg-[#E8F8F0] hover:bg-[#D2F2E2] text-[#00B050] font-bold px-3.5 py-1.5 rounded-2xl text-xs flex items-center gap-0.5 transition-colors z-10"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5px]" />
            <span>Назад</span>
          </button>
          <h1 className="text-base font-bold text-slate-900 tracking-tight text-center">
            Активная бронь
          </h1>
        </div>

        {/* Top Lock Emblem - Turns red when time expired */}
        <div className="pt-2">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-xs transition-colors ${
            secondsRemaining <= 0
              ? 'bg-rose-50 border-2 border-rose-200 text-rose-600 animate-pulse'
              : 'bg-[#E8F8F0] border border-[#00B050]/20 text-[#00B050]'
          }`}>
            {secondsRemaining <= 0 ? (
              <AlertTriangle className="w-11 h-11 stroke-[2.2px]" />
            ) : (
              <Unlock className="w-11 h-11 stroke-[2.2px]" />
            )}
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className={`text-2xl font-black tracking-tight ${secondsRemaining <= 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {secondsRemaining <= 0 ? 'Время вышло' : 'Площадка открыта'}
          </h2>
          {secondsRemaining <= 0 && (
            <p className="text-sm font-bold text-rose-600">
              Пожалуйста, покиньте площадку
            </p>
          )}
        </div>

        {/* Progress Timer Box OR Expired Warning Notice */}
        {secondsRemaining <= 0 ? (
          <div className="space-y-3">
            {/* 3-Day Block Penalty Highlighted Box */}
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-1.5 shadow-xs text-left animate-fade-in">
              <div className="flex items-center gap-2 text-rose-600 font-extrabold text-xs uppercase tracking-wide">
                <ShieldAlert className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                <span>ПРЕДУПРЕЖДЕНИЕ О БЛОКИРОВКЕ</span>
              </div>
              <p className="text-xs text-slate-800 font-medium leading-relaxed">
                Если в течение <span className="text-rose-600 font-bold">5 минут</span> после истечения лимита вы не покинете и не закроете площадку, ваш аккаунт будет <span className="text-rose-600 font-bold">заблокирован в сервисе на 3 дня</span>.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[#F8FAFC] border border-slate-100 rounded-2xl p-4 text-center space-y-2">
            <span className="text-xs font-medium text-slate-400 block">
              До освобождения площадки (за 5 мин до конца часа)
            </span>
            <div className={`text-xl font-bold transition-colors ${isUrgent ? 'text-[#F97316]' : 'text-slate-900'}`}>
              {displayTimeText}
            </div>

            {/* Progress bar fills up as time elapses, turns ORANGE when < 10 mins remain! */}
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isUrgent ? 'bg-[#F97316]' : 'bg-[#00B050]'
                }`}
                style={{ width: `${Math.max(8, progressPercent)}%` }}
              />
            </div>
          </div>
        )}

        {/* Demo Controls */}
        <div className="pt-1 flex items-center justify-center gap-2.5 text-[10px] text-slate-400 flex-wrap">
          <button
            type="button"
            onClick={() => setSecondsRemaining(0)}
            className="hover:text-rose-600 text-rose-500 font-bold"
          >
            Тест: Время вышло (0 мин)
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setSecondsRemaining(45)}
            className="hover:text-[#F97316]"
          >
            Тест: &lt;1 мин (45 сек)
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setSecondsRemaining(8 * 60)}
            className="hover:text-[#F97316]"
          >
            Тест: &lt;10 мин
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setSecondsRemaining(50 * 60)}
            className="hover:text-[#00B050]"
          >
            Сброс (50 мин)
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setIsNextSlotAvailable(!isNextSlotAvailable)}
            className={`font-bold ${isNextSlotAvailable ? 'text-[#00B050]' : 'text-rose-500'}`}
          >
            Тест: Слот {isNextSlotAvailable ? 'свободен' : 'занят'}
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setIsParticipant(!isParticipant)}
            className={`font-bold ${isParticipant ? 'text-indigo-600' : 'text-slate-600'}`}
          >
            Тест: {isParticipant ? 'Участник' : 'Владелец'}
          </button>
        </div>

        {/* Menu Action Cards Stack (8px gap) */}
        <div className="space-y-2 pt-1">
          {/* Card: Участники */}
          <button
            type="button"
            onClick={() => setActiveModal('players')}
            className="w-full bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-2 px-3 flex items-center gap-3 text-left shadow-xs transition-all active:scale-98"
          >
            <div className="w-8 h-8 rounded-xl bg-[#E8F8F0] text-[#00B050] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 stroke-[1.8px]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-slate-900 text-xs block leading-tight">
                Участники
              </span>
              <span className="text-[11px] text-slate-400 font-medium truncate block">
                {booking.guests && booking.guests.length > 0
                  ? `Организатор + ${booking.guests.length} игроков`
                  : '1 участник (Организатор)'}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>

          {/* Card 1: Правила пользования площадкой */}
          <button
            type="button"
            onClick={() => setActiveModal('rules')}
            className="w-full bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-2 px-3 flex items-center gap-3 text-left shadow-xs transition-all active:scale-98"
          >
            <div className="w-8 h-8 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
              <Info className="w-4 h-4 stroke-[1.8px]" />
            </div>
            <span className="font-bold text-slate-900 text-xs flex-1">
              Правила пользования площадкой
            </span>
          </button>

          {/* Card 2: Сообщить о проблеме */}
          <button
            type="button"
            onClick={() => setActiveModal('problem')}
            className="w-full bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-2 px-3 flex items-center gap-3 text-left shadow-xs transition-all active:scale-98"
          >
            <div className="w-8 h-8 rounded-xl bg-[#FEE2E2] text-[#EF4444] flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 stroke-[1.8px]" />
            </div>
            <span className="font-bold text-slate-900 text-xs flex-1">
              Сообщить о проблеме
            </span>
          </button>

          {/* Card: Продлить на 1 час (Над "Открыть дверь", максимум 2 часа) */}
          <button
            type="button"
            onClick={handleExtendBooking}
            disabled={!isNextSlotAvailable || extensionCount >= 2}
            className={`w-full border rounded-2xl p-2 px-3 flex items-center gap-3 text-left shadow-xs transition-all ${
              isNextSlotAvailable && extensionCount < 2
                ? 'bg-white border-slate-200/80 hover:border-slate-300 cursor-pointer active:scale-98'
                : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              isNextSlotAvailable && extensionCount < 2 ? 'bg-[#E8F8F0] text-[#00B050]' : 'bg-slate-100 text-slate-400'
            }`}>
              <Clock className="w-4 h-4 stroke-[1.8px]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-slate-900 text-xs block leading-tight">
                Продлить на 1 час
              </span>
              <span className="text-[11px] text-slate-400 font-medium truncate block">
                {extensionCount >= 2
                  ? 'Достигнут лимит продления (макс. 2 часа)'
                  : !isNextSlotAvailable
                  ? 'Следующий час уже забронирован'
                  : extensionCount === 1
                  ? 'Продлено на час, можно продлить ещё на час'
                  : 'Следующий час свободен'}
              </span>
            </div>
          </button>

          {/* Card 3: Открыть дверь */}
          <button
            type="button"
            onClick={() => setActiveModal('doorOpened')}
            className="w-full bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-2 px-3 flex items-center gap-3 text-left shadow-xs transition-all active:scale-98"
          >
            <div className="w-8 h-8 rounded-xl bg-[#E8F8F0] text-[#00B050] flex items-center justify-center shrink-0">
              <DoorOpen className="w-4 h-4 stroke-[1.8px]" />
            </div>
            <span className="font-bold text-slate-900 text-xs flex-1">
              Открыть дверь
            </span>
          </button>

          {/* Full-width Red Button: Завершить бронирование / Покинуть площадку */}
          <button
            type="button"
            onClick={() => setActiveModal('confirmFinish')}
            className="w-full bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-bold py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center shadow-md shadow-rose-500/20 transition-all cursor-pointer active:scale-98 !mt-6"
          >
            <span>{isParticipant ? 'Покинуть площадку' : 'Завершить бронирование'}</span>
          </button>
        </div>
      </div>

      {/* Rules Modal Popup */}
      {activeModal === 'rules' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-[420px] bg-white rounded-3xl p-5 shadow-2xl space-y-4 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-[#00B050]" />
                <h2>Правила пользования площадки</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>1. Переобувайтесь в чистую спортивную обувь без шипов.</p>
              <p>2. Убирайте за собой мусор и соблюдайте чистоту.</p>
              <p>3. Покиньте и освободите площадку за 5 минут до окончания забронированного часа.</p>
              <p>4. При выходе убедитесь, что дверь закрыта.</p>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full bg-[#00B050] hover:bg-[#009644] text-white font-bold py-3 rounded-2xl text-xs transition-all"
            >
              Понятно
            </button>
          </div>
        </div>
      )}

      {/* Problem Modal Popup */}
      {activeModal === 'problem' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
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
                onClick={() => setActiveModal(null)}
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
                <p className="text-xs text-slate-500">Наша служба поддержки уже занимается вашей заявкой.</p>
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
                    placeholder="Не работает свет, сломан замок, мусор на площадке..."
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

      {/* Door Opened Toast Modal Popup */}
      {activeModal === 'doorOpened' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-[360px] bg-white rounded-3xl p-6 shadow-2xl text-center space-y-3 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-[#E8F8F0] text-[#00B050] flex items-center justify-center">
              <DoorOpen className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Дверь разблокирована!</h3>
            <p className="text-xs text-slate-500">Сигнал на открытие отправлен на смарт-замок.</p>
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full bg-[#00B050] hover:bg-[#009644] text-white font-bold py-3 rounded-2xl text-xs transition-all"
            >
              Отлично
            </button>
          </div>
        </div>
      )}

      {/* Finish Booking or Leave Venue Confirmation Modal */}
      {activeModal === 'confirmFinish' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-[380px] bg-white rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
              <Check className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isParticipant ? 'Хотите покинуть площадку?' : 'Завершить бронирование?'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Доступ к площадке будет закрыт.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl text-xs transition-all"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleCompleteBooking}
                className="w-1/2 bg-[#00B050] hover:bg-[#009644] text-white font-bold py-3 rounded-2xl text-xs transition-all"
              >
                {isParticipant ? 'Да, покинуть' : 'Да, завершить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen "Участники" View matching user screenshot */}
      {activeModal === 'players' && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-fade-in text-slate-900 w-full min-w-[360px]">
          {/* Header Bar matching screenshot */}
          <div className="bg-white px-4 pt-3.5 pb-3.5 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10 w-full">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="flex items-center gap-1 bg-[#E8F8F0] hover:bg-[#D2F2E2] text-[#00B050] font-bold px-3.5 py-1.5 rounded-full text-xs transition-all active:scale-95 shrink-0"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5px]" />
              <span>Назад</span>
            </button>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight text-center flex-1 pr-14">
              Участники
            </h2>
          </div>

          {/* Participants List matching screenshot (8px gap below header) */}
          <div className="flex-1 overflow-y-auto w-full bg-white pt-[8px]">
            {participantsList.map((item) => (
              <div
                key={item.id}
                className="py-3.5 px-4 flex items-center justify-between text-xs w-full min-h-[48px] border-b border-slate-100"
              >
                {/* Left: Name */}
                <span className="font-bold text-slate-900 text-xs leading-normal pr-4 flex-1">
                  {item.name}
                </span>

                {/* Right: Status or Action */}
                {item.status === 'pending' && (
                  <div className="flex items-center gap-5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDeclineParticipant(item.id)}
                      className="text-[#EF4444] hover:text-red-600 font-bold text-xs active:scale-95 transition-all cursor-pointer leading-normal"
                    >
                      Отклонить
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveParticipant(item.id)}
                      className="text-[#00B050] hover:text-[#009040] font-bold text-xs active:scale-95 transition-all cursor-pointer leading-normal"
                    >
                      Принять
                    </button>
                  </div>
                )}

                {item.status === 'entered' && (
                  <span className="text-slate-400 font-medium text-xs shrink-0 leading-normal flex items-center">
                    Вошёл
                  </span>
                )}

                {item.status === 'approved' && (
                  <div className="shrink-0 leading-normal" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
