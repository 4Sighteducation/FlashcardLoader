/**
 * Staff Homepage Cache Module
 * Caches the rendered staff homepage to prevent reloading on navigation
 */

(function() {
    'use strict';
    
    const log = (msg, data) => {
        if (console && console.log) {
            console.log(`[HomepageCache] ${msg}`, data || '');
        }
    };
    
    // Cache storage
    const cache = {
        html: null,
        timestamp: null,
        maxAge: 5 * 60 * 1000, // 5 minutes
        sceneKey: null,
        viewKey: null
    };
    
    // Check if cache is valid
    function isCacheValid() {
        if (!cache.html || !cache.timestamp) {
            return false;
        }
        
        const age = Date.now() - cache.timestamp;
        if (age > cache.maxAge) {
            log('Cache expired');
            return false;
        }
        
        return true;
    }
    
    // Save homepage to cache
    function saveToCache(sceneKey, viewKey) {
        const container = document.querySelector('#view_3024 .kn-rich_text__content');
        const dashboard = document.getElementById('staff-homepage-container');
        
        if (container && dashboard && dashboard.innerHTML.length > 1000) {
            cache.html = container.innerHTML;
            cache.timestamp = Date.now();
            cache.sceneKey = sceneKey;
            cache.viewKey = viewKey;
            
            // Also cache any dynamically created styles
            const dynamicStyles = document.querySelectorAll('style[data-homepage-style="true"]');
            cache.styles = Array.from(dynamicStyles).map(style => style.innerHTML);
            
            log('Homepage saved to cache', {
                size: cache.html.length,
                hasStyles: cache.styles.length > 0
            });
            
            // Store in sessionStorage for persistence across page navigation
            try {
                sessionStorage.setItem('staffHomepageCache', JSON.stringify({
                    html: cache.html,
                    timestamp: cache.timestamp,
                    sceneKey: cache.sceneKey,
                    viewKey: cache.viewKey,
                    styles: cache.styles
                }));
            } catch (e) {
                log('Failed to save to sessionStorage', e);
            }
        }
    }
    
    // Restore homepage from cache
    function restoreFromCache() {
        if (!isCacheValid()) {
            // Try to load from sessionStorage
            try {
                const stored = sessionStorage.getItem('staffHomepageCache');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    cache.html = parsed.html;
                    cache.timestamp = parsed.timestamp;
                    cache.sceneKey = parsed.sceneKey;
                    cache.viewKey = parsed.viewKey;
                    cache.styles = parsed.styles;
                    
                    if (!isCacheValid()) {
                        return false;
                    }
                }
            } catch (e) {
                log('Failed to load from sessionStorage', e);
                return false;
            }
        }
        
        const container = document.querySelector('#view_3024 .kn-rich_text__content');
        if (container && cache.html) {
            log('Restoring homepage from cache');
            
            // Show loading briefly to prevent flicker
            container.innerHTML = '<div style="padding: 20px; text-align: center;">Loading cached homepage...</div>';
            
            // Restore the cached HTML
            setTimeout(() => {
                container.innerHTML = cache.html;
                
                // Restore styles
                if (cache.styles && cache.styles.length > 0) {
                    cache.styles.forEach(styleContent => {
                        const style = document.createElement('style');
                        style.setAttribute('data-homepage-style', 'true');
                        style.innerHTML = styleContent;
                        document.head.appendChild(style);
                    });
                }
                
                // Re-attach event listeners
                if (window.reattachHomepageEventListeners) {
                    window.reattachHomepageEventListeners();
                }
                
                // Patch navigation buttons
                setTimeout(() => {
                    if (window.patchHomepageNavigation) {
                        window.patchHomepageNavigation();
                    }
                }, 100);
                
                log('Homepage restored from cache');
            }, 100);
            
            return true;
        }
        
        return false;
    }
    
    // Clear cache
    function clearCache() {
        cache.html = null;
        cache.timestamp = null;
        cache.styles = null;
        sessionStorage.removeItem('staffHomepageCache');
        log('Cache cleared');
    }
    
    // Listen for scene renders
    $(document).on('knack-scene-render.any', function(event, scene) {
        if (scene && scene.key === 'scene_1215') {
            // Check if we can restore from cache
            const restored = restoreFromCache();
            
            if (restored) {
                // Set flag to skip full initialization
                window._homepageRestoredFromCache = true;
                
                // Hide loading screen if active
                if (window.VespaLoadingScreen && window.VespaLoadingScreen.isActive()) {
                    window.VespaLoadingScreen.hide();
                }
            }
        }
    });
    
    // Listen for view renders to save cache
    $(document).on('knack-view-render.any', function(event, view) {
        if (view && view.key === 'view_3024') {
            // Wait for homepage to fully render before caching
            setTimeout(() => {
                const dashboard = document.getElementById('staff-homepage-container');
                if (dashboard && dashboard.innerHTML.length > 1000) {
                    const currentScene = (typeof Knack !== 'undefined' && Knack.scene) ? Knack.scene.key : null;
                    saveToCache(currentScene, view.key);
                }
            }, 2000);
        }
    });
    
    // Clear cache on logout
    $(document).on('knack-login-submit.any', function() {
        clearCache();
    });
    
    $(document).on('knack-logout-submit.any', function() {
        clearCache();
    });
    
    // Expose functions globally
    window.staffHomepageCache = {
        save: saveToCache,
        restore: restoreFromCache,
        clear: clearCache,
        isValid: isCacheValid
    };
    
    log('Staff Homepage Cache initialized');
    
})();
