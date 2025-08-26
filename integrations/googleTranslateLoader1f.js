/**
 * Google Translate Loader
 * Separate loader for Google Translate to ensure proper initialization timing
 */

(function() {
    'use strict';
    
    console.log('[Google Translate Loader] Initializing...');
    
    // Create the Google Translate element container if it doesn't exist
    function ensureTranslateHost() {
        let container = document.getElementById('google_translate_element_loader');
        if (!container) {
            container = document.createElement('div');
            container.id = 'google_translate_element_loader';
            document.body.appendChild(container);
            console.log('[Google Translate Loader] Container created');
        }
        // Keep host visible (tiny, offscreen-hidden can block rendering)
        container.style.cssText = [
            'position: absolute',
            'opacity: 0.01',
            'height: 1px',
            'width: 1px',
            'overflow: hidden',
            'pointer-events: none',
            'z-index: -1',
            'top: 0',
            'left: 0'
        ].join(';') + ';';
        return container;
    }
    ensureTranslateHost();
    
    // Check if Google Translate is already initialized
    if (document.querySelector('.goog-te-combo')) {
        console.log('[Google Translate Loader] Google Translate already initialized');
        window.googleTranslateSelector = document.querySelector('.goog-te-combo');
        window.dispatchEvent(new Event('googleTranslateReady'));
        return;
    }
    
    // Define the initialization function
    function createOrInitWidget() {
        try {
            ensureTranslateHost();
            new google.translate.TranslateElement({
                pageLanguage: 'en',
                includedLanguages: 'en,cy,pl,es,fr,de,it,pt,ar,ur,zh-CN,hi,ga',
                layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
                autoDisplay: false,
                multilanguagePage: true,
                gaTrack: false
            }, 'google_translate_element_loader');
            console.log('[Google Translate Loader] Widget created (direct/init)');
        } catch (error) {
            console.error('[Google Translate Loader] Error creating widget:', error);
        }

        // Poll for selector and dispatch ready
        let attempts = 0;
        const maxAttempts = 30; // 15s
        const poll = setInterval(() => {
            const selector = document.querySelector('.goog-te-combo');
            if (selector) {
                clearInterval(poll);
                console.log('[Google Translate Loader] SUCCESS - Selector found with', selector.options.length, 'languages');
                window.googleTranslateSelector = selector;
                window.dispatchEvent(new Event('googleTranslateReady'));
            } else if (++attempts >= maxAttempts) {
                clearInterval(poll);
                console.error('[Google Translate Loader] ERROR - Selector not found after 15s');
            }
        }, 500);
    }

    window.googleTranslateElementInit = function() {
        console.log('[Google Translate Loader] Initialization callback triggered');
        createOrInitWidget();
    };
    
    // Load the Google Translate script
    if (!document.querySelector('script[src*="translate.google.com"]') && !window.google?.translate) {
        const script = document.createElement('script');
        script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        script.async = true;
        
        script.onload = () => {
            console.log('[Google Translate Loader] Script loaded');
            // In some cases callback might not fire, ensure widget creation
            if (window.google && window.google.translate && typeof window.googleTranslateElementInit === 'function') {
                window.googleTranslateElementInit();
            }
        };
        
        script.onerror = () => {
            console.error('[Google Translate Loader] Failed to load script');
            // Dispatch failure event so GeneralHeader knows
            window.dispatchEvent(new Event('googleTranslateLoadFailed'));
        };
        
        document.head.appendChild(script);
        console.log('[Google Translate Loader] Script tag added');
    } else {
        console.log('[Google Translate Loader] Script already loaded or Google Translate already available');
        // Wait for google object if not yet available, then create the widget; re-inject if needed
        let attempts = 0;
        const waitForGoogle = setInterval(() => {
            const hasGoogle = !!(window.google && window.google.translate);
            const hasSelector = !!document.querySelector('.goog-te-combo');
            if (hasSelector) {
                clearInterval(waitForGoogle);
                window.googleTranslateSelector = document.querySelector('.goog-te-combo');
                window.dispatchEvent(new Event('googleTranslateReady'));
                return;
            }
            if (hasGoogle) {
                clearInterval(waitForGoogle);
                console.log('[Google Translate Loader] google.translate available, creating widget now');
                createOrInitWidget();
                return;
            }
            attempts++;
            if (attempts >= 30) { // 15s
                clearInterval(waitForGoogle);
                console.warn('[Google Translate Loader] google object not ready after 15s - re-injecting script');
                const reinject = document.createElement('script');
                reinject.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit&_=' + Date.now();
                reinject.async = true;
                reinject.onload = () => {
                    console.log('[Google Translate Loader] Re-injected script loaded');
                    if (typeof window.googleTranslateElementInit === 'function') {
                        window.googleTranslateElementInit();
                    }
                };
                reinject.onerror = () => {
                    console.error('[Google Translate Loader] Failed to re-inject Google script');
                    window.dispatchEvent(new Event('googleTranslateLoadFailed'));
                };
                document.head.appendChild(reinject);
            }
        }, 500);
    }
})();
/**
 * Google Translate Loader
 * Separate loader for Google Translate to ensure proper initialization timing
 */

(function() {
    'use strict';
    
    console.log('[Google Translate Loader] Initializing...');
    
    // Create the Google Translate element container if it doesn't exist
    function ensureTranslateHost() {
        let container = document.getElementById('google_translate_element_loader');
        if (!container) {
            container = document.createElement('div');
            container.id = 'google_translate_element_loader';
            document.body.appendChild(container);
            console.log('[Google Translate Loader] Container created');
        }
        // Keep host visible (tiny, offscreen-hidden can block rendering)
        container.style.cssText = [
            'position: absolute',
            'opacity: 0.01',
            'height: 1px',
            'width: 1px',
            'overflow: hidden',
            'pointer-events: none',
            'z-index: -1',
            'top: 0',
            'left: 0'
        ].join(';') + ';';
        return container;
    }
    ensureTranslateHost();
    
    // Check if Google Translate is already initialized
    if (document.querySelector('.goog-te-combo')) {
        console.log('[Google Translate Loader] Google Translate already initialized');
        window.googleTranslateSelector = document.querySelector('.goog-te-combo');
        window.dispatchEvent(new Event('googleTranslateReady'));
        return;
    }
    
    // Define the initialization function
    function createOrInitWidget() {
        try {
            ensureTranslateHost();
            new google.translate.TranslateElement({
                pageLanguage: 'en',
                includedLanguages: 'en,cy,pl,es,fr,de,it,pt,ar,ur,zh-CN,hi,ga',
                layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
                autoDisplay: false,
                multilanguagePage: true,
                gaTrack: false
            }, 'google_translate_element_loader');
            console.log('[Google Translate Loader] Widget created (direct/init)');
        } catch (error) {
            console.error('[Google Translate Loader] Error creating widget:', error);
        }

        // Poll for selector and dispatch ready
        let attempts = 0;
        const maxAttempts = 30; // 15s
        const poll = setInterval(() => {
            const selector = document.querySelector('.goog-te-combo');
            if (selector) {
                clearInterval(poll);
                console.log('[Google Translate Loader] SUCCESS - Selector found with', selector.options.length, 'languages');
                window.googleTranslateSelector = selector;
                window.dispatchEvent(new Event('googleTranslateReady'));
            } else if (++attempts >= maxAttempts) {
                clearInterval(poll);
                console.error('[Google Translate Loader] ERROR - Selector not found after 15s');
            }
        }, 500);
    }

    window.googleTranslateElementInit = function() {
        console.log('[Google Translate Loader] Initialization callback triggered');
        createOrInitWidget();
    };
    
    // Load the Google Translate script
    if (!document.querySelector('script[src*="translate.google.com"]') && !window.google?.translate) {
        const script = document.createElement('script');
        script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        script.async = true;
        
        script.onload = () => {
            console.log('[Google Translate Loader] Script loaded');
            // In some cases callback might not fire, ensure widget creation
            if (window.google && window.google.translate && typeof window.googleTranslateElementInit === 'function') {
                window.googleTranslateElementInit();
            }
        };
        
        script.onerror = () => {
            console.error('[Google Translate Loader] Failed to load script');
            // Dispatch failure event so GeneralHeader knows
            window.dispatchEvent(new Event('googleTranslateLoadFailed'));
        };
        
        document.head.appendChild(script);
        console.log('[Google Translate Loader] Script tag added');
    } else {
        console.log('[Google Translate Loader] Script already loaded or Google Translate already available');
        // Wait for google object if not yet available, then create the widget; re-inject if needed
        let attempts = 0;
        const waitForGoogle = setInterval(() => {
            const hasGoogle = !!(window.google && window.google.translate);
            const hasSelector = !!document.querySelector('.goog-te-combo');
            if (hasSelector) {
                clearInterval(waitForGoogle);
                window.googleTranslateSelector = document.querySelector('.goog-te-combo');
                window.dispatchEvent(new Event('googleTranslateReady'));
                return;
            }
            if (hasGoogle) {
                clearInterval(waitForGoogle);
                console.log('[Google Translate Loader] google.translate available, creating widget now');
                createOrInitWidget();
                return;
            }
            attempts++;
            if (attempts >= 30) { // 15s
                clearInterval(waitForGoogle);
                console.warn('[Google Translate Loader] google object not ready after 15s - re-injecting script');
                const reinject = document.createElement('script');
                reinject.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit&_=' + Date.now();
                reinject.async = true;
                reinject.onload = () => {
                    console.log('[Google Translate Loader] Re-injected script loaded');
                    if (typeof window.googleTranslateElementInit === 'function') {
                        window.googleTranslateElementInit();
                    }
                };
                reinject.onerror = () => {
                    console.error('[Google Translate Loader] Failed to re-inject Google script');
                    window.dispatchEvent(new Event('googleTranslateLoadFailed'));
                };
                document.head.appendChild(reinject);
            }
        }, 500);
    }
})();
