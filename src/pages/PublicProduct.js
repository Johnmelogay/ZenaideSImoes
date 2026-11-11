import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Share2 } from 'lucide-react';
import { getOptimizedImageUrl, imagePresets, supabase } from '../services/supabase';
import { askAboutProductUrl, shareProductOnWhatsApp } from '../services/productLinks';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fieldClass = 'mt-1 block w-full rounded-xl border border-stone-300 p-3 text-base';

function ProductPurchase({ product, checkoutEnabled }) {
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [sizeChoice, setSizeChoice] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const attempt = useRef(null);
    const inFlight = useRef(false);
    const isRing = /\b(an[eé]is|anel|alian[çc]as?)\b/i.test(`${product.category} ${product.name}`);
    const sizes = Array.isArray(product.available_sizes) ? product.available_sizes.filter(Boolean) : [];
    const size = product.size_label?.trim();
    const hasSize = Boolean(sizeChoice || size);
    const canBuy = checkoutEnabled && product.stock_quantity > 0 && Number(product.price) >= 1 && (!isRing || hasSize);
    const whatsappUrl = askAboutProductUrl(product);

    async function startCheckout(event) {
        event.preventDefault();
        if (inFlight.current) return;
        inFlight.current = true;
        setSubmitting(true);
        setError('');
        const form = new FormData(event.currentTarget);
        const payload = {
            product_id: String(product.id),
            quantity,
            name: String(form.get('name')).trim(),
            phone: String(form.get('phone')).replace(/\D/g, ''),
            size: isRing ? (sizeChoice || size || '') : '',
        };
        const fingerprint = JSON.stringify(payload);
        if (attempt.current?.fingerprint !== fingerprint) {
            attempt.current = { fingerprint, id: crypto.randomUUID() };
        }

        try {
            const { data, error: requestError } = await supabase.functions.invoke('product-checkout', {
                body: { ...payload, order_id: attempt.current.id },
            });
            if (requestError || !data?.url) {
                const details = await requestError?.context?.json?.().catch(() => null);
                if (details?.restart) attempt.current = null;
                throw new Error(details?.error || 'Não foi possível abrir o pagamento agora. Tente novamente ou fale com a Zenaide.');
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
        <div className="mt-6 space-y-4">
            {size && <p className="text-sm text-stone-700">Tamanho ou medida: {size}</p>}
            {isRing && sizes.length > 0 && (
                <label className="block text-sm font-medium">
                    Escolha o tamanho
                    <select className={fieldClass} value={sizeChoice} onChange={event => setSizeChoice(event.target.value)} required>
                        <option value="">Selecione…</option>
                        {sizes.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                </label>
            )}
            {isRing && !sizes.length && !size && (
                <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                    <p className="font-semibold">Não sabe o tamanho do anel?</p>
                    <p className="mt-1">Meça o diâmetro interno de um anel que serve bem nela (de uma ponta à outra, por dentro) e compare:</p>
                    <ul className="mt-2 grid grid-cols-2 gap-x-4 text-xs text-stone-600">
                        <li>Aro 14 · 17,1 mm</li><li>Aro 16 · 18,0 mm</li>
                        <li>Aro 18 · 18,9 mm</li><li>Aro 20 · 19,8 mm</li>
                        <li>Aro 22 · 20,6 mm</li><li>Aro 24 · 21,5 mm</li>
                    </ul>
                    <p className="mt-2">Se ficar na dúvida, fale com a Zenaide: ela confirma o tamanho e envia o link de pagamento.</p>
                </div>
            )}
            {product.stock_quantity <= 0 && <p className="text-sm text-stone-700">Disponibilidade sob consulta.</p>}
            {canBuy && (checkoutOpen ? (
                <form data-clarity-mask="True" onSubmit={startCheckout} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4">
                    <p className="text-sm text-stone-600">Pague online e combine a entrega com a Zenaide pelo WhatsApp.</p>
                    {product.stock_quantity > 1 && (
                        <label className="block text-sm font-medium">
                            Quantidade
                            <select className={fieldClass} value={quantity} disabled={submitting} onChange={event => setQuantity(Number(event.target.value))}>
                                {Array.from({ length: Math.min(product.stock_quantity, 20) }, (_, index) => index + 1).map(value => (
                                    <option key={value} value={value}>{value}</option>
                                ))}
                            </select>
                        </label>
                    )}
                    <label className="block text-sm font-medium">
                        Seu nome
                        <input className={fieldClass} name="name" autoComplete="name" minLength={2} maxLength={100} required disabled={submitting} />
                    </label>
                    <label className="block text-sm font-medium">
                        Seu WhatsApp com DDD
                        <input className={fieldClass} name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={22} required disabled={submitting} />
                    </label>
                    <button type="submit" disabled={submitting} className="min-h-12 w-full rounded-xl bg-stone-900 px-4 py-3 font-semibold text-white disabled:opacity-60">
                        {submitting ? 'Abrindo pagamento…' : `Pagar ${money.format(Number(product.price) * quantity)} com Pix ou cartão`}
                    </button>
                    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                </form>
            ) : (
                <button type="button" onClick={() => setCheckoutOpen(true)} className="min-h-12 w-full rounded-xl bg-stone-900 px-4 py-3 font-semibold text-white">
                    Comprar online
                </button>
            ))}
            <a href={whatsappUrl} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 py-3 font-semibold">
                <MessageCircle size={18} /> Falar com a Zenaide
            </a>
        </div>
    );
}

function ProductPage({ id }) {
    const [result, setResult] = useState({ status: 'loading' });
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [retry, setRetry] = useState(0);
    const [unavailable, setUnavailable] = useState({});

    useEffect(() => {
        if (!/^\d+$/.test(id)) {
            setResult({ status: 'missing' });
            return;
        }
        const controller = new AbortController();
        setResult({ status: 'loading' });
        Promise.all([
            supabase.from('products').select('*').eq('id', id).eq('is_visible', true).abortSignal(controller.signal).maybeSingle(),
            supabase.from('store_settings').select('product_checkout_enabled').eq('id', 1).abortSignal(controller.signal).maybeSingle(),
        ]).then(([{ data, error }, settings]) => {
            if (controller.signal.aborted) return;
            if (error) setResult({ status: 'error' });
            else if (!data) setResult({ status: 'missing' });
            else setResult({ status: 'ready', product: data, checkoutEnabled: settings.data?.product_checkout_enabled === true });
        });
        return () => controller.abort();
    }, [id, retry]);

    const { product, status } = result;
    const photos = product ? [...new Set([product.studio_image_url, product.image_url, ...(product.images || [])].filter(photo => photo && !unavailable[photo]))] : [];

    const activePhoto = photos.includes(selectedPhoto) ? selectedPhoto : photos[0];

    return (
        <main className="min-h-screen bg-stone-50 px-4 pb-10 pt-4 text-stone-900">
            <div className="mx-auto max-w-5xl">
                <header className="mb-5 flex items-center justify-between border-b border-stone-200 pb-3">
                    <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium"><ArrowLeft size={17} /> Loja</Link>
                    <img src={`${process.env.PUBLIC_URL}/logo_full.svg`} className="h-11 w-auto" alt="Zenaide Simões" />
                </header>
                {status === 'loading' && <p role="status">Carregando a peça…</p>}
                {status === 'missing' && <p>Esta peça não está disponível na loja.</p>}
                {status === 'error' && (
                    <div role="alert">
                        <p>Não foi possível carregar esta peça.</p>
                        <button className="mt-3 underline" onClick={() => setRetry(value => value + 1)}>Tentar novamente</button>
                    </div>
                )}
                {product && (
                    <article className="grid gap-5 md:grid-cols-2 md:gap-10">
                        <div>
                            {photos.length > 0 && (
                                <img key={activePhoto} src={getOptimizedImageUrl(activePhoto, imagePresets.medium)}
                                    onError={event => {
                                        if (event.currentTarget.getAttribute('src') !== activePhoto) event.currentTarget.src = activePhoto;
                                        else setUnavailable(current => ({ ...current, [activePhoto]: true }));
                                    }}
                                    alt={product.name} width="800" height="800" fetchPriority="high"
                                    className="aspect-square w-full rounded-2xl bg-white object-contain" />
                            )}
                            {photos.length === 0 && (
                                <div className="flex aspect-square items-center justify-center rounded-2xl bg-stone-100 text-sm text-stone-600">Foto disponível sob consulta</div>
                            )}
                            {photos.length > 1 && (
                                <div className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="Fotos da peça">
                                    {photos.map((photo, index) => (
                                        <button type="button" key={photo} onClick={() => setSelectedPhoto(photo)} aria-label={`Ver foto ${index + 1}`}
                                            aria-pressed={activePhoto === photo} className="shrink-0 rounded-lg border border-stone-200 aria-pressed:border-stone-800">
                                            <img src={getOptimizedImageUrl(photo, imagePresets.small)} alt="" width="56" height="56" loading="lazy" className="h-14 w-14 rounded-lg object-contain" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="flex items-start justify-between gap-3">
                                <h1 className="font-serif text-2xl font-bold md:text-4xl">{product.name}</h1>
                                <button type="button" onClick={() => shareProductOnWhatsApp(product)} aria-label="Compartilhar pelo WhatsApp" className="rounded-full border border-stone-200 p-3"><Share2 size={18} /></button>
                            </div>
                            {Number(product.price) > 0 && <p className="mt-2 text-xl font-semibold">{money.format(product.price)}</p>}
                            <ProductPurchase product={product} checkoutEnabled={result.checkoutEnabled} />
                            {product.description && <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-stone-700">{product.description}</p>}
                            {product.sku && <p className="mt-4 text-xs text-stone-600">Ref. {product.sku}</p>}
                        </div>
                    </article>
                )}
            </div>
        </main>
    );
}

export default function PublicProduct() {
    const { productId } = useParams();
    return <ProductPage key={productId} id={productId} />;
}
