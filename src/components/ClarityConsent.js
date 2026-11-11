import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const PROJECT_ID = 'zc5kps16ab';
const PREFERENCE_KEY = 'zenaide_clarity_consent';

function readPreference() {
    try {
        return localStorage.getItem(PREFERENCE_KEY);
    } catch {
        return null;
    }
}

function sendConsent(accepted) {
    window.clarity('consentv2', {
        ad_Storage: 'denied',
        analytics_Storage: accepted ? 'granted' : 'denied',
    });
}

function startClarity() {
    if (window.clarity) return;

    const queue = [];
    window.clarity = (...args) => queue.push(args);
    window.clarity.q = queue;
    sendConsent(true);

    const script = document.createElement('script');
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.src = `https://www.clarity.ms/tag/${PROJECT_ID}`;
    document.head.appendChild(script);
}

export default function ClarityConsent({ children }) {
    const { pathname, search, hash } = useLocation();
    const [preference, setPreference] = useState(readPreference);
    const [editing, setEditing] = useState(false);
    const storefront = process.env.NODE_ENV === 'production' &&
        window.location.origin === 'https://johnmelogay.github.io' &&
        /^\/ZenaideSImoes\/(?:index\.html)?$/.test(window.location.pathname) &&
        !window.location.search && !search && !hash &&
        (pathname === '/' || /^\/produto\/\d+$/.test(pathname));
    const reloadWithoutClarity = !storefront && Boolean(window.clarity);

    useEffect(() => {
        if (reloadWithoutClarity) {
            window.location.reload();
        } else if (storefront && preference === 'accepted') {
            startClarity();
        }
    }, [storefront, preference, reloadWithoutClarity]);

    function choose(accepted) {
        const next = accepted ? 'accepted' : 'declined';
        try {
            localStorage.setItem(PREFERENCE_KEY, next);
        } catch {
            // Keep the choice for this document when browser storage is unavailable.
        }
        setPreference(next);
        setEditing(false);

        if (!accepted && window.clarity) {
            sendConsent(false);
            window.location.reload();
        }
    }

    if (reloadWithoutClarity) return null;

    return (
        <>
            {children}
            {storefront && (!preference || editing) && (
                <section aria-label="Análise de navegação" className="fixed bottom-[6rem] right-3 left-3 z-[60] max-w-sm rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-800 shadow-lg md:bottom-4 md:left-auto md:right-4">
                    <p>Com sua permissão, usamos o Microsoft Clarity para analisar cliques, rolagem e gravações de navegação e melhorar a loja.</p>
                    <a href="https://privacy.microsoft.com/pt-br/privacystatement" target="_blank" rel="noreferrer" className="mt-2 inline-block underline">Privacidade da Microsoft</a>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => choose(false)} className="rounded-lg border border-stone-300 px-3 py-2 font-medium">Recusar</button>
                        <button type="button" onClick={() => choose(true)} className="rounded-lg border border-stone-300 px-3 py-2 font-medium">Aceitar análise</button>
                    </div>
                </section>
            )}
            {storefront && preference && !editing && (
                <button type="button" onClick={() => setEditing(true)} className="fixed bottom-[6rem] right-3 z-30 rounded-md bg-white px-2 py-1 text-xs text-stone-600 shadow-sm md:bottom-4 md:right-4">Privacidade</button>
            )}
        </>
    );
}
