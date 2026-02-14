import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Trash2, Plus, Tag, Calendar, Percent, Hash } from 'lucide-react';

export default function AdminCoupons() {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        discount_type: 'percentage', // percentage | fixed
        discount_value: '',
        min_order_value: '',
        max_uses: '',
        expires_at: ''
    });

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCoupons(data || []);
        } catch (error) {
            console.error('Error fetching coupons:', error);
            alert('Erro ao carregar cupons');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir este cupom?')) return;
        try {
            const { error } = await supabase.from('coupons').delete().eq('id', id);
            if (error) throw error;
            setCoupons(coupons.filter(c => c.id !== id));
        } catch (error) {
            alert('Erro ao excluir: ' + error.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.code || !formData.discount_value) return alert('Preencha os campos obrigatórios');

        try {
            const payload = {
                code: formData.code.toUpperCase().trim(),
                discount_type: formData.discount_type,
                discount_value: parseFloat(formData.discount_value),
                min_order_value: formData.min_order_value ? parseFloat(formData.min_order_value) : null,
                max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
                expires_at: formData.expires_at || null,
                is_active: true
            };

            const { error } = await supabase.from('coupons').insert([payload]);

            if (error) throw error;

            setShowForm(false);
            setFormData({
                code: '',
                discount_type: 'percentage',
                discount_value: '',
                min_order_value: '',
                max_uses: '',
                expires_at: ''
            });
            fetchCoupons();
        } catch (error) {
            alert('Erro ao criar cupom: ' + error.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-stone-800">Gerenciar Cupons</h2>
                    <p className="text-sm text-stone-500">Crie códigos de desconto para seus clientes</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="w-full md:w-auto bg-stone-900 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors"
                >
                    <Plus size={18} /> Novo Cupom
                </button>
            </div>

            {showForm && (
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-stone-100 shadow-sm animate-in slide-in-from-top-4">
                    <h3 className="font-bold text-stone-800 mb-4">Novo Cupom</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Código</label>
                                <input
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="w-full p-2 md:p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none uppercase font-bold tracking-wider"
                                    placeholder="EX: VERAO10"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Tipo</label>
                                    <select
                                        value={formData.discount_type}
                                        onChange={e => setFormData({ ...formData, discount_type: e.target.value })}
                                        className="w-full p-2 md:p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none bg-white"
                                    >
                                        <option value="percentage">Porcentagem (%)</option>
                                        <option value="fixed">Valor Fixo (R$)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Valor</label>
                                    <input
                                        type="number"
                                        value={formData.discount_value}
                                        onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                                        className="w-full p-2 md:p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none"
                                        placeholder={formData.discount_type === 'percentage' ? '10' : '50.00'}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Pedido Mínimo (R$)</label>
                                <input
                                    type="number"
                                    value={formData.min_order_value}
                                    onChange={e => setFormData({ ...formData, min_order_value: e.target.value })}
                                    className="w-full p-2 md:p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none"
                                    placeholder="Opcional"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Limite de Usos</label>
                                <input
                                    type="number"
                                    value={formData.max_uses}
                                    onChange={e => setFormData({ ...formData, max_uses: e.target.value })}
                                    className="w-full p-2 md:p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none"
                                    placeholder="Opcional"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Validade</label>
                                <input
                                    type="date"
                                    value={formData.expires_at}
                                    onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
                                    className="w-full p-2 md:p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 py-3 text-stone-500 font-bold rounded-xl hover:bg-stone-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-3 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 transition-colors"
                            >
                                Criar Cupom
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {coupons.map(coupon => (
                    <div key={coupon.id} className="bg-white p-4 md:p-5 rounded-2xl border border-stone-100 shadow-sm relative group overflow-hidden">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <span className="bg-amber-100 text-amber-800 p-2 rounded-lg">
                                    <Tag size={18} />
                                </span>
                                <div>
                                    <h3 className="font-bold text-lg text-stone-800 tracking-wide">{coupon.code}</h3>
                                    <p className="text-xs text-stone-500">
                                        {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `R$ ${coupon.discount_value} OFF`}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(coupon.id)}
                                className="text-stone-300 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="space-y-2 text-sm text-stone-600 border-t border-stone-100 pt-3">
                            <div className="flex items-center gap-2">
                                <Hash size={14} className="text-stone-400" />
                                <span>Usos: <b>{coupon.current_uses}</b> / {coupon.max_uses || '∞'}</span>
                            </div>
                            {coupon.min_order_value && (
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-stone-400">R$</span>
                                    <span>Mínimo: <b>R$ {coupon.min_order_value}</b></span>
                                </div>
                            )}
                            {coupon.expires_at && (
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-stone-400" />
                                    <span className={`${new Date(coupon.expires_at) < new Date() ? 'text-red-500 font-bold' : ''}`}>
                                        Validade: {new Date(coupon.expires_at).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {coupons.length === 0 && !loading && (
                    <div className="col-span-full py-10 text-center text-stone-400">
                        Nenhum cupom ativo.
                    </div>
                )}
            </div>
        </div>
    );
}
