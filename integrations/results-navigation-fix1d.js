// Results Page Navigation Fix 
// Handles navigation to/from coaching results pages for both Admin and Normal Staff
// Version: 2.0

(function() {
    'use strict';
    
    // Avoid duplicate declarations by using IIFE scope
    const DEBUG = window.RESULTS_NAV_DEBUG || true;
    const log = (msg, data) => {
        if (DEBUG) console.log(`[ResultsNavFix] ${msg}`, data || '');
    };
    
    // Configuration
    const RESULTS_CONFIG = {
        adminScene: 'scene_1014',
        adminUrl: '#admin-coaching',
        adminViews: ['view_2772', 'view_3204'],
        
        staffScene: 'scene_1095', 
        staffUrl: '#mygroup-vespa-results2',
        staffViews: ['view_2776', 'view_3015'],
        
        resultsScene: 'scene_1270',  // Results page
        resultsUrl: '#vesparesults',
        resultsViews: ['view_3214'],  // Add the actual view IDs for scene_1270
        
        manageScene: 'scene_1212',
        manageUrl: '#upload-manager',
        
        homepageScene: 'scene_1215',
        homepageUrl: '#staff-home'
    };
    
    // Track navigation state
    let navigationState = {
        currentScene: null,
        previousScene: null,
        isNavigating: false,
        scriptLoadQueue: new Set(),
        cleanupRegistry: new Map()
    };
    
    // Prevent duplicate script loading
    function preventDuplicateScripts() {
        const loadedScripts = new Set();
        
        // Intercept document.createElement to prevent duplicate scripts
        const originalCreateElement = document.createElement.bind(document);
        document.createElement = function(tagName) {
            const element = originalCreateElement(tagName);
            
            if (tagName.toLowerCase() === 'script') {
                // Override the src setter
                const originalSrcSetter = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src').set;
                
                Object.defineProperty(element, '_src', {
                    writable: true,
                    value: ''
                });
                
                Object.defineProperty(element, 'src', {
                    get: function() {
                        return this._src;
                    },
                    set: function(url) {
                        // List of scripts that cause issues when loaded multiple times
                        const problematicScripts = [
                            'studentResultsViewer',
                            'index9k',
                            'uploadSystem',
                            'dynamicStaffTable',
                            'vue-table-ui-enhancer'
                        ];
                        
                        const isProblematic = problematicScripts.some(script => url.includes(script));
                        
                        if (isProblematic && loadedScripts.has(url)) {
                            log(`BLOCKED duplicate script load: ${url}`);
                            // Fire load event to prevent hanging
                            setTimeout(() => {
                                const event = new Event('load');
                                this.dispatchEvent(event);
                            }, 0);
                            return;
                        }
                        
                        loadedScripts.add(url);
                        this._src = url;
                        originalSrcSetter.call(this, url);
                    }
                });
            }
            
            return element;
        };
        
        // Also override window.loadScript if it exists
        const originalLoadScript = window.loadScript;
        window.loadScript = function(url) {
            // Check if script already loaded
            if (loadedScripts.has(url)) {
                log(`Preventing duplicate load via loadScript: ${url}`);
                return Promise.resolve();
            }
            
            // Track this script
            loadedScripts.add(url);
            navigationState.scriptLoadQueue.add(url);
            
            // Call original function if it exists
            if (originalLoadScript) {
                return originalLoadScript.call(this, url).finally(() => {
                    navigationState.scriptLoadQueue.delete(url);
                });
            }
            
            // Fallback script loading
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.async = true;
                script.onload = () => {
                    navigationState.scriptLoadQueue.delete(url);
                    resolve();
                };
                script.onerror = () => {
                    loadedScripts.delete(url); // Allow retry on error
                    navigationState.scriptLoadQueue.delete(url);
                    reject(new Error(`Failed to load script: ${url}`));
                };
                document.head.appendChild(script);
            });
        };
        
        // Also monitor script tag insertions
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.tagName === 'SCRIPT' && node.src) {
                        if (loadedScripts.has(node.src)) {
                            log(`Removing duplicate script tag: ${node.src}`);
                            node.remove();
                        } else {
                            loadedScripts.add(node.src);
                        }
                    }
                });
            });
        });
        
        observer.observe(document.head, {
            childList: true,
            subtree: true
        });
        
        // Store cleanup function
        navigationState.cleanupRegistry.set('scriptMonitor', () => {
            observer.disconnect();
        });
    }
    
    // Clean up results page before navigation
    function cleanupResultsPage(scene) {
        log(`Cleaning up results page: ${scene}`);
        
        // Clear Vue table states
        if (window.vueTableCache) {
            delete window.vueTableCache;
        }
        
        // Clear any running intervals
        ['enhancementCheckInterval', 'tableUpdateTimeout', 'profileCheckInterval'].forEach(intervalName => {
            if (window[intervalName]) {
                clearInterval(window[intervalName]);
                clearTimeout(window[intervalName]);
                window[intervalName] = null;
            }
        });
        
        // Disconnect observers
        if (window.coachingTableObserver) {
            window.coachingTableObserver.disconnect();
            window.coachingTableObserver = null;
        }
        
        // Remove modals
        const modals = document.querySelectorAll('#vue-table-modal, .vespa-modal, .coaching-modal');
        modals.forEach(modal => modal.remove());
        
        // Clear app states
        if (window.cleanupAppsForScene) {
            window.cleanupAppsForScene(scene);
        }
        
        // Clear config variables for table enhancer
        window.DYNAMIC_STAFF_TABLE_1014_CONFIG = undefined;
        window._tableEnhancerReset = true;
        
        // Clear profile configs
        window.REPORTPROFILE_CONFIG = undefined;
        window.AI_COACH_LAUNCHER_CONFIG = undefined;
        
        // Reset loading flags
        window._loading_dynamicStaffTable1014 = false;
        window._loading_reportProfiles = false;
        window._loading_aiCoachLauncher = false;
        
        log('Cleanup complete');
    }
    
    // Prepare target scene for navigation
    function prepareTargetScene(targetScene) {
        log(`Preparing target scene: ${targetScene}`);
        
        // Set navigation flags
        window._universalRedirectCompleted = true;
        window._bypassUniversalRedirect = true;
        sessionStorage.setItem('universalRedirectCompleted', 'true');
        sessionStorage.setItem('navigationTarget', targetScene);
        
        // Special preparation for different scenes
        switch(targetScene) {
            case RESULTS_CONFIG.manageScene:
                window._forceStayOnManage = true;
                window._manageNavigationActive = true;
                sessionStorage.setItem('navigatingToManage', 'true');
                break;
                
            case RESULTS_CONFIG.homepageScene:
                window._homepageNavigationActive = true;
                // Clear any coaching-specific flags
                window._coachingNavigationActive = false;
                break;
                
            case RESULTS_CONFIG.adminScene:
            case RESULTS_CONFIG.staffScene:
                window._coachingNavigationActive = true;
                window._forceAppReload = targetScene;
                break;
        }
        
        log('Preparation complete');
    }
    
    // Force actual page navigation (not AJAX load)
    window.forcePageNavigation = function(targetUrl) {
        log(`Forcing page navigation to ${targetUrl}`);
        
        // Set flags to prevent AJAX loading
        window._navigationInProgress = true;
        window._skipAjaxLoad = true;
        
        // Use location.href for full page navigation
        if (targetUrl.startsWith('#')) {
            // Change hash and reload if necessary
            const currentHash = window.location.hash;
            window.location.hash = targetUrl;
            
            // If hash didn't change, force reload
            if (currentHash === targetUrl) {
                window.location.reload();
            }
        } else {
            // Full URL navigation
            window.location.href = targetUrl;
        }
    };
    
    // Enhanced navigation function
    window.navigateFromResultsPage = function(targetScene, targetUrl, source = 'unknown') {
        // Prevent concurrent navigation
        if (navigationState.isNavigating) {
            log('Navigation already in progress, skipping');
            return;
        }
        
        navigationState.isNavigating = true;
        log(`Navigating from results to ${targetScene}`, { source, targetUrl });
        
        const currentScene = window.Knack?.scene?.key;
        
        // Clean up current scene if it's a results page
        if (currentScene === RESULTS_CONFIG.adminScene || currentScene === RESULTS_CONFIG.staffScene) {
            cleanupResultsPage(currentScene);
        }
        
        // Prepare target scene
        prepareTargetScene(targetScene);
        
        // Show loading screen if available
        if (window.VespaLoadingScreen) {
            window.VespaLoadingScreen.showForNavigation(targetScene, 'results');
            window._loadingScreenActive = true;
        }
        
        // Hide current content immediately
        const currentContainer = document.querySelector('.kn-scene-content');
        if (currentContainer) {
            currentContainer.style.opacity = '0';
            currentContainer.style.transition = 'opacity 0.2s';
        }
        
        // Perform navigation
        setTimeout(() => {
            // Update state before navigation
            navigationState.previousScene = currentScene;
            navigationState.currentScene = targetScene;
            
            // Force actual navigation (not AJAX)
            window.forcePageNavigation(targetUrl.startsWith('#') ? targetUrl : '#' + targetUrl);
            
            // Verify navigation succeeded
            setTimeout(() => {
                const newScene = window.Knack?.scene?.key;
                if (newScene === targetScene) {
                    log('Navigation successful');
                } else if (newScene === 'scene_1') {
                    log('Redirected to login, may need to refresh');
                    // Force reload to bypass universal redirect
                    window._bypassUniversalRedirect = true;
                    sessionStorage.setItem('postLoginTarget', targetUrl);
                    window.location.hash = targetUrl;
                    setTimeout(() => window.location.reload(), 500);
                } else {
                    log('Navigation may have failed, attempting direct navigation');
                    window.location.hash = targetUrl;
                }
                
                navigationState.isNavigating = false;
                
                // Clear loading screen
                if (window.VespaLoadingScreen) {
                    setTimeout(() => {
                        window.VespaLoadingScreen.hide();
                        window._loadingScreenActive = false;
                    }, 1000);
                }
            }, 1500);
        }, 200);
    };
    
    // Patch navigation buttons on results pages
    function patchResultsNavigation() {
        const currentScene = window.Knack?.scene?.key;
        
        // Only patch if we're on a results page
        if (currentScene !== RESULTS_CONFIG.adminScene && 
            currentScene !== RESULTS_CONFIG.staffScene &&
            currentScene !== RESULTS_CONFIG.resultsScene) {
            return;
        }
        
        log('Patching navigation on results page');
        
        // Patch header navigation
        const headerButtons = document.querySelectorAll('.header-nav-button, .vespa-nav-item');
        headerButtons.forEach(button => {
            if (button.dataset.resultsPatched === 'true') return;
            
            const href = button.getAttribute('href');
            const targetScene = button.dataset.scene;
            
            // Determine target based on href or data
            let navigationTarget = null;
            let navigationUrl = href;
            
            if (href?.includes('upload-manager') || targetScene === RESULTS_CONFIG.manageScene) {
                navigationTarget = RESULTS_CONFIG.manageScene;
                navigationUrl = RESULTS_CONFIG.manageUrl;
            } else if (href?.includes('staff-home') || targetScene === RESULTS_CONFIG.homepageScene) {
                navigationTarget = RESULTS_CONFIG.homepageScene;
                navigationUrl = RESULTS_CONFIG.homepageUrl;
            }
            
            if (navigationTarget) {
                button.dataset.resultsPatched = 'true';
                
                // Clone to remove existing handlers
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                // Add new handler
                newButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    log('Results page navigation clicked');
                    window.navigateFromResultsPage(navigationTarget, navigationUrl, 'header');
                }, true);
            }
        });
        
        // Also patch any breadcrumb navigation
        const breadcrumbs = document.querySelectorAll('.kn-crumbtrail a, .breadcrumb a');
        breadcrumbs.forEach(link => {
            if (link.dataset.resultsPatched === 'true') return;
            
            const href = link.getAttribute('href');
            if (href && href.includes('#')) {
                link.dataset.resultsPatched = 'true';
                
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const targetUrl = href.split('#')[1];
                    
                    // Determine scene from URL
                    let targetScene = RESULTS_CONFIG.homepageScene;
                    if (targetUrl.includes('upload-manager')) {
                        targetScene = RESULTS_CONFIG.manageScene;
                    }
                    
                    window.navigateFromResultsPage(targetScene, '#' + targetUrl, 'breadcrumb');
                });
            }
        });
        
        log('Navigation patching complete');
    }
    
    // Patch homepage navigation to results pages
    function patchHomepageNavigation() {
        const currentScene = window.Knack?.scene?.key;
        
        // Only patch if we're on the homepage
        if (currentScene !== RESULTS_CONFIG.homepageScene && currentScene !== 'scene_1215') {
            return;
        }
        
        log('Patching homepage navigation to results');
        
        // Find results navigation buttons/links
        const selectors = [
            'a[href*="vesparesults"]',
            'a[href*="admin-coaching"]',
            'a[href*="mygroup-vespa-results"]',
            '.app-card[data-scene="scene_1270"]',
            '.app-card[data-scene="scene_1014"]',
            '.app-card[data-scene="scene_1095"]',
            '[data-navigation-target="results"]'
        ];
        
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                if (element.dataset.homepagePatched === 'true') return;
                
                element.dataset.homepagePatched = 'true';
                
                // Remove existing click handlers
                const newElement = element.cloneNode(true);
                element.parentNode.replaceChild(newElement, element);
                
                // Add new handler
                newElement.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const href = this.getAttribute('href') || this.dataset.href;
                    const targetScene = this.dataset.scene;
                    
                    log('Homepage to results navigation clicked', { href, targetScene });
                    
                    // Determine target
                    let targetUrl = '#vesparesults';
                    if (href) {
                        targetUrl = href.startsWith('#') ? href : '#' + href;
                    } else if (targetScene === 'scene_1014') {
                        targetUrl = '#admin-coaching';
                    } else if (targetScene === 'scene_1095') {
                        targetUrl = '#mygroup-vespa-results2';
                    }
                    
                    // Force actual navigation (not AJAX)
                    window.forcePageNavigation(targetUrl);
                }, true);
            });
        });
        
        log('Homepage navigation patching complete');
    }
    
    // Monitor scene changes
    function monitorSceneChanges() {
        // Wait for jQuery and Knack to be available
        if (!window.$ || !window.Knack) {
            log('Waiting for jQuery and Knack to be available...');
            setTimeout(monitorSceneChanges, 500);
            return;
        }
        
        log('Setting up scene change monitoring');
        $(document).on('knack-scene-render.any', function(event, scene) {
                if (!scene) return;
                
                const previousScene = navigationState.currentScene;
                navigationState.currentScene = scene.key;
                
                                // If we just arrived at a results page
                if (scene.key === RESULTS_CONFIG.adminScene || 
                    scene.key === RESULTS_CONFIG.staffScene ||
                    scene.key === RESULTS_CONFIG.resultsScene) {
                    log(`Arrived at results page: ${scene.key}`);
                    
                    // Patch navigation after a delay
                    setTimeout(patchResultsNavigation, 1000);
                    
                    // Re-patch periodically in case new elements are added
                    const repatchInterval = setInterval(() => {
                        patchResultsNavigation();
                    }, 2000);
                    
                    // Stop repatching after 10 seconds
                    setTimeout(() => clearInterval(repatchInterval), 10000);
                }
                
                // If we arrived at homepage, patch navigation to results
                if (scene.key === RESULTS_CONFIG.homepageScene || scene.key === 'scene_1215') {
                    log(`Arrived at homepage: ${scene.key}`);
                    
                    // Patch navigation after a delay
                    setTimeout(patchHomepageNavigation, 1000);
                    
                    // Re-patch periodically in case new elements are added
                    const homepageRepatchInterval = setInterval(() => {
                        patchHomepageNavigation();
                    }, 2000);
                    
                    // Stop repatching after 10 seconds
                    setTimeout(() => clearInterval(homepageRepatchInterval), 10000);
                }
                
                // If we're leaving a results page
                if ((previousScene === RESULTS_CONFIG.adminScene || 
                     previousScene === RESULTS_CONFIG.staffScene || 
                     previousScene === RESULTS_CONFIG.resultsScene) &&
                    scene.key !== RESULTS_CONFIG.adminScene && 
                    scene.key !== RESULTS_CONFIG.staffScene && 
                    scene.key !== RESULTS_CONFIG.resultsScene) {
                    log('Left results page, running cleanup');
                    
                    // Run any registered cleanup functions
                    navigationState.cleanupRegistry.forEach((cleanupFn, key) => {
                        try {
                            cleanupFn();
                        } catch (e) {
                            console.error(`[ResultsNavFix] Cleanup error for ${key}:`, e);
                        }
                    });
                    navigationState.cleanupRegistry.clear();
                }
            });
            
            // Also monitor view renders for dynamic content
            $(document).on('knack-view-render.any', function(event, view) {
                const currentScene = window.Knack?.scene?.key;
                if (currentScene === RESULTS_CONFIG.adminScene || 
                    currentScene === RESULTS_CONFIG.staffScene || 
                    currentScene === RESULTS_CONFIG.resultsScene) {
                    // Patch any new navigation elements
                    setTimeout(patchResultsNavigation, 500);
                }
            });
    }
    
    // Initialize
    function initialize() {
        log('Initializing Results Navigation Fix');
        
        // Set initial state
        navigationState.currentScene = window.Knack?.scene?.key;
        
        // Prevent duplicate script loading
        preventDuplicateScripts();
        
        // Start monitoring (will wait for jQuery if needed)
        monitorSceneChanges();
        
        // Initial patch if we're already on a results page
        if (navigationState.currentScene === RESULTS_CONFIG.adminScene || 
            navigationState.currentScene === RESULTS_CONFIG.staffScene ||
            navigationState.currentScene === RESULTS_CONFIG.resultsScene) {
            log(`Already on results page: ${navigationState.currentScene}`);
            
            // Wait for jQuery before patching
            const waitForjQuery = () => {
                if (window.$) {
                    setTimeout(patchResultsNavigation, 1000);
                } else {
                    setTimeout(waitForjQuery, 500);
                }
            };
            waitForjQuery();
        }
        
        log('Initialization started');
    }
    
    // Initialize immediately
    initialize();
    
})();
