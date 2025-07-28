/**
 * VESPA Activities Section Enhancement
 * Improves the activities display, making it responsive and mobile-friendly
 * Version 1.0
 */

(function() {
    'use strict';
    
    try {
        console.log('[VESPA Activities Enhancement v1.0] Script loaded at', new Date().toISOString());
    
    let stylesApplied = false;
    let initAttempts = 0;
    const MAX_INIT_ATTEMPTS = 10;
    
    // Mobile detection
    function isMobileDevice() {
        const isMobile = window.innerWidth <= 768 || 
                        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                        ('ontouchstart' in window) ||
                        (navigator.maxTouchPoints > 0);
        console.log('[VESPA Activities Enhancement] Mobile detection:', isMobile, 'Width:', window.innerWidth);
        return isMobile;
    }
    
    // Wait for element helper
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            function checkElement() {
                const element = document.querySelector(selector);
                if (element) {
                    console.log(`[VESPA Activities Enhancement] Found element: ${selector}`);
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    console.warn(`[VESPA Activities Enhancement] Timeout waiting for element: ${selector}`);
                    reject(new Error(`Element ${selector} not found after ${timeout}ms`));
                } else {
                    setTimeout(checkElement, 100);
                }
            }
            
            checkElement();
        });
    }
    
    async function enhanceActivitiesSection() {
        // Check if we're on the activities page
        const currentScene = window.location.hash;
        if (!currentScene.includes('scene_437') && !currentScene.includes('my-vespa')) {
            console.log('[VESPA Activities Enhancement] Not on activities page, skipping');
            return false;
        }
        
        try {
            // Wait for the activities container
            const activitiesContainer = await waitForElement('#view_2959 #activityCardsContainer', 5000);
            
            console.log('[VESPA Activities Enhancement] Activities container found! Applying enhancements');
            
            // Apply CSS fixes (only once)
            if (!stylesApplied) {
                applyStyles();
            }
            
            // Enhance activity cards
            enhanceActivityCards();
            
            // Enhance progress bar
            enhanceProgressBar();
            
            // Add mobile-specific enhancements
            if (isMobileDevice()) {
                addMobileEnhancements();
            }
            
            return true;
        } catch (error) {
            console.error('[VESPA Activities Enhancement] Error during initialization:', error);
            return false;
        }
    }
    
    function enhanceActivityCards() {
        console.log('[VESPA Activities Enhancement] Enhancing activity cards');
        
        // Add animation to cards
        const cards = document.querySelectorAll('._activityItem');
        cards.forEach((card, index) => {
            // Add staggered animation
            card.style.animationDelay = `${index * 0.05}s`;
            card.classList.add('activity-card-enhanced');
            
            // Add touch feedback for mobile
            if (isMobileDevice()) {
                card.addEventListener('touchstart', function() {
                    this.classList.add('touch-active');
                });
                card.addEventListener('touchend', function() {
                    setTimeout(() => this.classList.remove('touch-active'), 200);
                });
            }
        });
        
        // Enhance category containers
        const categories = document.querySelectorAll('.activityCategory, .activityCategoryComplete');
        categories.forEach(category => {
            if (category.children.length === 0) {
                category.style.display = 'none'; // Hide empty categories
            }
        });
    }
    
    function enhanceProgressBar() {
        console.log('[VESPA Activities Enhancement] Enhancing progress bar');
        
        const progressContainer = document.getElementById('activityProgressBarContainer');
        if (progressContainer) {
            progressContainer.classList.add('progress-enhanced');
            
            // Get the progress value
            const progressBar = document.getElementById('completedActivityPercentage');
            if (progressBar) {
                const value = progressBar.value;
                const label = progressContainer.querySelector('label');
                
                // Update label styling based on progress
                if (label) {
                    label.classList.add('progress-label');
                    if (value >= 75) {
                        label.classList.add('high-progress');
                    } else if (value >= 50) {
                        label.classList.add('medium-progress');
                    } else {
                        label.classList.add('low-progress');
                    }
                }
                
                // Add completion celebration
                if (value === 100) {
                    progressContainer.classList.add('complete');
                    label.innerHTML = '100% 🎉';
                }
            }
        }
    }
    
    function addMobileEnhancements() {
        console.log('[VESPA Activities Enhancement] Adding mobile enhancements');
        
        // Add swipe indicators for scrollable areas
        const activityContainers = document.querySelectorAll('#activityCards, #activityCardsComplete');
        activityContainers.forEach(container => {
            if (container.scrollWidth > container.clientWidth) {
                container.classList.add('scrollable');
                
                // Add swipe hint
                const hint = document.createElement('div');
                hint.className = 'swipe-hint';
                hint.innerHTML = '<span>← Swipe for more →</span>';
                container.appendChild(hint);
                
                // Hide hint after first scroll
                container.addEventListener('scroll', function() {
                    const hint = this.querySelector('.swipe-hint');
                    if (hint) {
                        hint.style.opacity = '0';
                        setTimeout(() => hint.remove(), 300);
                    }
                }, { once: true });
            }
        });
    }
    
    function applyStyles() {
        const styleId = 'vespa-activities-enhancements-v1';
        
        // Remove any existing style to force refresh
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        
        // Define VESPA colors if not already defined
        style.textContent = `
            /* VESPA Activities Enhancement Styles v1.0 */
            
            /* Define VESPA color variables */
            :root {
                --visionColor: #ff8f00;
                --effortColor: #86b4f0;
                --systemColor: #72cb44;
                --practiceColor: #7f31a4;
                --attitudeColor: #f032e6;
                --primaryBlue: #079baa;
                --lightBlue: #7bd8d0;
                --darkBlue: #23356f;
            }
            
            /* Container styling */
            #view_2959 {
                padding: 20px;
                max-width: 1200px;
                margin: 0 auto;
            }
            
            #activityCardsContainer {
                margin-top: 20px;
            }
            
            /* Category title styling */
            .activityCategoryTitle {
                margin-bottom: 30px;
            }
            
            .activityCategoryTitle h2 {
                color: #23356f;
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #e0e0e0;
                position: relative;
            }
            
            .activityCategoryTitle h2:after {
                content: '';
                position: absolute;
                bottom: -2px;
                left: 0;
                width: 60px;
                height: 2px;
                background: #079baa;
            }
            
            /* Activity cards container */
            #activityCards,
            #activityCardsComplete {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 15px;
                margin-bottom: 30px;
            }
            
            /* Individual activity card styling */
            ._activityItem {
                display: block;
                padding: 20px;
                border-radius: 12px;
                color: white !important;
                text-decoration: none !important;
                font-weight: 500;
                font-size: 16px;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                position: relative;
                overflow: hidden;
                min-height: 80px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            /* Enhanced card animation */
            .activity-card-enhanced {
                animation: fadeInUp 0.5s ease-out both;
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            /* Hover effects */
            ._activityItem:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
            }
            
            /* Touch feedback */
            ._activityItem.touch-active {
                transform: scale(0.98);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            /* Completed activities styling */
            #activityCardsComplete ._activityItem {
                background-color: #bcbcbc !important;
                position: relative;
            }
            
            #activityCardsComplete ._activityItem span {
                font-size: 24px;
                margin-left: 10px;
            }
            
            /* Progress bar container */
            #activityProgressBarContainer {
                margin-top: 40px;
                padding: 30px;
                background: #f8f9fa;
                border-radius: 12px;
                text-align: center;
            }
            
            #activityProgressBarContainer.progress-enhanced {
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            }
            
            /* Progress label */
            .progress-label {
                display: block;
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 20px;
                transition: color 0.3s ease;
            }
            
            .progress-label.low-progress {
                color: #e74c3c;
            }
            
            .progress-label.medium-progress {
                color: #f39c12;
            }
            
            .progress-label.high-progress {
                color: #27ae60;
            }
            
            /* Progress bar styling */
            progress#completedActivityPercentage {
                width: 100%;
                height: 30px;
                border-radius: 15px;
                overflow: hidden;
                -webkit-appearance: none;
                appearance: none;
            }
            
            progress#completedActivityPercentage::-webkit-progress-bar {
                background-color: #e0e0e0;
                border-radius: 15px;
            }
            
            progress#completedActivityPercentage::-webkit-progress-value {
                background: linear-gradient(135deg, #079baa 0%, #7bd8d0 100%);
                border-radius: 15px;
                transition: width 0.5s ease;
            }
            
            progress#completedActivityPercentage::-moz-progress-bar {
                background: linear-gradient(135deg, #079baa 0%, #7bd8d0 100%);
                border-radius: 15px;
            }
            
            /* Completion celebration */
            #activityProgressBarContainer.complete {
                background: linear-gradient(135deg, #e8f8f5 0%, #d5f4e6 100%);
            }
            
            #activityProgressBarContainer.complete .progress-label {
                color: #27ae60;
                animation: pulse 1s ease-in-out infinite;
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            
            /* Mobile-specific styles */
            @media (max-width: 768px) {
                #view_2959 {
                    padding: 15px;
                }
                
                .activityCategoryTitle h2 {
                    font-size: 20px;
                }
                
                /* Horizontal scroll for mobile */
                #activityCards,
                #activityCardsComplete {
                    display: flex;
                    flex-wrap: nowrap;
                    overflow-x: auto;
                    gap: 12px;
                    padding-bottom: 10px;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                
                #activityCards::-webkit-scrollbar,
                #activityCardsComplete::-webkit-scrollbar {
                    display: none;
                }
                
                ._activityItem {
                    flex: 0 0 250px;
                    font-size: 15px;
                    padding: 18px;
                    min-height: 100px;
                }
                
                /* Swipe hint */
                .swipe-hint {
                    position: absolute;
                    bottom: -25px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 12px;
                    color: #999;
                    opacity: 0.8;
                    transition: opacity 0.3s ease;
                    white-space: nowrap;
                }
                
                .scrollable {
                    position: relative;
                    padding-bottom: 30px;
                }
                
                /* Mobile progress bar */
                #activityProgressBarContainer {
                    padding: 20px;
                    margin-top: 30px;
                }
                
                .progress-label {
                    font-size: 28px;
                }
                
                progress#completedActivityPercentage {
                    height: 25px;
                }
            }
            
            /* Small mobile adjustments */
            @media (max-width: 480px) {
                ._activityItem {
                    flex: 0 0 220px;
                    font-size: 14px;
                    padding: 16px;
                }
            }
            
            /* Hide empty categories */
            .activityCategory:empty,
            .activityCategoryComplete:empty {
                display: none !important;
            }
            
            /* Error message styling */
            #view_2959 h4[style*="color:red"] {
                background: #fee;
                border: 1px solid #fcc;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 20px;
                font-size: 14px;
                font-weight: normal;
            }
        `;
        
        document.head.appendChild(style);
        stylesApplied = true;
        
        console.log('[VESPA Activities Enhancement] Styles applied successfully!');
    }
    
    // Multiple initialization attempts with increasing delays
    async function attemptInitialization() {
        console.log(`[VESPA Activities Enhancement] Initialization attempt ${initAttempts + 1}/${MAX_INIT_ATTEMPTS}`);
        
        const success = await enhanceActivitiesSection();
        
        if (!success && initAttempts < MAX_INIT_ATTEMPTS) {
            initAttempts++;
            const delay = Math.min(500 * initAttempts, 2000);
            console.log(`[VESPA Activities Enhancement] Retrying in ${delay}ms...`);
            setTimeout(attemptInitialization, delay);
        } else if (success) {
            console.log('[VESPA Activities Enhancement] Successfully initialized!');
        } else {
            console.warn('[VESPA Activities Enhancement] Failed to initialize after maximum attempts');
        }
    }
    
    // Initialize on load
    if (typeof $ !== 'undefined') {
        $(function() {
            console.log('[VESPA Activities Enhancement] jQuery ready, attempting initialization');
            attemptInitialization();
        });
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('[VESPA Activities Enhancement] DOM ready, attempting initialization');
            attemptInitialization();
        });
    }
    
    // Re-apply on scene render
    if (typeof $ !== 'undefined') {
        $(document).on('knack-scene-render.scene_437', function() {
            console.log('[VESPA Activities Enhancement] Scene 437 rendered');
            initAttempts = 0;
            attemptInitialization();
        });
        
        // Re-apply on view render
        $(document).on('knack-view-render.view_2959', function() {
            console.log('[VESPA Activities Enhancement] View 2959 rendered');
            initAttempts = 0;
            attemptInitialization();
        });
    }
    
    // Check on hash change
    window.addEventListener('hashchange', function() {
        console.log('[VESPA Activities Enhancement] Hash changed, checking...');
        initAttempts = 0;
        attemptInitialization();
    });
    
    console.log('[VESPA Activities Enhancement v1.0] Initialization complete');
    } catch (error) {
        console.error('[VESPA Activities Enhancement] Error during script execution:', error);
        console.error('[VESPA Activities Enhancement] Stack trace:', error.stack);
    }
})();
