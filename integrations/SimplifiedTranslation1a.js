/**
 * Simplified Translation System for VESPA
 * Uses browser detection and manual URL parameter approach
 */

(function() {
    'use strict';
    
    console.log('[VESPA Translation] Initializing simplified translation system');
    
    // Function to detect browser
    function getBrowserInfo() {
        const userAgent = navigator.userAgent;
        let browserName = 'Unknown';
        
        if (userAgent.indexOf('Chrome') > -1) {
            browserName = 'Chrome';
        } else if (userAgent.indexOf('Safari') > -1) {
            browserName = 'Safari';
        } else if (userAgent.indexOf('Firefox') > -1) {
            browserName = 'Firefox';
        } else if (userAgent.indexOf('Edge') > -1 || userAgent.indexOf('Edg') > -1) {
            browserName = 'Edge';
        }
        
        return browserName;
    }
    
    // Function to trigger browser translation
    function triggerBrowserTranslation(targetLang) {
        const browser = getBrowserInfo();
        console.log('[VESPA Translation] Browser detected:', browser);
        
        // Add meta tag to help browser detect language
        let langMeta = document.querySelector('meta[name="language"]');
        if (!langMeta) {
            langMeta = document.createElement('meta');
            langMeta.name = 'language';
            document.head.appendChild(langMeta);
        }
        langMeta.content = targetLang || 'en';
        
        // Update HTML lang attribute
        document.documentElement.lang = targetLang || 'en';
        
        // Browser-specific instructions
        const instructions = {
            'Chrome': 'Right-click anywhere and select "Translate to [Language]" or click the translate icon in the address bar',
            'Edge': 'Click the translate icon in the address bar or press Ctrl+Shift+A',
            'Firefox': 'Install the Firefox Translations extension from Mozilla',
            'Safari': 'Use Safari > Translate Website menu',
            'Unknown': 'Use your browser\'s built-in translation feature'
        };
        
        return instructions[browser] || instructions['Unknown'];
    }
    
    // Simple translation using CSS content replacement for key UI elements
    const translations = {
        'cy': { // Welsh
            'Coaching': 'Hyfforddi',
            'Results': 'Canlyniadau',
            'Activities': 'Gweithgareddau',
            'Dashboard': 'Dangosfwrdd',
            'Settings': 'Gosodiadau',
            'Log Out': 'Allgofnodi',
            'Home': 'Cartref',
            'Resources': 'Adnoddau',
            'Students': 'Myfyrwyr',
            'Profile': 'Proffil'
        },
        'es': { // Spanish
            'Coaching': 'Entrenamiento',
            'Results': 'Resultados',
            'Activities': 'Actividades',
            'Dashboard': 'Tablero',
            'Settings': 'Configuración',
            'Log Out': 'Cerrar sesión',
            'Home': 'Inicio',
            'Resources': 'Recursos',
            'Students': 'Estudiantes',
            'Profile': 'Perfil'
        },
        'fr': { // French
            'Coaching': 'Encadrement',
            'Results': 'Résultats',
            'Activities': 'Activités',
            'Dashboard': 'Tableau de bord',
            'Settings': 'Paramètres',
            'Log Out': 'Déconnexion',
            'Home': 'Accueil',
            'Resources': 'Ressources',
            'Students': 'Étudiants',
            'Profile': 'Profil'
        }
    };
    
    // Function to apply simple translations
    function applySimpleTranslations(lang) {
        if (!translations[lang]) {
            console.log('[VESPA Translation] No translations available for:', lang);
            return;
        }
        
        const trans = translations[lang];
        let translationCount = 0;
        
        // Find all text nodes and translate key terms
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            const originalText = node.textContent.trim();
            if (trans[originalText]) {
                node.textContent = trans[originalText];
                translationCount++;
            }
        }
        
        console.log('[VESPA Translation] Applied', translationCount, 'translations');
        
        // Store language preference
        localStorage.setItem('vespaLanguage', lang);
        
        // Add language indicator
        addLanguageIndicator(lang);
    }
    
    // Add visual language indicator
    function addLanguageIndicator(lang) {
        let indicator = document.getElementById('vespa-lang-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'vespa-lang-indicator';
            indicator.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                background: rgba(0, 229, 219, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                z-index: 9999;
                cursor: pointer;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            `;
            document.body.appendChild(indicator);
            
            // Click to reset to English
            indicator.addEventListener('click', function() {
                resetToEnglish();
            });
        }
        
        const langNames = {
            'cy': '🏴󠁧󠁢󠁷󠁬󠁳󠁿 Cymraeg',
            'es': '🇪🇸 Español',
            'fr': '🇫🇷 Français',
            'de': '🇩🇪 Deutsch',
            'pl': '🇵🇱 Polski'
        };
        
        indicator.textContent = langNames[lang] || 'Translation Active';
        indicator.title = 'Click to reset to English';
    }
    
    // Reset to English
    function resetToEnglish() {
        localStorage.removeItem('vespaLanguage');
        location.reload();
    }
    
    // Enhanced translation modal handler
    window.handleVESPATranslation = function(lang) {
        console.log('[VESPA Translation] Language selected:', lang);
        
        if (!lang || lang === 'en' || lang === '') {
            resetToEnglish();
            return;
        }
        
        // Try simple translation first
        applySimpleTranslations(lang);
        
        // Then provide browser translation instructions
        const instruction = triggerBrowserTranslation(lang);
        
        // Show instruction modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 100000;
            max-width: 500px;
            text-align: center;
        `;
        
        modal.innerHTML = `
            <h3 style="color: #2a3c7a; margin-bottom: 15px;">Translation Instructions</h3>
            <p style="color: #666; margin-bottom: 20px;">
                Some key navigation elements have been translated. 
                For full page translation:
            </p>
            <p style="color: #079baa; font-weight: 600; margin-bottom: 25px;">
                ${instruction}
            </p>
            <button onclick="this.parentElement.remove()" style="
                background: #079baa;
                color: white;
                border: none;
                padding: 10px 30px;
                border-radius: 6px;
                font-size: 16px;
                cursor: pointer;
            ">Got it!</button>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-close after 10 seconds
        setTimeout(() => {
            if (modal.parentElement) modal.remove();
        }, 10000);
    };
    
    // Check for saved language preference on load
    const savedLang = localStorage.getItem('vespaLanguage');
    if (savedLang && savedLang !== 'en') {
        console.log('[VESPA Translation] Restoring saved language:', savedLang);
        setTimeout(() => {
            applySimpleTranslations(savedLang);
        }, 1000);
    }
    
    // Expose globally
    window.VESPATranslation = {
        translate: window.handleVESPATranslation,
        reset: resetToEnglish,
        applySimple: applySimpleTranslations
    };
    
    console.log('[VESPA Translation] System ready. Use VESPATranslation.translate(lang) to translate.');
})();
