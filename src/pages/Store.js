import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShoppingBag, Home, Heart, Search, User, Plus, Minus, Check, MessageCircle, X, ChevronRight, Package, LogOut, Sparkles, Crown, ChevronDown, CreditCard, Tag, Ticket, Lock, Edit3, Share2, AlertTriangle, SlidersHorizontal, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useCustomer } from '../contexts/CustomerContext';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

// --- NEW COMPONENT: STORE BANNER ---
const StoreBanner = ({ active, text, bgColor, textColor, link }) => {
    if (!active) return null;

    const Wrapper = link ? 'a' : 'div';
    const props = link ? { href: link, className: "block w-full" } : { className: "w-full" };

    return (
        <Wrapper {...props}>
            <div
                style={{ backgroundColor: bgColor, color: textColor }}
                className="w-full py-2.5 px-4 text-center text-xs md:text-sm font-bold tracking-wide transition-all hover:opacity-95"
            >
                {text}
            </div>
        </Wrapper>
    );
};

// --- NEW COMPONENT: FILTER SHEET ---
const FilterSheet = ({ isOpen, onClose, filters, setFilters, onApply, appliedCount }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex justify-end">
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-stone-800">Filtrar Produtos</h2>
                        {appliedCount > 0 && <p className="text-sm text-amber-600 font-bold">{appliedCount} {appliedCount === 1 ? 'filtro ativo' : 'filtros ativos'}</p>}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Sort */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-stone-800 uppercase tracking-widest">Ordenar Por</h3>
                        <div className="space-y-2">
                            {[
                                { id: 'recent', label: 'Lançamentos', icon: Clock },
                                { id: 'price_asc', label: 'Menor Preço', icon: ArrowUpRight },
                                { id: 'price_desc', label: 'Maior Preço', icon: ArrowDownRight }
                            ].map(opt => (
                                <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${filters.sortBy === opt.id ? 'border-amber-500 bg-amber-50/50 text-amber-900' : 'border-stone-200 hover:bg-stone-50 text-stone-600'}`}>
                                    <input
                                        type="radio"
                                        name="sortBy"
                                        value={opt.id}
                                        checked={filters.sortBy === opt.id}
                                        onChange={() => setFilters({ ...filters, sortBy: opt.id })}
                                        className="sr-only"
                                    />
                                    <opt.icon size={18} className={filters.sortBy === opt.id ? 'text-amber-500' : 'text-stone-400'} />
                                    <span className="font-bold font-sm">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Stock */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-stone-800 uppercase tracking-widest">Disponibilidade</h3>
                        <label className="flex items-center justify-between p-4 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50 transition-colors">
                            <span className="font-bold text-sm text-stone-700">Apenas em Estoque</span>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={filters.inStockOnly}
                                    onChange={(e) => setFilters({ ...filters, inStockOnly: e.target.checked })}
                                />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${filters.inStockOnly ? 'bg-amber-500' : 'bg-stone-300'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${filters.inStockOnly ? 'transform translate-x-4' : ''}`}></div>
                            </div>
                        </label>
                    </div>

                    {/* Price Range */}
                    <div className="space-y-3 pb-8">
                        <h3 className="text-sm font-bold text-stone-800 uppercase tracking-widest">Faixa de Preço</h3>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">R$</span>
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={filters.minPrice}
                                    onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                                />
                            </div>
                            <span className="text-stone-400">-</span>
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">R$</span>
                                <input
                                    type="number"
                                    placeholder="Max"
                                    value={filters.maxPrice}
                                    onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-stone-100 bg-white space-y-3 pb-safe">
                    <button
                        onClick={onApply}
                        className="w-full py-4 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 transition-all flex items-center justify-center gap-2"
                    >
                        Mostrar Resultados
                    </button>
                    {(filters.minPrice || filters.maxPrice || filters.inStockOnly || filters.sortBy !== 'recent') && (
                        <button
                            onClick={() => {
                                setFilters({ sortBy: 'recent', inStockOnly: false, minPrice: '', maxPrice: '' });
                            }}
                            className="w-full py-2.5 text-stone-500 text-sm font-bold hover:text-stone-800 transition-colors"
                        >
                            Limpar Filtros
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- COMPONENTS ---

const SidebarItem = ({ icon: Icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-4 px-4 py-3 rounded-xl w-full transition-all duration-200 group ${isActive
            ? 'bg-amber-50 text-amber-600 font-semibold'
            : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
            }`}
    >
        <Icon size={20} className={isActive ? 'text-amber-600' : 'text-stone-400 group-hover:text-stone-600'} />
        <span className="text-sm">{label}</span>
        {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500" />}
    </button>
);

const MobileTab = ({ icon: Icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-amber-600' : 'text-stone-400'}`}
    >
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] font-medium">{label}</span>
    </button>
);

const CategoryPill = ({ name, active, onClick }) => (
    <button
        onClick={onClick}
        className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 border ${active
            ? 'bg-stone-900 border-stone-900 text-white shadow-md'
            : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900 shadow-sm'
            }`}
    >
        {name}
    </button>
);

const ProductCard = ({ product, onAdd, isAdded, onClick, onFav, isFav }) => (
    <div
        onClick={() => onClick(product)}
        className="group cursor-pointer flex flex-col gap-3"
    >
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-stone-100 isolate">
            <img
                src={product.image_url || product.image}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />

            {/* Overlay Gradient on Hover */}
            <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />

            {product.is_new && (
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-stone-900 text-[10px] uppercase font-bold px-2.5 py-1 tracking-widest shadow-sm">
                    Novo
                </span>
            )}

            <button
                onClick={(e) => { e.stopPropagation(); onFav && onFav(product.id); }}
                className={`absolute top-3 right-3 p-2.5 backdrop-blur-md rounded-full transition-all duration-300 shadow-sm ${isFav
                    ? 'bg-rose-500 text-white opacity-100 translate-y-0 scale-110'
                    : 'bg-white/90 text-stone-900 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:bg-stone-900 hover:text-white'
                    }`}
            >
                <Heart size={16} strokeWidth={2.5} fill={isFav ? 'currentColor' : 'none'} />
            </button>

            {/* Quick Add Button (Bottom Right of Image) */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onAdd(product);
                }}
                className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 ${isAdded
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-stone-900 hover:bg-stone-900 hover:text-white'
                    }`}
            >
                {isAdded ? <Check size={18} /> : <Plus size={20} />}
            </button>
        </div>

        <div className="space-y-1">
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{(product.category || '').split(',')[0]?.trim()}</p>
            <h3 className="font-serif text-lg leading-tight text-stone-900 group-hover:text-stone-600 transition-colors">
                {product.name}
            </h3>
            <p className="text-sm font-medium text-stone-900">
                R$ {Number(product.price).toFixed(2)}
            </p>
        </div>
    </div>
);

const CartDrawer = ({ isOpen, onClose, items, onUpdateQty, onRemove, onCheckout, onContinue, coupon, onApplyCoupon, onRemoveCoupon }) => {
    const totalQty = items.reduce((acc, item) => acc + (item.qty || 1), 0);
    const total = items.reduce((acc, item) => acc + Number(item.price) * (item.qty || 1), 0);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex justify-end">
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-stone-800">Sua Sacola</h2>
                        <p className="text-sm text-stone-500">{totalQty} {totalQty === 1 ? 'item' : 'itens'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-4">
                            <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center">
                                <ShoppingBag size={32} className="opacity-50" />
                            </div>
                            <p className="font-medium">Sua sacola está vazia</p>
                            <button onClick={onContinue} className="text-amber-600 font-bold text-sm hover:underline">
                                Continuar Comprando
                            </button>
                        </div>
                    ) : (
                        items.map((item, idx) => (
                            <div key={item.id} className="flex gap-4 items-start bg-white border border-stone-100 p-3 rounded-2xl hover:border-amber-100 hover:shadow-sm transition-all">
                                <img src={item.image_url || item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover bg-stone-50 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-stone-800 line-clamp-2 mb-1">{item.name}</p>
                                    <p className="text-sm font-bold text-stone-900 mb-2">R$ {(Number(item.price) * (item.qty || 1)).toFixed(2)}</p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => item.qty <= 1 ? onRemove(idx) : onUpdateQty(idx, item.qty - 1)}
                                            className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 active:scale-95 transition-all"
                                        >
                                            {item.qty <= 1 ? <X size={14} className="text-red-400" /> : <Minus size={14} />}
                                        </button>
                                        <span className="w-10 text-center font-bold text-stone-800 text-sm">{item.qty || 1}</span>
                                        <button
                                            onClick={() => onUpdateQty(idx, (item.qty || 1) + 1)}
                                            className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 active:scale-95 transition-all"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {items.length > 0 && (
                    <div className="p-6 border-t border-stone-100 bg-stone-50">
                        {/* Coupon Section */}
                        <div className="bg-white border border-stone-200 p-3 rounded-xl mb-4 shadow-sm">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                                    <input
                                        id="cart-coupon-input"
                                        placeholder="Cupom de desconto"
                                        className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-100 rounded-lg text-sm outline-none focus:border-amber-500 transition-colors uppercase font-medium placeholder:normal-case"
                                        onKeyDown={(e) => e.key === 'Enter' && onApplyCoupon(e.currentTarget.value)}
                                    />
                                </div>
                                <button
                                    onClick={() => onApplyCoupon(document.getElementById('cart-coupon-input').value)}
                                    disabled={coupon?.loading}
                                    className="bg-stone-900 text-white px-4 rounded-lg font-bold text-xs disabled:opacity-50 hover:bg-stone-800 transition-colors"
                                >
                                    {coupon?.loading ? '...' : 'Aplicar'}
                                </button>
                            </div>
                            {coupon?.message && (
                                <p className={`text-xs mt-2 font-medium px-1 ${coupon.message.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                                    {coupon.message.text}
                                </p>
                            )}
                            {coupon?.selected && (
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-stone-100 text-sm animate-in slide-in-from-top-2">
                                    <span className="text-green-600 font-bold flex items-center gap-1"><Tag size={14} /> Cupom: {coupon.selected.code}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-green-600 font-bold">- R$ {coupon.discount.toFixed(2)}</span>
                                        <button onClick={onRemoveCoupon} className="text-stone-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"><X size={14} /></button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1 mb-4">
                            <div className="flex justify-between items-center text-stone-500 text-sm">
                                <span>Subtotal</span>
                                <span>R$ {total.toFixed(2)}</span>
                            </div>
                            {coupon?.discount > 0 && (
                                <div className="flex justify-between items-center text-green-600 text-sm font-bold">
                                    <span>Desconto</span>
                                    <span>- R$ {coupon.discount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-end pt-2 border-t border-stone-200 mt-2">
                                <span className="text-stone-800 text-lg font-bold">Total Final</span>
                                <span className="text-2xl font-bold text-stone-900">R$ {(total - (coupon?.discount || 0)).toFixed(2)}</span>
                            </div>
                        </div>
                        <button
                            onClick={onCheckout}
                            className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-stone-800 active:scale-95 transition-all shadow-lg hover:shadow-xl mb-3"
                        >
                            <Check size={20} />
                            Finalizar Compra
                        </button>
                        <button
                            onClick={onContinue}
                            className="w-full bg-white text-stone-700 py-3 rounded-xl font-bold text-sm border border-stone-200 hover:bg-stone-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={16} />
                            Adicionar mais itens
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const ProductDetails = ({ product, isOpen, onClose, onAdd }) => {
    const [qty, setQty] = useState(1);

    useEffect(() => { if (isOpen) setQty(1); }, [isOpen]);
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [showHint, setShowHint] = useState(false);
    const [showZoomHint, setShowZoomHint] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowHint(true);
            const timer = setTimeout(() => setShowHint(false), 3000);
            return () => clearTimeout(timer);
        } else {
            setShowHint(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (fullscreenImage) {
            setShowZoomHint(true);
            const timer = setTimeout(() => setShowZoomHint(false), 3000);
            return () => clearTimeout(timer);
        } else {
            setShowZoomHint(false);
        }
    }, [fullscreenImage]);

    if (!isOpen || !product) return null;

    const images = product.images && product.images.length > 0
        ? product.images
        : [product.image_url || product.image];

    return (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center isolate">
            <div
                className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full md:max-w-5xl md:h-[85vh] h-[92vh] bg-white rounded-t-[2rem] md:rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in slide-in-from-bottom duration-500">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 z-20 p-2 bg-white/50 backdrop-blur-md rounded-full text-stone-900 hover:bg-white transition-colors"
                >
                    <X size={24} />
                </button>

                {/* Left: Gallery */}
                <div className="w-full md:w-[55%] h-[45%] md:h-full bg-stone-100 relative group">
                    <Swiper
                        modules={[Pagination]}
                        pagination={{
                            clickable: true,
                            bulletActiveClass: 'swiper-pagination-bullet-active !bg-stone-900',
                        }}
                        className="w-full h-full"
                    >
                        {images.map((img, idx) => (
                            <SwiperSlide key={idx} onClick={() => setFullscreenImage(img)} className="cursor-zoom-in">
                                <img src={img} alt={`View ${idx}`} className="w-full h-full object-cover" />
                            </SwiperSlide>
                        ))}
                    </Swiper>

                    {/* Hint: Click to view details */}
                    {showHint && (
                        <div className="absolute bottom-4 right-4 z-30 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="bg-black/50 backdrop-blur-md text-white text-[10px] font-medium px-3 py-1.5 rounded-full border border-white/10 shadow-sm flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                Toque na foto
                            </div>
                        </div>
                    )}

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-white/80 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest text-stone-900 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Ampliar
                    </div>
                </div>

                {/* Right: Content */}
                <div className="flex-1 flex flex-col h-[55%] md:h-full bg-white">
                    <div className="flex-1 overflow-y-auto p-8 md:p-12">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">{(product.category || '').split(',').map(c => c.trim()).join(' · ')}</span>
                                    {product.is_new && <span className="text-[10px] font-bold bg-stone-900 text-white px-2 py-0.5 rounded-sm tracking-wide">NOVO</span>}
                                    {product.sku && <span className="text-[10px] font-mono text-stone-400 uppercase">Cód. {product.sku}</span>}
                                </div>
                                {/* Share Button */}
                                <button
                                    onClick={() => {
                                        const shareUrl = `https://bydedlfccgywqshzllmz.supabase.co/functions/v1/share?id=${product.id}`;
                                        const text = `✨ Olha essa peça linda da Zenaide Simões!\n\n*${product.name}*\nR$ ${Number(product.price).toFixed(2)}\n\n`;
                                        window.open(`https://wa.me/?text=${encodeURIComponent(text + shareUrl)}`, '_blank');
                                    }}
                                    className="p-2.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 active:scale-95 transition-all"
                                    title="Compartilhar via WhatsApp"
                                >
                                    <Share2 size={18} />
                                </button>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-serif text-stone-900 mb-4 leading-tight">{product.name}</h2>
                            <div className="flex items-center gap-4">
                                <p className="text-2xl font-light text-stone-900">
                                    R$ {Number(product.price).toFixed(2)}
                                </p>
                                <div className="h-4 w-[1px] bg-stone-200" />
                                <div className="flex text-amber-500 text-sm">
                                    {[1, 2, 3, 4, 5].map(s => <span key={s}>★</span>)}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="prose prose-stone prose-sm mb-10">
                            <p className="text-stone-600 leading-relaxed font-light text-base">
                                {product.description || "Esta peça exclusiva foi selecionada por nossa curadoria para garantir elegância e sofisticação. Acabamento de alta qualidade e design atemporal."}
                            </p>
                        </div>

                        {/* Trust Signals (Redesigned) */}
                        <div className="grid grid-cols-1 gap-4 border-t border-stone-100 pt-8">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-stone-900">
                                    <Check size={18} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-stone-900">Garantia Vitalícia</p>
                                    <p className="text-xs text-stone-500">Certificado de autenticidade incluso</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-stone-900">
                                    <Heart size={18} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-stone-900">Curadoria Exclusiva</p>
                                    <p className="text-xs text-stone-500">Peças selecionadas a dedo</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-stone-900">
                                    <ShoppingBag size={18} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-stone-900">Compra Segura</p>
                                    <p className="text-xs text-stone-500">Proteção total dos seus dados</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer / CTA */}
                    <div className="p-6 md:p-8 border-t border-stone-50 bg-white md:bg-stone-50/50">
                        {/* Quantity Selector */}
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-bold text-stone-600 uppercase tracking-wide">Quantidade</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setQty(q => Math.max(1, q - 1))}
                                    className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 active:scale-95 transition-all"
                                >
                                    <Minus size={18} />
                                </button>
                                <span className="w-12 text-center font-bold text-lg text-stone-900">{qty}</span>
                                <button
                                    onClick={() => setQty(q => q + 1)}
                                    className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 active:scale-95 transition-all"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={() => { onAdd(product, qty); onClose(); }}
                            className="w-full bg-stone-900 text-white h-14 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-stone-800 active:scale-[0.98] transition-all shadow-xl hover:shadow-stone-900/20"
                        >
                            <Plus size={20} />
                            <span>Adicionar {qty > 1 ? `${qty} itens` : ''} — R$ {(Number(product.price) * qty).toFixed(2)}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ZOOM */}
            {fullscreenImage && (
                <div className="fixed inset-0 z-[10000] bg-black/95 flex flex-col animate-in fade-in duration-300">
                    <button onClick={() => setFullscreenImage(null)} className="absolute top-6 right-6 z-50 p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors">
                        <X size={24} />
                    </button>
                    <div className="flex-1 overflow-hidden relative">
                        {/* Hint: Pinch to zoom */}
                        {showZoomHint && (
                            <div className="absolute bottom-12 right-6 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-medium px-4 py-2 rounded-full shadow-2xl flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                    Movimento de pinça para ampliar
                                </div>
                            </div>
                        )}
                        <TransformWrapper centerOnInit initialScale={1} minScale={1} maxScale={4} wheel={{ disabled: true }}>
                            <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                                <img src={fullscreenImage} alt="Zoom" className="max-w-full max-h-full object-contain" />
                            </TransformComponent>
                        </TransformWrapper>
                    </div>
                </div>
            )}
        </div>
    );
};

const CheckoutModal = ({ isOpen, onClose, cart, total, customerData, coupon }) => {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        name: customerData?.name || '',
        email: '',
        phone: customerData?.phone || '',
        cep: '',
        address: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        complement: ''
    });

    const [loadingCep, setLoadingCep] = useState(false);

    // Load saved address
    useEffect(() => {
        const savedAddress = localStorage.getItem('customer_last_address');
        if (isOpen && savedAddress) {
            try {
                const parsed = JSON.parse(savedAddress);
                setForm(prev => ({
                    ...prev,
                    ...parsed,
                    name: customerData?.name || prev.name || parsed.name,
                    phone: customerData?.phone || prev.phone || parsed.phone
                }));
            } catch (e) { console.error('Error loading address', e); }
        }
    }, [isOpen, customerData]);

    const saveAddress = () => {
        const addressData = {
            name: form.name,
            email: form.email,
            phone: form.phone,
            cep: form.cep,
            address: form.address,
            number: form.number,
            neighborhood: form.neighborhood,
            city: form.city,
            state: form.state,
            complement: form.complement
        };
        localStorage.setItem('customer_last_address', JSON.stringify(addressData));
    };

    if (!isOpen) return null;

    const handleChange = (e) => {
        let value = e.target.value;

        // Máscara de CEP
        if (e.target.name === 'cep') {
            value = value.replace(/\D/g, '').substring(0, 8);
            if (value.length > 5) value = value.replace(/^(\d{5})(\d)/, '$1-$2');
        }

        setForm({ ...form, [e.target.name]: value });

        // Auto-busca ao digitar 8 números
        if (e.target.name === 'cep' && value.replace(/\D/g, '').length === 8) {
            handleCepLookup(value);
        }
    };

    const handleCepLookup = async (cepValue) => {
        const cep = cepValue.replace(/\D/g, '');
        if (cep.length !== 8) return;

        setLoadingCep(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (!data.erro) {
                setForm(prev => ({
                    ...prev,
                    address: data.logradouro,
                    neighborhood: data.bairro,
                    city: data.localidade,
                    state: data.uf,
                    cep: cepValue // Mantém a formatação
                }));
                // Foca no número
                setTimeout(() => document.getElementById('numInput')?.focus(), 100);
            } else {
                alert("CEP não encontrado!");
            }
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
        } finally {
            setLoadingCep(false);
        }
    };



    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const handleWhatsApp = async () => {
        saveAddress();
        const phone = "5569999717163"; // Zenaide
        const finalTotal = total - (coupon?.discount || 0);

        // Monta a mensagem do WhatsApp (Apenas Pedido)
        let msg = `*Olá, Zenaide! Tenho interesse nesses produtos:*
----------------------------
*Cliente:* ${form.name}
*Email:* ${form.email}
*Contato:* ${form.phone}
----------------------------
*Itens:*
${cart.map((item, i) => `${i + 1}. ${item.name} x${item.qty || 1} - R$ ${(Number(item.price) * (item.qty || 1)).toFixed(2)}`).join('\n')}
----------------------------
*Subtotal:* R$ ${total.toFixed(2)}`;

        if (coupon?.selected) {
            msg += `\n*Cupom (${coupon.selected.code}):* -R$ ${coupon.discount.toFixed(2)}`;
        }

        msg += `\n*Total Final:* R$ ${finalTotal.toFixed(2)}
----------------------------
*Gostaria de tirar algumas dúvidas e combinar a entrega.*
----------------------------
*Endereço de Entrega:*
${form.address}, ${form.number} ${form.complement ? `- ${form.complement}` : ''}
${form.neighborhood} - ${form.city}/${form.state}
CEP: ${form.cep}`;

        // Salvar pedido com status de negociação
        try {
            await supabase.from('orders').insert({
                customer_name: form.name,
                customer_email: form.email,
                customer_phone: form.phone,
                address_data: form,
                items: cart,
                total_amount: finalTotal,
                payment_status: 'negotiating_whatsapp',
                coupon_code: coupon?.selected?.code || null,
                discount_amount: coupon?.discount || 0
            });

            // Increment coupon usage
            if (coupon?.selected) {
                await supabase.from('coupons').update({ current_uses: coupon.selected.current_uses + 1 }).eq('id', coupon.selected.id);
            }

        } catch (e) { console.error("Erro ao salvar pedido zap", e) }

        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        onClose();
    };

    const handlePayment = async () => {
        saveAddress();
        // Feedback Visual
        const btnText = document.getElementById('btn-payment-text');
        if (btnText) btnText.innerText = "Gerando Link...";

        const finalTotal = total - (coupon?.discount || 0);

        try {
            // 1. Salvar Pedido
            let orderId = crypto.randomUUID();
            let orderSaved = false;

            const orderPayload = {
                customer_name: form.name,
                customer_email: form.email,
                customer_phone: form.phone,
                address_data: form,
                items: cart,
                total_amount: finalTotal,
                payment_status: 'pending',
                coupon_code: coupon?.selected?.code || null,
                discount_amount: coupon?.discount || 0
            };

            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert(orderPayload)
                .select()
                .single();

            if (orderError) throw new Error("Erro ao salvar pedido: " + orderError.message);

            if (orderData) {
                orderId = orderData.id;
                orderSaved = true;
            }

            // Increment Coupon Usage
            if (coupon?.selected) {
                await supabase.from('coupons').update({ current_uses: coupon.selected.current_uses + 1 }).eq('id', coupon.selected.id);
            }

            // 2. Edge Function (InfinitePay)
            const sanitizedItems = cart.map(item => ({
                ...item,
                price: typeof item.price === 'string' ? parseFloat(item.price.replace(',', '.')) : item.price
            }));

            if (coupon?.discount > 0) {
                sanitizedItems.push({
                    name: `Desconto (${coupon.selected?.code})`,
                    price: -coupon.discount,
                    qty: 1
                });
            }

            // Calculate Base URL (handling subpaths like /zenaide-simoes)
            const currentUrl = window.location.href.split('#')[0]; // Remove hash
            const baseUrl = currentUrl.endsWith('/') ? currentUrl.slice(0, -1) : currentUrl;

            console.log("Sending origin to backend:", baseUrl); // DEBUG

            const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
                body: {
                    order_id: orderId,
                    items: sanitizedItems,
                    customer: {
                        name: form.name,
                        email: form.email,
                        phone: form.phone
                    },
                    origin: baseUrl // Send full base URL including subpath
                }
            });

            if (checkoutError || !checkoutData?.url) {
                console.error("Erro Edge Function:", checkoutError);
                throw new Error("Erro ao gerar link. Tente pelo WhatsApp.");
            }

            // 3. Atualiza Link no Banco
            if (orderSaved) {
                await supabase.from('orders').update({ payment_link: checkoutData.url }).eq('id', orderId);
            }

            // 4. Redireciona APENAS para o Pagamento
            window.location.href = checkoutData.url;

        } catch (error) {
            alert(error.message);
        } finally {
            if (btnText) btnText.innerText = "Pagar Agora (Pix/Cartão)";
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                {/* Header / Progress */}
                <div className="bg-stone-50 p-6 border-b border-stone-100/50 sticky top-0 z-10">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-serif font-bold text-stone-900">Finalizar Compra</h2>
                        <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex items-center justify-between relative">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-stone-200 rounded-full -z-10" />
                        <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-amber-500 rounded-full transition-all duration-500 -z-10"
                            style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
                        />

                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 1 ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-500'}`}>1</div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 2 ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-500'}`}>2</div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= 3 ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-500'}`}>3</div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-stone-400 mt-2">
                        <span>Identificação</span>
                        <span>Entrega</span>
                        <span>Revisão</span>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    {step === 1 && (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Seu Nome</label>
                                <input name="name" value={form.name} onChange={handleChange} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500/20 outline-none" placeholder="Ex: Maria Silva" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Email</label>
                                <input name="email" value={form.email} onChange={handleChange} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500/20 outline-none" placeholder="seunome@email.com" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">WhatsApp / Telefone</label>
                                <input name="phone" value={form.phone} onChange={handleChange} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500/20 outline-none" placeholder="(00) 00000-0000" />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1 flex justify-between">
                                        CEP
                                        {loadingCep && <span className="text-amber-600 animate-pulse">Buscando...</span>}
                                    </label>
                                    <input name="cep" value={form.cep} onChange={handleChange} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all" placeholder="00000-000" maxLength={9} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Estado (UF)</label>
                                    <input name="state" value={form.state} onChange={handleChange} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none" placeholder="Ex: RO" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Cidade</label>
                                <input name="city" value={form.city} onChange={handleChange} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none" placeholder="Ex: Porto Velho" />
                            </div>
                            <div className="grid grid-cols-[2fr_1fr] gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Endereço</label>
                                    <input name="address" value={form.address} onChange={handleChange} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none" placeholder="Rua/Av..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Número</label>
                                    <input id="numInput" name="number" value={form.number} onChange={handleChange} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none" placeholder="123" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Bairro</label>
                                <input name="neighborhood" value={form.neighborhood} onChange={handleChange} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none" placeholder="Ex: Centro" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Complemento (Opcional)</label>
                                <input name="complement" value={form.complement} onChange={handleChange} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 outline-none" placeholder="Apto, Bloco..." />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                                <h4 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">
                                    <ShoppingBag size={16} /> Resumo do Pedido
                                </h4>
                                <ul className="space-y-2 text-sm text-stone-600 mb-3 max-h-32 overflow-y-auto">
                                    {cart.map((item, i) => (
                                        <li key={i} className="flex justify-between">
                                            <span className="truncate pr-4">{item.name} <span className="text-stone-400">x{item.qty || 1}</span></span>
                                            <span className="font-medium whitespace-nowrap">R$ {(Number(item.price) * (item.qty || 1)).toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="border-t border-stone-200 pt-3 flex justify-between font-bold text-stone-900">
                                    <span>Total:</span>
                                    <span>R$ {total.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 text-sm">
                                <h4 className="font-bold text-stone-800 mb-1">Entrega para:</h4>
                                <p className="text-stone-600">{form.name}</p>
                                <p className="text-stone-600">{form.address}, {form.number}</p>
                                <p className="text-stone-600">{form.neighborhood} - {form.city}/{form.state}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-stone-100 bg-stone-50 flex justify-between gap-4">
                    {step > 1 ? (
                        <button onClick={prevStep} className="px-6 py-3 rounded-xl font-bold text-stone-500 hover:bg-stone-200 transition-colors">
                            Voltar
                        </button>
                    ) : (
                        <div />
                    )}

                    {step < 3 ? (
                        <button
                            onClick={nextStep}
                            disabled={(step === 1 && (!form.name || !form.email || !form.phone)) || (step === 2 && (!form.address || !form.number || !form.city))}
                            className="bg-stone-900 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Próximo <ChevronRight size={18} />
                        </button>
                    ) : (
                        <div className="flex flex-col gap-3 w-full">
                            <button onClick={handlePayment} className="w-full bg-green-600 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 shadow-lg shadow-green-600/20 transition-all transform hover:scale-[1.02]">
                                <Check size={24} />
                                <span id="btn-payment-text">Pagar Agora (Pix/Cartão)</span>
                            </button>

                            <button onClick={handleWhatsApp} className="w-full bg-white text-green-600 border-2 border-green-600 px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-50 transition-all">
                                <MessageCircle size={20} />
                                Tirar Dúvidas via WhatsApp
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ============ AUTH GATE MODAL ============
const AuthGateModal = ({ isOpen, onClose, onSuccess, customer, verifyPasscode, createPasscode }) => {
    const [digits, setDigits] = useState(['', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mode, setMode] = useState(null); // 'verify' or 'create'
    const inputRefs = [React.useRef(), React.useRef(), React.useRef(), React.useRef()];

    useEffect(() => {
        if (isOpen) {
            setDigits(['', '', '', '']);
            setError('');
            setLoading(false);
            setMode(customer?.hasPasscode ? 'verify' : 'create');
            setTimeout(() => inputRefs[0]?.current?.focus(), 100);
        }
    }, [isOpen, customer]);

    const handleDigit = (index, value) => {
        if (!/^\d?$/.test(value)) return;
        const newDigits = [...digits];
        newDigits[index] = value;
        setDigits(newDigits);
        setError('');

        if (value && index < 3) {
            inputRefs[index + 1]?.current?.focus();
        }

        // Auto-submit when all 4 digits are filled
        if (value && index === 3) {
            const code = newDigits.join('');
            if (code.length === 4) handleSubmit(code);
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs[index - 1]?.current?.focus();
        }
    };

    const handleSubmit = async (code) => {
        if (code.length !== 4) return;
        setLoading(true);
        setError('');

        if (mode === 'verify') {
            const result = await verifyPasscode(code);
            if (result.success) {
                onSuccess();
                onClose();
            } else {
                setError(result.error || 'Código incorreto.');
                setDigits(['', '', '', '']);
                setTimeout(() => inputRefs[0]?.current?.focus(), 100);
            }
        } else {
            const result = await createPasscode(code);
            if (result.success) {
                onSuccess();
                onClose();
            } else {
                setError(result.error || 'Erro ao criar código.');
            }
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 fade-in duration-300">
                {/* Icon */}
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/25">
                    <Lock size={28} className="text-white" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-serif font-bold text-stone-800 text-center mb-2">
                    {mode === 'verify' ? 'Olá novamente! 💛' : 'Crie seu código de acesso'}
                </h3>
                <p className="text-stone-500 text-sm text-center mb-6 leading-relaxed">
                    {mode === 'verify'
                        ? 'Digite seu código de 4 dígitos para acessar.'
                        : 'Crie um código de 4 dígitos para proteger sua conta. 💛'}
                </p>

                {/* Customer Info */}
                <div className="bg-stone-50 rounded-xl p-3 mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {customer?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                        <p className="font-bold text-stone-800 text-sm">{customer?.name}</p>
                        <p className="text-stone-400 text-xs">{customer?.phone?.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}</p>
                    </div>
                </div>

                {/* 4 Digit Input */}
                <div className="flex justify-center gap-3 mb-4">
                    {digits.map((digit, i) => (
                        <input
                            key={i}
                            ref={inputRefs[i]}
                            type="tel"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleDigit(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            className={`w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all ${error ? 'border-red-300 bg-red-50' : digit ? 'border-amber-400 bg-amber-50' : 'border-stone-200 bg-white'
                                } focus:border-amber-500 focus:ring-4 focus:ring-amber-100`}
                        />
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <p className="text-red-500 text-xs text-center font-medium mb-4 animate-in fade-in">{error}</p>
                )}

                {/* Loading */}
                {loading && (
                    <div className="flex justify-center mb-4">
                        <div className="w-6 h-6 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                    </div>
                )}

                {/* Cancel */}
                <button
                    onClick={onClose}
                    className="w-full text-stone-400 text-sm font-medium hover:text-stone-600 transition-colors mt-2"
                >
                    Voltar
                </button>
            </div>
        </div>
    );
};

export default function Store() {
    const { customer, toggleFavorite, isFavorite, logout, isVerified, verifyPasscode, createPasscode, updateName, checkPhonePasscode } = useCustomer();
    const { productId: urlProductId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Data States
    const [products, setProducts] = useState([]);
    const [storeCategories, setStoreCategories] = useState([]);
    const [storeSettings, setStoreSettings] = useState({ active: false });
    const [loading, setLoading] = useState(true);

    // Filtering & Search
    const [activeTab, setActiveTab] = useState('home');
    const [activeFilter, setActiveFilter] = useState('Todas As Joias');
    const [storeSearchQuery, setStoreSearchQuery] = useState('');

    // Advanced Filters State
    const [showFilterSheet, setShowFilterSheet] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState({
        sortBy: 'recent',
        inStockOnly: false,
        minPrice: '',
        maxPrice: ''
    });

    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [toast, setToast] = useState(null);
    const [customerOrders, setCustomerOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);

    const [selectedProduct, setSelectedProduct] = useState(null);

    // Auth Gate
    const [showAuthGate, setShowAuthGate] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState('');

    const guardedAction = (action) => {
        if (!isVerified) {
            checkPhonePasscode();
            setPendingAction(() => action);
            setShowAuthGate(true);
            return;
        }
        action();
    };

    // Coupon State (Lifted)
    const [coupon, setCoupon] = useState({ selected: null, discount: 0, loading: false, message: null });

    const handleApplyCoupon = async (code) => {
        if (!code) return;
        setCoupon(prev => ({ ...prev, loading: true, message: null }));
        const cartTotal = cart.reduce((acc, item) => acc + Number(item.price) * (item.qty || 1), 0);

        try {
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .eq('code', code.toUpperCase())
                .eq('is_active', true)
                .single();

            if (error || !data) {
                setCoupon(prev => ({ ...prev, loading: false, message: { type: 'error', text: 'Cupom inválido ou expirado.' } }));
                return;
            }

            if (data.expires_at && new Date(data.expires_at) < new Date()) {
                setCoupon(prev => ({ ...prev, loading: false, message: { type: 'error', text: 'Cupom expirado.' } }));
                return;
            }

            if (data.max_uses && data.current_uses >= data.max_uses) {
                setCoupon(prev => ({ ...prev, loading: false, message: { type: 'error', text: 'Limite de uso esgotado.' } }));
                return;
            }

            if (data.min_order_value && cartTotal < data.min_order_value) {
                setCoupon(prev => ({ ...prev, loading: false, message: { type: 'error', text: `Mínimo de R$ ${data.min_order_value}.` } }));
                return;
            }

            let discountValue = data.discount_type === 'percentage'
                ? cartTotal * (data.discount_value / 100)
                : data.discount_value;

            if (discountValue > cartTotal) discountValue = cartTotal;

            setCoupon({
                selected: data,
                discount: discountValue,
                loading: false,
                message: null // Success state is implied by selected != null
            });
        } catch (error) {
            setCoupon(prev => ({ ...prev, loading: false, message: { type: 'error', text: 'Erro ao validar.' } }));
        }
    };

    // Recalculate discount if cart changes
    useEffect(() => {
        if (coupon.selected) {
            const cartTotal = cart.reduce((acc, item) => acc + Number(item.price) * (item.qty || 1), 0);

            // Re-validate minimum value
            if (coupon.selected.min_order_value && cartTotal < coupon.selected.min_order_value) {
                setCoupon(prev => ({ ...prev, selected: null, discount: 0, message: { type: 'error', text: `Mínimo de R$ ${coupon.selected.min_order_value} não atingido.` } }));
                return;
            }

            let discountValue = coupon.selected.discount_type === 'percentage'
                ? cartTotal * (coupon.selected.discount_value / 100)
                : coupon.selected.discount_value;

            if (discountValue > cartTotal) discountValue = cartTotal;

            setCoupon(prev => ({ ...prev, discount: discountValue }));
        }
    }, [cart]);

    // Greeting logic
    const getGreeting = () => {
        const hour = new Date().getHours();
        const name = customer?.name?.split(' ')[0] || 'Cliente';
        if (hour < 12) return `Bom dia, ${name}!`;
        if (hour < 18) return `Boa tarde, ${name}!`;
        return `Boa noite, ${name}!`;
    };

    // Load customer orders when "Pedidos" tab is selected
    useEffect(() => {
        if (activeTab === 'orders' && customer?.phone) {
            setOrdersLoading(true);
            supabase
                .from('orders')
                .select('*')
                .eq('customer_phone', customer.phone.replace(/\D/g, ''))
                .order('created_at', { ascending: false })
                .then(({ data }) => {
                    setCustomerOrders(data || []);
                    setOrdersLoading(false);
                });
        }
    }, [activeTab, customer]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: pData } = await supabase.from('products').select('*').eq('is_visible', true).order('created_at', { ascending: false });
            if (pData) setProducts(pData);

            const { data: cData } = await supabase.from('categories').select('*').order('display_order', { ascending: true });
            if (cData) setStoreCategories([{ id: 'all', name: 'Todas As Joias' }, ...cData]);

            const { data: sData } = await supabase.from('store_settings').select('*').eq('id', 1).single();
            if (sData) {
                setStoreSettings({
                    active: sData.banner_active,
                    text: sData.banner_text,
                    bgColor: sData.banner_bg_color,
                    textColor: sData.banner_text_color,
                    link: sData.banner_link
                });
            }

            // Auto-open product from URL if navigated via /produto/:id
            if (urlProductId && pData) {
                const found = pData.find(p => String(p.id) === String(urlProductId));
                if (found) {
                    setSelectedProduct(found);
                    // Clean URL so refreshing doesn't re-open
                    // URL stays until modal closes
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCart = (product, qty = 1) => {
        setCart(prev => {
            const existing = prev.findIndex(item => item.id === product.id);
            const currentQty = existing >= 0 ? (prev[existing].qty || 1) : 0;
            const newQty = currentQty + qty;

            if (newQty > (product.stock_quantity || 0)) {
                showToast(`Apenas ${product.stock_quantity || 0} unidades disponíveis!`);
                return prev;
            }

            if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = { ...updated[existing], qty: newQty };
                return updated;
            }
            return [...prev, { ...product, qty }];
        });
        setShowCart(true);
    };

    const updateCartQty = (idx, newQty) => {
        setCart(prev => {
            const item = prev[idx];
            if (newQty > (item.stock_quantity || 0)) {
                showToast(`Máximo de ${item.stock_quantity} unidades!`);
                return prev;
            }

            const updated = [...prev];
            if (newQty <= 0) return updated.filter((_, i) => i !== idx);
            updated[idx] = { ...updated[idx], qty: newQty };
            return updated;
        });
    };

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2000);
    };

    const filteredProducts = useMemo(() => {
        let result = products;

        // 1. Text Search
        if (storeSearchQuery) {
            const sq = storeSearchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(sq) ||
                (p.sku && p.sku.toLowerCase().includes(sq)) ||
                (p.description && p.description.toLowerCase().includes(sq))
            );
        }

        // 2. Category Filter
        if (activeFilter && activeFilter !== 'Todas As Joias') {
            result = result.filter(p => (p.category || '').split(',').map(c => c.trim()).includes(activeFilter));
        }

        // 3. Advanced Filters (Stock & Price)
        if (advancedFilters.inStockOnly) {
            result = result.filter(p => (Number(p.stock_quantity) || 0) > 0);
        }
        if (advancedFilters.minPrice !== '') {
            result = result.filter(p => Number(p.price) >= Number(advancedFilters.minPrice));
        }
        if (advancedFilters.maxPrice !== '') {
            result = result.filter(p => Number(p.price) <= Number(advancedFilters.maxPrice));
        }

        // 4. Sorting
        result.sort((a, b) => {
            if (advancedFilters.sortBy === 'price_asc') return Number(a.price) - Number(b.price);
            if (advancedFilters.sortBy === 'price_desc') return Number(b.price) - Number(a.price);
            // Default 'recent'
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });

        return result;
    }, [products, storeSearchQuery, activeFilter, advancedFilters]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (advancedFilters.inStockOnly) count++;
        if (advancedFilters.minPrice !== '') count++;
        if (advancedFilters.maxPrice !== '') count++;
        if (advancedFilters.sortBy !== 'recent') count++;
        return count;
    }, [advancedFilters]);

    return (
        <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row font-sans text-stone-900">

            {/* --- DESKTOP SIDEBAR --- */}
            <aside className="hidden md:flex flex-col w-72 bg-white h-screen sticky top-0 border-r border-stone-200 z-30">
                <div className="p-8 pb-4">
                    {/* Logo instead of Text */}
                    <img src={`${process.env.PUBLIC_URL}/logo_full.svg`} alt="Zenaide Simões" className="h-32 w-auto -my-4" />
                    <p className="text-xs text-stone-400 mt-1 uppercase tracking-widest font-medium">Joias & Semijoias</p>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-6">
                    <SidebarItem icon={Home} label="Início" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                    <SidebarItem icon={Search} label="Buscar" isActive={activeTab === 'search'} onClick={() => setActiveTab('search')} />
                    <SidebarItem icon={Heart} label="Favoritos" isActive={activeTab === 'fav'} onClick={() => guardedAction(() => setActiveTab('fav'))} />
                    <SidebarItem icon={Package} label="Meus Pedidos" isActive={activeTab === 'orders'} onClick={() => guardedAction(() => setActiveTab('orders'))} />
                    <SidebarItem icon={Crown} label="Consultoria" isActive={activeTab === 'consultoria'} onClick={() => setActiveTab('consultoria')} />
                    <SidebarItem icon={User} label="Meu Perfil" isActive={activeTab === 'profile'} onClick={() => guardedAction(() => setActiveTab('profile'))} />
                </nav>

                <div className="p-4 m-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                            <ShoppingBag size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-stone-500 uppercase">Sua Sacola</p>
                            <p className="text-sm font-bold text-stone-900">{cart.reduce((a, i) => a + (i.qty || 1), 0)} itens</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCart(true)}
                        className="w-full bg-stone-900 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-stone-800 transition-colors"
                    >
                        Ver Sacola
                    </button>
                </div>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 flex flex-col min-w-0 md:bg-stone-50/50 relative">

                {/* Banner Global */}
                <StoreBanner {...storeSettings} />

                {/* Modals & Overlays */}
                <FilterSheet
                    isOpen={showFilterSheet}
                    onClose={() => setShowFilterSheet(false)}
                    filters={advancedFilters}
                    setFilters={setAdvancedFilters}
                    onApply={() => setShowFilterSheet(false)}
                    appliedCount={activeFilterCount}
                />

                <CartDrawer
                    isOpen={showCart}
                    onClose={() => setShowCart(false)}
                    items={cart}
                    onUpdateQty={updateCartQty}
                    onRemove={(idx) => setCart(prev => prev.filter((_, i) => i !== idx))}
                    onCheckout={() => { setShowCart(false); setShowCheckout(true); }}
                    onContinue={() => setShowCart(false)}
                    coupon={coupon}
                    onApplyCoupon={handleApplyCoupon}
                    onRemoveCoupon={() => setCoupon({ selected: null, discount: 0, loading: false, message: null })}
                />

                <ProductDetails
                    product={selectedProduct}
                    isOpen={!!selectedProduct}
                    onClose={() => { setSelectedProduct(null); navigate(location.pathname.split('/produto')[0], { replace: true }); }}
                    onAdd={toggleCart}
                />

                <CheckoutModal
                    isOpen={showCheckout}
                    onClose={() => setShowCheckout(false)}
                    cart={cart}
                    total={cart.reduce((acc, item) => acc + Number(item.price) * (item.qty || 1), 0)}
                    customerData={customer}
                    coupon={coupon}
                />

                <AuthGateModal
                    isOpen={showAuthGate}
                    onClose={() => setShowAuthGate(false)}
                    onSuccess={() => {
                        setShowAuthGate(false);
                        if (pendingAction) {
                            pendingAction();
                            setPendingAction(null);
                        }
                    }}
                    customer={customer}
                    verifyPasscode={verifyPasscode}
                    createPasscode={createPasscode}
                />

                {/* Desktop Header */}
                <header className="hidden md:flex justify-between items-center px-8 py-5 bg-white/95 backdrop-blur-md sticky top-0 z-20 border-b border-stone-200/50">
                    <div className="w-full max-w-md relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar joias incríveis..."
                            className="w-full pl-12 pr-4 py-2.5 bg-stone-100 border-none rounded-full text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:bg-white transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 text-stone-400 hover:text-stone-600 transition-colors">
                            <MessageCircle size={22} />
                        </button>
                        <div className="w-9 h-9 bg-gradient-to-tr from-amber-400 to-amber-600 rounded-full p-[2px]">
                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(customer?.name || 'Cliente')}&background=fff&color=000`} className="w-full h-full rounded-full border-2 border-white" alt="Profile" />
                        </div>
                    </div>
                </header>

                {/* Mobile Header — Home tab only */}
                {activeTab === 'home' && (
                    <header className="md:hidden px-5 pb-2 bg-white flex justify-between items-center sticky top-0 z-10 border-b border-stone-50" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top, 1.5rem))' }}>
                        <div>
                            <h1 className="text-xl font-serif font-bold text-stone-800">{getGreeting()}</h1>
                            <p className="text-xs text-stone-500">Seleção especial para você</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => guardedAction(() => setActiveTab('fav'))} className="p-2 bg-stone-50 rounded-full text-stone-600 relative">
                                <Heart size={20} />
                            </button>
                            <button
                                onClick={() => setShowCart(true)}
                                className="p-2 bg-stone-50 rounded-full text-stone-600 relative"
                            >
                                <ShoppingBag size={20} />
                                {cart.length > 0 && (
                                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                                )}
                            </button>
                        </div>
                    </header>
                )}

                {/* Safe area spacer for non-home tabs (no header to absorb notch space) */}
                {activeTab !== 'home' && (
                    <div className="md:hidden bg-white" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }} />
                )}

                {/* Toast Notification */}
                {toast && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
                        <div className="bg-stone-900/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border border-white/10">
                            <AlertTriangle size={18} className="text-amber-400" />
                            <span className="text-sm font-bold">{toast}</span>
                        </div>
                    </div>
                )}

                {/* Content Container */}
                <div className="flex-1 overflow-y-auto">

                    {/* Categories - Sleek pill list */}
                    {(activeTab === 'home' || activeTab === 'search') && (
                        <section className="bg-white border-b border-stone-100 py-4 md:py-6 md:bg-transparent md:border-none sticky top-0 md:static z-20 shadow-sm md:shadow-none">
                            <div className="px-5 md:px-8">
                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x hide-scrollbar">
                                    {storeCategories.filter(c => c.name).map(cat => (
                                        <div key={cat.id} className="snap-start shrink-0">
                                            <CategoryPill
                                                name={cat.name}
                                                active={activeFilter === cat.name}
                                                onClick={() => {
                                                    setActiveFilter(cat.name);
                                                    setStoreSearchQuery('');
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Main Feed */}
                    <div className="p-5 md:p-8 space-y-8 pb-32">

                        {/* === HOME TAB === */}
                        {(activeTab === 'home' || activeTab === 'search') && (
                            <>

                                {/* Product Grid */}
                                {/* Professional Filter Bar */}
                                <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                                            <h2 className="font-bold text-stone-800 text-xl">{activeFilter}</h2>
                                            <span className="px-2.5 py-1 bg-stone-100 text-stone-500 text-xs font-bold rounded-full w-fit">
                                                {filteredProducts.length} itens encontrados
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex w-full md:w-auto gap-2">
                                        {/* Search Input */}
                                        <div className="relative flex-1 md:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Buscar produto, SKU..."
                                                value={storeSearchQuery}
                                                onChange={(e) => setStoreSearchQuery(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                                            />
                                        </div>

                                        {/* Filter Button */}
                                        <button
                                            onClick={() => setShowFilterSheet(true)}
                                            className={`relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-sm transition-all focus:ring-2 focus:ring-amber-500/20 outline-none ${activeFilterCount > 0
                                                ? 'bg-amber-50 border-amber-200 text-amber-900'
                                                : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                                                }`}
                                        >
                                            <SlidersHorizontal size={16} />
                                            <span className="hidden sm:inline">Filtrar</span>
                                            {activeFilterCount > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white min-w-[20px] h-5 px-1 rounded-full text-[10px] flex items-center justify-center">
                                                    {activeFilterCount}
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="aspect-[3/4] bg-stone-100 animate-pulse rounded-2xl" />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                                        {filteredProducts.map(product => (
                                            <ProductCard
                                                key={product.id}
                                                product={product}
                                                onClick={setSelectedProduct}
                                                onAdd={toggleCart}
                                                isAdded={false}
                                                onFav={toggleFavorite}
                                                isFav={isFavorite(product.id)}
                                            />
                                        ))}
                                        {filteredProducts.length === 0 && (
                                            <div className="col-span-full py-20 bg-white rounded-3xl border border-dashed border-stone-200 text-center">
                                                <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300">
                                                    <Search size={32} />
                                                </div>
                                                <p className="text-stone-500 font-medium">Nenhum produto encontrado nesta categoria.</p>
                                            </div>
                                        )}
                                    </div>
                                )}


                                {/* WhatsApp Channel Invite */}
                                <div className="rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100/50 p-5 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-green-500/20">
                                        <MessageCircle size={22} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-stone-800 text-sm">Canal exclusivo da Zenaide</p>
                                        <p className="text-xs text-stone-500 mt-0.5">Peças do acervo pessoal, promoções e descontos todo mês só pra quem está no canal!</p>
                                    </div>
                                    <button
                                        onClick={() => window.open('https://wa.me/5569999717163?text=' + encodeURIComponent('Oi Zenaide! Quero participar do canal exclusivo no WhatsApp!'), '_blank')}
                                        className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-xs flex-shrink-0 hover:bg-green-700 active:scale-95 transition-all shadow-md"
                                    >
                                        Entrar
                                    </button>
                                </div>
                            </>
                        )}

                        {/* === FAVORITES TAB === */}
                        {activeTab === 'fav' && (
                            <div>
                                <h2 className="font-serif text-2xl font-bold text-stone-800 mb-2">Seus Favoritos 💛</h2>
                                <p className="text-stone-500 text-sm mb-6">As peças que você guardou com carinho</p>
                                {products.filter(p => isFavorite(p.id)).length === 0 ? (
                                    <div className="py-20 bg-white rounded-3xl border border-dashed border-stone-200 text-center">
                                        <Heart size={48} className="mx-auto mb-4 text-stone-200" />
                                        <p className="text-stone-500 font-medium">Você ainda não favoritou nenhuma peça.</p>
                                        <p className="text-stone-400 text-sm mt-1">Toque no coração ♥ para salvar!</p>
                                        <button onClick={() => setActiveTab('home')} className="mt-4 bg-amber-500 text-white px-6 py-2 rounded-xl font-bold text-sm">Ver Peças</button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                                        {products.filter(p => isFavorite(p.id)).map(product => (
                                            <ProductCard
                                                key={product.id}
                                                product={product}
                                                onClick={setSelectedProduct}
                                                onAdd={toggleCart}
                                                isAdded={false}
                                                onFav={toggleFavorite}
                                                isFav={true}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* WhatsApp Channel Invite */}
                                <div className="mt-8 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100/50 p-5 flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                                        <MessageCircle size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-stone-800 text-xs">Quer ver mais peças exclusivas?</p>
                                        <p className="text-[11px] text-stone-500 mt-0.5">Entre no canal da Zenaide e receba ofertas e descontos que não saem no site.</p>
                                    </div>
                                    <button
                                        onClick={() => window.open('https://wa.me/5569999717163?text=' + encodeURIComponent('Oi Zenaide! Quero participar do canal exclusivo no WhatsApp!'), '_blank')}
                                        className="bg-green-600 text-white px-3 py-2 rounded-xl font-bold text-xs flex-shrink-0 hover:bg-green-700 active:scale-95 transition-all"
                                    >
                                        Entrar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* === ORDERS TAB === */}
                        {activeTab === 'orders' && (
                            <div className="max-w-xl mx-auto">
                                <h2 className="font-serif text-2xl font-bold text-stone-800 mb-2">Meus Pedidos 📦</h2>
                                <p className="text-stone-500 text-sm mb-6">{customer?.name ? `Aqui estão seus pedidos, ${customer.name.split(' ')[0]}.` : 'Seus pedidos aparecem aqui.'}</p>
                                {ordersLoading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-stone-100 animate-pulse rounded-2xl" />)}
                                    </div>
                                ) : customerOrders.length === 0 ? (
                                    <div className="py-20 bg-white rounded-3xl border border-dashed border-stone-200 text-center">
                                        <Package size={48} className="mx-auto mb-4 text-stone-200" />
                                        <p className="text-stone-500 font-medium">Você ainda não fez nenhum pedido.</p>
                                        <p className="text-stone-400 text-sm mt-1">Quando fizer, ele aparece aqui!</p>
                                        <button onClick={() => setActiveTab('home')} className="mt-4 bg-amber-500 text-white px-6 py-2 rounded-xl font-bold text-sm">Ver Peças</button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {customerOrders.map(order => (
                                            <div key={order.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                                                {/* Header do Pedido */}
                                                <div className="p-5 cursor-pointer hover:bg-stone-50 transition-colors" onClick={() => document.getElementById(`order-details-${order.id}`).classList.toggle('hidden')}>
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-bold text-stone-800 text-sm">Pedido #{order.id?.slice(0, 8)}</p>
                                                                <ChevronDown size={14} className="text-stone-400" />
                                                            </div>
                                                            <p className="text-xs text-stone-400">{new Date(order.created_at).toLocaleDateString('pt-BR')} às {new Date(order.created_at).toLocaleTimeString().slice(0, 5)}</p>
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                            order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                                                                order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                                                                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                                        'bg-amber-100 text-amber-700'
                                                            }`}>
                                                            {order.status === 'paid' ? '✅ Pago' :
                                                                order.status === 'pending' ? '⏳ Pendente' :
                                                                    order.status === 'shipped' ? '🚚 Enviado' :
                                                                        order.status === 'delivered' ? '📦 Entregue' :
                                                                            order.status === 'cancelled' ? '❌ Cancelado' :
                                                                                order.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <p className="font-bold text-stone-900">R$ {Number(order.total_amount || 0).toFixed(2)}</p>
                                                        <p className="text-xs text-stone-500">{order.items?.length || 0} itens</p>
                                                    </div>
                                                </div>

                                                {/* Detalhes Expansíveis */}
                                                <div id={`order-details-${order.id}`} className="hidden border-t border-stone-100 bg-stone-50/50 p-4">
                                                    <h4 className="text-xs font-bold uppercase text-stone-400 mb-3">Itens do Pedido</h4>
                                                    <div className="space-y-3 mb-4">
                                                        {order.items?.map((item, idx) => (
                                                            <div key={idx} className="flex gap-3 items-center bg-white p-2 rounded-lg border border-stone-100">
                                                                <div className="w-12 h-12 bg-stone-100 rounded-md bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${item.image || item.image_url || item.images?.[0]})` }}></div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-stone-800 line-clamp-1">{item.name}</p>
                                                                    <p className="text-xs text-stone-500">R$ {Number(item.price).toFixed(2)} x {item.qty || 1}</p>
                                                                </div>
                                                                <p className="text-sm font-bold text-stone-900">R$ {(Number(item.price) * (item.qty || 1)).toFixed(2)}</p>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                                                        {order.payment_link && order.status === 'pending' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    window.open(order.payment_link, '_blank');
                                                                }}
                                                                className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 flex items-center gap-2"
                                                            >
                                                                <CreditCard size={14} /> Pagar Agora
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                window.open(`https://wa.me/5569999717163?text=${encodeURIComponent(`Oi Zenaide! Quero saber sobre meu pedido #${order.id?.slice(0, 8)}`)}`, '_blank');
                                                            }}
                                                            className="px-4 py-2 bg-white border border-stone-200 text-stone-600 text-xs font-bold rounded-lg hover:bg-stone-50 flex items-center gap-2"
                                                        >
                                                            <MessageCircle size={14} /> Ajuda
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* WhatsApp Channel Invite */}
                                <div className="mt-8 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100/50 p-5 flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                                        <MessageCircle size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-stone-800 text-xs">Canal exclusivo da Zenaide</p>
                                        <p className="text-[11px] text-stone-500 mt-0.5">Peças do acervo pessoal + descontos todo mês. Não perca!</p>
                                    </div>
                                    <button
                                        onClick={() => window.open('https://wa.me/5569999717163?text=' + encodeURIComponent('Oi Zenaide! Quero participar do canal exclusivo no WhatsApp!'), '_blank')}
                                        className="bg-green-600 text-white px-3 py-2 rounded-xl font-bold text-xs flex-shrink-0 hover:bg-green-700 active:scale-95 transition-all"
                                    >
                                        Entrar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* === PROFILE TAB === */}
                        {activeTab === 'profile' && (
                            <div className="max-w-md mx-auto">
                                <h2 className="font-serif text-2xl font-bold text-stone-800 mb-6">Meu Perfil</h2>
                                <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                            {customer?.name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div className="flex-1">
                                            {editingName ? (
                                                <div className="flex gap-2">
                                                    <input
                                                        value={newName}
                                                        onChange={(e) => setNewName(e.target.value)}
                                                        className="flex-1 px-3 py-1.5 border border-stone-200 rounded-lg text-sm outline-none focus:border-amber-400"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && newName.trim()) {
                                                                updateName(newName.trim());
                                                                setEditingName(false);
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => { if (newName.trim()) { updateName(newName.trim()); setEditingName(false); } }}
                                                        className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold"
                                                    >
                                                        Salvar
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-stone-800 text-lg">{customer?.name}</p>
                                                    <button onClick={() => { setNewName(customer?.name || ''); setEditingName(true); }} className="p-1 text-stone-400 hover:text-amber-500 transition-colors">
                                                        <Edit3 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                            <p className="text-stone-500 text-sm">{customer?.phone?.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}</p>
                                        </div>
                                    </div>
                                    <hr className="border-stone-100" />
                                    <button onClick={() => setActiveTab('orders')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-stone-50 flex items-center gap-3 text-stone-700 font-medium">
                                        <Package size={20} className="text-stone-400" /> Meus Pedidos
                                    </button>
                                    <button onClick={() => setActiveTab('fav')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-stone-50 flex items-center gap-3 text-stone-700 font-medium">
                                        <Heart size={20} className="text-stone-400" /> Favoritos
                                    </button>
                                    <button onClick={() => setActiveTab('consultoria')} className="w-full text-left px-4 py-3 rounded-xl hover:bg-stone-50 flex items-center gap-3 text-stone-700 font-medium">
                                        <Crown size={20} className="text-amber-500" /> Consultoria VIP
                                    </button>
                                    <button onClick={() => { window.open('https://wa.me/5569999717163', '_blank'); }} className="w-full text-left px-4 py-3 rounded-xl hover:bg-stone-50 flex items-center gap-3 text-stone-700 font-medium">
                                        <MessageCircle size={20} className="text-green-500" /> Falar com a Zenaide
                                    </button>
                                    <hr className="border-stone-100" />
                                    <button onClick={logout} className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 flex items-center gap-3 text-red-500 font-medium">
                                        <LogOut size={20} /> Sair
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* === CONSULTORIA TAB === */}
                        {activeTab === 'consultoria' && (
                            <div className="max-w-lg mx-auto space-y-6">
                                {/* Hero */}
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/25">
                                        <Crown size={40} className="text-white" />
                                    </div>
                                    <h2 className="font-serif text-3xl font-bold text-stone-800 mb-3">Consultoria Pessoal</h2>
                                    <p className="text-stone-500 text-sm max-w-sm mx-auto leading-relaxed">
                                        Assessoria exclusiva com Zenaide — sua consultora pessoal de acessórios e joias de luxo.
                                    </p>
                                </div>

                                {/* Value Proposition */}
                                <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-3xl p-8 text-white space-y-6">
                                    <p className="text-white/80 text-sm leading-relaxed font-light">
                                        Cada momento na vida de uma mulher pede a joia ideal. Um jantar especial, uma reunião decisiva, uma comemoração íntima — cada ocasião merece um acessório que conte a sua história.
                                    </p>
                                    <p className="text-white/80 text-sm leading-relaxed font-light">
                                        Uma consultora de joias entende isso como ninguém. Ela conhece seu estilo, seu tom de pele, suas preferências e, principalmente, sabe como transformar cada look em algo memorável.
                                    </p>
                                    <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/10">
                                        <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-2">Por que ter uma consultora?</p>
                                        <p className="text-white/90 text-sm leading-relaxed">
                                            A mulher contemporânea não compra joias — ela <strong>investe em si mesma</strong>. Uma consultora garante que cada peça escolhida valorize quem você é e comunique exatamente o que você deseja.
                                        </p>
                                    </div>
                                </div>

                                {/* Features */}
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="bg-white rounded-2xl p-5 border border-stone-100 flex items-start gap-4">
                                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0">
                                            <MessageCircle size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-stone-800 text-sm">Atendimento de segunda a sábado</p>
                                            <p className="text-stone-500 text-xs mt-1">Me chame pelo WhatsApp nos horários comerciais. Estou sempre pronta para ajudar na escolha perfeita.</p>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-2xl p-5 border border-stone-100 flex items-start gap-4">
                                        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 flex-shrink-0">
                                            <Heart size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-stone-800 text-sm">Curadoria personalizada</p>
                                            <p className="text-stone-500 text-xs mt-1">Receba sugestões feitas exclusivamente para você, com base no seu estilo e nas ocasiões do seu dia a dia.</p>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-2xl p-5 border border-stone-100 flex items-start gap-4">
                                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                                            <Sparkles size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-stone-800 text-sm">Acesso antecipado</p>
                                            <p className="text-stone-500 text-xs mt-1">Seja a primeira a conhecer lançamentos, edições limitadas e peças exclusivas antes de todo mundo.</p>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-2xl p-5 border border-stone-100 flex items-start gap-4">
                                        <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600 flex-shrink-0">
                                            <Crown size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-stone-800 text-sm">Descontos VIP e condições especiais</p>
                                            <p className="text-stone-500 text-xs mt-1">Preços diferenciados, parcelamentos exclusivos e mimos que só clientes da consultoria recebem.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Pricing */}
                                <div className="bg-gradient-to-br from-amber-50 via-white to-rose-50 rounded-3xl p-8 border border-amber-100/50 text-center space-y-4">
                                    <p className="text-stone-500 text-xs font-bold uppercase tracking-widest">Investimento mensal</p>
                                    <div className="flex items-baseline justify-center gap-1">
                                        <span className="text-stone-400 text-lg">R$</span>
                                        <span className="text-5xl font-bold text-stone-900">570</span>
                                        <span className="text-stone-400 text-sm">/mês</span>
                                    </div>
                                    <p className="text-stone-500 text-xs max-w-xs mx-auto">Assessoria ilimitada, curadoria pessoal e atendimento prioritário com Zenaide.</p>
                                    <button
                                        onClick={() => {
                                            const msg = encodeURIComponent(`Oi Zenaide! Tenho interesse na Consultoria VIP mensal. Pode me contar mais?`);
                                            window.open(`https://wa.me/5569999717163?text=${msg}`, '_blank');
                                        }}
                                        className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-stone-800 active:scale-[0.98] transition-all shadow-xl shadow-stone-900/15 text-sm"
                                    >
                                        <Crown size={20} />
                                        Quero minha Consultoria VIP
                                    </button>
                                    <p className="text-stone-400 text-[10px]">Ao contratar, você será atendida diretamente pela Zenaide no WhatsApp.</p>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </main >

            {/* --- MOBILE NAVIGATION --- */}
            < nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 px-6 py-2 flex justify-between items-center z-40 pb-safe" >
                <MobileTab icon={Home} label="Início" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                <MobileTab icon={Crown} label="Consultoria" isActive={activeTab === 'consultoria'} onClick={() => setActiveTab('consultoria')} />
                <div className="relative -top-5">
                    <button
                        onClick={() => setShowCart(true)}
                        className="w-14 h-14 bg-stone-900 rounded-full flex items-center justify-center text-white shadow-lg shadow-stone-900/30 active:scale-95 transition-transform"
                    >
                        <ShoppingBag size={24} />
                        {cart.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                                {cart.reduce((a, i) => a + (i.qty || 1), 0)}
                            </span>
                        )}
                    </button>
                </div>
                <MobileTab icon={Package} label="Pedidos" isActive={activeTab === 'orders'} onClick={() => guardedAction(() => setActiveTab('orders'))} />
                <MobileTab icon={User} label="Perfil" isActive={activeTab === 'profile'} onClick={() => guardedAction(() => setActiveTab('profile'))} />
            </nav >

            {/* TOAST & CART DRAWER */}
            {
                toast && (
                    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-stone-900 text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl animate-in fade-in slide-in-from-top-4 flex items-center gap-3">
                        <Check size={18} className="text-green-400" />
                        {toast}
                    </div>
                )
            }

            <ProductDetails
                product={selectedProduct}
                isOpen={!!selectedProduct}
                onClose={() => {
                    setSelectedProduct(null);
                    if (urlProductId) navigate('/', { replace: true });
                }}
                onAdd={toggleCart}
            />

            <AuthGateModal
                isOpen={showAuthGate}
                onClose={() => { setShowAuthGate(false); setPendingAction(null); }}
                onSuccess={() => { if (pendingAction) { pendingAction(); setPendingAction(null); } }}
                customer={customer}
                verifyPasscode={verifyPasscode}
                createPasscode={createPasscode}
            />

            <CartDrawer
                isOpen={showCart}
                onClose={() => setShowCart(false)}
                items={cart}
                onUpdateQty={updateCartQty}
                onRemove={(idx) => setCart(cart.filter((_, i) => i !== idx))}
                onCheckout={() => {
                    setShowCart(false);
                    guardedAction(() => setShowCheckout(true));
                }}
                onContinue={() => {
                    setShowCart(false);
                    setActiveTab('home');
                }}
                coupon={coupon}
                onApplyCoupon={handleApplyCoupon}
                onRemoveCoupon={() => setCoupon({ selected: null, discount: 0, loading: false, message: null })}
            />

            <CheckoutModal
                isOpen={showCheckout}
                onClose={() => setShowCheckout(false)}
                cart={cart}
                total={cart.reduce((acc, item) => acc + Number(item.price) * (item.qty || 1), 0)}
                customerData={customer}
                coupon={coupon}
            />

        </div >
    );
}
