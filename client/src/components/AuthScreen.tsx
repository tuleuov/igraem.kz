import React, { useState } from 'react';
import { Phone, Lock, User, FileText, ArrowRight } from 'lucide-react';
import { api, UserProfile } from '../services/api';
import { Logo } from './Logo';

interface AuthScreenProps {
  onSuccess: (user: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [iin, setIin] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const formatKazakhstanNumber = (digits: string) => {
    const cleaned = digits.replace(/\D/g, '').slice(0, 10);
    let formatted = '';
    if (cleaned.length > 0) formatted += `(${cleaned.slice(0, 3)}`;
    if (cleaned.length >= 3) formatted += `) ${cleaned.slice(3, 6)}`;
    if (cleaned.length >= 6) formatted += `-${cleaned.slice(6, 8)}`;
    if (cleaned.length >= 8) formatted += `-${cleaned.slice(8, 10)}`;
    return formatted;
  };

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if ((val.startsWith('7') || val.startsWith('8')) && val.length > 10) {
      val = val.slice(1);
    }
    setPhoneDigits(val.slice(0, 10));
  };

  const fullFormattedPhone = `+7 ${formatKazakhstanNumber(phoneDigits)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login(fullFormattedPhone, password);
        if (res.success && res.data?.user) {
          onSuccess(res.data.user);
        } else {
          setErrorMsg(res.message || 'Ошибка входа');
        }
      } else {
        const res = await api.register({
          iin,
          phone: fullFormattedPhone,
          full_name: fullName,
          password,
        });
        if (res.success && res.data?.user) {
          onSuccess(res.data.user);
        } else {
          setErrorMsg(res.message || 'Ошибка регистрации');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Произошла ошибка при обращении к серверу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-white text-slate-900 min-h-screen sm:min-h-0 relative">
      <div className="pt-4">
        {/* Logo */}
        <div className="mb-6">
          <Logo size="lg" />
        </div>

        {/* Tab switcher: Login / Register */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(''); }}
            className={`pb-3 px-4 font-semibold text-sm border-b-2 transition-colors ${
              mode === 'login'
                ? 'border-[#00B050] text-[#00B050]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(''); }}
            className={`pb-3 px-4 font-semibold text-sm border-b-2 transition-colors ${
              mode === 'register'
                ? 'border-[#00B050] text-[#00B050]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Регистрация
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {mode === 'login' ? 'Вход в личный кабинет' : 'Создать аккаунт'}
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            {mode === 'login'
              ? 'Введите телефон или ИИН для входа'
              : 'Заполните данные для создания профиля с валидацией ИИН'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  ФИО
                </label>
                <div className="flex items-center bg-slate-50 border border-slate-300 focus-within:border-[#00B050] focus-within:bg-white rounded-2xl px-3.5 py-3 transition-all">
                  <User className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Аскаров Арман"
                    required
                    className="w-full bg-transparent text-slate-900 font-medium text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  ИИН (12 цифр)
                </label>
                <div className="flex items-center bg-slate-50 border border-slate-300 focus-within:border-[#00B050] focus-within:bg-white rounded-2xl px-3.5 py-3 transition-all">
                  <FileText className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    maxLength={12}
                    value={iin}
                    onChange={(e) => setIin(e.target.value.replace(/\D/g, ''))}
                    placeholder="990101300123"
                    required
                    className="w-full bg-transparent text-slate-900 font-bold text-sm outline-none tracking-widest font-mono"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Номер телефона
            </label>
            <div className="flex items-center bg-slate-50 border border-slate-300 focus-within:border-[#00B050] focus-within:bg-white rounded-2xl overflow-hidden transition-all shadow-xs">
              <div className="flex items-center gap-1 px-3 py-3 bg-slate-100/80 border-r border-slate-200 shrink-0 select-none">
                <span className="text-base leading-none">🇰🇿</span>
                <span className="text-xs font-extrabold text-slate-800">+7</span>
              </div>
              <input
                type="tel"
                value={formatKazakhstanNumber(phoneDigits)}
                onChange={handlePhoneInputChange}
                placeholder="(707) 000-00-00"
                required
                className="w-full bg-transparent py-3 px-3 text-slate-900 font-bold text-sm outline-none tracking-wide font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Пароль
            </label>
            <div className="flex items-center bg-slate-50 border border-slate-300 focus-within:border-[#00B050] focus-within:bg-white rounded-2xl px-3.5 py-3 transition-all">
              <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                required
                className="w-full bg-transparent text-slate-900 font-medium text-sm outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00B050] hover:bg-[#009644] active:scale-[0.99] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-[#00B050]/20 transition-all text-base disabled:opacity-50 mt-4"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>{mode === 'login' ? 'Войти в систему' : 'Зарегистрироваться'}</span>
            )}
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <div className="pb-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
        <Lock className="w-3.5 h-3.5 text-[#00B050]" />
        <span>Защищено igraem.kz API</span>
      </div>
    </div>
  );
};

