import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Check, Clock, MessageCircle, Package, RefreshCw, Truck } from 'lucide-react';
import { getOptimizedImageUrl, imagePresets, supabase } from '../services/supabase';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const steps = [
    { key: 'order', label: 'Pedido feito' },
    { key: 'paid', label: 'Pagamento confirmado' },
    { key: 'processing', label: 'Separando a peça' },
    { key: 'shipped', label: 'Saiu para entrega' },
    { key: 'delivered', label: 'Entregue' },
];

function stepIndex(order) {
    if (!order) return 0;
    if (order.status === 'delivered') return 4;
    if (order.status === 'shipped') return 3;
    if (order.status === 'processing') return 2;
    if (order.payment_status === 'paid' || order.status === 'paid') return 1;
    return 0;
}

export default function OrderStatus() {
    const { token } = useParams();
    const [state, setState] = useState({ status: 'loading' });
    const [refreshing, setRefreshing] = useState(false);

    async function load() {
        if (!/^[a-f0-9]{12,32}$/i.test(token || '')) return setState({ status: 'missing' });
        const [{ data: link }, { data: order, error }] = await Promise.all([
            supabase.from('sales_links').select('title, image_url').eq('token', token).maybeSingle(),
            supabase.rpc('get_sales_link_order', { p_token: token }),
        ]);
        if (error) return setState({ status: 'error' });
        if (!order) return setState(link ? { status: 'waiting', link } : { status: 'missing' });
        setState({ status: 'ready', link, order });
    }

    useEffect(() => {
        load();
        const timer = setInterval(() => {
            setState(current => {
                if (current.status === 'ready' && current.order.payment_status === 'paid') return current;
                return current;
            });
        }, 20000);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    useEffect(() => {
        if (state.status !== 'ready' || state.order.payment_status === 'paid') return undefined;
        const timer = setInterval(load, 20000);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.status, state.order?.payment_status]);

    const order = state.order;
    const current = stepIndex(order);
    const item = order?.items?.[0];
    const whatsappMessage = `Oi, Zenaide! Sou ${order?.customer_name || ''}, sobre o pedido #${String(order?.id || '').slice(0, 8)}.`;
    const pending = order && order.payment_status !== 'paid';

    return (
        <main className="min-h-screen bg-stone-50 pb-10 text-stone-900">
            <header className="border-b border-stone-200 bg-white">
                <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
                    <a href={`${process.env.PUBLIC_URL}/`} className="inline-flex min-h-10 items-center gap-2 text-sm font-medium"><ArrowLeft size={17} /> Loja</a>
                    <img src={`${process.env.PUBLIC_URL}/logo_full.svg`} className="h-9 w-auto" alt="Zenaide Simões" />
                </div>
            </header>

            <div className="mx-auto max-w-lg space-y-4 px-4 py-5">
                {state.status === 'loading' && <p className="py-10 text-center text-sm text-stone-500">Carregando seu pedido…</p>}
                {(state.status === 'missing' || state.status === 'error') && (
                    <div className="rounded-2xl bg-white p-6 text-center">
                        <p className="font-serif text-lg font-bold">Não encontramos este pedido</p>
                        <a className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-stone-900 font-semibold text-white" href="https://wa.me/5569999717163">Falar com a Zenaide</a>
                    </div>
                )}

                {order && (
                    <>
                        <section className="rounded-2xl bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-widest text-stone-400">Pedido #{String(order.id).slice(0, 8)}</p>
                                    <h1 className="mt-1 font-serif text-2xl font-bold">
                                        {order.status === 'delivered' ? 'Entregue' : order.payment_status === 'paid' ? 'Pagamento confirmado' : 'Aguardando pagamento'}
                                    </h1>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                    {order.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                                </span>
                            </div>

                            <ol className="mt-5 space-y-3">
                                {steps.map((step, index) => {
                                    const done = index <= current;
                                    const Icon = index === 0 ? Check : index === 1 ? Check : index === 2 ? Package : index === 3 ? Truck : Check;
                                    return (
                                        <li key={step.key} className="flex items-center gap-3 text-sm">
                                            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${done ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-400'}`}>
                                                {index > current ? <Clock size={14} /> : <Icon size={14} />}
                                            </span>
                                            <span className={done ? 'font-medium text-stone-900' : 'text-stone-500'}>{step.label}</span>
                                        </li>
                                    );
                                })}
                            </ol>

                            {order.tracking_code && <p className="mt-4 rounded-xl bg-stone-50 p-3 text-sm">Rastreio: <strong>{order.tracking_code}</strong></p>}
                            {pending && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">A peça fica reservada por alguns minutos. O pagamento é confirmado automaticamente.</p>}
                            {pending && order.payment_link && (
                                <a href={order.payment_link} className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-stone-900 font-semibold text-white">Pagar agora com Pix ou cartão</a>
                            )}
                        </section>

                        {item && (
                            <section className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm">
                                {item.image_url && <img src={getOptimizedImageUrl(item.image_url, imagePresets.small)} alt={item.name} className="h-20 w-20 rounded-xl bg-stone-50 object-contain" />}
                                <div className="flex-1">
                                    <p className="font-medium leading-tight">{item.name}</p>
                                    {item.size_label && <p className="text-sm text-stone-500">Tamanho: {item.size_label}</p>}
                                    <p className="text-sm text-stone-500">Qtd: {item.qty || 1}</p>
                                    <p className="mt-1 font-semibold">{money.format(Number(item.price) * (item.qty || 1))}</p>
                                </div>
                            </section>
                        )}

                        <section className="rounded-2xl bg-white p-4 shadow-sm">
                            <h2 className="flex items-center gap-2 font-semibold"><Truck size={18} /> Entrega</h2>
                            <p className="mt-2 text-sm text-stone-600">{order.delivery_method || 'A combinar com a Zenaide'}</p>
                            {Number(order.delivery_fee) > 0 && <p className="text-sm text-stone-600">Taxa: {money.format(Number(order.delivery_fee))}</p>}
                            {order.address?.street && (
                                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                                    {order.address.street}, {order.address.number}
                                    {order.address.complement ? ` — ${order.address.complement}` : ''}<br />
                                    {order.address.district} — {order.address.city}/{order.address.state}<br />
                                    CEP {order.address.cep}
                                </p>
                            )}
                            <div className="mt-3 flex justify-between border-t border-stone-100 pt-3 text-base font-semibold">
                                <span>Total</span><span>{money.format(Number(order.total_amount))}</span>
                            </div>
                        </section>

                        <a href={`https://wa.me/5569999717163?text=${encodeURIComponent(whatsappMessage)}`}
                            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white font-semibold">
                            <MessageCircle size={18} /> Falar com a Zenaide
                        </a>

                        <button type="button" onClick={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
                            className="mx-auto flex min-h-11 items-center gap-2 text-sm text-stone-500">
                            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Atualizar status
                        </button>
                    </>
                )}

                {state.status === 'waiting' && state.link && (
                    <div className="rounded-2xl bg-white p-6 text-center text-sm">Pedido ainda não iniciado para esta peça.</div>
                )}
            </div>
        </main>
    );
}
