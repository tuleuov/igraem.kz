import React, { useState } from 'react';
import {
  User as UserIcon,
  Phone,
  Calendar as CalendarIcon,
  MapPin,
  Globe,
  Smartphone,
  ChevronRight,
  X,
  Check
} from 'lucide-react';
import { CityName } from '../types';
import { Language, LANGUAGE_NAMES, translations } from '../i18n/translations';
import { UserProfile } from '../services/api';

interface ProfileTabProps {
  userProfile?: UserProfile | null;
  userPhone: string;
  currentCity: CityName;
  currentLang: Language;
  onSelectLang: (lang: Language) => void;
  onLogout: () => void;
  bookings?: any[];
  onBanUserDemo?: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  userProfile,
  userPhone,
  currentCity,
  currentLang,
  onSelectLang,
  onLogout,
  bookings = [],
  onBanUserDemo,
}) => {
  const t = translations[currentLang];

  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  // Settings Toggles state (Disabled by default)
  const [remindersEnabled, setRemindersEnabled] = useState(false);

  const handleToggleReminders = async () => {
    if (!remindersEnabled) {
      if (!('Notification' in window)) {
        alert('Ваш браузер не поддерживает push-уведомления.');
        return;
      }

      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setRemindersEnabled(true);
          try {
            new Notification('Igraem.kz', {
              body: 'Напоминание о бронях включено! Вы получите push-уведомление за 30 минут до начала игры ⚽',
            });
          } catch (e) {
            console.warn('[Push Notification trigger error]', e);
          }
        } else if (permission === 'denied') {
          alert('Отправка уведомлений заблокирована в настройках браузера. Пожалуйста, разрешите уведомления в настройках вашего браузера.');
          setRemindersEnabled(false);
        } else {
          setRemindersEnabled(false);
        }
      } catch (err) {
        console.error('[Notification Permission Error]', err);
        setRemindersEnabled(false);
      }
    } else {
      setRemindersEnabled(false);
    }
  };

  const displayName = userProfile?.full_name || 'Пользователь';
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'УЗ';

  // Calculate actual played hours from completed/active bookings (1 hour per slot)
  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const hoursPlayed = completedCount * 1;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 text-slate-900 min-w-[360px] animate-fade-in pb-24">
      {/* BLOCK 1: Игрок + Статистика (Сыграно часов & Любимый спорт) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl pt-4 px-4 pb-2 shadow-xs space-y-3">
        <div className="text-center pt-1">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {displayName}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-3 text-center space-y-0.5">
            <div className="text-lg font-black text-slate-900">
              {hoursPlayed}
            </div>
            <div className="text-[11px] font-semibold text-slate-400">
              {t.hoursPlayed}
            </div>
          </div>
          <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-3 text-center space-y-0.5">
            <div className="text-lg font-black text-slate-900">
              ⚽
            </div>
            <div className="text-[11px] font-semibold text-slate-400">
              {t.favSport}
            </div>
          </div>
        </div>
      </div>

      {/* BLOCK 2: Профиль (Имя, Телефон, ИИН) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl pt-4 px-4 pb-1 shadow-xs space-y-1">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {t.sectionProfile}
        </div>
        <div className="divide-y divide-slate-100">
          {/* Имя */}
          <div className="py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 font-semibold text-slate-800">
              <UserIcon className="w-4 h-4 text-slate-400" />
              <span>{t.name}</span>
            </div>
            <span className="text-slate-400 font-medium">{displayName}</span>
          </div>

          {/* Телефон */}
          <div className="py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 font-semibold text-slate-800">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{t.phone}</span>
            </div>
            <span className="text-slate-400 font-medium">{userProfile?.phone_number || userPhone}</span>
          </div>

          {/* ИИН */}
          <div className="py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 font-semibold text-slate-800">
              <CalendarIcon className="w-4 h-4 text-slate-400" />
              <span>ИИН</span>
            </div>
            <span className="text-slate-400 font-medium font-mono">{userProfile?.iin || '—'}</span>
          </div>
        </div>
      </div>

      {/* BLOCK 3: Уведомления */}
      <div className="bg-white border border-slate-200/80 rounded-2xl pt-4 px-4 pb-1 shadow-xs space-y-1">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {t.sectionNotifications}
        </div>
        <div className="py-2 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800 pr-4">
            {t.reminders30min}
          </span>
          <button
            type="button"
            onClick={handleToggleReminders}
            className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center shrink-0 ${
              remindersEnabled ? 'bg-[#00B050] justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-white shadow-xs" />
          </button>
        </div>
      </div>

      {/* BLOCK 4: Приложение */}
      <div className="bg-white border border-slate-200/80 rounded-2xl pt-4 px-4 pb-1 shadow-xs space-y-1">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {t.sectionApp}
        </div>
        <div className="divide-y divide-slate-100">
          {/* Язык */}
          <button
            type="button"
            onClick={() => setIsLangModalOpen(true)}
            className="w-full py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2.5 font-semibold text-slate-800">
              <Globe className="w-4 h-4 text-slate-400" />
              <span>{t.language}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400 font-medium">
              <span>{LANGUAGE_NAMES[currentLang]}</span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </button>

          {/* О приложении */}
          <button
            type="button"
            onClick={() => setIsAboutModalOpen(true)}
            className="w-full py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2.5 font-semibold text-slate-800">
              <Smartphone className="w-4 h-4 text-slate-400" />
              <span>{t.aboutApp}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>

          {/* Admin Dashboard */}
          {userProfile?.role === 'admin' && (
            <a
              href="http://localhost:3000/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors block"
            >
              <div className="flex items-center gap-2.5 font-semibold text-[#00B050]">
                <Smartphone className="w-4 h-4 text-[#00B050]" />
                <span>Панель администратора (Дашборд)</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#00B050]" />
            </a>
          )}
        </div>
      </div>

      {/* Demo Test Ban Button */}
      {onBanUserDemo && (
        <div className="text-center pt-1 pb-1">
          <button
            type="button"
            onClick={onBanUserDemo}
            className="text-[11px] text-rose-500 underline hover:text-rose-700 font-bold"
          >
            Тест: Симулировать блокировку аккаунта (Бан)
          </button>
        </div>
      )}

      {/* Exit Button */}
      <button
        type="button"
        onClick={onLogout}
        className="w-full bg-[#FEE2E2]/60 hover:bg-[#FEE2E2] text-[#EF4444] font-bold py-3.5 rounded-2xl text-xs transition-colors mb-4"
      >
        {t.logout}
      </button>

      {/* Language Selection Modal */}
      {isLangModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setIsLangModalOpen(false)}
        >
          <div
            className="w-full max-w-[380px] bg-white border border-slate-100 rounded-3xl p-5 shadow-2xl space-y-4 animate-fade-in text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Globe className="w-5 h-5 text-[#00B050]" />
                <h2>{t.selectLanguageModalTitle}</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsLangModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {(['ru', 'kk', 'en'] as Language[]).map((langKey) => {
                const isSelected = currentLang === langKey;
                return (
                  <button
                    key={langKey}
                    type="button"
                    onClick={() => {
                      onSelectLang(langKey);
                      setIsLangModalOpen(false);
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#E8F8F0] border-[#00B050] text-[#00B050]'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <span>{LANGUAGE_NAMES[langKey]}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#00B050] stroke-[2.5px]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* About App Modal */}
      {isAboutModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setIsAboutModalOpen(false)}
        >
          <div
            className="w-full max-w-[380px] bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-fade-in text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-[#E8F8F0] text-[#00B050] flex items-center justify-center font-black text-xl">
              P
            </div>
            <div>
              <h3 className="text-base font-bold">{t.appInfoTitle}</h3>
              <p className="text-xs text-slate-400 mt-1">{t.appVersion}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAboutModalOpen(false)}
              className="w-full bg-[#00B050] hover:bg-[#009644] text-white font-bold py-3 rounded-2xl text-xs transition-all"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
