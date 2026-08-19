import React, { useState, useEffect } from 'react';
import { Phone, User, FileText, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { api, UserProfile } from '../services/api';
import { Logo } from './Logo';

interface AuthScreenProps {
  onSuccess: (user: UserProfile) => void;
}

// Pre-registered demo numbers list
const REGISTERED_PHONES = [
  '+7 (707) 890-12-34',
  '+7 (707) 123-45-67',
  '+7 (777) 888-99-00',
];

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');

  // Step 1: Phone input
  const [phoneDigits, setPhoneDigits] = useState('');

  // Step 2: OTP State
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendToast, setResendToast] = useState(false);

  // Step 3: Registration Profile Inputs (for new unregistered numbers)
  const [fullName, setFullName] = useState('');
  const [iin, setIin] = useState('');
  const [isForceNewUser, setIsForceNewUser] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Format Kazakhstan phone number: +7 (7XX) XXX-XX-XX
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

  // 60-Second Resend Countdown Timer for OTP
  useEffect(() => {
    let interval: any = null;
    if (step === 'otp' && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timerSeconds]);

  // Step 1 Submission: Send SMS Code
  const handleRequestCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneDigits.length < 10) {
      setErrorMsg('Введите полный 10-значный номер телефона');
      return;
    }
    setErrorMsg('');
    setStep('otp');
    setTimerSeconds(60);
    setCanResend(false);
    setOtpDigits(['', '', '', '']);
  };

  // Resend SMS Code (Available after 60 seconds)
  const handleResendCode = () => {
    if (!canResend) return;
    setTimerSeconds(60);
    setCanResend(false);
    setOtpDigits(['', '', '', '']);
    setErrorMsg('');
    setResendToast(true);
    setTimeout(() => setResendToast(false), 2500);
  };

  // OTP 4-Digit Input Change & Auto-Focus
  const handleOtpChange = (val: string, idx: number) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newOtp = [...otpDigits];
    newOtp[idx] = digit;
    setOtpDigits(newOtp);

    // Auto-advance focus to next input box
    if (digit && idx < 3) {
      const nextInput = document.getElementById(`otp-input-${idx + 1}`);
      nextInput?.focus();
    }

    // Auto-verify when all 4 digits are entered
    if (newOtp.every((d) => d !== '')) {
      handleVerifyOtp();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      const prevInput = document.getElementById(`otp-input-${idx - 1}`);
      prevInput?.focus();
    }
  };

  // Step 2 Submission: Verify SMS OTP Code
  const handleVerifyOtp = async () => {
    setErrorMsg('');
    setLoading(true);

    try {
      // Check if phone number is registered in DB or demo list
      const isRegistered = !isForceNewUser && REGISTERED_PHONES.includes(fullFormattedPhone);

      if (isRegistered) {
        // Registered user -> Direct Login!
        onSuccess({
          id: 'u-existing-1',
          full_name: 'Матвей Матвеев',
          phone_number: fullFormattedPhone,
          iin: '990101300123',
          role: 'USER',
        });
      } else {
        // Unregistered new user -> Proceed to Step 3 (Personal Info Profile Registration)
        setStep('profile');
      }
    } catch (err: any) {
      setStep('profile');
    } finally {
      setLoading(false);
    }
  };

  // Step 3 Submission: Register New User Profile
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Укажите ваше имя и фамилию');
      return;
    }
    if (iin.length < 12) {
      setErrorMsg('ИИН должен состоять из 12 цифр');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const newUser: UserProfile = {
        id: `u-new-${Math.floor(1000 + Math.random() * 9000)}`,
        full_name: fullName.trim(),
        phone_number: fullFormattedPhone,
        iin: iin.trim(),
        role: 'USER',
      };
      onSuccess(newUser);
    } catch (err: any) {
      setErrorMsg('Ошибка регистрации профиля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-white text-slate-900 min-h-screen sm:min-h-0 relative">
      <div className="pt-4">
        {/* Header Bar with Logo and Navigation Back Button */}
        <div className="mb-6 flex items-center justify-between">
          <Logo size="lg" />
          {step === 'otp' && (
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Изменить номер</span>
            </button>
          )}
          {step === 'profile' && (
            <button
              type="button"
              onClick={() => setStep('otp')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Назад</span>
            </button>
          )}
        </div>

        {/* STEP 1: Phone Number Input Page */}
        {step === 'phone' && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Вход в систему</h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                Введите номер телефона для входа или регистрации в igraem.kz
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600 animate-fade-in">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Номер телефона (Казахстан)
                </label>
                <div className="flex items-center bg-slate-50 border border-slate-300 focus-within:border-[#00B050] focus-within:bg-white rounded-2xl overflow-hidden transition-all shadow-xs">
                  <div className="flex items-center gap-1 px-3 py-3.5 bg-slate-100/80 border-r border-slate-200 shrink-0 select-none">
                    <span className="text-base leading-none">🇰🇿</span>
                    <span className="text-xs font-extrabold text-slate-800">+7</span>
                  </div>
                  <input
                    type="tel"
                    value={formatKazakhstanNumber(phoneDigits)}
                    onChange={handlePhoneInputChange}
                    placeholder="(707) 000-00-00"
                    required
                    autoFocus
                    className="w-full bg-transparent py-3.5 px-3 text-slate-900 font-bold text-sm outline-none tracking-wide font-mono"
                  />
                </div>
              </div>

              {/* Demo Fast Test Number Pill */}
              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>Демо-номер:</span>
                <button
                  type="button"
                  onClick={() => setPhoneDigits('7078901234')}
                  className="text-[#00B050] font-bold hover:underline"
                >
                  +7 (707) 890-12-34 (Вход)
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || phoneDigits.length < 10}
                className="w-full bg-[#00B050] hover:bg-[#009644] active:scale-[0.99] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-[#00B050]/20 transition-all text-base disabled:opacity-50 mt-4 cursor-pointer"
              >
                <span>Получить SMS код</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: SMS OTP 4-Digit Code Verification Page */}
        {step === 'otp' && (
          <div className="animate-fade-in text-center space-y-4 pt-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Введите код из SMS</h1>
              <p className="text-xs text-slate-500 max-w-[290px] mx-auto leading-relaxed">
                Мы отправили 4-значный код подтверждения на номер{' '}
                <span className="font-bold text-slate-900 block mt-0.5">{fullFormattedPhone}</span>
              </p>
            </div>

            {resendToast && (
              <div className="p-3 bg-[#E8F8F0] border border-[#00B050]/30 text-[#00B050] text-xs font-bold rounded-2xl animate-fade-in flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Новый код отправлен по SMS</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
                {errorMsg}
              </div>
            )}

            {/* 4-Digit Input Boxes */}
            <div className="flex items-center justify-center gap-3 py-4">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(e.target.value, idx)}
                  onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                  autoFocus={idx === 0}
                  className={`w-13 h-14 text-center font-black text-2xl rounded-2xl border-2 transition-all outline-none ${
                    digit
                      ? 'border-[#00B050] bg-[#E8F8F0]/30 text-slate-900 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-[#00B050] focus:bg-white'
                  }`}
                />
              ))}
            </div>

            {/* Resend Code Countdown Timer */}
            <div className="pt-2">
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-xs font-bold text-[#00B050] hover:underline flex items-center justify-center gap-1.5 mx-auto py-2 px-4 rounded-xl hover:bg-[#E8F8F0]/50 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Отправить код повторно</span>
                </button>
              ) : (
                <p className="text-xs text-slate-400 font-medium">
                  Отправить код повторно через{' '}
                  <span className="font-bold text-slate-700 font-mono">
                    0:{timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}
                  </span>
                </p>
              )}
            </div>

            {/* Demo Testing Controls for Existing vs New Unregistered User */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-3 text-[10px] text-slate-400">
              <span>Демо-сценарий:</span>
              <button
                type="button"
                onClick={() => {
                  setIsForceNewUser(false);
                  handleVerifyOtp();
                }}
                className="text-[#00B050] font-bold hover:underline"
              >
                Существующий юзер
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  setIsForceNewUser(true);
                  handleVerifyOtp();
                }}
                className="text-indigo-600 font-bold hover:underline"
              >
                Новый юзер (Форма)
              </button>
            </div>

            <button
              type="button"
              disabled={loading || otpDigits.some((d) => !d)}
              onClick={handleVerifyOtp}
              className="w-full bg-[#00B050] hover:bg-[#009644] active:scale-[0.99] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-[#00B050]/20 transition-all text-base disabled:opacity-50 mt-4 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Подтвердить код</span>
              )}
            </button>
          </div>
        )}

        {/* STEP 3: Personal Info Profile Page (For NEW Unregistered Numbers) */}
        {step === 'profile' && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Заполните профиль</h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                Вы вошли впервые по номеру <span className="font-bold text-slate-800">{fullFormattedPhone}</span>. Укажите личные данные для завершения регистрации.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600 animate-fade-in">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCompleteRegistration} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Имя и Фамилия
                </label>
                <div className="flex items-center bg-slate-50 border border-slate-300 focus-within:border-[#00B050] focus-within:bg-white rounded-2xl px-3.5 py-3.5 transition-all">
                  <User className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Аскаров Арман"
                    required
                    autoFocus
                    className="w-full bg-transparent text-slate-900 font-bold text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  ИИН (12 цифр)
                </label>
                <div className="flex items-center bg-slate-50 border border-slate-300 focus-within:border-[#00B050] focus-within:bg-white rounded-2xl px-3.5 py-3.5 transition-all">
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

              <div className="p-3 bg-[#E8F8F0]/60 border border-[#00B050]/20 rounded-2xl flex items-center gap-2.5 text-xs text-[#00B050] font-semibold mt-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>ИИН используется только для подлинности регистраций и защиты от бана</span>
              </div>

              <button
                type="submit"
                disabled={loading || !fullName.trim() || iin.length < 12}
                className="w-full bg-[#00B050] hover:bg-[#009644] active:scale-[0.99] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-[#00B050]/20 transition-all text-base disabled:opacity-50 mt-6 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>Завершить регистрацию</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer Security Badge */}
      <div className="pb-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
        <ShieldCheck className="w-4 h-4 text-[#00B050]" />
        <span>Защищено igraem.kz API</span>
      </div>
    </div>
  );
};
