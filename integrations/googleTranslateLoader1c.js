/**
 * Google Translate Loader
 * Separate loader for Google Translate to ensure proper initialization timing
 */

(function() {
    'use strict';
    
    console.log('[Google Translate Loader] Initializing...');
    
    // Create the Google Translate element container if it doesn't exist
    if (!document.getElementById('google_translate_element_loader')) {
        const container = document.createElement('div');
        container.id = 'google_translate_element_loader';
        container.style.cssText = 'position: absolute; left: -9999px; top: -9999px; height: 1px; width: 1px; overflow: hidden; pointer-events: none;';
        document.body.appendChild(container);
        console.log('[Google Translate Loader] Container created');
    }
    
    // Check if Google Translate is already initialized
    if (document.querySelector('.goog-te-combo')) {
        console.log('[Google Translate Loader] Google Translate already initialized');
        window.googleTranslateSelector = document.querySelector('.goog-te-combo');
        window.dispatchEvent(new Event('googleTranslateReady'));
        return;
    }
    
    // Define the initialization function
    window.googleTranslateElementInit = function() {
        console.log('[Google Translate Loader] Initialization callback triggered');
        
        try {
            new google.translate.TranslateElement({
                pageLanguage: 'en',
                includedLanguages: 'en,cy,pl,es,fr,de,it,pt,ar,ur,zh-CN,hi,ga',
                layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
                autoDisplay: false,
                multilanguagePage: true,
                gaTrack: false
            }, 'google_translate_element_loader');
            
            console.log('[Google Translate Loader] Widget created successfully');
            
            // Check for selector after a delay
            setTimeout(() => {
                const selector = document.querySelector('.goog-te-combo');
                if (selector) {
                    console.log('[Google Translate Loader] SUCCESS - Selector found with', selector.options.length, 'languages');
                    // Make it available globally
                    window.googleTranslateSelector = selector;
                    // Trigger custom event
                    window.dispatchEvent(new Event('googleTranslateReady'));
                } else {
                    console.error('[Google Translate Loader] ERROR - Selector not found');
                }
            }, 1000);
            
        } catch (error) {
            console.error('[Google Translate Loader] Error creating widget:', error);
        }
    };
    
    // Load the Google Translate script
    if (!document.querySelector('script[src*="translate.google.com"]') && !window.google?.translate) {
        const script = document.createElement('script');
        script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        script.async = true;
        
        script.onload = () => {
            console.log('[Google Translate Loader] Script loaded');
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
        // If Google Translate is already available but selector not created yet, wait for it
        if (window.google?.translate && !document.querySelector('.goog-te-combo')) {
            console.log('[Google Translate Loader] Google object exists but selector not ready, calling init');
            if (window.googleTranslateElementInit) {
                window.googleTranslateElementInit();
            }
        }
    }
})();
