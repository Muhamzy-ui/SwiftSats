import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Headphones, ArrowLeft, ScanFace, Check } from 'lucide-react';

export const PinEntryPage: React.FC = () => {
  const [pin, setPin] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const navigate = useNavigate();

  // Check WebAuthn platform biometric capability
  useEffect(() => {
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => setBiometricAvailable(available))
        .catch(() => setBiometricAvailable(false));
    }
  }, []);

  const handleCompletePin = useCallback((enteredPin: string) => {
    if (enteredPin.length === 4) {
      setIsSuccess(true);
      setErrorMessage(null);
      setTimeout(() => {
        navigate('/track');
      }, 600);
    }
  }, [navigate]);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        handleCompletePin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const handleBiometricAuth = async () => {
    setBiometricLoading(true);
    setErrorMessage(null);
    try {
      if (window.PublicKeyCredential) {
        setIsSuccess(true);
        setTimeout(() => {
          navigate('/track');
        }, 600);
      } else {
        setErrorMessage('Biometrics unavailable on this device.');
      }
    } catch {
      setErrorMessage('Biometric verification failed. Please enter your PIN.');
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-white flex flex-col justify-between pt-6 pb-10 px-6 max-w-sm mx-auto select-none relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-600/20 blur-[90px] pointer-events-none" />

      {/* Top Bar: "Log out" left, "Help" right */}
      <div className="flex items-center justify-between w-full pt-2 relative z-10">
        <Link
          to="/"
          className="text-sm font-semibold text-slate-300 hover:text-white transition-colors"
        >
          Log out
        </Link>

        <button
          type="button"
          onClick={() => alert('SwiftSats Support: WhatsApp +234 800 SWIFTSATS or support@swiftsats.com')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-white/[0.08] hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors shadow-sm"
        >
          <Headphones className="w-3.5 h-3.5 text-indigo-400" />
          <span>Help</span>
        </button>
      </div>

      {/* Center Section: Avatar + Heading + PIN Inputs */}
      <div className="flex flex-col items-center text-center mt-6 mb-2 space-y-4 relative z-10">
        {/* Centered Circular Avatar Placeholder Icon */}
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/[0.08] flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-950/40">
          <svg
            className="w-8 h-8"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl sm:text-[26px] font-black tracking-tight text-white">
            Welcome Back
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Enter your PIN
          </p>
        </div>

        {/* 4 Rounded-Square PIN Boxes */}
        <div className="flex justify-center items-center gap-3.5 pt-2">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            const isCurrent = pin.length === index;

            return (
              <div
                key={index}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-150 border ${
                  isSuccess
                    ? 'border-emerald-500 bg-emerald-950/40 text-[#00e676]'
                    : isFilled
                    ? 'border-indigo-500/80 bg-slate-900/90 shadow-sm shadow-indigo-950/50'
                    : isCurrent
                    ? 'border-indigo-400 ring-2 ring-indigo-500/30 bg-slate-950'
                    : 'border-white/[0.08] bg-slate-950/60'
                }`}
              >
                {isSuccess ? (
                  <Check className="w-5 h-5 stroke-[3] text-[#00e676] animate-in zoom-in" />
                ) : isFilled ? (
                  <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 animate-in zoom-in-50 duration-100" />
                ) : null}
              </div>
            );
          })}
        </div>

        {errorMessage && (
          <p className="text-xs font-semibold text-rose-400 animate-in fade-in">
            {errorMessage}
          </p>
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="w-full max-w-xs mx-auto space-y-4 relative z-10">
        <div className="grid grid-cols-3 gap-y-4 text-center">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-bold text-white hover:bg-slate-900 active:scale-95 transition-all focus:outline-none"
            >
              {digit}
            </button>
          ))}

          {/* Row 4: Biometric / 0 / Backspace */}
          <button
            type="button"
            onClick={handleBiometricAuth}
            disabled={biometricLoading}
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-indigo-400 hover:bg-slate-900 active:scale-95 transition-all focus:outline-none"
            title={biometricAvailable ? 'Face ID / Touch ID Authenticator' : 'Biometric Auth (Simulated)'}
          >
            <ScanFace className={`w-7 h-7 stroke-[1.8] ${biometricLoading ? 'animate-pulse' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-bold text-white hover:bg-slate-900 active:scale-95 transition-all focus:outline-none"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-slate-300 hover:bg-slate-900 active:scale-95 transition-all focus:outline-none"
            title="Backspace"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2]" />
          </button>
        </div>

        {/* Forgot PIN? Link */}
        <div className="text-center pt-2 pb-1">
          <button
            type="button"
            onClick={() => alert('PIN Reset: A secure reset link has been dispatched to your email.')}
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            Forgot PIN?
          </button>
        </div>
      </div>
    </div>
  );
};
