/**
 * Staff Homepage API Cache Monitor
 * Monitors and manages the API response cache for better performance
 */

(function() {
    'use strict';
    
    const log = (msg, data) => {
        if (console && console.log) {
            console.log(`[HomepageCache] ${msg}`, data || '');
        }
    };
    
    // Monitor cache usage
    function monitorCache() {
        let cacheHits = 0;
        let cacheMisses = 0;
        let totalRequests = 0;
        
        // Log cache statistics every 30 seconds if there's activity
        setInterval(() => {
            if (totalRequests > 0) {
                const hitRate = Math.round((cacheHits / totalRequests) * 100);
                log(`Cache Performance: ${hitRate}% hit rate`, {
                    hits: cacheHits,
                    misses: cacheMisses,
                    total: totalRequests
                });
                
                // Reset counters
                cacheHits = 0;
                cacheMisses = 0;
                totalRequests = 0;
            }
        }, 30000);
        
        // Track cache hits/misses
        const originalConsoleLog = console.log;
        console.log = function() {
            const firstArg = arguments[0];
            if (typeof firstArg === 'string') {
                if (firstArg.includes('API Cache: Hit')) {
                    cacheHits++;
                    totalRequests++;
                } else if (firstArg.includes('Cache miss')) {
                    cacheMisses++;
                    totalRequests++;
                }
            }
            originalConsoleLog.apply(console, arguments);
        };
    }
    
    // Clear cache when user logs out
    $(document).on('knack-logout-submit.any', function() {
        log('User logging out, clearing API cache');
        if (window.APICache && typeof window.APICache.clearAll === 'function') {
            window.APICache.clearAll();
        }
    });
    
    // Clear old cache entries periodically
    setInterval(() => {
        if (window.APICache && typeof window.APICache.clearExpired === 'function') {
            window.APICache.clearExpired();
        }
    }, 60000); // Every minute
    
    // Provide global cache management functions
    window.HomepageCache = {
        // Clear all cached data
        clearAll: function() {
            if (window.APICache) {
                window.APICache.clearAll();
                log('All API cache cleared');
            }
        },
        
        // Clear specific cache entry
        clear: function(key) {
            if (window.APICache) {
                window.APICache.clear(key);
                log(`Cleared cache for: ${key}`);
            }
        },
        
        // Get cache statistics
        getStats: function() {
            if (window.APICache && typeof window.APICache.getStats === 'function') {
                const stats = window.APICache.getStats();
                log('Cache Statistics', stats);
                return stats;
            }
            return null;
        },
        
        // Force refresh specific data
        refresh: function(dataType) {
            const user = (typeof Knack !== 'undefined') ? Knack.getUserAttributes() : null;
            if (!user) return;
            
            switch(dataType) {
                case 'profile':
                    this.clear(`staff_profile_${user.id}`);
                    break;
                case 'school':
                    // Clear all school-related caches
                    for (let i = 0; i < sessionStorage.length; i++) {
                        const key = sessionStorage.key(i);
                        if (key && key.includes('school_vespa_')) {
                            sessionStorage.removeItem(key);
                        }
                    }
                    break;
                case 'staff':
                    // Clear all staff-related caches
                    for (let i = 0; i < sessionStorage.length; i++) {
                        const key = sessionStorage.key(i);
                        if (key && key.includes('staff_vespa_')) {
                            sessionStorage.removeItem(key);
                        }
                    }
                    break;
            }
            
            log(`Refreshed cache for: ${dataType}`);
        }
    };
    
    // Start monitoring
    monitorCache();
    
    // Log initialization
    log('API Cache Monitor initialized');
    
    // Check if APICache is available
    setTimeout(() => {
        if (window.APICache) {
            log('APICache detected and ready');
            const stats = window.APICache.getStats ? window.APICache.getStats() : null;
            if (stats) {
                log('Initial cache state', stats);
            }
        } else {
            log('Warning: APICache not found - cache may not be working');
        }
    }, 2000);
    
})();
