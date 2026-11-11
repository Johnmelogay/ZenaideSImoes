import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, Lock, MessageCircle, Truck } from 'lucide-react';
import { getOptimizedImageUrl, imagePresets, supabase } from '../services/supabase';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const field = 'mt-1 block w-full rounded-xl border border-stone-300 bg-white p-3 text-base outline-none focus:border-stone-900';

const addressFields = [
    { name: 'cep', label: 'CEP', autoComplete: 'postal-code', inputMode: 'numeric', maxLength: 9 },
    { name: 'street', label: 'Rua / Avenida', autoComplete: 'address-line1' },
    { name: 'number', label: 'Número', inputMode: 'numeric' },
    { name: 'complement', label: 'Complemento (opcional)', autoComplete: 'address-line2' },
    { name: 'district', label: 'Bairro', autoComplete: 'address-level3' },
    { name: 'city', label: 'Cidade', autoComplete: 'address-level2' },
    { name: 'state', label: 'Estado', autoComplete: 'address-level1', maxLength: 2 },
];

function formatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function SalesLink() {
    const { token } = useParams();
    const [state, setState] = useState({ status: 'loading' });
    const [size, setSize] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [delivery, setDelivery] = useState(0);
    const [phone, setPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const attempt = useRef(null);
    const inFlight = useRef(false);

    useEffect(() => {
        let active = true;
        if (!/^[a-f0-9]{12,32}$/i.test(token || '')) {
            setState({ status: 'missing' });
            return undefined;
        }
        supabase.from('sales_links')
            .select('id, token, title, description, price, image_url, sizes, stock, status, delivery_options, expires_at')
            .eq('token', token)
            .maybeSingle()
            .then(({ data, error: loadError }) => {
                if (!active) return;
                if (loadError) return setState({ status: 'error' });
                if (!data) return setState({ status: 'missing' });
                const expired = data.expires_at && new Date(data.expires_at) <= new Date();
                if (data.status !== 'active' || expired) return setState({ status: 'closed', link: data });
                setState({ status: 'ready', link: data });
                setSize((data.sizes || [])[0] || '');
            });
        return () => { active = false; };
    }, [token]);

    const { link } = state;
    const options = useMemo(() => (link?.delivery_options || []).filter(option => option && typeof option.label === 'string'), [link]);
    const fee = Number(options[delivery]?.fee || 0);
    const total = link ? Number(link.price) * quantity + fee : 0;
    const photos = link ? [link.image_url].filter(Boolean) : [];

    async function submit(event) {
        event.preventDefault();
        if (inFlight.current || !link) return;
        inFlight.current = true;
        setSubmitting(true);
        setError('');
        const form = new FormData(event.currentTarget);
        const payload = {
            token: link.token,
            quantity,
            size,
            name: String(form.get('name') || '').trim(),
            phone: phone.replace(/\D/g, ''),
            email: String(form.get('email') || '').trim(),
            delivery: { label: options[delivery]?.label || '', fee },
            address: Object.fromEntries(addressFields.map(item => [item.name, String(form.get(item.name) || '').trim()])),
        };
        const fingerprint = JSON.stringify(payload);
        if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, id: crypto.randomUUID() };
        try {
            const { data, error: requestError } = await supabase.functions.invoke('sales-link-checkout', {
                body: { ...payload, order_id: attempt.current.id },
            });
            if (requestError || !data?.url) {
                const details = await requestError?.context?.json?.().catch(() => null);
                if (details?.restart) attempt.current = null;
                throw new Error(details?.error || 'Não foi possível abrir o pagamento agora.');
            }
            window.location.assign(data.url);
        } catch (checkoutError) {
            setError(checkoutError.message);
        } finally {
            inFlight.current = false;
            setSubmitting(false);
        }
    }

    return (
        <main className="min-h-screen bg-stone-50 pb-28 text-stone-900">
            <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
                    <a href={`${process.env.PUBLIC_URL}/`} className="inline-flex min-h-10 items-center gap-2 text-sm font-medium"><ArrowLeft size={17} /> Loja</a>
                    <img src={`${process.env.PUBLIC_URL}/logo_full.svg`} className="h-9 w-auto" alt="Zenaide Simões" />
                </div>
            </header>

            <div className="mx-auto max-w-lg px-4 py-4">
                {state.status === 'loading' && <p className="py-10 text-center text-sm text-stone-500"><Loader2 className="mx-auto mb-2 animate-spin" size={20} /> Carregando…</p>}

                {(state.status === 'missing' || state.status === 'closed') && (
                    <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                        <h1 className="font-serif text-xl font-bold">Este link não está mais disponível</h1>
                        <p className="mt-2 text-sm text-stone-600">Fale com a Zenaide para receber um link novo ou ver outras peças.</p>
                        <a className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-stone-900 px-4 font-semibold text-white" href="https://wa.me/5569999717163">Falar com a Zenaide</a>
                    </div>
                )}

                {state.status === 'error' && <p className="rounded-xl bg-white p-4 text-sm">Não foi possível carregar este link. Tente novamente.</p>}

                {state.status === 'ready' && link && (
                    <form id="sales-checkout" data-clarity-mask="True" onSubmit={submit} className="space-y-4">
                        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
                            {photos[0] ? (
                                <img src={getOptimizedImageUrl(photos[0], imagePresets.medium)}
                                    onError={event => { if (event.currentTarget.src !== photos[0]) event.currentTarget.src = photos[0]; }}
                                    alt={link.title} className="aspect-square w-full bg-stone-50 object-contain" />
                            ) : <div className="aspect-square w-full bg-stone-100" />}
                            <div className="p-4">
                                <h1 className="font-serif text-2xl font-bold leading-tight">{link.title}</h1>
                                <p className="mt-1 text-xl font-semibold">{money.format(Number(link.price))}</p>
                                {link.description && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-600">{link.description}</p>}
                                {link.sizes?.length > 0 && (
                                    <label className="mt-4 block text-sm font-medium">
                                        Tamanho
                                        <select className={field} value={size} onChange={event => setSize(event.target.value)} required>
                                            {link.sizes.map(option => <option key={option} value={option}>{option}</option>)}
                                        </select>
                                    </label>
                                )}
                                <label className="mt-4 block text-sm font-medium">
                                    Quantidade
                                    <select className={field} value={quantity} onChange={event => setQuantity(Number(event.target.value))}>
                                        {Array.from({ length: Math.max(1, Math.min(link.stock || 10, 10)) }, (_, index) => index + 1)
                                            .map(value => <option key={value} value={value}>{value}</option>)}
                                    </select>
                                </label>
                            </div>
                        </section>

                        <section className="rounded-2xl bg-white p-4 shadow-sm">
                            <h2 className="font-semibold">Quem vai receber</h2>
                            <label className="mt-3 block text-sm font-medium">Nome completo
                                <input className={field} name="name" autoComplete="name" minLength={2} maxLength={100} required />
                            </label>
                            <label className="mt-3 block text-sm font-medium">WhatsApp com DDD
                                <input className={field} name="phone" type="tel" inputMode="tel" autoComplete="tel"
                                    value={phone} onChange={event => setPhone(formatPhone(event.target.value))} required />
                            </label>
                            <label className="mt-3 block text-sm font-medium">E-mail (opcional, para acompanhar o pedido)
                                <input className={field} name="email" type="email" autoComplete="email" maxLength={120} />
                            </label>
                        </section>

                        <section className="rounded-2xl bg-white p-4 shadow-sm">
                            <h2 className="flex items-center gap-2 font-semibold"><Truck size={18} /> Entrega</h2>
                            {options.length > 0 ? (
                                <div className="mt-3 space-y-2">
                                    {options.map((option, index) => (
                                        <label key={`${option.label}-${index}`} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm ${delivery === index ? 'border-stone-900 bg-stone-50' : 'border-stone-200'}`}>
                                            <span className="flex items-center gap-2">
                                                <input type="radio" name="delivery" checked={delivery === index} onChange={() => setDelivery(index)} />
                                                <span>{option.label}</span>
                                            </span>
                                            <strong>{Number(option.fee) > 0 ? money.format(Number(option.fee)) : 'Grátis'}</strong>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-2 text-sm text-stone-600">A entrega é combinada com a Zenaide pelo WhatsApp. Deixe seu endereço abaixo para agilizar.</p>
                            )}
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    {addressFields.map(item => (
                                        <label key={item.name} className={`block text-sm font-medium ${['street', 'complement'].includes(item.name) ? 'col-span-2' : ''}`}>
                                            {item.label}
                                            <input className={field} name={item.name} autoComplete={item.autoComplete}
                                                inputMode={item.inputMode} maxLength={item.maxLength} required={options.length > 0 && item.name !== 'complement'} />
                                        </label>
                                    ))}
                                </div>
                        </section>

                        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                    </form>
                )}
            </div>

            {state.status === 'ready' && link && (
                <div className="fixed bottom-0 left-0 right-0 border-t border-stone-200 bg-white/95 p-3 backdrop-blur safe-area-bottom">
                    <div className="mx-auto max-w-lg">
                        <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="text-stone-500">Total {fee > 0 ? `(peça + entrega)` : ''}</span>
                            <strong className="text-lg">{money.format(total)}</strong>
                        </div>
                        <button form="sales-checkout" type="submit" disabled={submitting}
                            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 font-semibold text-white disabled:opacity-60">
                            {submitting ? <><Loader2 className="animate-spin" size={18} /> Abrindo pagamento…</> : <><Lock size={16} /> Pagar com Pix ou cartão</>}
                        </button>
                        <p className="mt-1 text-center text-[11px] text-stone-500">Pagamento seguro InfinitePay. A peça é preparada após a confirmação.</p>
                    </div>
                </div>
            )}
        </main>
    );
}
