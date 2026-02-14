import React, { useState } from 'react';
import { Heart, Sparkles, ArrowRight, Phone, Check } from 'lucide-react';
import { useCustomer } from '../contexts/CustomerContext';
import { supabase } from '../services/supabase';

export default function LandingPage() {
    const { registerCustomer } = useCustomer();
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Phone-first flow states
    const [step, setStep] = useState('phone'); // 'phone' | 'greeting' | 'name'
    const [foundName, setFoundName] = useState('');
    const [checking, setChecking] = useState(false);

    const formatPhone = (value) => {
        const digits = value.replace(/\D/g, '').substring(0, 11);
        if (digits.length <= 2) return digits;
        if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    };

    const handlePhoneChange = (e) => {
        setPhone(formatPhone(e.target.value));
        setError('');
    };

    const handlePhoneLookup = async () => {
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            setError('Por favor, informe o número completo.');
            return;
        }

        setChecking(true);
        setError('');

        try {
            const { data } = await supabase
                .from('customers')
                .select('name')
                .eq('phone', cleanPhone)
                .single();

            if (data?.name) {
                setFoundName(data.name);
                setStep('greeting');
            } else {
                setStep('name');
            }
        } catch {
            // Customer not found — ask for name
            setStep('name');
        }
        setChecking(false);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        const cleanPhone = phone.replace(/\D/g, '');
        const finalName = foundName || name;

        if (!finalName.trim()) { setError('Por favor, informe seu nome. 💛'); return; }
        if (cleanPhone.length < 10) { setError('Por favor, informe o número completo.'); return; }

        setLoading(true);
        setError('');
        try {
            await registerCustomer(finalName.trim(), cleanPhone);
        } catch (err) {
            setError('Ops! Algo deu errado. Tenta de novo? 🙏');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-stone-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">

            {/* Decorative Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-10 left-10 w-72 h-72 bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }} />
            </div>

            <div className="relative z-10 max-w-md w-full text-center">

                {!showForm ? (
                    /* ============ WELCOME SCREEN ============ */
                    <div className="animate-fadeIn">
                        {/* Logo / Brand */}
                        <div className="mb-8">
                            <div className="flex justify-center mb-6">
                                <img src="/logo_full.svg" alt="Zenaide Simões" className="h-40 w-auto" />
                            </div>
                            <p className="text-stone-500 text-sm tracking-widest uppercase">
                                Joias • Acessórios • Casa
                            </p>
                        </div>

                        {/* Welcome Message */}
                        <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-xl shadow-stone-200/50 border border-white/80 mb-8">
                            <p className="text-stone-700 text-lg leading-relaxed font-medium">
                                Oi! Eu sou a <span className="text-amber-600 font-bold">Zenaide</span>. 💛
                            </p>
                            <p className="text-stone-600 text-base mt-3 leading-relaxed">
                                Boas-vindas! Preparei uma seleção especial com as peças mais lindas pensando em você.
                            </p>
                            <p className="text-stone-500 text-sm mt-4">
                                Como podemos chamar você?
                            </p>
                        </div>

                        {/* CTA Button */}
                        <button
                            onClick={() => setShowForm(true)}
                            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white py-4 px-8 rounded-2xl font-bold text-lg shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 group"
                        >
                            Entrar na Loja
                            <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                        </button>

                        {/* Trust Signal */}
                        <p className="text-stone-400 text-xs mt-6 flex items-center justify-center gap-1">

                            Há mais de 30 anos trazendo os melhores produtos para você!
                        </p>
                    </div>
                ) : (
                    /* ============ REGISTRATION FORM ============ */
                    <div className="animate-fadeIn">
                        <div className="mb-8">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                                <Heart size={32} className="text-white" />
                            </div>
                            <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">
                                {step === 'greeting' ? `Olá, ${foundName}! 💛` : 'Vamos começar:'}
                            </h2>
                            {step === 'greeting' && (
                                <p className="text-stone-500 text-sm">Que bom ver você de novo!</p>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-xl shadow-stone-200/50 border border-white/80 space-y-5">

                            {/* Phone Input — Always visible */}
                            <div className="text-left">
                                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">
                                    Seu WhatsApp
                                </label>
                                <div className="relative">
                                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={handlePhoneChange}
                                        placeholder="(69) 99999-9999"
                                        className={`w-full pl-12 pr-5 py-4 rounded-xl border-2 ${step !== 'phone' ? 'border-green-300 bg-green-50/50' : 'border-stone-200'} focus:border-amber-400 focus:ring-4 focus:ring-amber-100 outline-none transition-all text-stone-800 placeholder-stone-300 text-base`}
                                        disabled={step !== 'phone'}
                                        autoFocus={step === 'phone'}
                                    />
                                    {step !== 'phone' && (
                                        <Check size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />
                                    )}
                                </div>
                                <p className="text-xs text-stone-400 mt-1.5 ml-1">
                                    Usaremos para atualizar sobre seus pedidos 💛
                                </p>
                            </div>

                            {/* Step: Phone lookup — show "Continuar" button */}
                            {step === 'phone' && (
                                <button
                                    type="button"
                                    onClick={handlePhoneLookup}
                                    disabled={checking || phone.replace(/\D/g, '').length < 10}
                                    className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold text-base shadow-lg hover:bg-stone-800 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {checking ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Verificando...
                                        </>
                                    ) : (
                                        <>
                                            Continuar
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Step: Name — customer not found, ask for name */}
                            {step === 'name' && (
                                <div className="text-left animate-fadeIn">
                                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 block">
                                        Seu Nome
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => { setName(e.target.value); setError(''); }}
                                        placeholder="Como posso te chamar?"
                                        className="w-full px-5 py-4 rounded-xl border-2 border-stone-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-100 outline-none transition-all text-stone-800 placeholder-stone-300 text-base"
                                        autoFocus
                                    />
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="bg-rose-50 text-rose-600 text-sm p-3 rounded-xl text-center font-medium">
                                    {error}
                                </div>
                            )}

                            {/* Submit — visible when we have enough info */}
                            {(step === 'greeting' || step === 'name') && (
                                <button
                                    type="submit"
                                    disabled={loading || (step === 'name' && !name.trim())}
                                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Entrando...
                                        </>
                                    ) : (
                                        <>
                                            Acessar Loja
                                        </>
                                    )}
                                </button>
                            )}
                        </form>

                        {/* Back */}
                        <button
                            onClick={() => { setShowForm(false); setStep('phone'); setFoundName(''); setName(''); setError(''); }}
                            className="mt-4 text-stone-400 text-sm hover:text-stone-600 transition-colors"
                        >
                            ← Voltar
                        </button>
                    </div>
                )}
            </div>

            {/* CSS Animation */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.6s ease-out;
                }
            `}
            </style>
        </div>
    );
}
