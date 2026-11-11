import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Link2, Plus, RefreshCw, Ruler, Save, Trash2, Truck, Upload, X } from 'lucide-react';
import { supabase } from '../services/supabase';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const input = 'w-full rounded-xl border border-stone-200 p-3 text-sm outline-none focus:border-stone-900';
const isRing = product => /\b(an[eé]is|anel|alian[çc]as?)\b/i.test(`${product.name || ''} ${product.category || ''}`);

const linkUrl = token => `${window.location.origin}${process.env.PUBLIC_URL || ''}/#/p/${token}`;

export default function AdminLinks() {
    const [tab, setTab] = useState('links');
    const [links, setLinks] = useState([]);
    const [products, setProducts] = useState([]);
    const [settings, setSettings] = useState({ delivery_options: [] });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const [manual, setManual] = useState(false);
    const [form, setForm] = useState({ title: '', price: '', description: '', image_url: '', sizes: '', stock: '' });
    const [chosenDelivery, setChosenDelivery] = useState([]);
    const [created, setCreated] = useState(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [sizeDrafts, setSizeDrafts] = useState({});
    const [deliveryDraft, setDeliveryDraft] = useState([]);

    async function load() {
        setLoading(true);
        const [{ data: linkRows }, { data: productRows }, { data: config }] = await Promise.all([
            supabase.from('sales_links').select('*').order('created_at', { ascending: false }).limit(60),
            supabase.from('products').select('id, name, category, price, image_url, available_sizes, stock_quantity').eq('is_visible', true).order('created_at', { ascending: false }).limit(400),
            supabase.from('store_settings').select('delivery_options').eq('id', 1).maybeSingle(),
        ]);
        setLinks(linkRows || []);
        setProducts(productRows || []);
        const options = config?.delivery_options || [];
        setSettings({ delivery_options: options });
        setDeliveryDraft(options);
        setChosenDelivery((options || []).map(() => true));
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    const ringsWithoutSize = useMemo(
        () => products.filter(product => isRing(product) && !(product.available_sizes || []).length).slice(0, 60),
        [products]
    );
    const results = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return [];
        return products.filter(product => product.name?.toLowerCase().includes(term) || String(product.id) === term).slice(0, 8);
    }, [products, search]);

    function chooseProduct(product) {
        setSelected(product);
        setManual(false);
        setForm({
            title: product.name,
            price: String(product.price ?? ''),
            description: '',
            image_url: product.image_url || '',
            sizes: (product.available_sizes || []).join(', '),
            stock: product.stock_quantity != null ? String(product.stock_quantity) : '',
        });
        setSearch(product.name);
    }

    function resetForm() {
        setSelected(null);
        setManual(false);
        setForm({ title: '', price: '', description: '', image_url: '', sizes: '', stock: '' });
        setSearch('');
        setCreated(null);
    }

    async function uploadPhoto(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fileName = `sales/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '-').toLowerCase()}`;
            const { error } = await supabase.storage.from('product-images').upload(fileName, file, { upsert: false });
            if (error) throw error;
            const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
            setForm(current => ({ ...current, image_url: data.publicUrl }));
        } catch (error) {
            alert('Erro ao enviar foto: ' + error.message);
        } finally {
            setUploading(false);
        }
    }

    async function createLink() {
        if (!form.title.trim() || !Number(form.price)) return alert('Informe o nome e o preço da peça.');
        setSaving(true);
        try {
            const deliveryOptions = settings.delivery_options.filter((_, index) => chosenDelivery[index]);
            const payload = {
                product_id: manual ? null : selected?.id ?? null,
                title: form.title.trim(),
                description: form.description.trim() || null,
                price: Number(String(form.price).replace(',', '.')),
                image_url: form.image_url || null,
                sizes: form.sizes.split(',').map(value => value.trim()).filter(Boolean),
                stock: form.stock === '' ? null : Number(form.stock),
                delivery_options: deliveryOptions,
            };
            const { data, error } = await supabase.from('sales_links').insert([payload]).select().single();
            if (error) throw error;
            setCreated(data);
            setLinks(current => [data, ...current]);
        } catch (error) {
            alert('Erro ao criar link: ' + error.message);
        } finally {
            setSaving(false);
        }
    }

    async function archiveLink(link) {
        if (!window.confirm('Arquivar este link? Ele deixa de abrir para as clientes.')) return;
        const { error } = await supabase.from('sales_links').update({ status: 'archived' }).eq('id', link.id);
        if (error) return alert(error.message);
        setLinks(current => current.map(item => item.id === link.id ? { ...item, status: 'archived' } : item));
    }

    async function saveSizes(product) {
        const value = sizeDrafts[product.id];
        if (value === undefined) return;
        const sizes = value.split(',').map(item => item.trim()).filter(Boolean);
        const { error } = await supabase.from('products').update({ available_sizes: sizes }).eq('id', product.id);
        if (error) return alert(error.message);
        setProducts(current => current.map(item => item.id === product.id ? { ...item, available_sizes: sizes } : item));
        setSizeDrafts(current => { const next = { ...current }; delete next[product.id]; return next; });
    }

    async function saveDelivery() {
        const cleaned = deliveryDraft
            .filter(option => option.label?.trim())
            .map(option => ({ label: option.label.trim(), fee: Number(String(option.fee).replace(',', '.')) || 0 }));
        const { error } = await supabase.from('store_settings').update({ delivery_options: cleaned }).eq('id', 1);
        if (error) return alert(error.message);
        setSettings({ delivery_options: cleaned });
        setChosenDelivery(cleaned.map(() => true));
        alert('Taxas de entrega salvas.');
    }

    const message = created
        ? `Oi! Separei esta peça pra você 💎\n\n*${created.title}*\n${money.format(Number(created.price))}${created.sizes?.length ? `\nTamanhos: ${created.sizes.join(', ')}` : ''}\n\nAbra o link, escolha a entrega e pague por Pix ou cartão:\n${linkUrl(created.token)}`
        : '';

    if (loading) return <div className="p-8 text-center text-stone-500">Carregando…</div>;

    return (
        <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto">
                {[['links', 'Links de venda'], ['sizes', `Aneis sem tamanho (${ringsWithoutSize.length})`], ['delivery', 'Entregas']].map(([id, label]) => (
                    <button key={id} onClick={() => setTab(id)}
                        className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${tab === id ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'links' && (
                <>
                    <section className="rounded-2xl border border-stone-100 bg-white p-4">
                        <div className="flex items-center justify-between">
                            <h2 className="flex items-center gap-2 font-bold"><Link2 size={18} /> Criar link de compra</h2>
                            <button onClick={resetForm} className="text-xs text-stone-400">Limpar</button>
                        </div>
                        <div className="mt-3 flex gap-2">
                            <button onClick={() => { setManual(false); setSelected(null); }}
                                className={`flex-1 rounded-xl border p-2 text-xs font-bold ${!manual ? 'border-stone-900' : 'border-stone-200 text-stone-500'}`}>Peça do catálogo</button>
                            <button onClick={() => { setManual(true); setSelected(null); }}
                                className={`flex-1 rounded-xl border p-2 text-xs font-bold ${manual ? 'border-stone-900' : 'border-stone-200 text-stone-500'}`}>Peça fora do catálogo</button>
                        </div>

                        {!manual && (
                            <div className="mt-3">
                                <input className={input} value={search} placeholder="Buscar peça por nome…"
                                    onChange={event => { setSearch(event.target.value); setSelected(null); }} />
                                {results.length > 0 && (
                                    <div className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-100">
                                        {results.map(product => (
                                            <button key={product.id} onClick={() => chooseProduct(product)}
                                                className="flex w-full items-center gap-3 p-2 text-left text-sm hover:bg-stone-50">
                                                {product.image_url && <img src={product.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                                                <span className="flex-1 truncate">{product.name}</span>
                                                <span className="text-xs text-stone-500">{money.format(Number(product.price))}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {selected && <p className="mt-2 text-xs text-green-700">Selecionado: {selected.name}</p>}
                            </div>
                        )}

                        <div className="mt-3 grid gap-2">
                            <input className={input} placeholder="Nome da peça" value={form.title}
                                onChange={event => setForm({ ...form, title: event.target.value })} />
                            <div className="grid grid-cols-2 gap-2">
                                <input className={input} placeholder="Preço (R$)" inputMode="decimal" value={form.price}
                                    onChange={event => setForm({ ...form, price: event.target.value })} />
                                <input className={input} placeholder="Estoque (opcional)" inputMode="numeric" value={form.stock}
                                    onChange={event => setForm({ ...form, stock: event.target.value })} />
                            </div>
                            <input className={input} placeholder="Tamanhos separados por vírgula (ex.: 14, 16, 18)" value={form.sizes}
                                onChange={event => setForm({ ...form, sizes: event.target.value })} />
                            <textarea className={input} rows={2} placeholder="Descrição curta (opcional)" value={form.description}
                                onChange={event => setForm({ ...form, description: event.target.value })} />

                            <div className="flex items-center gap-3">
                                {form.image_url && <img src={form.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />}
                                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-stone-600">
                                    {uploading ? 'Enviando…' : <><Upload size={14} /> Foto da peça</>}
                                    <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
                                </label>
                            </div>

                            {settings.delivery_options.length > 0 && (
                                <div className="rounded-xl bg-stone-50 p-3">
                                    <p className="text-xs font-bold uppercase text-stone-500">Formas de entrega neste link</p>
                                    <div className="mt-2 space-y-1">
                                        {settings.delivery_options.map((option, index) => (
                                            <label key={index} className="flex items-center gap-2 text-sm">
                                                <input type="checkbox" checked={chosenDelivery[index] ?? true}
                                                    onChange={event => setChosenDelivery(current => current.map((value, i) => i === index ? event.target.checked : value))} />
                                                <span className="flex-1">{option.label}</span>
                                                <span className="text-xs text-stone-500">{Number(option.fee) > 0 ? money.format(Number(option.fee)) : 'Grátis'}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button onClick={createLink} disabled={saving}
                                className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-stone-900 font-bold text-white disabled:opacity-60">
                                <Plus size={18} /> {saving ? 'Gerando…' : 'Gerar link'}
                            </button>
                        </div>

                        {created && (
                            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3">
                                <p className="text-xs font-bold uppercase text-green-800">Link pronto</p>
                                <p className="mt-1 break-all text-xs text-green-900">{linkUrl(created.token)}</p>
                                <textarea readOnly value={message} rows={4} className="mt-2 w-full rounded-lg border border-green-200 bg-white p-2 text-xs" />
                                <div className="mt-2 flex gap-2">
                                    <button onClick={() => { navigator.clipboard.writeText(message); alert('Mensagem copiada!'); }}
                                        className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-700 px-3 py-2 text-xs font-bold text-white">
                                        <Copy size={14} /> Copiar mensagem
                                    </button>
                                    <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"
                                        className="flex items-center justify-center gap-1 rounded-lg border border-green-700 px-3 py-2 text-xs font-bold text-green-800">WhatsApp</a>
                                    <a href={linkUrl(created.token)} target="_blank" rel="noreferrer"
                                        className="flex items-center justify-center rounded-lg border border-green-700 px-3 py-2 text-xs font-bold text-green-800"><ExternalLink size={14} /></a>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold">Links recentes</h2>
                            <button onClick={load} className="inline-flex items-center gap-1 text-xs text-stone-500"><RefreshCw size={13} /> Atualizar</button>
                        </div>
                        {links.length === 0 && <p className="text-sm text-stone-500">Nenhum link criado ainda.</p>}
                        {links.map(link => (
                            <div key={link.id} className="rounded-2xl border border-stone-100 bg-white p-3">
                                <div className="flex items-start gap-3">
                                    {link.image_url && <img src={link.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold">{link.title}</p>
                                        <p className="text-xs text-stone-500">
                                            {money.format(Number(link.price))} · {link.status === 'active' ? 'ativo' : link.status === 'sold' ? 'vendido' : 'arquivado'}
                                            {link.sizes?.length ? ` · ${link.sizes.join(', ')}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button title="Copiar link" onClick={() => { navigator.clipboard.writeText(linkUrl(link.token)); alert('Link copiado!'); }}
                                            className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"><Copy size={16} /></button>
                                        <a title="Abrir" href={linkUrl(link.token)} target="_blank" rel="noreferrer"
                                            className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"><ExternalLink size={16} /></a>
                                        {link.status === 'active' && (
                                            <button title="Arquivar" onClick={() => archiveLink(link)}
                                                className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </section>
                </>
            )}

            {tab === 'sizes' && (
                <section className="space-y-2">
                    <div className="rounded-2xl border border-stone-100 bg-white p-4">
                        <h2 className="flex items-center gap-2 font-bold"><Ruler size={18} /> Aneis sem tamanho cadastrado</h2>
                        <p className="mt-1 text-xs text-stone-500">Preencha os tamanhos que você tem de cada anel. A cliente só vê os que existirem.</p>
                    </div>
                    {ringsWithoutSize.length === 0 && <p className="p-4 text-sm text-stone-500">Tudo preenchido por aqui. 🎉</p>}
                    {ringsWithoutSize.map(product => (
                        <div key={product.id} className="flex items-center gap-2 rounded-2xl border border-stone-100 bg-white p-3">
                            {product.image_url && <img src={product.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{product.name}</p>
                                <input className="mt-1 w-full rounded-lg border border-stone-200 p-2 text-xs" placeholder="Ex.: 14, 16, 18, 20"
                                    value={sizeDrafts[product.id] ?? ''} onChange={event => setSizeDrafts({ ...sizeDrafts, [product.id]: event.target.value })} />
                            </div>
                            <button onClick={() => saveSizes(product)} className="rounded-lg bg-stone-900 p-2 text-white"><Save size={16} /></button>
                        </div>
                    ))}
                </section>
            )}

            {tab === 'delivery' && (
                <section className="rounded-2xl border border-stone-100 bg-white p-4">
                    <h2 className="flex items-center gap-2 font-bold"><Truck size={18} /> Taxas de entrega</h2>
                    <p className="mt-1 text-xs text-stone-500">Cadastre os serviços que você usa (motoboy, Correios, retirada). A cliente escolhe na hora de pagar.</p>
                    <div className="mt-3 space-y-2">
                        {deliveryDraft.map((option, index) => (
                            <div key={index} className="flex gap-2">
                                <input className={input} placeholder="Serviço (ex.: Motoboy Rio Preto)" value={option.label}
                                    onChange={event => setDeliveryDraft(current => current.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} />
                                <input className={`${input} w-28`} placeholder="Taxa" inputMode="decimal" value={option.fee}
                                    onChange={event => setDeliveryDraft(current => current.map((item, i) => i === index ? { ...item, fee: event.target.value } : item))} />
                                <button onClick={() => setDeliveryDraft(current => current.filter((_, i) => i !== index))}
                                    className="rounded-lg p-2 text-stone-400 hover:text-red-600"><X size={16} /></button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                        <button onClick={() => setDeliveryDraft(current => [...current, { label: '', fee: '' }])}
                            className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-stone-200 p-2 text-xs font-bold text-stone-600">
                            <Plus size={14} /> Adicionar serviço
                        </button>
                        <button onClick={saveDelivery} className="flex items-center justify-center gap-1 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white">
                            <Check size={14} /> Salvar
                        </button>
                    </div>
                </section>
            )}
        </div>
    );
}
