import React, { useEffect, useState } from 'react';
import { Check, Package, Truck, MessageCircle, ArrowRight, Home } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function Success() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [orderId, setOrderId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Tenta pegar o ID da transação ou pedido da URL (Hash ou Query String padrão)
        const params = new URLSearchParams(window.location.search);
        const transactionId = searchParams.get('transaction_id') || searchParams.get('order_id') || params.get('transaction_id') || params.get('order_id');
        const orderNsu = searchParams.get('order_nsu') || params.get('order_nsu');
        const captureMethod = searchParams.get('capture_method') || params.get('capture_method');

        const idFromLocal = localStorage.getItem('last_order_id');

        // Determine the order ID to display
        const effectiveOrderId = orderNsu || transactionId || idFromLocal;
        if (effectiveOrderId) {
            setOrderId(effectiveOrderId);
        }

        // CLIENT-SIDE FALLBACK: If we have payment proof, mark order as paid
        // This covers the case where InfinitePay's webhook doesn't fire
        if ((captureMethod || transactionId) && (orderNsu || idFromLocal)) {
            const targetOrderId = orderNsu || idFromLocal;
            console.log(`[Success] Marking order ${targetOrderId} as paid (fallback)`);

            supabase.functions.invoke('infinitepay-webhook', {
                body: {
                    order_nsu: targetOrderId,
                    status: 'paid',
                    id: transactionId || 'client-side-confirm',
                    source: 'client-redirect-fallback'
                }
            }).then(({ data, error }) => {
                if (error) console.error('[Success] Fallback webhook error:', error);
                else console.log('[Success] Order marked as paid:', data);
            });
        }

        // Simula loading para dar um efeito de "Verificando..."
        setTimeout(() => setLoading(false), 2000);

        // Limpa o carrinho
        localStorage.removeItem('zenaide_cart');

    }, [searchParams]);

    const handleWhatsApp = () => {
        const phone = "5569999717163";
        const msg = `Olá! Finalizei meu pedido no site (Pedido #${orderId ? orderId.slice(0, 8) : 'Novo'}). Gostaria de confirmar.`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center">
                <div className="flex flex-col items-center animate-pulse">
                    <div className="w-16 h-16 bg-stone-200 rounded-full mb-4"></div>
                    <div className="h-4 w-48 bg-stone-200 rounded mb-2"></div>
                    <div className="h-3 w-32 bg-stone-100 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6 font-sans text-stone-900">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">

                {/* Header / Hero */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-10 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

                    <div className="relative z-10">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-bounce">
                            <Check size={40} className="text-green-600" strokeWidth={4} />
                        </div>
                        <h1 className="text-3xl font-serif font-bold text-white mb-2">Pedido Confirmado!</h1>
                        <p className="text-green-100 font-medium text-sm">Obrigado por comprar conosco.</p>
                    </div>
                </div>

                {/* Body / Timeline */}
                <div className="p-8 space-y-8">

                    {/* Status Steps */}
                    <div className="relative pl-4 border-l-2 border-stone-100 space-y-8">
                        {/* Step 1 */}
                        <div className="relative">
                            <div className="absolute -left-[25px] top-0 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-sm flex items-center justify-center">
                                <Check size={12} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-stone-800 text-sm">Pagamento Processado</h3>
                                <p className="text-xs text-stone-500">Seu pagamento foi recebido com segurança.</p>
                            </div>
                        </div>

                        {/* Step 2 (Active) */}
                        <div className="relative">
                            <div className="absolute -left-[25px] top-0 w-6 h-6 bg-amber-500 rounded-full border-4 border-white shadow-sm flex items-center justify-center animate-pulse">
                                <Package size={12} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-stone-800 text-sm">Em Separação</h3>
                                <p className="text-xs text-stone-500">Seu pedido está sendo separado.</p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="relative opacity-50">
                            <div className="absolute -left-[25px] top-0 w-6 h-6 bg-stone-200 rounded-full border-4 border-white shadow-sm flex items-center justify-center">
                                <Truck size={12} className="text-stone-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-stone-800 text-sm">Entrega</h3>
                                <p className="text-xs text-stone-500">Seu pedido sairá para entrega em breve.</p>
                            </div>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 text-center">
                        <p className="text-stone-500 text-xs mb-3 uppercase tracking-widest font-bold">Estimativa de Entrega</p>
                        <p className="text-stone-900 font-serif text-xl font-bold">3 a 5 dias úteis</p>
                        <p className="text-stone-400 text-[10px] mt-2">Dependendo da sua localização</p>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={handleWhatsApp}
                            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-green-700 active:scale-95 transition-all shadow-lg shadow-green-600/20"
                        >
                            <MessageCircle size={20} />
                            Acompanhar pelo WhatsApp
                        </button>

                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-white text-stone-900 border border-stone-200 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-stone-50 active:scale-95 transition-all"
                        >
                            <Home size={20} />
                            Voltar para a Loja
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
