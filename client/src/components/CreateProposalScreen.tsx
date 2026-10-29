import React, { useState } from 'react';
import { X, MapPin, Loader2, Navigation } from 'lucide-react';
import {
  playProposalsApi,
  CreateProposalDTO,
  ProposalSportType,
} from '../services/playProposalsApi';
import { SPORT_EMOJI, SPORT_LABEL } from './ProposalCard';
import { LocationPickerModal } from './LocationPickerModal';

interface CreateProposalScreenProps {
  onClose: () => void;
  onCreated: (proposalId: string) => void;
}

const SPORTS: ProposalSportType[] = ['football', 'basketball', 'volleyball'];

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const CreateProposalScreen: React.FC<CreateProposalScreenProps> = ({
  onClose,
  onCreated,
}) => {
  const [sportType, setSportType] = useState<ProposalSportType>('football');
  const [eventDate, setEventDate] = useState(getTodayStr());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locationText, setLocationText] = useState('');
  const [lat, setLat] = useState<number | ''>('');
  const [lng, setLng] = useState<number | ''>('');
  const [comment, setComment] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [loading, setLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!startTime) {
      setError('Укажите время начала');
      return;
    }
    if (!locationText.trim() || locationText.trim().length < 5 || lat === '' || lng === '') {
      setError('Пожалуйста, выберите место проведения на карте');
      return;
    }

    const dto: CreateProposalDTO = {
      sport_type: sportType,
      event_date: eventDate,
      start_time: startTime,
      ...(endTime ? { end_time: endTime } : {}),
      location_text: locationText.trim(),
      latitude: Number(lat),
      longitude: Number(lng),
      ...(comment.trim() ? { comment: comment.trim() } : {}),
      max_participants: maxParticipants,
    };

    try {
      setLoading(true);
      const res = await playProposalsApi.create(dto);
      onCreated(res.data.id);
    } catch (err: any) {
      const msgs: Record<string, string> = {
        DATE_IN_PAST: 'Дата в прошлом',
        TIME_IN_PAST: 'Время в прошлом',
        USER_BANNED: 'Ваш аккаунт заблокирован',
        TOO_MANY_OPEN_PROPOSALS: 'У вас уже 5 открытых заявок — закройте часть',
        VALIDATION_ERROR: err.message,
      };
      setError(msgs[err.code] || err.message || 'Ошибка создания заявки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200/80 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full text-slate-500 hover:bg-slate-100 active:scale-95 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-slate-900 text-base">Новая заявка</h1>
        <div className="w-9" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 pt-5 pb-32 space-y-5">
        {/* Sport */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Вид спорта</label>
          <div className="grid grid-cols-3 gap-2">
            {SPORTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSportType(s)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all font-semibold text-xs ${
                  sportType === s
                    ? 'bg-[#E8F8F0] border-[#00B050] text-[#00B050] shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-2xl">{SPORT_EMOJI[s]}</span>
                {SPORT_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Дата</label>
          <input
            type="date"
            value={eventDate}
            min={getTodayStr()}
            onChange={(e) => setEventDate(e.target.value)}
            required
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 font-medium focus:outline-none focus:border-[#00B050] focus:ring-1 focus:ring-[#00B050]/20"
          />
        </div>

        {/* Time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Начало <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 font-medium focus:outline-none focus:border-[#00B050] focus:ring-1 focus:ring-[#00B050]/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Конец <span className="text-slate-300">(опц.)</span>
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 font-medium focus:outline-none focus:border-[#00B050] focus:ring-1 focus:ring-[#00B050]/20"
            />
          </div>
        </div>

        {/* Location Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Место проведения <span className="text-red-400">*</span>
          </label>

          {locationText && lat !== '' && lng !== '' ? (
            <div className="space-y-2">
              {/* Readonly Address Input */}
              <div className="relative flex items-center">
                <div className="absolute left-4 text-[#00B050] pointer-events-none">
                  <MapPin className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  readOnly
                  value={locationText}
                  className="w-full bg-slate-100/90 border border-slate-200/90 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-900 font-semibold cursor-default focus:outline-none"
                />
              </div>

              {/* Ghost button to change location */}
              <button
                type="button"
                onClick={() => setShowLocationPicker(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[#00B050] hover:bg-[#E8F8F0] active:scale-95 transition-all"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Изменить место</span>
              </button>
            </div>
          ) : (
            <div>
              {/* Initial Action Button to Pick Location */}
              <button
                type="button"
                onClick={() => setShowLocationPicker(true)}
                className="w-full bg-[#E8F8F0] hover:bg-[#d5f5e3] border border-[#00B050]/30 rounded-2xl py-3.5 px-4 flex items-center justify-center gap-2 text-sm font-bold text-[#00B050] shadow-xs active:scale-[0.98] transition-all"
              >
                <MapPin className="w-4 h-4 stroke-[2.5]" />
                <span>Указать место</span>
              </button>
            </div>
          )}
        </div>

        {/* Max participants */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Максимум участников
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMaxParticipants((v) => Math.max(2, v - 1))}
              className="w-11 h-11 rounded-full border border-slate-200 bg-white text-slate-700 text-xl font-bold flex items-center justify-center active:scale-95 hover:border-slate-300 transition-all"
            >
              −
            </button>
            <span className="text-2xl font-black text-slate-900 w-12 text-center">
              {maxParticipants}
            </span>
            <button
              type="button"
              onClick={() => setMaxParticipants((v) => Math.min(50, v + 1))}
              className="w-11 h-11 rounded-full border border-slate-200 bg-white text-slate-700 text-xl font-bold flex items-center justify-center active:scale-95 hover:border-slate-300 transition-all"
            >
              +
            </button>
            <span className="text-xs text-slate-400 ml-1">чел. (включая тебя)</span>
          </div>
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Комментарий <span className="text-slate-300 normal-case font-normal">(опционально)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Уровень игры, форма одежды, ваши пожелания…"
            maxLength={500}
            rows={3}
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:border-[#00B050] focus:ring-1 focus:ring-[#00B050]/20"
          />
          <p className="text-[10px] text-slate-400 text-right">{comment.length}/500</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600 font-medium">
            {error}
          </div>
        )}
      </form>

      {/* Submit button — fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 px-4 py-4">
        <button
          type="submit"
          form=""
          onClick={handleSubmit as any}
          disabled={loading}
          className="w-full bg-[#00B050] text-white font-bold text-base rounded-2xl py-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60 shadow-sm"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Публикую…</>
          ) : (
            'Опубликовать заявку'
          )}
        </button>
      </div>

      {/* Fullscreen Location Picker Modal */}
      {showLocationPicker && (
        <LocationPickerModal
          initialLat={lat}
          initialLng={lng}
          initialAddress={locationText}
          onClose={() => setShowLocationPicker(false)}
          onSelect={({ address, lat: selectedLat, lng: selectedLng }) => {
            setLocationText(address);
            setLat(selectedLat);
            setLng(selectedLng);
            setError(null);
          }}
        />
      )}
    </div>
  );
};
