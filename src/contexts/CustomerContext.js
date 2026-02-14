import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

const CustomerContext = createContext(null);

const STORAGE_KEY = 'zenaide_customer';
const VERIFIED_KEY = 'zenaide_verified';

export function CustomerProvider({ children }) {
    const [customer, setCustomer] = useState(null); // { id, name, phone, hasPasscode }
    const [favorites, setFavorites] = useState([]); // [product_id, ...]
    const [isLoading, setIsLoading] = useState(true);
    const [isVerified, setIsVerified] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        const verified = localStorage.getItem(VERIFIED_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setCustomer(parsed);
                if (verified === 'true') setIsVerified(true);
                if (parsed.id) {
                    loadFavorites(parsed.id);
                }
            } catch (e) {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
        setIsLoading(false);
    }, []);

    // Persist verified state
    useEffect(() => {
        localStorage.setItem(VERIFIED_KEY, isVerified ? 'true' : 'false');
    }, [isVerified]);

    const loadFavorites = async (customerId) => {
        const { data } = await supabase
            .from('favorites')
            .select('product_id')
            .eq('customer_id', customerId);

        if (data) {
            setFavorites(data.map(f => f.product_id));
        }
    };

    // Register or find existing customer (Landing Page — no passcode yet)
    const registerCustomer = async (name, phone) => {
        const cleanPhone = phone.replace(/\D/g, '');

        let { data: existing } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', cleanPhone)
            .single();

        if (existing) {
            if (existing.name !== name) {
                await supabase.from('customers').update({ name }).eq('id', existing.id);
                existing.name = name;
            }
            const customerData = { id: existing.id, name: existing.name, phone: cleanPhone, hasPasscode: !!existing.passcode };
            setCustomer(customerData);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(customerData));
            await loadFavorites(existing.id);

            await supabase
                .from('orders')
                .update({ customer_id: existing.id })
                .eq('customer_phone', cleanPhone)
                .is('customer_id', null);

            return customerData;
        }

        const { data: newCustomer, error } = await supabase
            .from('customers')
            .insert({ name, phone: cleanPhone })
            .select()
            .single();

        if (error) throw error;

        const customerData = { id: newCustomer.id, name: newCustomer.name, phone: cleanPhone, hasPasscode: false };
        setCustomer(customerData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customerData));

        await supabase
            .from('orders')
            .update({ customer_id: newCustomer.id })
            .eq('customer_phone', cleanPhone)
            .is('customer_id', null);

        return customerData;
    };

    // Verify 4-digit passcode
    const verifyPasscode = async (code) => {
        if (!customer?.id) return { success: false, error: 'Nenhum cliente encontrado.' };

        const { data, error } = await supabase
            .from('customers')
            .select('passcode')
            .eq('id', customer.id)
            .single();

        if (error || !data) return { success: false, error: 'Erro na verificação.' };

        if (data.passcode === code) {
            setIsVerified(true);
            return { success: true };
        }
        return { success: false, error: 'Código inválido.' };
    };

    // Create 4-digit passcode
    const createPasscode = async (code) => {
        if (!customer?.id) return { success: false, error: 'Nenhum cliente encontrado.' };

        const { error } = await supabase
            .from('customers')
            .update({ passcode: code })
            .eq('id', customer.id);

        if (error) return { success: false, error: 'Erro ao salvar o código.' };

        setIsVerified(true);
        setCustomer(prev => {
            const updated = { ...prev, hasPasscode: true };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
        return { success: true };
    };

    // Update customer name
    const updateName = async (newName) => {
        if (!customer?.id) return;
        await supabase.from('customers').update({ name: newName }).eq('id', customer.id);
        setCustomer(prev => {
            const updated = { ...prev, name: newName };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    // Check if phone exists and has passcode (for AuthGate)
    const checkPhonePasscode = async () => {
        if (!customer?.phone) return { exists: false, hasPasscode: false };

        const { data } = await supabase
            .from('customers')
            .select('passcode')
            .eq('phone', customer.phone)
            .single();

        if (!data) return { exists: false, hasPasscode: false };
        const hasPasscode = !!data.passcode;

        // Update local state
        setCustomer(prev => {
            const updated = { ...prev, hasPasscode };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });

        return { exists: true, hasPasscode };
    };

    const toggleFavorite = useCallback(async (productId) => {
        if (!customer?.id) return;

        const isFav = favorites.includes(productId);

        if (isFav) {
            setFavorites(prev => prev.filter(id => id !== productId));
            await supabase
                .from('favorites')
                .delete()
                .eq('customer_id', customer.id)
                .eq('product_id', productId);
        } else {
            setFavorites(prev => [...prev, productId]);
            await supabase
                .from('favorites')
                .insert({ customer_id: customer.id, product_id: productId });
        }
    }, [customer, favorites]);

    const isFavorite = useCallback((productId) => {
        return favorites.includes(productId);
    }, [favorites]);

    const logout = () => {
        setCustomer(null);
        setFavorites([]);
        setIsVerified(false);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(VERIFIED_KEY);
    };

    const isNewCustomer = !customer && !isLoading;

    return (
        <CustomerContext.Provider value={{
            customer,
            favorites,
            isLoading,
            isNewCustomer,
            isVerified,
            registerCustomer,
            verifyPasscode,
            createPasscode,
            updateName,
            checkPhonePasscode,
            toggleFavorite,
            isFavorite,
            logout,
        }}>
            {children}
        </CustomerContext.Provider>
    );
}

export function useCustomer() {
    const context = useContext(CustomerContext);
    if (!context) throw new Error('useCustomer must be used inside CustomerProvider');
    return context;
}
