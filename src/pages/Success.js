import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { supabase } from '../services/supabase';

export default function Success() {
    const [search] = useSearchParams();
    const params = new URLSearchParams(window.location.search);
    const orderId = search.get('order_nsu') || params.get('order_nsu') || localStorage.getItem('last_order_id');
    const slug = search.get('slug') || params.get('slug');
    const transaction = search.get('transaction_nsu') || params.get('transaction_nsu');
    const [status, setStatus] = useState('pending');
    const [attempt, setAttempt] = useState(0);
    const completeDetails = Boolean(orderId && slug && transaction);

    useEffect(() => {
        if (!completeDetails) return;
        let active = true;
        setStatus('checking');
        supabase.functions.invoke('infinitepay-webhook', {
            body: { order_nsu: orderId, slug, transaction_nsu: transaction },
        }).then(({ data }) => {
            if (active) setStatus(data?.paid ? 'paid' : 'pending');
        });
        return () => { active = false; };
    }, [attempt, completeDetails, orderId, slug, transaction]);

    const message = `Olá, Zenaide! Gostaria de combinar a entrega do meu pedido${orderId ? ` #${orderId.slice(0, 8)}` : ''}.`;

    return (
        <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-8 text-stone-900">
            <div className="w-full max-w-md space-y-5 rounded-2xl bg-white p-6 text-center shadow-sm">
                <h1 className="font-serif text-2xl font-bold" role="status">
                    {status === 'paid' ? 'Pagamento confirmado' : status === 'checking' ? 'Verificando pagamento…' : 'Aguardando confirmação do pagamento'}
                </h1>
                {orderId && <p className="text-sm text-stone-600">Pedido #{orderId.slice(0, 8)}</p>}
                {status === 'paid' ? (
                    <p className="text-sm text-stone-700">Combine a entrega diretamente com a Zenaide pelo WhatsApp.</p>
                ) : (
                    <p className="text-sm text-stone-700">Se você já pagou, a confirmação pode levar alguns instantes.</p>
                )}
                {completeDetails && status === 'pending' && (
                    <button type="button" onClick={() => setAttempt(value => value + 1)} className="min-h-11 px-4 font-medium underline">
                        Verificar novamente
                    </button>
                )}
                <a href={`https://wa.me/5569999717163?text=${encodeURIComponent(message)}`}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-green-700 p-3 font-semibold text-white">
                    <MessageCircle size={18} /> {status === 'paid' ? 'Combinar entrega' : 'Falar com a Zenaide'}
                </a>
                <Link to="/" className="inline-flex min-h-11 items-center text-sm underline">Voltar à loja</Link>
            </div>
        </main>
    );
}
