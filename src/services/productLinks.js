const STORE_WHATSAPP = '5569999717163';

export function productShareUrl(id) {
    return `https://bydedlfccgywqshzllmz.supabase.co/functions/v1/share?id=${encodeURIComponent(id)}`;
}

export function shareProductOnWhatsApp(product) {
    const message = `${product.name}\n${productShareUrl(product.id)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}

export function askAboutProductUrl(product) {
    const message = `Oi, Zenaide! Pode confirmar a disponibilidade e os detalhes desta peça?\n${product.name}\n${productShareUrl(product.id)}`;
    return `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
