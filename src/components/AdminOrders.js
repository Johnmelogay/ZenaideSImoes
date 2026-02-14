import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Search, Filter, MessageCircle, Package, Truck, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, Copy, ExternalLink, Save, X } from 'lucide-react';

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [expandedOrder, setExpandedOrder] = useState(null);

    // State for editing
    const [editStatus, setEditStatus] = useState('');
    const [editTracking, setEditTracking] = useState('');
    const [zoomedImage, setZoomedImage] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data);
        } catch (error) {
            console.error('Erro ao buscar pedidos:', error);
            alert('Erro ao carregar pedidos');
        } finally {
            setLoading(false);
        }
    };

    const handleExpand = (order) => {
        if (expandedOrder === order.id) {
            setExpandedOrder(null);
        } else {
            setExpandedOrder(order.id);
            setEditStatus(order.status);
            setEditTracking(order.tracking_code || '');
        }
    };

    const handleUpdateOrder = async (orderId) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    status: editStatus,
                    tracking_code: editTracking
                })
                .eq('id', orderId);

            if (error) throw error;

            // Update local state
            setOrders(orders.map(o => o.id === orderId ? {
                ...o,
                status: editStatus,
                tracking_code: editTracking
            } : o));

            alert('Pedido atualizado com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar:', error);
            alert('Erro ao atualizar pedido');
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Copiado!');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800 border-green-200';
            case 'processing': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'shipped': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'delivered': return 'bg-stone-100 text-stone-800 border-stone-200';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-yellow-50 text-yellow-800 border-yellow-200'; // pending
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'paid': return 'Pago';
            case 'processing': return 'Separando';
            case 'shipped': return 'Enviado';
            case 'delivered': return 'Entregue';
            case 'cancelled': return 'Cancelado';
            default: return 'Pendente';
        }
    };

    const handleWhatsAppNotify = (order) => {
        let msg = '';
        const name = order.customer_name.split(' ')[0];
        const tracking = order.tracking_code || editTracking;

        switch (order.status) {
            case 'pending':
                msg = `Olá ${name}! Tudo bem? Vi que seu pedido #${order.id.slice(0, 8)} está pendente. Posso ajudar a finalizar?`;
                if (order.payment_link) msg += ` Aqui está o link: ${order.payment_link}`;
                break;
            case 'paid':
                msg = `Olá ${name}! 💎 Recebemos seu pagamento! Agradecemos a preferência. Estamos preparando seu pedido!`;
                break;
            case 'processing':
                msg = `Olá ${name}! 💎 Seus produtos estão em separação! Em breve enviaremos o rastreio.`;
                break;
            case 'shipped':
                msg = `Olá ${name}! ✨ Boas notícias: Seu pedido já foi enviado! 🚚 ${tracking ? `Código de rastreio: *${tracking}*` : 'Fique de olho na entrega!'}`;
                break;
            case 'delivered':
                msg = `Olá ${name}! Vi que seu pedido chegou! 😍 O que achou das peças? Espero que tenha gostado! Se puder, nos marque nas redes sociais ✨`;
                break;
            case 'cancelled':
                msg = `Olá ${name}. Seu pedido #${order.id.slice(0, 8)} foi cancelado. Houve algum problema?`;
                break;
            default:
                msg = `Olá ${name}! Tudo bem? Gostaria de falar sobre o seu pedido #${order.id.slice(0, 8)}.`;
        }

        const phone = order.customer_phone.replace(/\D/g, '');
        window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const filteredOrders = filterStatus === 'all'
        ? orders
        : orders.filter(o => o.status === filterStatus);

    if (loading) return <div className="p-8 text-center text-stone-500">Carregando pedidos...</div>;

    return (
        <div className="space-y-6">
            {/* Header / Filter */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 md:p-4 rounded-xl border border-stone-100 shadow-sm">
                <div className="flex items-center gap-2 text-stone-600">
                    <Package size={20} />
                    <span className="font-bold">{filteredOrders.length} Pedidos</span>
                </div>

                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
                    {['all', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filterStatus === status
                                ? 'bg-stone-900 text-white shadow-md'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                }`}
                        >
                            {status === 'all' ? 'Todos' : getStatusLabel(status)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
                {filteredOrders.map(order => (
                    <div key={order.id} className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">

                        {/* Order Header */}
                        <div
                            className="p-3 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 cursor-pointer bg-stone-50/50"
                            onClick={() => handleExpand(order)}
                        >
                            <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 ${getStatusColor(order.status)}`}>
                                    {order.status === 'shipped' ? <Truck size={16} /> :
                                        order.status === 'processing' ? <Package size={16} /> :
                                            order.status === 'paid' ? <CheckCircle size={16} /> :
                                                order.status === 'delivered' ? <CheckCircle size={16} /> :
                                                    order.status === 'cancelled' ? <AlertCircle size={16} /> :
                                                        <Clock size={16} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
                                        #{order.id.slice(0, 8)}
                                        <span className="md:hidden font-normal text-stone-400">- {order.customer_name.split(' ')[0]}</span>
                                        <span className="hidden md:inline">- {order.customer_name}</span>
                                    </h3>
                                    <p className="text-[10px] md:text-xs text-stone-500 flex items-center gap-2 truncate">
                                        {new Date(order.created_at).toLocaleDateString()} às {new Date(order.created_at).toLocaleTimeString().slice(0, 5)}
                                        <span className="w-1 h-1 bg-stone-300 rounded-full"></span>
                                        {order.items?.length || 0} Itens
                                    </p>
                                </div>
                                <div className="md:hidden">
                                    {expandedOrder === order.id ? <ChevronUp size={20} className="text-stone-400" /> : <ChevronDown size={20} className="text-stone-400" />}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end pl-11 md:pl-0">
                                <span className="font-serif font-bold text-stone-900 text-sm md:text-base">
                                    R$ {order.total_amount?.toFixed(2)}
                                </span>
                                <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                                    {getStatusLabel(order.status)}
                                </span>
                                <div className="hidden md:block">
                                    {expandedOrder === order.id ? <ChevronUp size={20} className="text-stone-400" /> : <ChevronDown size={20} className="text-stone-400" />}
                                </div>
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedOrder === order.id && (
                            <div className="p-3 md:p-5 border-t border-stone-100 bg-white animate-in slide-in-from-top-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">

                                    {/* Column 1: Items & Address */}
                                    <div className="space-y-4 md:space-y-6">
                                        <div>
                                            <h4 className="text-xs font-bold uppercase text-stone-400 mb-2 md:mb-3">Itens do Pedido</h4>
                                            <div className="space-y-2 md:space-y-3">
                                                {order.items?.map((item, idx) => (
                                                    <div key={idx} className="flex gap-3 md:gap-4 items-center bg-stone-50 p-2 md:p-3 rounded-xl border border-stone-100">
                                                        <div
                                                            className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-lg bg-cover bg-center cursor-zoom-in border border-stone-200 shadow-sm"
                                                            style={{ backgroundImage: `url(${item.image || item.image_url || item.images?.[0]})` }}
                                                            onClick={() => setZoomedImage(item.image || item.image_url || item.images?.[0])}
                                                        ></div>
                                                        <div className="flex-1">
                                                            <p className="text-xs md:text-sm font-bold text-stone-800 line-clamp-1">{item.name}</p>
                                                            <div className="flex justify-between items-center mt-1">
                                                                <p className="text-[10px] md:text-xs text-stone-500">Qtd: {item.qty || 1}</p>
                                                                <p className="text-xs md:text-sm font-bold text-stone-900">R$ {Number(item.price).toFixed(2)}</p>
                                                            </div>
                                                            <p className="text-[10px] md:text-xs text-stone-400 mt-1">Total: R$ {((item.qty || 1) * Number(item.price)).toFixed(2)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-stone-50 p-3 md:p-4 rounded-xl border border-stone-100">
                                            <h4 className="text-xs font-bold uppercase text-stone-400 mb-2">Endereço de Entrega</h4>
                                            <p className="text-xs md:text-sm text-stone-600">
                                                {order.address_data?.address}, {order.address_data?.number}<br />
                                                {order.address_data?.component && <>{order.address_data.complement}<br /></>}
                                                {order.address_data?.neighborhood} - {order.address_data?.city}/{order.address_data?.state}<br />
                                                CEP: {order.address_data?.cep}
                                            </p>
                                        </div>

                                        {order.payment_link && (
                                            <div className="bg-green-50 p-3 md:p-4 rounded-xl border border-green-100 cursor-pointer hover:bg-green-100 transition-colors" onClick={() => copyToClipboard(order.payment_link)}>
                                                <h4 className="text-xs font-bold uppercase text-green-700 mb-1 flex items-center gap-2">
                                                    Link de Pagamento <ExternalLink size={12} />
                                                </h4>
                                                <p className="text-xs text-green-800 break-all line-clamp-1">{order.payment_link}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Column 2: Status & Contact */}
                                    <div className="space-y-4 md:space-y-6">
                                        <div className="bg-stone-50 p-4 md:p-5 rounded-xl border border-stone-100">
                                            <h4 className="text-xs font-bold uppercase text-stone-400 mb-3">Gerenciar Pedido</h4>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-bold text-stone-500 uppercase mb-1 block">Status do Pedido</label>
                                                    <select
                                                        value={editStatus}
                                                        onChange={(e) => setEditStatus(e.target.value)}
                                                        className="w-full p-2 border border-stone-200 rounded-lg bg-white focus:border-amber-500 outline-none transition-colors text-sm"
                                                    >
                                                        <option value="pending">Pendente</option>
                                                        <option value="paid">Pago</option>
                                                        <option value="processing">Separando</option>
                                                        <option value="shipped">Enviado</option>
                                                        <option value="delivered">Entregue</option>
                                                        <option value="cancelled">Cancelado</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="text-xs font-bold text-stone-500 uppercase mb-1 block">Código de Rastreio</label>
                                                    <input
                                                        type="text"
                                                        value={editTracking}
                                                        onChange={(e) => setEditTracking(e.target.value)}
                                                        placeholder="Ex: AA123456789BR"
                                                        className="w-full p-2 border border-stone-200 rounded-lg bg-white focus:border-amber-500 outline-none transition-colors text-sm"
                                                    />
                                                </div>

                                                <button
                                                    onClick={() => handleUpdateOrder(order.id)}
                                                    className="w-full py-2 bg-stone-900 text-white font-bold rounded-lg hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
                                                >
                                                    <Save size={16} /> Salvar Alterações
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-xs font-bold uppercase text-stone-400 mb-3">Notificar Cliente</h4>
                                            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <MessageCircle size={16} className="text-green-600" />
                                                    <span className="text-sm font-bold text-green-800">WhatsApp Automático</span>
                                                </div>
                                                <p className="text-xs text-green-700 mb-3">
                                                    Mensagem pronta para status: <strong>{getStatusLabel(editStatus || order.status)}</strong>
                                                </p>
                                                <button
                                                    onClick={() => handleWhatsAppNotify(order)}
                                                    className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors shadow-sm"
                                                >
                                                    Enviar Mensagem no Zap
                                                </button>
                                            </div>
                                            <p className="text-xs text-stone-400 mt-2 text-center">Tel: {order.customer_phone}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Image Zoom Modal */}
            {zoomedImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/90 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setZoomedImage(null)}
                >
                    <img
                        src={zoomedImage}
                        alt="Zoom"
                        className="max-w-full max-h-[90vh] rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
                    />
                    <button className="absolute top-4 right-4 text-white hover:text-stone-300">
                        <X size={32} />
                    </button>
                </div>
            )}

        </div>
    );
}
