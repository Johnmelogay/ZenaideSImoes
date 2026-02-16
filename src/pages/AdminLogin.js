import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/admin/dashboard');
        } catch (error) {
            alert(error.error_description || error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-stone-100">
                <div className="flex justify-center mb-6">
                    <img src={`${process.env.PUBLIC_URL}/logo_full.svg`} alt="Zenaide Simões" className="h-28 w-auto" />
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Email</label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 text-stone-400" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-500 transition-colors"
                                placeholder="email@zenaide.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 text-stone-400" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-500 transition-colors"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-stone-900 text-white font-bold py-3 rounded-xl hover:bg-stone-800 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Entrando...' : 'Acessar Painel'}
                    </button>
                </form>
            </div>
        </div>
    );
}
