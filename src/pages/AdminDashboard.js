import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Plus, Trash2, Edit2, LogOut, Image as ImageIcon, Save, X, Download, Upload, Search, Package, AlertTriangle, TrendingUp, ShoppingBag, Grid, ChevronUp, ChevronDown, Layers, Tag, Zap, Settings, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import AdminOrders from '../components/AdminOrders';
import AdminCoupons from '../components/AdminCoupons';

// Helper to convert VAPID key from base64 string to Uint8Array
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('products');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [selectedProducts, setSelectedProducts] = useState(new Set());
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Bulk Actions Handlers
    const handleSelectAll = () => {
        if (selectedProducts.size === filteredProducts.length) {
            setSelectedProducts(new Set());
        } else {
            setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
        }
    };

    const handleToggleSelect = (id) => {
        const newSelected = new Set(selectedProducts);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedProducts(newSelected);
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Tem certeza que deseja excluir ${selectedProducts.size} produtos?`)) return;

        setBulkActionLoading(true);
        const { error } = await supabase
            .from('products')
            .delete()
            .in('id', Array.from(selectedProducts));

        if (error) {
            alert('Erro ao excluir produtos.');
        } else {
            setSelectedProducts(new Set());
            fetchProducts();
        }
        setBulkActionLoading(false);
    };
    const [sortBy, setSortBy] = useState('recent');
    const [stockFilter, setStockFilter] = useState('all');
    const navigate = useNavigate();

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        category: '',
        description: '',
        image_url: '',
        images: [],
        stock_quantity: 0,
        is_new: false,
        sku: ''
    });

    const [uploading, setUploading] = useState(false);

    // Stats
    const totalProducts = products.length;
    const totalValue = products.reduce((acc, p) => {
        const price = typeof p.price === 'string'
            ? parseFloat(p.price.replace(/[^\d,.-]/g, '').replace(',', '.'))
            : Number(p.price) || 0;
        const stock = Number(p.stock_quantity) || 0;
        return acc + (price * stock);
    }, 0);
    const lowStockCount = products.filter(p => (Number(p.stock_quantity) || 0) < 3).length;

    // Categories state
    const [categories, setCategories] = useState([]);
    const [catLoading, setCatLoading] = useState(false);
    const [editingCat, setEditingCat] = useState(null);
    const [catForm, setCatForm] = useState({ name: '', image_url: '', display_order: 0 });
    const [uploadingCat, setUploadingCat] = useState(false);

    // Push notification state
    const [pushStatus, setPushStatus] = useState(() => {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') return 'subscribed';
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied') return 'denied';
        return 'idle';
    });
    const [swRegistration, setSwRegistration] = useState(null);

    // Order notifications
    const [newOrderCount, setNewOrderCount] = useState(0);
    const [lastSeenOrderIds, setLastSeenOrderIds] = useState(() => {
        try { return JSON.parse(localStorage.getItem('zs_seen_orders') || '[]'); } catch { return []; }
    });

    // Audio alert helper
    const playNotificationSound = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            // Play two ascending tones
            [0, 0.15].forEach((delay, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = i === 0 ? 587 : 784; // D5 then G5
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.3);
                osc.start(ctx.currentTime + delay);
                osc.stop(ctx.currentTime + delay + 0.3);
            });
        } catch (e) { console.warn('Audio alert failed:', e); }
    }, []);

    // Browser notification helper
    const sendBrowserNotification = useCallback((count) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Zenaide Simões 💎', {
                body: `${count} novo${count > 1 ? 's' : ''} pedido${count > 1 ? 's' : ''} pago${count > 1 ? 's' : ''}!`,
                icon: '/logo192.png',
                tag: 'new-order',
                renotify: true
            });
        }
    }, []);

    // Register Service Worker silently on mount (no permission request)
    useEffect(() => {
        const registerSW = async () => {
            try {
                if (!('serviceWorker' in navigator)) return;
                const reg = await navigator.serviceWorker.register('./sw.js');
                setSwRegistration(reg);
                console.log('SW registered:', reg.scope);

                // Check if already subscribed
                const existing = await reg.pushManager.getSubscription();
                if (existing && Notification.permission === 'granted') {
                    setPushStatus('subscribed');
                }
            } catch (err) {
                console.error('SW registration error:', err);
            }
        };
        registerSW();

        // Listen for SW messages (navigate to orders on notification click)
        const handleSWMessage = (event) => {
            if (event.data?.type === 'NAVIGATE_ORDERS') {
                setActiveTab('orders');
            }
        };
        navigator.serviceWorker?.addEventListener('message', handleSWMessage);
        return () => navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Enable push — triggered by user gesture (button tap)
    const handleEnablePush = async () => {
        const VAPID_PUBLIC = 'BHnaISi2YoHc8LdFKlfDYmDV1_gIFPTHUghliRkgjS7SFK6VyXHepPXGFW6MGFEcOj2Vr_4g7TUDztyh1JWPmp8';
        try {
            if (!('PushManager' in window)) {
                alert('Push não suportado neste navegador. Adicione o site à Tela Inicio primeiro!');
                return;
            }

            const permission = await Notification.requestPermission();
            if (permission === 'denied') {
                setPushStatus('denied');
                alert('Permissão negada. Vá em Ajustes → Notificações para ativar.');
                return;
            }
            if (permission !== 'granted') return;

            // Get or wait for SW registration
            let reg = swRegistration;
            if (!reg) {
                reg = await navigator.serviceWorker.ready;
            }

            // Subscribe to push
            let subscription = await reg.pushManager.getSubscription();
            if (!subscription) {
                const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC);
                subscription = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey
                });
            }

            // Save to Supabase
            const subJSON = subscription.toJSON();
            const { error } = await supabase
                .from('push_subscriptions')
                .upsert({
                    endpoint: subJSON.endpoint,
                    p256dh: subJSON.keys.p256dh,
                    auth: subJSON.keys.auth,
                    user_agent: navigator.userAgent
                }, { onConflict: 'endpoint' });

            if (error) {
                console.error('Error saving push sub:', error);
                alert('Erro ao salvar. Tente novamente.');
            } else {
                setPushStatus('subscribed');
                console.log('Push subscription saved!');
            }
        } catch (err) {
            console.error('Push setup error:', err);
            alert('Erro ao ativar notificações: ' + err.message);
        }
    };

    // Poll for new paid orders every 30 seconds
    useEffect(() => {
        const checkNewOrders = async () => {
            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select('id')
                    .eq('status', 'paid');
                if (error || !data) return;

                const newIds = data.map(o => o.id).filter(id => !lastSeenOrderIds.includes(id));
                const prevCount = newOrderCount;

                if (newIds.length > 0) {
                    setNewOrderCount(newIds.length);
                    document.title = `(${newIds.length}) Painel Zenaide`;

                    // Only alert if count increased (new order just arrived)
                    if (newIds.length > prevCount) {
                        playNotificationSound();
                        sendBrowserNotification(newIds.length);
                    }
                } else {
                    setNewOrderCount(0);
                    document.title = 'Painel Zenaide';
                }
            } catch (e) { console.warn('Order poll error:', e); }
        };

        checkNewOrders();
        const interval = setInterval(checkNewOrders, 30000);
        return () => clearInterval(interval);
    }, [lastSeenOrderIds, playNotificationSound, sendBrowserNotification]); // eslint-disable-line react-hooks/exhaustive-deps

    // Mark paid orders as seen when switching to orders tab
    const markOrdersSeen = useCallback(async () => {
        try {
            const { data } = await supabase.from('orders').select('id').eq('status', 'paid');
            if (data) {
                const ids = data.map(o => o.id);
                setLastSeenOrderIds(prev => {
                    const merged = [...new Set([...prev, ...ids])];
                    localStorage.setItem('zs_seen_orders', JSON.stringify(merged));
                    return merged;
                });
                setNewOrderCount(0);
                document.title = 'Painel Zenaide';
            }
        } catch (e) { console.warn('Mark seen error:', e); }
    }, []);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setCatLoading(true);
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('display_order', { ascending: true });
        if (!error && data) setCategories(data);
        setCatLoading(false);
    };

    const categoryNames = categories.map(c => c.name);

    const handleCatImageUpload = async (e) => {
        try {
            setUploadingCat(true);
            const file = e.target.files[0];
            if (!file) return;
            const compressedFile = await compressImage(file);
            const fileName = `cat-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
            const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, compressedFile);
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
            setCatForm(prev => ({ ...prev, image_url: data.publicUrl }));
        } catch (error) {
            alert('Erro ao enviar imagem: ' + error.message);
        } finally {
            setUploadingCat(false);
        }
    };

    const handleSaveCat = async () => {
        if (!catForm.name.trim()) return alert('Nome da categoria é obrigatório');
        try {
            if (editingCat) {
                const { error } = await supabase.from('categories').update({
                    name: catForm.name.trim(),
                    image_url: catForm.image_url,
                    display_order: catForm.display_order
                }).eq('id', editingCat.id);
                if (error) throw error;
            } else {
                const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.display_order)) : 0;
                const { error } = await supabase.from('categories').insert({
                    name: catForm.name.trim(),
                    image_url: catForm.image_url,
                    display_order: maxOrder + 1
                });
                if (error) throw error;
            }
            setEditingCat(null);
            setCatForm({ name: '', image_url: '', display_order: 0 });
            fetchCategories();
        } catch (error) {
            alert('Erro ao salvar categoria: ' + error.message);
        }
    };

    const handleDeleteCat = async (id) => {
        if (!window.confirm('Remover esta categoria?')) return;
        await supabase.from('categories').delete().eq('id', id);
        fetchCategories();
    };

    const handleReorderCat = async (id, direction) => {
        const idx = categories.findIndex(c => c.id === id);
        if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === categories.length - 1)) return;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        const a = categories[idx];
        const b = categories[swapIdx];
        await supabase.from('categories').update({ display_order: b.display_order }).eq('id', a.id);
        await supabase.from('categories').update({ display_order: a.display_order }).eq('id', b.id);
        fetchCategories();
    };

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProducts(data);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };


    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200; // Limit max width for performance/size
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height = (height * MAX_WIDTH) / width;
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error('Falha na compressão da imagem'));
                            return;
                        }
                        // Create new file with .webp extension
                        const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                        const newFile = new File([blob], newName, {
                            type: 'image/webp',
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    }, 'image/webp', 0.85); // 85% Quality - Great balance
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleImageUpload = async (e) => {
        try {
            setUploading(true);
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            const newImageUrls = [];

            for (const file of files) {
                // Compress/Convert to WebP
                const compressedFile = await compressImage(file);

                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(filePath, compressedFile);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(filePath);

                newImageUrls.push(data.publicUrl);
            }

            setFormData(prev => {
                const updatedImages = [...(prev.images || []), ...newImageUrls];
                return {
                    ...prev,
                    images: updatedImages,
                    image_url: updatedImages[0] // Set primary image
                };
            });
        } catch (error) {
            console.error(error);
            alert('Erro ao processar imagem: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                price: typeof formData.price === 'string'
                    ? parseFloat(formData.price.replace(',', '.'))
                    : formData.price,
                stock_quantity: parseInt(formData.stock_quantity) || 0
            };

            if (editing?.id) {
                // Update
                const { error } = await supabase
                    .from('products')
                    .update(payload)
                    .eq('id', editing.id);
                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase
                    .from('products')
                    .insert([payload]);
                if (error) throw error;
            }

            await fetchProducts();
            setEditing(null);
            resetForm();
        } catch (error) {
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja apagar?')) return;
        try {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            fetchProducts();
        } catch (error) {
            alert('Erro ao apagar: ' + error.message);
        }
    };

    const handleEdit = (product) => {
        setEditing(product);
        setFormData(product);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            price: '',
            category: '',
            description: '',
            image_url: '',
            images: [],
            stock_quantity: 0,
            is_new: false,
            sku: ''
        });
    };

    // Auto-generate SKU for artisan products
    const generateSku = () => {
        const artProducts = products.filter(p => p.sku && p.sku.startsWith('ART'));
        const maxNum = artProducts.reduce((max, p) => {
            const num = parseInt(p.sku.replace('ART', ''));
            return isNaN(num) ? max : Math.max(max, num);
        }, 0);
        const nextNum = String(maxNum + 1).padStart(4, '0');
        setFormData(prev => ({ ...prev, sku: `ART${nextNum}` }));
    };

    // CSV EXPORT
    const handleExportCSV = () => {
        const csv = Papa.unparse(products.map(p => ({
            ID: p.id,
            SKU: p.sku || '',
            Nome: p.name,
            Preco: p.price,
            Estoque: p.stock_quantity || 0,
            Categoria: p.category || '',
            Descricao: p.description || '',
            ImagemPrincipal: p.image_url || '',
            ImagensExtras: (p.images || []).join(','),
            Novo: p.is_new ? 'Sim' : 'Não'
        })));

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `catalogo_zenaide_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    // CSV IMPORT
    const handleImportCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            complete: async (results) => {
                const importedProducts = results.data.filter(r => r.Nome); // Simple validation
                if (importedProducts.length === 0) {
                    alert("Nenhum produto válido encontrado no CSV.");
                    return;
                }

                if (!window.confirm(`Deseja importar ${importedProducts.length} produtos? Isso pode criar duplicatas se não for cuidadoso.`)) return;

                setLoading(true);
                try {
                    const formattedData = importedProducts.map(p => ({
                        name: p.Nome,
                        sku: p.SKU || null,
                        price: typeof p.Preco === 'string'
                            ? parseFloat(p.Preco.replace(/[^\d,.-]/g, '').replace(',', '.'))
                            : parseFloat(p.Preco) || 0,
                        stock_quantity: parseInt(p.Estoque) || 0,
                        category: p.Categoria,
                        description: p.Descricao,
                        image_url: p.ImagemPrincipal,
                        images: p.ImagensExtras ? p.ImagensExtras.split(',') : [],
                        is_new: p.Novo === 'Sim'
                    }));

                    const { error } = await supabase.from('products').insert(formattedData);
                    if (error) throw error;

                    alert("Importação concluída com sucesso!");
                    fetchProducts();
                } catch (error) {
                    alert("Erro na importação: " + error.message);
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const filteredProducts = products.filter(p => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = p.name.toLowerCase().includes(term) || (p.sku && p.sku.toLowerCase().includes(term));
        const matchesCategory = filterCategory ? (p.category || '').split(',').map(c => c.trim()).includes(filterCategory) : true;
        const matchesStock = stockFilter === 'low' ? (Number(p.stock_quantity) || 0) < 3
            : stockFilter === 'instock' ? (Number(p.stock_quantity) || 0) >= 3
                : true;
        return matchesSearch && matchesCategory && matchesStock;
    }).sort((a, b) => {
        switch (sortBy) {
            case 'name': return a.name.localeCompare(b.name);
            case 'name_desc': return b.name.localeCompare(a.name);
            case 'price_asc': return (Number(a.price) || 0) - (Number(b.price) || 0);
            case 'price_desc': return (Number(b.price) || 0) - (Number(a.price) || 0);
            case 'stock_asc': return (Number(a.stock_quantity) || 0) - (Number(b.stock_quantity) || 0);
            case 'stock_desc': return (Number(b.stock_quantity) || 0) - (Number(a.stock_quantity) || 0);
            default: return (b.id || 0) - (a.id || 0); // recent first
        }
    });

    return (
        <div className="min-h-screen bg-stone-50 pb-24 font-sans text-stone-900">
            {/* Minimal Header */}
            <div className="bg-white border-b border-stone-100 sticky top-0 z-30 safe-area-top">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="flex justify-between items-center h-12">
                        <h1 className="text-base font-serif font-bold text-stone-800 tracking-tight">Zenaide Simões</h1>
                        <div className="flex items-center gap-2">
                            {pushStatus === 'idle' && (
                                <button
                                    onClick={handleEnablePush}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200 hover:bg-amber-100 transition-colors animate-pulse"
                                >
                                    🔔 Ativar Notificações
                                </button>
                            )}
                            {pushStatus === 'subscribed' && (
                                <span className="text-green-500 text-xs font-bold">🔔 Ativo</span>
                            )}
                            <button onClick={handleLogout} className="p-2 text-stone-400 hover:text-red-500 transition-colors" title="Sair">
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Navbar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-40 safe-area-bottom">
                <div className="max-w-lg mx-auto flex justify-around items-center py-1.5 px-2">
                    {[
                        { id: 'products', icon: Grid, label: 'Produtos' },
                        { id: 'orders', icon: ShoppingBag, label: 'Pedidos', badge: newOrderCount },
                        { id: 'categories', icon: Layers, label: 'Categorias' },
                        { id: 'coupons', icon: Tag, label: 'Cupons' },
                        { id: 'settings', icon: Settings, label: 'Config' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); if (tab.id === 'orders') markOrdersSeen(); }}
                            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-all relative ${activeTab === tab.id ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'
                                }`}
                        >
                            <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 1.5} />
                            <span className={`text-[10px] ${activeTab === tab.id ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
                            {tab.badge > 0 && (
                                <span className="absolute -top-0.5 right-0.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-1 animate-pulse">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-3 md:p-6 space-y-4">

                {activeTab === 'orders' ? (
                    <AdminOrders />
                ) : activeTab === 'coupons' ? (
                    <AdminCoupons />
                ) : activeTab === 'settings' ? (
                    /* === SETTINGS TAB === */
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-stone-800">Configurações</h2>
                        <div className="bg-white rounded-xl border border-stone-100 p-4 space-y-4">
                            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Dados de Produtos</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className="flex items-center gap-3 p-3 border border-stone-200 rounded-xl cursor-pointer hover:bg-stone-50 transition-colors">
                                    {uploading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-stone-600"></div> : <Upload size={20} className="text-stone-500" />}
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-stone-700">Importar CSV</p>
                                        <p className="text-[11px] text-stone-400">Importar produtos de um arquivo .csv</p>
                                    </div>
                                    <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" disabled={uploading} />
                                </label>
                                <button
                                    onClick={handleExportCSV}
                                    className="flex items-center gap-3 p-3 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors text-left"
                                >
                                    <Download size={20} className="text-stone-500" />
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-stone-700">Exportar CSV</p>
                                        <p className="text-[11px] text-stone-400">Baixar todos os produtos em .csv</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'categories' ? (
                    /* === CATEGORIES MANAGEMENT === */
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-stone-800">Administrar Categorias</h2>
                                <p className="text-sm text-stone-500">Gerencie as categorias que aparecem na loja, com imagem e ordem de exibição</p>
                            </div>
                        </div>

                        {/* Live Preview */}
                        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
                            <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-4">Prévia no Site</h3>
                            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                                {categories.filter(c => c.image_url).map(cat => (
                                    <div key={cat.id} className="flex flex-col items-center space-y-2 min-w-[80px]">
                                        <div className="p-[3px] rounded-full bg-gradient-to-tr from-amber-400 to-amber-600">
                                            <div className="p-[3px] bg-white rounded-full">
                                                <img src={cat.image_url} alt={cat.name} className="w-16 h-16 rounded-full object-cover" />
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-stone-700 text-center truncate w-full">{cat.name}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[11px] text-stone-400 mt-2">Apenas categorias com imagem aparecem como Stories no site. As demais ficam só no dropdown de produtos.</p>
                        </div>

                        {/* Add / Edit Form */}
                        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-4">
                            <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest">
                                {editingCat ? 'Editar Categoria' : 'Nova Categoria'}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wide block mb-1">Nome</label>
                                    <input
                                        type="text"
                                        value={catForm.name}
                                        onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                                        placeholder="Ex: Rommanel"
                                        className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wide block mb-1">Imagem</label>
                                    <div className="flex items-center gap-3">
                                        {catForm.image_url ? (
                                            <div className="relative">
                                                <img src={catForm.image_url} alt="Preview" className="w-12 h-12 rounded-full object-cover border-2 border-amber-400" />
                                                <button onClick={() => setCatForm({ ...catForm, image_url: '' })} className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center">
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-300">
                                                <ImageIcon size={20} />
                                            </div>
                                        )}
                                        <label className="flex-1">
                                            <input type="file" accept="image/*" onChange={handleCatImageUpload} className="hidden" />
                                            <div className="px-4 py-2 bg-stone-100 rounded-xl text-sm font-medium text-stone-600 cursor-pointer hover:bg-stone-200 transition-colors text-center">
                                                {uploadingCat ? 'Enviando...' : 'Escolher Imagem'}
                                            </div>
                                        </label>
                                    </div>
                                </div>
                                <div className="flex items-end gap-2">
                                    <button
                                        onClick={handleSaveCat}
                                        className="flex-1 px-6 py-3 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save size={16} /> {editingCat ? 'Salvar' : 'Adicionar'}
                                    </button>
                                    {editingCat && (
                                        <button
                                            onClick={() => { setEditingCat(null); setCatForm({ name: '', image_url: '', display_order: 0 }); }}
                                            className="px-4 py-3 text-stone-500 font-bold rounded-xl hover:bg-stone-100 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Categories List */}
                        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-stone-100">
                                <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest">{categories.length} Categorias</h3>
                            </div>
                            {catLoading ? (
                                <div className="p-8 text-center text-stone-400">Carregando...</div>
                            ) : (
                                <div className="divide-y divide-stone-100">
                                    {categories.map((cat, idx) => (
                                        <div key={cat.id} className="flex items-center gap-4 px-4 py-3 hover:bg-stone-50 transition-colors">
                                            {/* Order controls */}
                                            <div className="flex flex-col gap-0.5">
                                                <button
                                                    onClick={() => handleReorderCat(cat.id, 'up')}
                                                    disabled={idx === 0}
                                                    className={`p-1 rounded ${idx === 0 ? 'text-stone-200' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'}`}
                                                >
                                                    <ChevronUp size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleReorderCat(cat.id, 'down')}
                                                    disabled={idx === categories.length - 1}
                                                    className={`p-1 rounded ${idx === categories.length - 1 ? 'text-stone-200' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'}`}
                                                >
                                                    <ChevronDown size={14} />
                                                </button>
                                            </div>

                                            {/* Order number */}
                                            <span className="text-xs font-bold text-stone-300 w-6 text-center">#{idx + 1}</span>

                                            {/* Image */}
                                            {cat.image_url ? (
                                                <img src={cat.image_url} alt={cat.name} className="w-10 h-10 rounded-full object-cover border border-stone-200" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-300 text-xs font-bold">
                                                    {cat.name.charAt(0)}
                                                </div>
                                            )}

                                            {/* Name */}
                                            <div className="flex-1">
                                                <p className="font-bold text-stone-800 text-sm">{cat.name}</p>
                                                <p className="text-[11px] text-stone-400">{cat.image_url ? 'Com imagem (aparece no Stories)' : 'Sem imagem (só no dropdown)'}</p>
                                            </div>

                                            {/* Actions */}
                                            <button
                                                onClick={() => { setEditingCat(cat); setCatForm({ name: cat.name, image_url: cat.image_url || '', display_order: cat.display_order }); }}
                                                className="p-2 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCat(cat.id)}
                                                className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Compact Stats Strip */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-stone-100 text-xs">
                                <Package size={13} className="text-blue-500" />
                                <span className="text-stone-500">Produtos</span>
                                <span className="font-bold text-stone-800">{totalProducts}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-stone-100 text-xs">
                                <TrendingUp size={13} className="text-green-500" />
                                <span className="text-stone-500">Estoque</span>
                                <span className="font-bold text-stone-800">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </span>
                            {lowStockCount > 0 && (
                                <span className="inline-flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 text-xs">
                                    <AlertTriangle size={13} className="text-red-500" />
                                    <span className="text-red-600 font-bold">{lowStockCount} baixo</span>
                                </span>
                            )}
                        </div>

                        {/* Search + Filters Row */}
                        <div className="space-y-2">
                            {/* Search + Filters Row or Context Bar */}
                            {isSelectionMode ? (
                                <div className="flex items-center justify-between gap-4 bg-stone-900 text-white p-2 rounded-lg animate-in fade-in slide-in-from-top-2 shadow-lg">
                                    <div className="flex items-center gap-3 pl-2">
                                        <button
                                            onClick={() => { setIsSelectionMode(false); setSelectedProducts(new Set()); }}
                                            className="text-stone-400 hover:text-white transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                        <span className="font-bold text-sm">{selectedProducts.size} selecionados</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleSelectAll}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${selectedProducts.size === filteredProducts.length ? 'bg-white text-stone-900 border-white' : 'border-stone-700 text-stone-300 hover:bg-stone-800'}`}
                                        >
                                            {selectedProducts.size === filteredProducts.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                        </button>
                                        {selectedProducts.size > 0 && (
                                            <button
                                                onClick={handleBulkDelete}
                                                disabled={bulkActionLoading}
                                                className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
                                            >
                                                {bulkActionLoading ? <span className="animate-spin">⏳</span> : <Trash2 size={18} />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Buscar por nome ou SKU..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        {filteredProducts.length > 0 && (
                                            <button
                                                onClick={() => setIsSelectionMode(true)}
                                                className="bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5 transition-all whitespace-nowrap"
                                            >
                                                <Check size={16} className="opacity-60" />
                                                Selecionar
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                resetForm();
                                                setEditing({});
                                            }}
                                            className="bg-stone-900 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5 hover:bg-stone-800 transition-colors whitespace-nowrap"
                                        >
                                            <Plus size={16} /> Novo
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Pro Filters */}
                            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                <select
                                    value={sortBy}
                                    onChange={e => setSortBy(e.target.value)}
                                    className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-600 outline-none min-w-0 appearance-none cursor-pointer"
                                >
                                    <option value="recent">Mais recentes</option>
                                    <option value="name">Nome A→Z</option>
                                    <option value="name_desc">Nome Z→A</option>
                                    <option value="price_asc">Preço ↑</option>
                                    <option value="price_desc">Preço ↓</option>
                                    <option value="stock_asc">Estoque ↑</option>
                                    <option value="stock_desc">Estoque ↓</option>
                                </select>
                                <select
                                    value={filterCategory}
                                    onChange={e => setFilterCategory(e.target.value)}
                                    className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-600 outline-none min-w-0 appearance-none cursor-pointer"
                                >
                                    <option value="">Todas categorias</option>
                                    {categoryNames.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select
                                    value={stockFilter}
                                    onChange={e => setStockFilter(e.target.value)}
                                    className="bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-600 outline-none min-w-0 appearance-none cursor-pointer"
                                >
                                    <option value="all">Todo estoque</option>
                                    <option value="low">Estoque baixo</option>
                                    <option value="instock">Em estoque</option>
                                </select>
                                {(filterCategory || stockFilter !== 'all' || sortBy !== 'recent') && (
                                    <button
                                        onClick={() => { setFilterCategory(''); setStockFilter('all'); setSortBy('recent'); }}
                                        className="text-[11px] text-amber-600 font-bold whitespace-nowrap px-2"
                                    >
                                        Limpar filtros
                                    </button>
                                )}
                            </div>

                            <p className="text-[11px] text-stone-400">{filteredProducts.length} de {products.length} produtos</p>
                        </div>



                        {/* LIST */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    className={`bg-white p-3 md:p-4 rounded-xl border ${selectedProducts.has(product.id) ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-50/10' : 'border-stone-100'} flex gap-3 md:gap-4 items-start hover:shadow-md transition-all relative group cursor-pointer`}
                                    onClick={(e) => {
                                        if (e.target.closest('button')) return;
                                        if (isSelectionMode) {
                                            handleToggleSelect(product.id);
                                        } else {
                                            handleEdit(product);
                                        }
                                    }}
                                >
                                    {/* Selection Checkbox (Visible in mode or if selected) */}
                                    <div className={`absolute top-3 left-3 z-10 ${isSelectionMode || selectedProducts.has(product.id) ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
                                        <div className={`w-5 h-5 rounded border ${selectedProducts.has(product.id) ? 'bg-amber-500 border-amber-500' : 'bg-white/90 border-stone-300 backdrop-blur-sm'} flex items-center justify-center shadow-sm`}>
                                            {selectedProducts.has(product.id) && <Check size={12} className="text-white" />}
                                        </div>
                                    </div>

                                    <img src={product.image_url} alt={product.name} className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover bg-stone-100" />
                                    <div className="flex-1 min-w-0 pl-2"> {/* Added pl-2 to make space for checkbox if needed, though absolute positioning handles it */}
                                        <h3 className="font-bold text-stone-800 line-clamp-1 text-sm">{product.name}</h3>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {product.sku && (
                                                <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-mono font-bold">{product.sku}</span>
                                            )}
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {(product.category || '').split(',').filter(Boolean).map(cat => (
                                                    <span key={cat} className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-medium">{cat.trim()}</span>
                                                ))}
                                            </div>
                                            {(product.stock_quantity || 0) < 3 && (
                                                <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                                    <AlertTriangle size={8} /> Baixo Estoque
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex justify-between items-end mt-2">
                                            <p className="text-sm font-bold text-stone-900">R$ {product.price}</p>
                                            <p className="text-xs text-stone-500">Estoque: {Number(product.stock_quantity) || 0}</p>
                                        </div>
                                    </div>

                                    <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(product)} className="p-1.5 bg-white text-stone-600 rounded-lg shadow-sm border border-stone-200 hover:text-amber-600">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(product.id)} className="p-1.5 bg-white text-stone-600 rounded-lg shadow-sm border border-stone-200 hover:text-red-500">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredProducts.length === 0 && !loading && (
                            <div className="text-center py-10 text-stone-400">
                                <Package size={48} className="mx-auto mb-2 opacity-20" />
                                Nenhum produto encontrado.
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal de Edição/Criação */}
            {
                editing && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={(e) => {
                        if (e.target === e.currentTarget) setEditing(null);
                    }}>
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 my-8">
                            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50 rounded-t-2xl">
                                <h2 className="text-lg font-bold text-stone-800">
                                    {editing.id ? 'Editar Produto' : 'Novo Produto'}
                                </h2>
                                <button onClick={() => setEditing(null)} className="text-stone-400 hover:text-stone-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                {/* Upload Imagem */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-stone-700">Imagens do Produto</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {formData.images && formData.images.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-stone-200 group">
                                                <img src={img} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => {
                                                        const newImages = formData.images.filter((_, i) => i !== idx);
                                                        setFormData({ ...formData, images: newImages, image_url: newImages[0] || '' });
                                                    }}
                                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="aspect-square rounded-lg border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400 hover:bg-stone-50 hover:border-amber-500 hover:text-amber-500 cursor-pointer transition-colors">
                                            {uploading ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div> : <ImageIcon size={24} />}
                                            <span className="text-[10px] font-bold mt-1">Adicionar</span>
                                            <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Nome do Produto</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none font-bold"
                                            placeholder="Ex: Colar de Ouro"
                                        />
                                    </div>

                                    {/* SKU / Código do Produto */}
                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Código (SKU)</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={formData.sku || ''}
                                                onChange={e => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                                                className="flex-1 p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none font-mono tracking-wider"
                                                placeholder="Ex: ROM12345 ou clique Gerar"
                                            />
                                            <button
                                                type="button"
                                                onClick={generateSku}
                                                className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl font-bold text-xs hover:bg-amber-200 transition-colors flex items-center gap-1 whitespace-nowrap"
                                            >
                                                <Zap size={14} /> Gerar
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-stone-400 mt-1">Deixe em branco ou clique "Gerar" para produtos artesanais (formato ART0001)</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Preço (R$)</label>
                                            <input
                                                type="text"
                                                value={formData.price}
                                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                                className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none font-bold"
                                                placeholder="0,00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Categorias</label>
                                            {/* Selected categories as removable tags */}
                                            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                                                {(formData.category || '').split(',').filter(Boolean).map(cat => (
                                                    <span
                                                        key={cat.trim()}
                                                        className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-1 rounded-lg text-xs font-bold"
                                                    >
                                                        {cat.trim()}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const cats = (formData.category || '').split(',').filter(Boolean).map(c => c.trim());
                                                                const updated = cats.filter(c => c !== cat.trim()).join(',');
                                                                setFormData({ ...formData, category: updated });
                                                            }}
                                                            className="hover:text-red-600 transition-colors"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                            {/* Dropdown to add categories */}
                                            <select
                                                value=""
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (!val) return;
                                                    const cats = (formData.category || '').split(',').filter(Boolean).map(c => c.trim());
                                                    if (!cats.includes(val)) {
                                                        const updated = [...cats, val].join(',');
                                                        setFormData({ ...formData, category: updated });
                                                    }
                                                }}
                                                className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none bg-white text-stone-400"
                                            >
                                                <option value="">+ Adicionar categoria...</option>
                                                {categoryNames
                                                    .filter(c => !(formData.category || '').split(',').map(x => x.trim()).includes(c))
                                                    .map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Estoque</label>
                                            <input
                                                type="number"
                                                value={formData.stock_quantity}
                                                onChange={e => setFormData({ ...formData, stock_quantity: e.target.value })}
                                                className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 pt-6">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_new}
                                                onChange={e => setFormData({ ...formData, is_new: e.target.checked })}
                                                className="w-5 h-5 accent-amber-500"
                                            />
                                            <label className="text-sm font-bold text-stone-700">Novidade?</label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Descrição</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 outline-none h-24"
                                            placeholder="Detalhes do produto..."
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="submit"
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="flex-1 bg-stone-900 text-white py-3 rounded-xl font-bold hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {loading ? 'Salvando...' : (
                                            <>
                                                <Save size={18} /> Salvar Produto
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
