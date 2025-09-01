/**
 * Universal Loading Screen Manager for VESPA Academy
 * Version: 1.0.0
 * 
 * Provides a consistent loading experience across the entire application
 * Can be called from any script or navigation event
 */

(function() {
    'use strict';
    
    const DEBUG = true;
    const log = (msg, data) => {
        if (DEBUG) console.log(`[Universal Loading]`, msg, data || '');
    };
    
    // Loading screen configuration
    const CONFIG = {
        fadeOutDuration: 500,
        minDisplayTime: 800, // Minimum time to show loading screen (prevents flicker)
        defaultText: 'Loading...',
        logoUrl: 'https://vespa.academy/_astro/vespalogo.BGrK1ARl.png',
        
        // Predefined loading texts for different scenarios
        texts: {
            // Navigation
            'navigation': 'Navigating...',
            'page-load': 'Loading page...',
            'dashboard': 'Loading Dashboard',
            
            // Specific scenes
            'scene_1014': 'Loading VESPA Staff Portal',
            'scene_1095': 'Loading VESPA Staff Portal',
            'scene_1210': 'Loading Student Homepage',
            'scene_1215': 'Loading Staff Homepage',
            'scene_1252': 'Loading Resource Dashboard',
            'scene_1225': 'Loading Analytics Dashboard',
            'scene_1268': 'Loading Super User Dashboard',
            'scene_1224': 'Loading Coach Summary',
            'scene_1227': 'Loading Bulk Print',
            'scene_1256': 'Loading Staff Activities',
            'scene_1258': 'Loading Student Activities',
            'scene_1206': 'Loading Flashcards',
            'scene_1208': 'Loading Study Planner',
            'scene_1188': 'Loading Taskboards',
            'scene_1212': 'Loading Upload Manager',
            'scene_43': 'Loading Student Report',
            'scene_481': 'Loading Resources',
            'scene_1270': 'Loading Student Results',
            'scene_1272': 'Loading Staff Manager',
            
            // Actions
            'saving': 'Saving changes...',
            'loading-report': 'Loading report...',
            'processing': 'Processing...',
            'uploading': 'Uploading files...',
            'downloading': 'Downloading...',
            'searching': 'Searching...',
            'generating': 'Generating report...',
            'syncing': 'Syncing data...',
            'analyzing': 'Analyzing data...',
            'preparing': 'Preparing content...'
        }
    };
    
    // Track loading state
    let loadingState = {
        isActive: false,
        startTime: null,
        currentText: '',
        overlay: null,
        progressElement: null,
        hideTimeout: null
    };
    
    /**
     * Create the loading screen HTML and styles
     */
    function createLoadingScreen(text, progress) {
        // Use provided text or look up from config
        const displayText = CONFIG.texts[text] || text || CONFIG.defaultText;
        const progressText = progress || 'Please wait...';
        
        const html = `
            <div class="vespa-universal-loading-overlay" id="vespa-universal-loading-overlay">
                <div class="vespa-universal-loading-content">
                    <img src="${CONFIG.logoUrl}" alt="VESPA" class="vespa-universal-loading-logo">
                    <div class="vespa-universal-loading-spinner"></div>
                    <div class="vespa-universal-loading-text">${displayText}</div>
                    <div class="vespa-universal-loading-progress" id="vespa-universal-loading-progress">${progressText}</div>
                </div>
            </div>
        `;
        
        const styles = `
            <style id="vespa-universal-loading-styles">
                .vespa-universal-loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #2a3c7a 0%, #079baa 100%);
                    z-index: 999999;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    transition: opacity 0.5s ease-out;
                    opacity: 1;
                }
                
                .vespa-universal-loading-overlay.fade-out {
                    opacity: 0;
                    pointer-events: none;
                }
                
                .vespa-universal-loading-content {
                    text-align: center;
                    color: white;
                    padding: 20px;
                }
                
                .vespa-universal-loading-logo {
                    width: 150px;
                    height: auto;
                    margin-bottom: 30px;
                    animation: vespaLoadingPulse 1.5s ease-in-out infinite;
                }
                
                .vespa-universal-loading-spinner {
                    width: 60px;
                    height: 60px;
                    border: 4px solid rgba(255, 255, 255, 0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: vespaLoadingSpin 1s linear infinite;
                    margin: 0 auto 20px;
                }
                
                .vespa-universal-loading-text {
                    font-size: 18px;
                    font-weight: 300;
                    letter-spacing: 1px;
                    opacity: 0.9;
                    animation: vespaLoadingFade 2s ease-in-out infinite;
                    margin-bottom: 10px;
                }
                
                .vespa-universal-loading-progress {
                    font-size: 14px;
                    opacity: 0.7;
                    min-height: 20px;
                }
                
                @keyframes vespaLoadingSpin {
                    to { transform: rotate(360deg); }
                }
                
                @keyframes vespaLoadingPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                
                @keyframes vespaLoadingFade {
                    0%, 100% { opacity: 0.9; }
                    50% { opacity: 0.6; }
                }
                
                /* Mobile responsiveness */
                @media (max-width: 768px) {
                    .vespa-universal-loading-logo {
                        width: 120px;
                    }
                    
                    .vespa-universal-loading-spinner {
                        width: 50px;
                        height: 50px;
                    }
                    
                    .vespa-universal-loading-text {
                        font-size: 16px;
                    }
                    
                    .vespa-universal-loading-progress {
                        font-size: 12px;
                    }
                }
                
                /* Ensure it covers everything */
                body.vespa-loading-active {
                    overflow: hidden !important;
                }
            </style>
        `;
        
        // Inject styles if not already present
        if (!document.getElementById('vespa-universal-loading-styles')) {
            document.head.insertAdjacentHTML('beforeend', styles);
        }
        
        // Create and insert loading overlay
        const container = document.createElement('div');
        container.innerHTML = html;
        return container.firstElementChild;
    }
    
    /**
     * Show the loading screen
     * @param {string|object} options - Loading text or options object
     * @param {string} options.text - Main loading text
     * @param {string} options.progress - Progress text
     * @param {number} options.minTime - Minimum display time
     */
    function show(options = {}) {
        // Handle simple string argument
        if (typeof options === 'string') {
            options = { text: options };
        }
        
        // Don't create duplicate
        if (loadingState.isActive && loadingState.overlay) {
            log('Loading screen already active, updating text');
            updateText(options.text);
            if (options.progress) {
                updateProgress(options.progress);
            }
            return;
        }
        
        // Clear any pending hide
        if (loadingState.hideTimeout) {
            clearTimeout(loadingState.hideTimeout);
            loadingState.hideTimeout = null;
        }
        
        // Remove any existing overlay (cleanup)
        const existing = document.getElementById('vespa-universal-loading-overlay');
        if (existing) {
            existing.remove();
        }
        
        // Also check for old navigation loading screens and remove them
        const oldOverlay = document.getElementById('vespa-loading-overlay');
        if (oldOverlay) {
            oldOverlay.remove();
        }
        
        // Create new loading screen
        const overlay = createLoadingScreen(options.text, options.progress);
        document.body.appendChild(overlay);
        document.body.classList.add('vespa-loading-active');
        
        // Update state
        loadingState = {
            isActive: true,
            startTime: Date.now(),
            currentText: options.text || CONFIG.defaultText,
            overlay: overlay,
            progressElement: overlay.querySelector('#vespa-universal-loading-progress'),
            hideTimeout: null,
            minTime: options.minTime || CONFIG.minDisplayTime
        };
        
        // Set global flag for coordination with other scripts
        window._loadingScreenActive = true;
        
        log('Loading screen shown', { text: loadingState.currentText });
        window._universalLoadingActive = true;
    }
    
    /**
     * Hide the loading screen
     * @param {boolean} immediate - Skip fade animation
     */
    function hide(immediate = false) {
        if (!loadingState.isActive || !loadingState.overlay) {
            log('No active loading screen to hide');
            return;
        }
        
        // Calculate how long the loading screen has been shown
        const displayTime = Date.now() - loadingState.startTime;
        const remainingTime = Math.max(0, loadingState.minTime - displayTime);
        
        // Function to actually hide the overlay
        const doHide = () => {
            if (!loadingState.overlay) return;
            
            if (immediate) {
                loadingState.overlay.remove();
                cleanup();
            } else {
                loadingState.overlay.classList.add('fade-out');
                setTimeout(() => {
                    if (loadingState.overlay) {
                        loadingState.overlay.remove();
                    }
                    cleanup();
                }, CONFIG.fadeOutDuration);
            }
            
            log('Loading screen hidden');
        };
        
        // If we haven't shown for minimum time, delay hiding
        if (remainingTime > 0 && !immediate) {
            log(`Delaying hide for ${remainingTime}ms to meet minimum display time`);
            loadingState.hideTimeout = setTimeout(doHide, remainingTime);
        } else {
            doHide();
        }
    }
    
    /**
     * Clean up after hiding
     */
    function cleanup() {
        document.body.classList.remove('vespa-loading-active');
        document.body.style.overflow = '';
        
        // Clear state
        loadingState = {
            isActive: false,
            startTime: null,
            currentText: '',
            overlay: null,
            progressElement: null,
            hideTimeout: null
        };
        
        // Clear global flags
        window._loadingScreenActive = false;
        window._universalLoadingActive = false;
    }
    
    /**
     * Update the main loading text
     */
    function updateText(text) {
        if (!loadingState.overlay) return;
        
        const textElement = loadingState.overlay.querySelector('.vespa-universal-loading-text');
        if (textElement) {
            const displayText = CONFIG.texts[text] || text || CONFIG.defaultText;
            textElement.textContent = displayText;
            loadingState.currentText = displayText;
            log('Updated loading text', displayText);
        }
    }
    
    /**
     * Update the progress text
     */
    function updateProgress(text) {
        if (!loadingState.progressElement) return;
        
        loadingState.progressElement.textContent = text;
        log('Updated progress text', text);
    }
    
    /**
     * Check if loading screen is active
     */
    function isActive() {
        return loadingState.isActive;
    }
    
    /**
     * Smart navigation helper - shows appropriate loading screen for navigation
     */
    function showForNavigation(targetScene, source = 'unknown') {
        const text = CONFIG.texts[targetScene] || CONFIG.texts['navigation'];
        show({
            text: text,
            progress: 'Preparing navigation...'
        });
        
        // Update progress after a moment
        setTimeout(() => {
            updateProgress('Loading components...');
        }, 500);
    }
    
    /**
     * Helper for page loads
     */
    function showForPageLoad(pageName) {
        show({
            text: CONFIG.texts[pageName] || CONFIG.texts['page-load'],
            progress: 'Initializing...'
        });
    }
    
    /**
     * Helper for async operations
     */
    function showForOperation(operation, customText) {
        show({
            text: customText || CONFIG.texts[operation] || CONFIG.texts['processing'],
            progress: 'Please wait...'
        });
    }
    
    // Expose the API globally
    window.VespaLoadingScreen = {
        show: show,
        hide: hide,
        updateText: updateText,
        updateProgress: updateProgress,
        isActive: isActive,
        showForNavigation: showForNavigation,
        showForPageLoad: showForPageLoad,
        showForOperation: showForOperation,
        
        // Expose config for runtime customization
        config: CONFIG
    };
    
    // Also expose simpler global functions for convenience
    window.showLoadingScreen = show;
    window.hideLoadingScreen = hide;
    window.updateLoadingProgress = updateProgress;
    
    // Listen for scene changes to auto-show loading screen
    if (window.$ && window.Knack) {
        $(document).on('knack-scene-render.any', function(event, scene) {
            // Auto-hide if still showing from previous navigation
            if (isActive() && !window._navigationInProgress) {
                hide();
            }
        });
    }
    
    // Handle browser back/forward
    window.addEventListener('popstate', function() {
        if (isActive()) {
            hide(true); // Immediate hide for browser navigation
        }
    });
    
    log('Universal Loading Screen Manager initialized');
    
})();
