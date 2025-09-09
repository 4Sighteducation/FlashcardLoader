/**
 * Scene 1095 Staff Closing confaching Report Mobile Optimization & Help System
 * Optimizes the VESPA coaching report display for staff members viewing student reports
 * Based on mobileReportFix.js v5.1 - EXACT SAME LOGIC adapted for scene_1095/view_2776
 */

(function() {
    'use strict';
    
    console.log('[Staff Mobile Report Enhancement v1.0] Script loaded at', new Date().toISOString());
    
    let stylesApplied = false;
    let popupsInitialized = false;
    let initAttempts = 0;
    const MAX_INIT_ATTEMPTS = 10;
    
    // More robust mobile detection - FIXED
    function isMobileDevice() {
        // Check multiple conditions for mobile detection
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const smallWidth = window.innerWidth <= 768;
        const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Consider it mobile if it has touch AND (small width OR mobile user agent)
        const isMobile = hasTouch && (smallWidth || mobileUserAgent);
        
        console.log('[Staff Mobile Report Enhancement] Mobile detection:', isMobile, 'Width:', window.innerWidth, 'Touch:', hasTouch, 'UA Mobile:', mobileUserAgent);
        return isMobile;
    }
    
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            function checkElement() {
                const element = document.querySelector(selector);
                if (element) {
                    console.log(`[Staff Mobile Report Enhancement] Found element: ${selector}`);
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    console.warn(`[Staff Mobile Report Enhancement] Timeout waiting for element: ${selector}`);
                    reject(new Error(`Element ${selector} not found after ${timeout}ms`));
                } else {
                    setTimeout(checkElement, 100);
                }
            }
            
            checkElement();
        });
    }
    
    async function fixStaffReport() {
        // Check if we're on the staff coaching report page
        const currentScene = window.location.hash;
        if (!currentScene.includes('scene_1095') && !currentScene.includes('mygroup-vespa-results2')) {
            console.log('[Staff Mobile Report Enhancement] Not on staff coaching report page, skipping');
            return false;
        }
        
        // SKIP FOR EMULATED STUDENTS - Only skip if viewing their OWN report
        const user = Knack.getUserAttributes();
        if (user && user.roles) {
            const hasStaffRole = user.roles.includes('object_7');
            const hasStudentRole = user.roles.includes('object_6');
            
            // Only skip if it's an emulated student viewing their OWN report
            // Check if the report being viewed belongs to the current user
            if (hasStaffRole && hasStudentRole && currentScene.includes('vespa-results')) {
                // Look for the student name in the report to see if it matches current user
                const studentNameElement = document.querySelector('#student-name');
                const currentUserName = user.name || '';
                
                if (studentNameElement && currentUserName) {
                    const reportStudentName = studentNameElement.textContent.trim();
                    if (reportStudentName.toLowerCase().includes(currentUserName.toLowerCase())) {
                        console.log('[Staff Mobile Report Enhancement] Emulated student viewing OWN report - skipping mobile fixes');
                        return false;
                    }
                }
                
                // If we can't determine, allow the enhancements for staff viewing other students
                console.log('[Staff Mobile Report Enhancement] Staff member viewing student report - applying enhancements');
            }
        }
        
        try {
            // Wait for the report container with timeout - try multiple selectors
            const selectors = [
                '#view_2776 #report-container',
                '#view_3015 #report-container', 
                '#kn-scene_1095 #report-container'
            ];
            
            let reportContainer = null;
            for (const selector of selectors) {
                try {
                    reportContainer = await waitForElement(selector, 2000);
                    break;
                } catch (error) {
                    console.log(`[Staff Mobile Report Enhancement] ${selector} not found, trying next...`);
                }
            }
            
            if (!reportContainer) {
                console.log('[Staff Mobile Report Enhancement] No report container found, skipping');
                return false;
            }
            
            console.log('[Staff Mobile Report Enhancement] Report container found! Applying enhancements');
            
            // Apply CSS fixes (only once)
            if (!stylesApplied) {
                applyStyles();
                // Force a reflow on mobile to ensure styles are applied
                if (isMobileDevice()) {
                    document.body.offsetHeight; // Force reflow
                }
            }
            
            // FAILSAFE: Force hide mobile elements on desktop
            if (!isMobileDevice()) {
                console.log('[Staff Mobile Report Enhancement] Desktop detected - force hiding mobile elements');
                const mobileElements = document.querySelectorAll('.mobile-section-heading, .mobile-section-heading-comments, .mobile-section-heading-coaching, .mobile-theme-heading, .mobile-score-display');
                mobileElements.forEach(el => {
                    el.style.cssText = 'display: none !important; visibility: hidden !important; position: absolute !important; left: -9999px !important;';
                });
                
                // Ensure original content is visible
                const originalContent = document.querySelectorAll('.original-theme-content');
                originalContent.forEach(el => {
                    el.style.cssText = 'display: block !important; visibility: visible !important; position: static !important;';
                });
            }
            
            // Initialize features
            if (!popupsInitialized) {
                // Initialize features for ALL screen sizes
                initializeHelpButtons(); // Help modals work on desktop too
                improveInfoButtonContent(); // Universal info button improvements
                interceptActivityLinks(); // Intercept and style activity links
                fixInfoButtonModals(); // Fix info button modals on all screen sizes
                
                // Initialize View Answers enhancements for ALL devices
                initializeViewAnswersEnhancement();
                
                // FIX VIEW ANSWERS BUTTON for ALL devices
                fixViewAnswersButton();
                setTimeout(fixViewAnswersButton, 500);
                setTimeout(fixViewAnswersButton, 1000);
                
                // Initialize VESPA popups for ALL devices (tap to expand)
                initializeVespaPopups(); // Now works on desktop too!
                
                // Mobile-specific initializations
                if (isMobileDevice()) {
                    initializeTextAreaFocus(); // Text area focus only on mobile
                    
                    // Try multiple times to ensure button is hidden
                    hideShowAnswersButton();
                    setTimeout(hideShowAnswersButton, 500);
                    setTimeout(hideShowAnswersButton, 1000);
                    setTimeout(hideShowAnswersButton, 2000);
                    
                    // Fix all modal types on mobile
                    fixAllModalsForMobile();
                }
                
                popupsInitialized = true;
            }
            
            // Fix EFFORT section width issues for ALL devices
            fixEffortSection();
            
            // Mobile-only features
            if (isMobileDevice()) {
                enableZoom();
                // Add mobile section headings - THIS IS THE KEY MISSING PIECE!
                addSectionHeadings();
            }
            
            return true;
        } catch (error) {
            console.error('[Staff Mobile Report Enhancement] Error during initialization:', error);
            return false;
        }
    }
    
    function fixViewAnswersButton() {
        console.log('[Staff Mobile Report Enhancement] Fixing VIEW ANSWERS button');
        
        // Debug: Log all buttons found
        const allButtons = document.querySelectorAll('button.p-button');
        console.log(`[Staff Mobile Report Enhancement] Found ${allButtons.length} p-button elements`);
        
        // Find the VIEW ANSWERS button - it incorrectly has p-button-rounded class
        const viewBtn = Array.from(allButtons).find(b => {
            const hasViewAnswers = b.textContent.includes('VIEW ANSWERS');
            if (hasViewAnswers) {
                console.log('[Staff Mobile Report Enhancement] Found VIEW ANSWERS button with classes:', b.className);
            }
            return hasViewAnswers;
        });
        
        if (viewBtn) {
            // Remove the rounded class that makes it circular
            viewBtn.classList.remove('p-button-rounded');
            viewBtn.classList.remove('p-button-icon-only');
            
            // Apply rectangular styling directly with higher specificity
            viewBtn.style.cssText = `
                min-width: 140px !important;
                width: auto !important;
                height: 44px !important;
                border-radius: 6px !important;
                padding: 10px 20px !important;
                white-space: nowrap !important;
                background-color: #00e5db !important;
                color: #23356f !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                border: none !important;
                box-shadow: 0 2px 8px rgba(0, 229, 219, 0.3) !important;
            `;
            
            // Also ensure the text is visible
            const buttonLabel = viewBtn.querySelector('.p-button-label');
            if (buttonLabel) {
                buttonLabel.style.display = 'inline';
                buttonLabel.style.visibility = 'visible';
            }
            
            console.log('[Staff Mobile Report Enhancement] VIEW ANSWERS button fixed with enhanced styles');
        }
        
        // View Answers enhancement is now initialized earlier for all devices
        
        // Fix header container wrapping
        const topHeader = document.getElementById('top-report-header-container');
        if (topHeader) {
            topHeader.style.flexWrap = 'wrap';
            topHeader.style.gap = '10px';
            topHeader.style.padding = '10px';
            topHeader.style.justifyContent = 'center';
            topHeader.style.alignItems = 'center';
            console.log('[Staff Mobile Report Enhancement] Header wrapping fixed');
        }
        
        // Fix fixed-width containers
        document.querySelectorAll('div[style*="width: 250px"], div[style*="width:250px"]').forEach(div => {
            div.style.width = 'auto';
            div.style.flex = '1 1 auto';
            div.style.minWidth = '200px';
            div.style.maxWidth = '100%';
            div.style.margin = '5px';
        });
        
        // Fix title wrapping
        const titleDiv = document.querySelector('#header-title');
        if (titleDiv) {
            titleDiv.style.flex = '1 1 100%';
            titleDiv.style.width = '100%';
            titleDiv.style.textAlign = 'center';
            
            const title = titleDiv.querySelector('h2, h3, div');
            if (title && title.textContent.includes('VESPA')) {
                title.style.whiteSpace = 'normal';
                title.style.wordWrap = 'break-word';
                title.style.fontSize = '20px';
                title.style.lineHeight = '1.3';
            }
        }
    }
    
    function enableZoom() {
        // Remove or update viewport meta to allow zooming
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.content = 'width=device-width, initial-scale=1.0';
            console.log('[Staff Mobile Report Enhancement] Zoom enabled');
        }
    }
    
    function fixEffortSection() {
        console.log('[Staff Mobile Report Enhancement] Fixing EFFORT section width issues');
        
        // Find the EFFORT section by its blue color - adapt selectors for staff views
        const effortSectionSelectors = [
            '#view_2776 .vespa-report-score[style*="background-color: rgb(134, 180, 240)"]',
            '#view_3015 .vespa-report-score[style*="background-color: rgb(134, 180, 240)"]',
            '#kn-scene_1095 .vespa-report-score[style*="background-color: rgb(134, 180, 240)"]'
        ];
        
        let effortSection = null;
        for (const selector of effortSectionSelectors) {
            effortSection = document.querySelector(selector);
            if (effortSection) break;
        }
        
        if (effortSection) {
            // Get the parent vespa-report container
            const vespaReport = effortSection.closest('.vespa-report');
            
            if (vespaReport) {
                console.log('[Staff Mobile Report Enhancement] Found EFFORT section, applying fixes');
                
                // Debug: Log current styles
                console.log('[DEBUG] EFFORT section computed styles:', {
                    width: window.getComputedStyle(vespaReport).width,
                    maxWidth: window.getComputedStyle(vespaReport).maxWidth,
                    display: window.getComputedStyle(vespaReport).display,
                    marginLeft: window.getComputedStyle(vespaReport).marginLeft,
                    marginRight: window.getComputedStyle(vespaReport).marginRight
                });
                
                // Get all parent elements up to the view container
                let parent = vespaReport.parentElement;
                const viewSelectors = ['view_2776', 'view_3015', 'kn-scene_1095'];
                while (parent && !viewSelectors.some(id => parent.id?.includes(id))) {
                    // Fix width without changing display type
                    parent.style.width = '100%';
                    parent.style.maxWidth = '100%';
                    parent.style.marginLeft = '0';
                    parent.style.marginRight = '0';
                    parent = parent.parentElement;
                }
                
                // Fix the main container width without changing its display type
                vespaReport.style.width = '100%';
                vespaReport.style.maxWidth = '100%';
                vespaReport.style.marginLeft = '0';
                vespaReport.style.marginRight = '0';
                vespaReport.style.boxSizing = 'border-box';
                
                // Only fix width for specific sections, not all children
                const scoreSection = vespaReport.querySelector('.vespa-report-score');
                const commentsSection = vespaReport.querySelector('.vespa-report-comments');
                const coachingSection = vespaReport.querySelector('.vespa-report-coaching-questions');
                
                // Fix score section
                if (scoreSection) {
                    // Preserve the background color
                    const bgColor = scoreSection.style.backgroundColor;
                    // Only adjust width-related properties
                    scoreSection.style.width = '';  // Let it use its natural width
                    scoreSection.style.maxWidth = '100%';
                    scoreSection.style.boxSizing = 'border-box';
                    if (bgColor) {
                        scoreSection.style.backgroundColor = bgColor;
                    }
                }
                
                // Fix comments section width
                if (commentsSection) {
                    commentsSection.style.maxWidth = '100%';
                    commentsSection.style.boxSizing = 'border-box';
                }
                
                // Fix coaching section width
                if (coachingSection) {
                    coachingSection.style.maxWidth = '100%';
                    coachingSection.style.boxSizing = 'border-box';
                }
                
                // Add section headings ONLY on mobile
                if (isMobileDevice()) {
                    console.log('[Staff Mobile Report Enhancement] Adding section headings from fixEffortSection');
                    addSectionHeadings();
                } else {
                    console.log('[Staff Mobile Report Enhancement] Desktop detected in fixEffortSection - skipping headings');
                }
                
                // Compare with other VESPA sections for consistency
                const allVespaReports = document.querySelectorAll('#view_2776 .vespa-report, #view_3015 .vespa-report, #kn-scene_1095 .vespa-report');
                if (allVespaReports.length > 0) {
                    // Get the first non-EFFORT section as reference
                    const referenceSection = Array.from(allVespaReports).find(section => 
                        !section.querySelector('.vespa-report-score[style*="background-color: rgb(134, 180, 240)"]')
                    );
                    
                    if (referenceSection) {
                        // Copy display type from reference section
                        const refDisplay = window.getComputedStyle(referenceSection).display;
                        const refFlexDirection = window.getComputedStyle(referenceSection).flexDirection;
                        console.log('[DEBUG] Reference section display:', refDisplay, 'flex-direction:', refFlexDirection);
                        
                        // Apply same display properties
                        if (refDisplay) {
                            vespaReport.style.display = refDisplay;
                        }
                        if (refFlexDirection && refDisplay === 'flex') {
                            vespaReport.style.flexDirection = refFlexDirection;
                        }
                    }
                }
                
                console.log('[Staff Mobile Report Enhancement] EFFORT section width fixed with preserved layout');
            }
        }
        
        // Set up a MutationObserver to fix EFFORT section if it gets modified
        setupEffortSectionObserver();
    }
    
    function addSectionHeadings() {
        // Only add headings on mobile
        if (!isMobileDevice()) {
            console.log('[Staff Mobile Report Enhancement] Skipping section headings on desktop (width: ' + window.innerWidth + ')');
            
            // Extra safety: remove any mobile headings that might exist
            const mobileHeadings = document.querySelectorAll('.mobile-theme-heading, .mobile-score-display, .mobile-section-heading, .mobile-section-heading-comments, .mobile-section-heading-coaching');
            if (mobileHeadings.length > 0) {
                console.log('[Staff Mobile Report Enhancement] Found ' + mobileHeadings.length + ' mobile headings on desktop - removing them');
                mobileHeadings.forEach(heading => heading.remove());
            }
            return;
        }
        
        console.log('[Staff Mobile Report Enhancement] Adding section headings for mobile');
        
        // Add headings to all VESPA sections on mobile - adapt selectors for staff views
        const vespaSelectors = [
            '#view_2776 .vespa-report',
            '#view_3015 .vespa-report', 
            '#kn-scene_1095 .vespa-report'
        ];
        
        let allVespaReports = [];
        vespaSelectors.forEach(selector => {
            const reports = document.querySelectorAll(selector);
            allVespaReports = allVespaReports.concat(Array.from(reports));
        });
        
        allVespaReports.forEach(report => {
            const scoreSection = report.querySelector('.vespa-report-score');
            const commentsSection = report.querySelector('.vespa-report-comments');
            const coachingSection = report.querySelector('.vespa-report-coaching-questions');
            
            // Extract theme name from score section
            if (scoreSection && !scoreSection.querySelector('.mobile-theme-heading')) {
                const scoreText = scoreSection.innerText || scoreSection.textContent;
                const lines = scoreText.split('\n').filter(line => line.trim());
                const themeName = lines[0]; // Should be VISION, EFFORT, etc.
                
                if (themeName && themeName.match(/^(VISION|EFFORT|SYSTEMS|PRACTICE|ATTITUDE)/i)) {
                    // Create container for original content
                    const originalContent = document.createElement('div');
                    originalContent.className = 'original-theme-content';
                    
                    // Move all existing content to the container
                    while (scoreSection.firstChild) {
                        originalContent.appendChild(scoreSection.firstChild);
                    }
                    
                    // Add new theme heading
                    const themeHeading = document.createElement('h3');
                    themeHeading.className = 'mobile-theme-heading';
                    themeHeading.textContent = themeName;
                    scoreSection.appendChild(themeHeading);
                    
                    // Add back the original content (hidden on mobile)
                    scoreSection.appendChild(originalContent);
                    
                    // Find and display just the score number
                    // Look for a line that's just a number, not necessarily the last line
                    let scoreNumber = null;
                    for (let i = lines.length - 1; i >= 0; i--) {
                        if (/^\d+$/.test(lines[i].trim())) {
                            scoreNumber = lines[i].trim();
                            break;
                        }
                    }
                    
                    if (scoreNumber) {
                        const scoreDisplay = document.createElement('div');
                        scoreDisplay.className = 'mobile-score-display';
                        scoreDisplay.textContent = scoreNumber;
                        scoreSection.appendChild(scoreDisplay);
                    } else {
                        // If we can't find a score, don't add the mobile display
                        console.log('[Staff Mobile Report Enhancement] Could not parse score for', themeName);
                    }
                }
            }
            
            // Add "Comments" heading if it doesn't exist
            if (commentsSection && !commentsSection.querySelector('.mobile-section-heading-comments')) {
                const commentsHeading = document.createElement('h4');
                commentsHeading.className = 'mobile-section-heading mobile-section-heading-comments';
                commentsHeading.textContent = 'Comments';
                commentsSection.insertBefore(commentsHeading, commentsSection.firstChild);
            }
            
            // Add "Coaching Questions" heading if it doesn't exist
            if (coachingSection && !coachingSection.querySelector('.mobile-section-heading-coaching')) {
                const coachingHeading = document.createElement('h4');
                coachingHeading.className = 'mobile-section-heading mobile-section-heading-coaching';
                coachingHeading.textContent = 'Coaching Questions';
                coachingSection.insertBefore(coachingHeading, coachingSection.firstChild);
            }
        });
        
        console.log('[Staff Mobile Report Enhancement] Added section headings for mobile view');
    }
    
    function setupEffortSectionObserver() {
        // Only set up once
        if (window.staffEffortSectionObserver) {
            return;
        }
        
        console.log('[Staff Mobile Report Enhancement] Setting up EFFORT section observer');
        
        const observer = new MutationObserver((mutations) => {
            let shouldFix = false;
            
            mutations.forEach((mutation) => {
                // Check if EFFORT section or its children were modified
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const target = mutation.target;
                    if (target.closest('.vespa-report') && 
                        (target.style.backgroundColor === 'rgb(134, 180, 240)' || 
                         target.closest('.vespa-report')?.querySelector('.vespa-report-score[style*="background-color: rgb(134, 180, 240)"]'))) {
                        shouldFix = true;
                    }
                }
            });
            
            if (shouldFix) {
                console.log('[Staff Mobile Report Enhancement] EFFORT section modified, reapplying fixes');
                // Use a small delay to ensure all changes are complete
                setTimeout(() => {
                    fixEffortSection();
                }, 50);
            }
        });
        
        // Observe the report container - adapt for staff views
        const containerSelectors = ['#view_2776', '#view_3015', '#kn-scene_1095'];
        containerSelectors.forEach(selector => {
            const reportContainer = document.querySelector(selector);
            if (reportContainer) {
                observer.observe(reportContainer, {
                    attributes: true,
                    attributeFilter: ['style'],
                    subtree: true,
                    childList: true
                });
            }
        });
        
        window.staffEffortSectionObserver = observer;
    }
    
    // New function to intercept and style activity links
    function interceptActivityLinks() {
        console.log('[Staff Mobile Report Enhancement] Intercepting activity links...');
        
        // Convert old URL format to new format
        function convertActivityUrl(oldUrl) {
            const pattern1 = /my-vespa\/start-activity\/([a-f0-9]+)\/?/;
            const pattern2 = /activity\/([a-f0-9]+)\/?/;
            
            let match = oldUrl.match(pattern1) || oldUrl.match(pattern2);
            
            if (match && match[1]) {
                const activityId = match[1];
                return `https://vespaacademy.knack.com/vespa-academy#my-vespa-activities?activity=${activityId}&action=start`;
            }
            
            return oldUrl;
        }
        
        // Get theme color based on section
        function getThemeColor(element) {
            const section = element.closest('.vespa-report');
            if (!section) return '#1976d2';
            
            const scoreSection = section.querySelector('.vespa-report-score');
            if (!scoreSection) return '#1976d2';
            
            const bgColor = scoreSection.style.backgroundColor;
            
            // Updated colors to match ACTUAL VESPA app RGB values
            if (bgColor.includes('255, 143, 0')) return '#ff6b35'; // VISION - Orange
            if (bgColor.includes('56, 182, 255')) return '#7bd8d0'; // EFFORT - Light Blue  
            if (bgColor.includes('2, 230, 18')) return '#4CAF50'; // SYSTEMS - Green
            if (bgColor.includes('140, 82, 255')) return '#9C27B0'; // PRACTICE - Purple
            if (bgColor.includes('255, 102, 196')) return '#E91E63'; // ATTITUDE - Pink
            
            return '#1976d2';
        }
        
        // Process all activity links - adapt selectors for staff views
        const selectors = [
            '#view_2776 a[href*="start-activity"]',
            '#view_2776 a[href*="/activity/"]',
            '#view_2776 .vespa-report-coaching-questions a',
            '#view_3015 a[href*="start-activity"]',
            '#view_3015 a[href*="/activity/"]',
            '#view_3015 .vespa-report-coaching-questions a',
            '#kn-scene_1095 a[href*="start-activity"]',
            '#kn-scene_1095 a[href*="/activity/"]',
            '#kn-scene_1095 .vespa-report-coaching-questions a',
            '.vespa-modal-activities a'
        ];
        
        selectors.forEach(selector => {
            const links = document.querySelectorAll(selector);
            
            links.forEach(link => {
                if (link.hasAttribute('data-activity-processed')) return;
                
                const href = link.href || link.getAttribute('href');
                if (!href) return;
                
                // Convert URL
                const newUrl = convertActivityUrl(href);
                link.href = newUrl;
                
                // Style the link
                const themeColor = getThemeColor(link);
                const isMobile = window.innerWidth <= 768;
                
                // Remove any icons first
                link.innerHTML = link.innerHTML.replace('▸', '').replace('🎯', '').trim();
                
                if (isMobile) {
                    // Mobile: Ultra compact chip style
                    link.style.cssText = `
                        display: inline-flex;
                        align-items: center;
                        padding: 2px 6px;
                        margin: 1px;
                        background: linear-gradient(135deg, ${themeColor}15 0%, ${themeColor}25 100%);
                        border: 1px solid ${themeColor}40;
                        border-radius: 10px;
                        color: ${themeColor};
                        text-decoration: none;
                        font-size: 9px;
                        font-weight: 500;
                        transition: all 0.3s ease;
                        box-shadow: 0 1px 3px ${themeColor}10;
                        white-space: nowrap;
                        line-height: 1.1;
                    `;
                } else {
                    // Desktop: Minimal button style
                    link.style.cssText = `
                        display: inline-flex;
                        align-items: center;
                        padding: 3px 8px;
                        margin: 2px;
                        background: linear-gradient(135deg, ${themeColor}10 0%, ${themeColor}20 100%);
                        border: 1px solid ${themeColor}30;
                        border-radius: 6px;
                        color: ${themeColor};
                        text-decoration: none;
                        font-size: 11px;
                        font-weight: 500;
                        transition: all 0.3s ease;
                        box-shadow: 0 1px 4px ${themeColor}08;
                        white-space: nowrap;
                        line-height: 1.2;
                    `;
                }
                
                // Add hover effects
                link.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-2px)';
                    this.style.boxShadow = `0 5px 20px ${themeColor}30`;
                });
                
                link.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0)';
                    this.style.boxShadow = `0 3px 12px ${themeColor}15`;
                });
                
                // Mark as processed
                link.setAttribute('data-activity-processed', 'true');
                
                console.log(`[Staff Mobile Report Enhancement] Updated activity link: ${newUrl}`);
            });
        });
    }
    
    function initializeViewAnswersEnhancement() {
        console.log('[Staff Mobile Report Enhancement] Initializing View Answers enhancement for ALL devices...');
        
        // Check if already initialized to prevent duplicates
        if (window._viewAnswersEnhancementInitialized) {
            console.log('[Staff Mobile Report Enhancement] View Answers enhancement already initialized, skipping...');
            return;
        }
        window._viewAnswersEnhancementInitialized = true;
        
        let currentCycle = 1;
        
        // ========== CREATE CUSTOM CYCLE MODAL ==========
        createCustomCycleModal();
        
        // ========== SIMPLER DATA EXTRACTION FROM PAGE ==========
        function fetchCycleDataFromAPI() {
            console.log('[Staff Mobile Report Enhancement] Extracting cycle data from page...');
            
            try {
                // Get the current student's ID
                const currentStudentId = window.currentReportObject10Id;
                if (!currentStudentId) {
                    console.log('[Staff Mobile Report Enhancement] No student ID found');
                    return {};
                }
                
                console.log('[Staff Mobile Report Enhancement] Looking for student ID:', currentStudentId);
                
                // Get data from the Knack model for view_2716
                if (window.Knack && window.Knack.models && window.Knack.models.view_2716) {
                    const model = window.Knack.models.view_2716;
                    
                    if (model.data && model.data.models) {
                        // Find the student's record by ID
                        const studentRecord = model.data.models.find(record => {
                            const attrs = record.attributes || record;
                            return attrs.id === currentStudentId;
                        });
                        
                        if (studentRecord) {
                            const attrs = studentRecord.attributes || studentRecord;
                            console.log('[Staff Mobile Report Enhancement] Found student record in Knack model');
                            
                            // Extract all questionnaire fields
                            const data = {};
                            Object.keys(attrs).forEach(key => {
                                // Only get questionnaire fields (field_19xx, field_20xx, field_29xx)
                                if (key.match(/^field_(19|20|29)\d{2}$/)) {
                                    const value = attrs[key];
                                    if (value !== undefined && value !== null && value !== '') {
                                        data[key] = value.toString();
                                    }
                                }
                            });
                            
                            console.log(`[Staff Mobile Report Enhancement] Extracted ${Object.keys(data).length} questionnaire fields`);
                            
                            // Debug: Log sample values
                            if (Object.keys(data).length > 0) {
                                console.log('[Staff Mobile Report Enhancement] Sample extracted values:', {
                                    'field_1953 (Q1 C1)': data.field_1953 || 'missing',
                                    'field_1955 (Q1 C2)': data.field_1955 || 'missing',  
                                    'field_1956 (Q1 C3)': data.field_1956 || 'missing',
                                    'field_1980 (Q10 C1)': data.field_1980 || 'missing',
                                    'field_1981 (Q10 C2)': data.field_1981 || 'missing',
                                    'field_1982 (Q10 C3)': data.field_1982 || 'missing'
                                });
                            }
                            
                            window.staffCycleDataFromAPI = data;
                            return data;
                        } else {
                            console.log('[Staff Mobile Report Enhancement] Student record not found in Knack model');
                        }
                    }
                }
                
                // Fallback: Try DOM extraction if Knack model doesn't work
                console.log('[Staff Mobile Report Enhancement] Fallback: trying DOM extraction...');
                const data = {};
                const table = document.querySelector('#view_2716');
                
                if (table && currentStudentId) {
                    console.log('[Staff Mobile Report Enhancement] Found DOM table view_2716');
                    
                    // Find the row that contains the student's data
                    const rows = table.querySelectorAll('tbody tr');
                    let studentRow = null;
                    
                    // Look for the row containing the student's name or ID
                    rows.forEach(row => {
                        const rowText = row.textContent;
                        if (rowText.includes(currentStudentId) || 
                            (window.currentReportStudentEmail && rowText.includes(window.currentReportStudentEmail))) {
                            studentRow = row;
                        }
                    });
                    
                    if (studentRow) {
                        console.log('[Staff Mobile Report Enhancement] Found student row in DOM');
                        const cells = studentRow.querySelectorAll('td');
                        cells.forEach(cell => {
                            const fieldClass = Array.from(cell.classList).find(c => c.startsWith('field_'));
                            if (fieldClass && fieldClass.match(/^field_(19|20|29)\d{2}$/)) {
                                const value = cell.textContent.trim();
                                if (value) {
                                    data[fieldClass] = value;
                                }
                            }
                        });
                        
                        console.log(`[Staff Mobile Report Enhancement] Extracted ${Object.keys(data).length} fields from DOM`);
                        window.staffCycleDataFromAPI = data;
                        return data;
                    }
                } else {
                    console.log('[Staff Mobile Report Enhancement] Could not extract from DOM table');
                }
                
                // Fallback: try to get the selected student's questionnaire data
                const tableData = extractStudentQuestionnaireData();
                if (tableData && Object.keys(tableData).length > 0) {
                    console.log(`[Staff Mobile Report Enhancement] Found ${Object.keys(tableData).length} fields from student data`);
                    window.staffCycleDataFromAPI = tableData;
                    return tableData;
                }
                
                // Method 2: Try Knack models - check multiple views
                if (window.Knack && window.Knack.models) {
                    console.log('[Staff Mobile Report Enhancement] Checking Knack models for questionnaire data...');
                    
                    // List of views that might contain questionnaire data
                    // view_2716 is the primary view for staff viewing student data in scene_1095
                    // view_449 is the Object_10 grid with connected Object_29 fields
                    const viewsToCheck = ['view_2716', 'view_71', 'view_449', 'view_2723', 'view_2751', 'view_69', 'view_3041'];
                    
                    for (const viewId of viewsToCheck) {
                        if (window.Knack.models[viewId]) {
                            console.log(`[Staff Mobile Report Enhancement] Checking model ${viewId}`);
                            
                            // Try to get data from the model
                            let modelData = null;
                            
                            // Check if there's a data collection
                            if (window.Knack.models[viewId].data) {
                                if (typeof window.Knack.models[viewId].data.toJSON === 'function') {
                                    modelData = window.Knack.models[viewId].data.toJSON();
                                } else if (window.Knack.models[viewId].data.models) {
                                    // It's a collection with models array
                                    modelData = window.Knack.models[viewId].data.models.map(m => 
                                        m.attributes || m.toJSON()
                                    );
                                } else {
                                    modelData = window.Knack.models[viewId].data;
                                }
                            } else if (window.Knack.models[viewId].attributes) {
                                // Direct attributes
                                modelData = window.Knack.models[viewId].attributes;
                            }
                            
                            // Check if we found questionnaire data
                            if (modelData) {
                                // Handle array of records
                                if (Array.isArray(modelData)) {
                                    for (const record of modelData) {
                                        if (hasQuestionnaireData(record)) {
                                            console.log(`[Staff Mobile Report Enhancement] Found questionnaire data in ${viewId}`);
                                            window.staffCycleDataFromAPI = record;
                                            return record;
                                        }
                                    }
                                } 
                                // Handle single record
                                else if (hasQuestionnaireData(modelData)) {
                                    console.log(`[Staff Mobile Report Enhancement] Found questionnaire data in ${viewId}`);
                                    window.staffCycleDataFromAPI = modelData;
                                    return modelData;
                                }
                            }
                        }
                    }
                }
                
                // Method 3: Try to find data in the DOM directly
                console.log('[Staff Mobile Report Enhancement] Trying to extract from DOM elements...');
                const domData = extractFromDOM();
                if (domData && Object.keys(domData).length > 0) {
                    console.log(`[Staff Mobile Report Enhancement] Found ${Object.keys(domData).length} fields from DOM`);
                    window.staffCycleDataFromAPI = domData;
                    return domData;
                }
                
                console.log('[Staff Mobile Report Enhancement] No cycle data found on page');
                return {};
                
            } catch (error) {
                console.error('[Staff Mobile Report Enhancement] Error extracting cycle data:', error);
                return {};
            }
        }
        
        // Helper function to check if an object has questionnaire data
        function hasQuestionnaireData(obj) {
            if (!obj || typeof obj !== 'object') return false;
            
            // Check for any of the questionnaire fields
            const questionnaireFields = [
                'field_1953', 'field_1954', 'field_1955', 'field_1956', 'field_1957', 'field_1958',
                'field_1959', 'field_1960', 'field_1961', 'field_1962', 'field_1963', 'field_1964',
                'field_1965', 'field_1966', 'field_1967', 'field_1968', 'field_1969', 'field_1970'
            ];
            
            return questionnaireFields.some(field => obj[field] !== undefined && obj[field] !== null);
        }
        
        // Extract data from DOM elements
        function extractFromDOM() {
            const data = {};
            
            // Look for any elements with field classes
            const fieldElements = document.querySelectorAll('[class*="field_19"], [class*="field_20"], [class*="field_29"]');
            fieldElements.forEach(elem => {
                const classes = Array.from(elem.classList);
                const fieldClass = classes.find(c => c.match(/^field_\d+$/));
                if (fieldClass) {
                    const value = elem.textContent.trim();
                    if (value) {
                        data[fieldClass] = value;
                    }
                }
            });
            
            return data;
        }
        
        // Extract data from hidden table - simpler version like student modal
        // New function to extract student questionnaire data properly
        function extractStudentQuestionnaireData() {
            const data = {};
            
            // For staff viewing student data, check these views in order:
            // view_2716 - Staff view of student questionnaire data in scene_1095 (primary)
            // view_71 - Alternative staff view (if exists)
            // view_69 - Student version questionnaire view (fallback)
            // view_3041 - Main report view might have embedded data
            const viewsToCheck = ['#view_2716', '#view_71', '#view_69', '#view_3041 .hidden-table', '#view_3041 table[style*="display: none"]'];
            
            for (const selector of viewsToCheck) {
                const table = document.querySelector(selector);
                if (table) {
                    console.log(`[Staff Mobile Report Enhancement] Found data table: ${selector}`);
                    
                    // Extract all field data from the table
                    const cells = table.querySelectorAll('td[class*="field_"]');
                    console.log(`[Staff Mobile Report Enhancement] Found ${cells.length} field cells`);
                    
                    cells.forEach(cell => {
                        // Get all field classes (a cell might have multiple)
                        const classes = Array.from(cell.classList).filter(c => c.startsWith('field_'));
                        classes.forEach(fieldClass => {
                            // Try multiple extraction methods
                            let value = cell.textContent.trim();
                            
                            // Also check for span content (Knack often wraps values)
                            const span = cell.querySelector('span');
                            if (span) {
                                const spanValue = span.textContent.trim();
                                if (spanValue) value = spanValue;
                            }
                            
                            // Store the value - including '0' and '1' which are valid Likert values!
                            // Only exclude truly empty or N/A values
                            if (value !== '' && value !== 'N/A' && value !== null && value !== undefined) {
                                data[fieldClass] = value;
                            }
                        });
                    });
                    
                    // If we found cycle data, stop searching
                    if (Object.keys(data).length > 0) {
                        // Debug: Check if we have all three cycles of data
                        console.log('[Staff Mobile Report Enhancement] Sample cycle data:', {
                            'Cycle 1 (field_1953)': data.field_1953 || 'missing',
                            'Cycle 2 (field_1955)': data.field_1955 || 'missing',
                            'Cycle 3 (field_1956)': data.field_1956 || 'missing',
                            'Total fields': Object.keys(data).length
                        });
                        break;
                    }
                }
            }
            
            // If still no data, try to extract from any visible grid/table with questionnaire fields
            if (Object.keys(data).length === 0) {
                console.log('[Staff Mobile Report Enhancement] Trying alternative extraction from visible tables...');
                const allTables = document.querySelectorAll('table');
                for (const table of allTables) {
                    // Skip if table is not visible or is a navigation table
                    if (table.offsetHeight === 0 || table.classList.contains('kn-table-nav')) continue;
                    
                    const cells = table.querySelectorAll('td');
                    cells.forEach(cell => {
                        const fieldClasses = Array.from(cell.classList).filter(c => c.match(/^field_(1953|1955|1956|1954|1957|1958|1959|1960|1961|1962|1963|1964|1965|1966|1967|1968|1969|1970|1971|1972|1973|1974|1975|1976|1977|1978|1979|1980|1981|1982|1983|1984|1985|1986|1987|1988|1989|1990|1991|1992|1993|1994|1995|1996|1997|1998|1999|2000|2001|2002|2003|2004|2005|2006|2007|2008|2009|2010|2011|2012|2013|2014|2015|2016|2017|2018|2019|2020|2021|2022|2023|2024|2025|2026|2027|2028|2029|2030|2031|2032|2033|2034|2035|2036|2037|2038|2039|2040|2041|2042|2043|2044|2045|2927|2928|2929)$/));
                        fieldClasses.forEach(fieldClass => {
                            const value = cell.textContent.trim();
                            if (value && value !== '' && value !== 'N/A') {
                                data[fieldClass] = value;
                            }
                        });
                    });
                    
                    if (Object.keys(data).length > 0) {
                        console.log(`[Staff Mobile Report Enhancement] Found ${Object.keys(data).length} fields from visible table`);
                        break;
                    }
                }
            }
            
            return data;
        }
        
        // Keep the old function for backwards compatibility but rename it
        function extractFromHiddenTable() {
            return extractStudentQuestionnaireData();
        }
        
        // Helper function to extract value from a cell
        function extractCellValue(cell) {
            const cellHTML = cell.innerHTML;
            let value = '';
            
            // Check if this is HTML with span elements
            if (cellHTML.includes('<span') && cellHTML.includes('data-kn="connection-value"')) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = cellHTML;
                const spans = tempDiv.querySelectorAll('span[data-kn="connection-value"]');
                
                if (spans.length >= 1) {
                    value = spans[0].textContent.trim();
                }
            } else {
                // Plain text value
                value = cell.textContent.trim();
            }
            
            return value;
        }
        
        // Fallback function to extract all data from table (old method)
        function extractAllTableData(table) {
            const data = {};
            const cells = table.querySelectorAll('tbody tr td');
            
            cells.forEach(cell => {
                const fieldClass = Array.from(cell.classList).find(c => c.startsWith('field_'));
                if (fieldClass) {
                    const value = extractCellValue(cell);
                    if (value !== '') {
                        data[fieldClass] = value;
                    } else {
                        data[fieldClass] = '0';
                    }
                }
            });
            
            return data;
        }
        
        // Helper function to get the current student's Object_10 record ID or email
        function getCurrentStudentObject10Id() {
            // Method 1: Check if ReportProfiles has already identified the Object_10 ID
            if (window.currentReportObject10Id) {
                console.log('[Staff Mobile Report Enhancement] Using Object_10 ID from ReportProfiles:', window.currentReportObject10Id);
                return window.currentReportObject10Id;
            }
            
            // Method 2: Check if we have the student email from ReportProfiles
            if (window.currentReportStudentEmail) {
                console.log('[Staff Mobile Report Enhancement] Using student email from ReportProfiles:', window.currentReportStudentEmail);
                return window.currentReportStudentEmail;
            }
            
            // Method 3: Try to extract from visible student profile views
            // These views should contain the Object_10 record
            const profileViews = ['view_3015', 'view_2776', 'view_3047'];
            for (const viewId of profileViews) {
                if (window.Knack && window.Knack.models && window.Knack.models[viewId]) {
                    const model = window.Knack.models[viewId];
                    
                    // Try to get the ID
                    if (model.id) {
                        console.log(`[Staff Mobile Report Enhancement] Found student ID from ${viewId}:`, model.id);
                        return model.id;
                    }
                    if (model.attributes) {
                        // Try to get ID
                        if (model.attributes.id) {
                            console.log(`[Staff Mobile Report Enhancement] Found student ID from ${viewId} attributes:`, model.attributes.id);
                            return model.attributes.id;
                        }
                        // Try to get email (field_197)
                        if (model.attributes.field_197) {
                            console.log(`[Staff Mobile Report Enhancement] Found student email from ${viewId}:`, model.attributes.field_197);
                            return model.attributes.field_197;
                        }
                        // Try raw email field
                        if (model.attributes.field_197_raw && model.attributes.field_197_raw.email) {
                            console.log(`[Staff Mobile Report Enhancement] Found student email from ${viewId} raw:`, model.attributes.field_197_raw.email);
                            return model.attributes.field_197_raw.email;
                        }
                    }
                }
            }
            
            // Method 4: Check URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            let studentId = urlParams.get('student_id') || urlParams.get('id');
            if (studentId) {
                console.log('[Staff Mobile Report Enhancement] Found student ID from URL:', studentId);
                return studentId;
            }
            
            // Method 5: Get the student email from the profile name on page (fallback)
            const profileName = document.querySelector('.profile-name, .student-name');
            if (profileName) {
                const studentText = profileName.textContent.trim();
                console.log('[Staff Mobile Report Enhancement] Found student text from profile (fallback):', studentText);
                return studentText;
            }
            
            console.log('[Staff Mobile Report Enhancement] Warning: Could not identify current student');
            return null;
        }
        
        // Helper function to get the current student's name from the page
        function getCurrentStudentName() {
            // Look for student name in various places
            const selectors = [
                '.profile-name',
                '.student-name',
                '[class*="student"][class*="name"]',
                '#view_3015 .field_197', // Student name field
                '#view_2776 h2',
                '#view_3047 h2'
            ];
            
            for (const selector of selectors) {
                const elem = document.querySelector(selector);
                if (elem) {
                    const text = elem.textContent.trim();
                    // Make sure it's not a generic title
                    if (text && !text.includes('VESPA') && !text.includes('Report') && !text.includes('Profile') && text.length > 2) {
                        return text;
                    }
                }
            }
            
            return null;
        }
        
        // ========== CREATE CUSTOM MODAL HTML ==========
        function createCustomCycleModal() {
            // Remove existing modal if present
            const existing = document.getElementById('customStaffCycleModal');
            if (existing) existing.remove();
            
            const modalHtml = `
                <div id="customStaffCycleModal" class="custom-cycle-modal-overlay">
                    <div class="custom-cycle-modal-container">
                        <div class="custom-cycle-modal-header">
                            <h2>Student VESPA Questionnaire Responses - Cycle <span id="staffCycleNumber">${currentCycle}</span></h2>
                            <button class="custom-cycle-modal-close">✕</button>
                        </div>
                        <div class="cycle-selector-bar">
                                <button class="cycle-btn ${currentCycle === 1 ? 'active' : ''}" data-cycle="1">Cycle 1</button>
                                <button class="cycle-btn ${currentCycle === 2 ? 'active' : ''}" data-cycle="2">Cycle 2</button>
                                <button class="cycle-btn ${currentCycle === 3 ? 'active' : ''}" data-cycle="3">Cycle 3</button>
                        </div>
                        <div class="custom-cycle-modal-body">
                            <div class="cycle-data-content"></div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Add event listeners
            const modal = document.getElementById('customStaffCycleModal');
            modal.querySelector('.custom-cycle-modal-close').addEventListener('click', () => {
                modal.style.display = 'none';
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
            
            // Cycle button listeners - handle new location in cycle-selector-bar
            modal.querySelectorAll('.cycle-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    currentCycle = parseInt(btn.dataset.cycle);
                    // Update active state
                    modal.querySelectorAll('.cycle-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    renderModalContent(currentCycle);
                });
            });
        }
        
        // ========== RENDER MODAL CONTENT ==========
        function renderModalContent(cycle) {
            const modal = document.getElementById('customStaffCycleModal');
            const contentDiv = modal.querySelector('.cycle-data-content');
            
            // Clear any existing content first
            contentDiv.innerHTML = '';
            contentDiv.style.display = 'block';
            
            // Get or fetch data
            let data = window.staffCycleDataFromAPI;
            if (!data) {
                data = fetchCycleDataFromAPI();
            }
            
            if (!data || Object.keys(data).length === 0) {
                contentDiv.innerHTML = '<p style="text-align: center; color: #666;">Unable to load student cycle data. Please try again.</p>';
                contentDiv.style.display = 'block';
                return;
            }
            
            // Render the data with progress bars and category colors
            const cycleFieldMappings = getCycleFieldMappings();
            let html = '<div class="cycle-questions-list">';
            
            console.log(`[Staff Mobile Report Enhancement] Rendering data for Cycle ${cycle}`);
            
            // Category colors
            const categoryColors = {
                'VISION': '#ff8f00',
                'EFFORT': '#38b6ff',
                'SYSTEMS': '#02e612',
                'PRACTICE': '#8c52ff',
                'ATTITUDE': '#ff66c4',
                'OUTCOME': '#2196f3'  // Blue for outcome questions
            };
            
            cycleFieldMappings.forEach((mapping, index) => {
                const fieldKey = cycle === 1 ? mapping.fieldIdCycle1 : 
                               cycle === 2 ? mapping.fieldIdCycle2 : 
                               mapping.fieldIdCycle3;
                               
                // Get the value from the data - try both regular and raw
                let value = data[fieldKey] || data[fieldKey + '_raw'] || '';
                
                // Debug specific problematic cycles
                if (index < 3 || index === 9 || index === 31) {  // Log sample questions
                    // Log after numValue is calculated
                    // This will be logged below after numValue calculation
                }
                
                // Handle display - parse the value properly
                // Important: Don't default to '0' if value exists
                if (value === undefined || value === null || value === '') {
                    value = '0';
                }
                
                // Parse as number - handle various formats (decimals, strings, etc.)
                let numValue = 0;
                if (value !== '0' && value) {
                    // Remove any non-numeric characters except decimal point
                    const cleanValue = value.toString().trim().replace(/[^\d.-]/g, '');
                    numValue = Math.round(parseFloat(cleanValue)) || 0;
                    
                    // Ensure value is within Likert scale range (1-5)
                    if (numValue < 0) numValue = 0;
                    if (numValue > 5) numValue = 5;
                }
                
                // Log debug info for sample questions
                if (index < 3 || index === 9 || index === 31) {
                    console.log(`[Staff Mobile Report Enhancement] C${cycle} Q${index+1} (${fieldKey}): raw="${value}" parsed=${numValue}`);
                }
                
                const percentage = (numValue / 5) * 100;  // Likert scale 1-5
                const color = categoryColors[mapping.vespaCategory] || '#079baa';
                
                html += `
                    <div class="cycle-question-item-enhanced">
                        <div class="question-number">Q${index + 1}</div>
                        <div class="question-content">
                            <div class="question-text">${mapping.questionText}</div>
                            <div class="question-response">
                                <div class="progress-bar-container">
                                    <div class="progress-bar-fill" style="width: ${percentage}%; background: ${color};"></div>
                                    <div class="progress-bar-value">${numValue}/5</div>
                                </div>
                            </div>
                        </div>
                        <div class="question-category" style="background: ${color}">${mapping.vespaCategory}</div>
                    </div>
                `;
            });
            
            html += '</div>';
            
            // Update modal content
            contentDiv.innerHTML = html;
            contentDiv.style.display = 'block';
            contentDiv.style.visibility = 'visible';
            
            // Update active button
            modal.querySelectorAll('.cycle-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.cycle == cycle);
            });
            
            // Update header cycle number
            const cycleSpan = document.getElementById('staffCycleNumber');
            if (cycleSpan) {
                cycleSpan.textContent = cycle;
            }
        }
        
        // Helper function to get field mappings with proper question labels
        function getCycleFieldMappings() {
            return [
                { questionText: "I've worked out the next steps I need to take to reach my career goals", vespaCategory: "VISION", fieldIdCycle1: "field_1953", fieldIdCycle2: "field_1955", fieldIdCycle3: "field_1956" },
                { questionText: "I plan and organise my time so that I can fit in all my school work as well as other activities", vespaCategory: "SYSTEMS", fieldIdCycle1: "field_1954", fieldIdCycle2: "field_1957", fieldIdCycle3: "field_1958" },
                { questionText: "I give a lot of attention to my career planning", vespaCategory: "VISION", fieldIdCycle1: "field_1959", fieldIdCycle2: "field_1960", fieldIdCycle3: "field_1961" },
                { questionText: "I complete all my homework on time", vespaCategory: "SYSTEMS", fieldIdCycle1: "field_1962", fieldIdCycle2: "field_1963", fieldIdCycle3: "field_1964" },
                { questionText: "No matter who you are, you can change your intelligence a lot", vespaCategory: "ATTITUDE", fieldIdCycle1: "field_1965", fieldIdCycle2: "field_1966", fieldIdCycle3: "field_1967" },
                { questionText: "I use all my independent study time effectively", vespaCategory: "EFFORT", fieldIdCycle1: "field_1968", fieldIdCycle2: "field_1969", fieldIdCycle3: "field_1970" },
                { questionText: "I test myself on important topics until I remember them", vespaCategory: "PRACTICE", fieldIdCycle1: "field_1971", fieldIdCycle2: "field_1972", fieldIdCycle3: "field_1973" },
                { questionText: "I have a positive view of myself", vespaCategory: "ATTITUDE", fieldIdCycle1: "field_1974", fieldIdCycle2: "field_1975", fieldIdCycle3: "field_1976" },
                { questionText: "I am a hard working student", vespaCategory: "EFFORT", fieldIdCycle1: "field_1977", fieldIdCycle2: "field_1978", fieldIdCycle3: "field_1979" },
                { questionText: "I am confident in my academic ability", vespaCategory: "ATTITUDE", fieldIdCycle1: "field_1980", fieldIdCycle2: "field_1981", fieldIdCycle3: "field_1982" },
                { questionText: "I always meet deadlines", vespaCategory: "SYSTEMS", fieldIdCycle1: "field_1983", fieldIdCycle2: "field_1984", fieldIdCycle3: "field_1985" },
                { questionText: "I spread out my revision, rather than cramming at the last minute", vespaCategory: "PRACTICE", fieldIdCycle1: "field_1986", fieldIdCycle2: "field_1987", fieldIdCycle3: "field_1988" },
                { questionText: "I don't let a poor test/assessment result get me down for too long", vespaCategory: "ATTITUDE", fieldIdCycle1: "field_1989", fieldIdCycle2: "field_1990", fieldIdCycle3: "field_1991" },
                { questionText: "I strive to achieve the goals I set for myself", vespaCategory: "VISION", fieldIdCycle1: "field_1992", fieldIdCycle2: "field_1993", fieldIdCycle3: "field_1994" },
                { questionText: "I summarise important information in diagrams, tables or lists", vespaCategory: "PRACTICE", fieldIdCycle1: "field_1995", fieldIdCycle2: "field_1996", fieldIdCycle3: "field_1997" },
                { questionText: "I enjoy learning new things", vespaCategory: "VISION", fieldIdCycle1: "field_1998", fieldIdCycle2: "field_1999", fieldIdCycle3: "field_2000" },
                { questionText: "I'm not happy unless my work is the best it can be", vespaCategory: "EFFORT", fieldIdCycle1: "field_2001", fieldIdCycle2: "field_2002", fieldIdCycle3: "field_2003" },
                { questionText: "I take good notes in class which are useful for revision", vespaCategory: "SYSTEMS", fieldIdCycle1: "field_2004", fieldIdCycle2: "field_2005", fieldIdCycle3: "field_2006" },
                { questionText: "When revising I mix different kinds of topics/subjects in one study session", vespaCategory: "PRACTICE", fieldIdCycle1: "field_2007", fieldIdCycle2: "field_2008", fieldIdCycle3: "field_2009" },
                { questionText: "I feel I can cope with the pressure at school/college/University", vespaCategory: "ATTITUDE", fieldIdCycle1: "field_2010", fieldIdCycle2: "field_2011", fieldIdCycle3: "field_2012" },
                { questionText: "I work as hard as I can in most classes", vespaCategory: "EFFORT", fieldIdCycle1: "field_2013", fieldIdCycle2: "field_2014", fieldIdCycle3: "field_2015" },
                { questionText: "My books/files are organised", vespaCategory: "SYSTEMS", fieldIdCycle1: "field_2016", fieldIdCycle2: "field_2017", fieldIdCycle3: "field_2018" },
                { questionText: "I study by explaining difficult topics out loud", vespaCategory: "PRACTICE", fieldIdCycle1: "field_2019", fieldIdCycle2: "field_2020", fieldIdCycle3: "field_2021" },
                { questionText: "I'm happy to ask questions in front of a group", vespaCategory: "ATTITUDE", fieldIdCycle1: "field_2022", fieldIdCycle2: "field_2023", fieldIdCycle3: "field_2024" },
                { questionText: "When revising, I work under timed conditions answering exam-style questions", vespaCategory: "PRACTICE", fieldIdCycle1: "field_2025", fieldIdCycle2: "field_2026", fieldIdCycle3: "field_2027" },
                { questionText: "Your intelligence is something about you that you can change very much", vespaCategory: "ATTITUDE", fieldIdCycle1: "field_2028", fieldIdCycle2: "field_2029", fieldIdCycle3: "field_2030" },
                { questionText: "I like hearing feedback about how I can improve", vespaCategory: "ATTITUDE", fieldIdCycle1: "field_2031", fieldIdCycle2: "field_2032", fieldIdCycle3: "field_2033" },
                { questionText: "I can control my nerves in tests/practical assessments", vespaCategory: "ATTITUDE", fieldIdCycle1: "field_2034", fieldIdCycle2: "field_2035", fieldIdCycle3: "field_2036" },
                { questionText: "I know what grades I want to achieve", vespaCategory: "VISION", fieldIdCycle1: "field_2927", fieldIdCycle2: "field_2928", fieldIdCycle3: "field_2929" },
                // Outcome questions
                { questionText: "I have the support I need to achieve this year", vespaCategory: "OUTCOME", fieldIdCycle1: "field_2037", fieldIdCycle2: "field_2038", fieldIdCycle3: "field_2039" },
                { questionText: "I feel equipped to face the study and revision challenges this year", vespaCategory: "OUTCOME", fieldIdCycle1: "field_2040", fieldIdCycle2: "field_2041", fieldIdCycle3: "field_2042" },
                { questionText: "I am confident I will achieve my potential in my final exams", vespaCategory: "OUTCOME", fieldIdCycle1: "field_2043", fieldIdCycle2: "field_2044", fieldIdCycle3: "field_2045" }
            ];
        }
        
        // ========== OVERRIDE VIEW ANSWERS BUTTON ==========
        function overrideViewAnswersButton() {
            // Find the View Answers button
            const findAndOverride = () => {
                const viewAnswersBtn = Array.from(document.querySelectorAll('button')).find(btn => 
                    btn.textContent.includes('VIEW ANSWERS') || btn.textContent.includes('View Answers')
                );
                
                if (viewAnswersBtn && !viewAnswersBtn.dataset.customModalOverride) {
                    viewAnswersBtn.dataset.customModalOverride = 'true';
                    
                    // Clone and replace to remove existing listeners
                    const newBtn = viewAnswersBtn.cloneNode(true);
                    viewAnswersBtn.parentNode.replaceChild(newBtn, viewAnswersBtn);
                    
                    // Add our custom handler
                    newBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        console.log('[Staff Mobile Report Enhancement] View Answers clicked - showing custom modal');
                        
                        // Update current cycle from page buttons
                        const cycleButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
                            const text = btn.textContent.trim();
                            return text === '1' || text === '2' || text === '3';
                        });
                        
                        cycleButtons.forEach((btn, index) => {
                            const opacity = window.getComputedStyle(btn).opacity;
                            if (opacity === '1') {
                                currentCycle = index + 1;
                            }
                        });
                        
                        // Show modal
                        const modal = document.getElementById('customStaffCycleModal');
                        modal.style.display = 'flex';
                        
                        // Render content after a small delay to ensure modal is visible
                        setTimeout(() => {
                            renderModalContent(currentCycle);
                        }, 100);
                    });
                    
                    console.log('[Staff Mobile Report Enhancement] View Answers button overridden with custom modal');
                }
            };
            
            // Try immediately and after delays
            findAndOverride();
            setTimeout(findAndOverride, 500);
            setTimeout(findAndOverride, 1000);
            setTimeout(findAndOverride, 2000);
        }
        
        // Call the override function
        overrideViewAnswersButton();
        
        /* OLD INTERCEPTOR CODE - DISABLED
        // CORRECTED FIELD MAPPINGS from object_29json.json
        const cycleFieldMappings = [
            { questionId: "q1", currentCycleFieldId: "field_794", fieldIdCycle1: "field_1953", fieldIdCycle2: "field_1955", fieldIdCycle3: "field_1956" },
            { questionId: "q2", currentCycleFieldId: "field_795", fieldIdCycle1: "field_1954", fieldIdCycle2: "field_1957", fieldIdCycle3: "field_1958" },
            { questionId: "q3", currentCycleFieldId: "field_796", fieldIdCycle1: "field_1959", fieldIdCycle2: "field_1960", fieldIdCycle3: "field_1961" },
            { questionId: "q4", currentCycleFieldId: "field_797", fieldIdCycle1: "field_1962", fieldIdCycle2: "field_1963", fieldIdCycle3: "field_1964" },
            { questionId: "q5", currentCycleFieldId: "field_798", fieldIdCycle1: "field_1965", fieldIdCycle2: "field_1966", fieldIdCycle3: "field_1967" },
            { questionId: "q6", currentCycleFieldId: "field_799", fieldIdCycle1: "field_1968", fieldIdCycle2: "field_1969", fieldIdCycle3: "field_1970" },
            { questionId: "q7", currentCycleFieldId: "field_800", fieldIdCycle1: "field_1971", fieldIdCycle2: "field_1972", fieldIdCycle3: "field_1973" },
            { questionId: "q8", currentCycleFieldId: "field_801", fieldIdCycle1: "field_1974", fieldIdCycle2: "field_1975", fieldIdCycle3: "field_1976" },
            { questionId: "q9", currentCycleFieldId: "field_802", fieldIdCycle1: "field_1977", fieldIdCycle2: "field_1978", fieldIdCycle3: "field_1979" },
            { questionId: "q10", currentCycleFieldId: "field_803", fieldIdCycle1: "field_1980", fieldIdCycle2: "field_1981", fieldIdCycle3: "field_1982" },
            { questionId: "q11", currentCycleFieldId: "field_804", fieldIdCycle1: "field_1983", fieldIdCycle2: "field_1984", fieldIdCycle3: "field_1985" },
            { questionId: "q12", currentCycleFieldId: "field_805", fieldIdCycle1: "field_1986", fieldIdCycle2: "field_1987", fieldIdCycle3: "field_1988" },
            { questionId: "q13", currentCycleFieldId: "field_806", fieldIdCycle1: "field_1989", fieldIdCycle2: "field_1990", fieldIdCycle3: "field_1991" },
            { questionId: "q14", currentCycleFieldId: "field_807", fieldIdCycle1: "field_1992", fieldIdCycle2: "field_1993", fieldIdCycle3: "field_1994" },
            { questionId: "q15", currentCycleFieldId: "field_808", fieldIdCycle1: "field_1995", fieldIdCycle2: "field_1996", fieldIdCycle3: "field_1997" },
            { questionId: "q16", currentCycleFieldId: "field_809", fieldIdCycle1: "field_1998", fieldIdCycle2: "field_1999", fieldIdCycle3: "field_2000" },
            { questionId: "q17", currentCycleFieldId: "field_810", fieldIdCycle1: "field_2001", fieldIdCycle2: "field_2002", fieldIdCycle3: "field_2003" },
            { questionId: "q18", currentCycleFieldId: "field_811", fieldIdCycle1: "field_2004", fieldIdCycle2: "field_2005", fieldIdCycle3: "field_2006" },
            { questionId: "q19", currentCycleFieldId: "field_812", fieldIdCycle1: "field_2007", fieldIdCycle2: "field_2008", fieldIdCycle3: "field_2009" },
            { questionId: "q20", currentCycleFieldId: "field_813", fieldIdCycle1: "field_2010", fieldIdCycle2: "field_2011", fieldIdCycle3: "field_2012" },
            { questionId: "q21", currentCycleFieldId: "field_814", fieldIdCycle1: "field_2013", fieldIdCycle2: "field_2014", fieldIdCycle3: "field_2015" },
            { questionId: "q22", currentCycleFieldId: "field_815", fieldIdCycle1: "field_2016", fieldIdCycle2: "field_2017", fieldIdCycle3: "field_2018" },
            { questionId: "q23", currentCycleFieldId: "field_816", fieldIdCycle1: "field_2019", fieldIdCycle2: "field_2020", fieldIdCycle3: "field_2021" },
            { questionId: "q24", currentCycleFieldId: "field_817", fieldIdCycle1: "field_2022", fieldIdCycle2: "field_2023", fieldIdCycle3: "field_2024" },
            { questionId: "q25", currentCycleFieldId: "field_818", fieldIdCycle1: "field_2025", fieldIdCycle2: "field_2026", fieldIdCycle3: "field_2027" },
            { questionId: "q26", currentCycleFieldId: "field_819", fieldIdCycle1: "field_2028", fieldIdCycle2: "field_2029", fieldIdCycle3: "field_2030" },
            { questionId: "q27", currentCycleFieldId: "field_820", fieldIdCycle1: "field_2031", fieldIdCycle2: "field_2032", fieldIdCycle3: "field_2033" },
            { questionId: "q28", currentCycleFieldId: "field_821", fieldIdCycle1: "field_2034", fieldIdCycle2: "field_2035", fieldIdCycle3: "field_2036" },
            { questionId: "q29", currentCycleFieldId: "field_2317", fieldIdCycle1: "field_2927", fieldIdCycle2: "field_2928", fieldIdCycle3: "field_2929" },
            { questionId: "outcome_support", currentCycleFieldId: "field_1816", fieldIdCycle1: "field_2037", fieldIdCycle2: "field_2038", fieldIdCycle3: "field_2039" },
            { questionId: "outcome_equipped", currentCycleFieldId: "field_1817", fieldIdCycle1: "field_2040", fieldIdCycle2: "field_2041", fieldIdCycle3: "field_2042" },
            { questionId: "outcome_confident", currentCycleFieldId: "field_1818", fieldIdCycle1: "field_2043", fieldIdCycle2: "field_2044", fieldIdCycle3: "field_2045" }
        ];
        
        // Extract cycle data from hidden table (view_2716)
        function extractCycleData() {
            const allData = {};
            
            // Check Knack model
            if (window.Knack?.models?.view_2716?.data) {
                const dataCollection = window.Knack.models.view_2716.data;
                if (dataCollection.models && dataCollection.models.length > 0) {
                    dataCollection.models.forEach(model => {
                        const record = model.attributes || model.toJSON();
                        Object.assign(allData, record);
                    });
                }
            }
            
            // Also check DOM
            const table = document.querySelector('#view_2716');
            if (table) {
                const rows = table.querySelectorAll('tbody tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    cells.forEach(cell => {
                        const fieldClass = Array.from(cell.classList).find(c => c.startsWith('field_'));
                        if (fieldClass) {
                            const value = cell.textContent.trim();
                            if (value) {
                                allData[fieldClass] = value;
                            }
                        }
                    });
                });
            }
            
            return allData;
        }
        
        // Get cycle-specific data
        function getCycleSpecificData(cycle) {
            const allData = extractCycleData();
            const cycleData = {};
            const cycleFieldKey = `fieldIdCycle${cycle}`;
            
            cycleFieldMappings.forEach(mapping => {
                const cycleField = mapping[cycleFieldKey];
                const value = allData[cycleField];
                
                if (value !== undefined && value !== '') {
                    cycleData[mapping.currentCycleFieldId] = value;
                    console.log(`[Staff Mobile Report Enhancement] ${mapping.questionId}: ${value} (Cycle ${cycle})`);
                }
            });
            
            window.staffCycleData = cycleData;
            console.log(`[Staff Mobile Report Enhancement] Loaded ${Object.keys(cycleData).length} values for Cycle ${cycle}`);
            return cycleData;
        }
        
        // INTERCEPT API CALLS TO REPLACE WITH CYCLE DATA
        function interceptQuestionnaireData() {
            console.log('[Staff Mobile Report Enhancement] Installing questionnaire data interceptor...');
            
            // Create field mapping lookup
            const fieldMap = {};
            cycleFieldMappings.forEach(mapping => {
                fieldMap[mapping.currentCycleFieldId] = {
                    cycle1: mapping.fieldIdCycle1,
                    cycle2: mapping.fieldIdCycle2,
                    cycle3: mapping.fieldIdCycle3
                };
            });
            
            // Override XMLHttpRequest to intercept API responses
            const originalOpen = XMLHttpRequest.prototype.open;
            const originalSend = XMLHttpRequest.prototype.send;
            
            if (!window._staffXHRIntercepted) {
                window._staffXHRIntercepted = true;
                
                XMLHttpRequest.prototype.open = function(method, url) {
                    this._interceptUrl = url;
                    this._interceptMethod = method;
                    return originalOpen.apply(this, arguments);
                };
                
                XMLHttpRequest.prototype.send = function(body) {
                    const xhr = this;
                    
                    // Check if this is a questionnaire request
                    if (xhr._interceptUrl && (xhr._interceptUrl.includes('questionnaire') || xhr._interceptUrl.includes('view_2775'))) {
                        const originalOnLoad = xhr.onload;
                        
                        xhr.onload = function() {
                            try {
                                const response = JSON.parse(xhr.responseText);
                                console.log('[Staff Mobile Report Enhancement] Intercepted questionnaire response');
                                
                                // Get all available cycle data
                                const allData = extractCycleData();
                                const cycleKey = `fieldIdCycle${currentCycle}`;
                                
                                // Modify response if it contains records
                                if (response && response.records && response.records.length > 0) {
                                    response.records.forEach(record => {
                                        // Replace current cycle fields with historical cycle fields
                                        Object.keys(fieldMap).forEach(currentField => {
                                            if (record[currentField] !== undefined) {
                                                const mapping = fieldMap[currentField];
                                                const cycleField = mapping[`cycle${currentCycle}`];
                                                const cycleValue = allData[cycleField];
                                                
                                                if (cycleValue !== undefined && cycleValue !== null) {
                                                    console.log(`[Staff Mobile Report Enhancement] Replacing ${currentField}: ${record[currentField]} → ${cycleValue} (Cycle ${currentCycle})`);
                                                    record[currentField] = cycleValue;
                                                    record[currentField + '_raw'] = cycleValue;
                                                }
                                            }
                                        });
                                    });
                                    
                                    // Replace response text
                                    Object.defineProperty(xhr, 'responseText', {
                                        writable: true,
                                        value: JSON.stringify(response)
                                    });
                                    
                                    console.log(`[Staff Mobile Report Enhancement] Modified response for Cycle ${currentCycle}`);
                                }
                            } catch (error) {
                                console.error('[Staff Mobile Report Enhancement] Error intercepting response:', error);
                            }
                            
                            if (originalOnLoad) {
                                originalOnLoad.apply(xhr, arguments);
                            }
                        };
                    }
                    
                    return originalSend.apply(this, arguments);
                };
                
                console.log('[Staff Mobile Report Enhancement] XMLHttpRequest interceptor installed');
            }
        }
        
        // Debug: Check if we're on the right page
        console.log('[Staff Mobile Report Enhancement] Current URL hash:', window.location.hash);
        
        // Track cycle button clicks
        function initializeCycleTracking() {
            const cycleButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
                const text = btn.textContent.trim();
                return text === '1' || text === '2' || text === '3' || 
                       text.includes('Cycle 1') || text.includes('Cycle 2') || text.includes('Cycle 3');
            });
            
            console.log(`[Staff Mobile Report Enhancement] Found ${cycleButtons.length} cycle buttons`);
            
            cycleButtons.forEach((btn, index) => {
                // Check if already has listener to prevent duplicates
                if (btn.dataset.cycleListenerAdded) return;
                btn.dataset.cycleListenerAdded = 'true';
                
                btn.addEventListener('click', function() {
                    const btnText = this.textContent.trim();
                    if (btnText === '1' || btnText.includes('Cycle 1')) currentCycle = 1;
                    else if (btnText === '2' || btnText.includes('Cycle 2')) currentCycle = 2;
                    else if (btnText === '3' || btnText.includes('Cycle 3')) currentCycle = 3;
                    
                    console.log(`[Staff Mobile Report Enhancement] Cycle ${currentCycle} selected`);
                    
                    // Update button styles to show selection
                    cycleButtons.forEach(b => b.style.opacity = '0.6');
                    this.style.opacity = '1';
                    this.style.boxShadow = '0 0 0 2px #079baa';
                });
            });
        }
        
        // DISABLED: This function was causing the modal to crash
        // The Vue app needs to render without interference
        function enhanceViewAnswersModal(modal) {
            console.log('[Staff Mobile Report Enhancement] Modal enhancement DISABLED to prevent crashes');
            // DO NOT modify the modal DOM while Vue is rendering
            // This was causing infinite loading spinner
            return;
        }
        
        // TODO: Implement proper data interception for cycle switching
        // Need to intercept the API call or data loading to use:
        // - Cycle 1: field_3309, field_3312, etc.
        // - Cycle 2: field_3310, field_3313, etc.
        // - Cycle 3: field_3311, field_3314, etc.
        // Instead of currentCycleFieldId (field_794, field_795, etc.)
        
        // Watch for View Answers button click - improved selector
        let viewAnswersBtn = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent.includes('VIEW ANSWERS') || 
            btn.getAttribute('aria-label')?.includes('VIEW ANSWERS')
        );
        
        console.log('[Staff Mobile Report Enhancement] View Answers button search result:', viewAnswersBtn ? 'FOUND' : 'NOT FOUND');
        
        if (viewAnswersBtn && !viewAnswersBtn.dataset.enhancementListenerAdded) {
            viewAnswersBtn.dataset.enhancementListenerAdded = 'true';
            console.log('[Staff Mobile Report Enhancement] View Answers button details:', {
                text: viewAnswersBtn.textContent,
                classes: viewAnswersBtn.className,
                ariaLabel: viewAnswersBtn.getAttribute('aria-label')
            });
            
            // Add a safe click handler that loads cycle data
            viewAnswersBtn.addEventListener('click', function(e) {
                console.log('[Staff Mobile Report Enhancement] View Answers clicked - Cycle', currentCycle);
                
                // Load cycle-specific data when button is clicked
                const cycleData = getCycleSpecificData(currentCycle);
                console.log('[Staff Mobile Report Enhancement] Cycle data loaded:', Object.keys(cycleData).length, 'fields');
                
                // Store globally for debugging
                window.staffCycleData = cycleData;
                console.log('[Staff Mobile Report Enhancement] Cycle data available at window.staffCycleData');
            });
        }
        
        // Only set up ONE mutation observer for modals to prevent performance issues
        if (!window._modalObserverInitialized) {
            window._modalObserverInitialized = true;
            
            const observer = new MutationObserver((mutations) => {
                // Process mutations in batches to prevent performance issues
                const modalsToEnhance = [];
                
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.classList?.contains('p-dialog') || 
                                node.getAttribute?.('role') === 'dialog' ||
                                node.querySelector?.('.p-dialog')) {
                                
                                const modal = node.classList?.contains('p-dialog') ? node : node.querySelector('.p-dialog');
                                if (modal && modal.textContent.includes('Question') && !modal.dataset.enhanced) {
                                    modal.dataset.enhanced = 'true';
                                    modalsToEnhance.push(modal);
                                }
                            }
                        }
                    });
                });
                
                // Do not enhance modals - this was causing crashes
                if (modalsToEnhance.length > 0) {
                    console.log('[Staff Mobile Report Enhancement] Modal detected but enhancement disabled to prevent crashes');
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        // Initialize cycle tracking with safeguards
        let cycleTrackingInitialized = false;
        
        if (!cycleTrackingInitialized) {
            try {
                initializeCycleTracking();
                cycleTrackingInitialized = true;
            } catch (error) {
                console.error('[Staff Mobile Report Enhancement] Error in cycle tracking:', error);
            }
        }
        
        console.log('[Staff Mobile Report Enhancement] View Answers enhancement initialized');
        
        // Initialize the interceptor after all functions are defined
        interceptQuestionnaireData();
        */ // END OF OLD INTERCEPTOR CODE
    }
    
    function initializeHelpButtons() {
        console.log('[Staff Mobile Report Enhancement] Initializing help buttons');
        
        // Create TWO modals: one for student response guide (what students see), one for coaching guide
        
        // 1. Student Response Guide Modal (shows what students see)
        if (!document.getElementById('staff-student-guide-modal')) {
            const studentModalHtml = `
                <div id="staff-student-guide-modal" class="help-modal-overlay">
                    <div class="help-modal-content">
                        <div class="help-modal-header" style="background: #079baa !important;">
                            <h2>Student Response Guide (What Students See)</h2>
                            <button class="help-modal-close">&times;</button>
                        </div>
                        <div class="help-modal-body">
                            <div id="staff-student-guide-content"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', studentModalHtml);
            
            // Add close handlers
            const modal = document.getElementById('staff-student-guide-modal');
            const closeBtn = modal.querySelector('.help-modal-close');
            
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
        
        // 2. Coaching Conversation Guide Modal (for staff)
        if (!document.getElementById('staff-coaching-guide-modal')) {
            const coachingModalHtml = `
                <div id="staff-coaching-guide-modal" class="help-modal-overlay">
                    <div class="help-modal-content">
                        <div class="help-modal-header" style="background: #5899a8 !important;">
                            <h2>Coaching Conversation Guide</h2>
                            <button class="help-modal-close">&times;</button>
                        </div>
                        <div class="help-modal-body">
                            <div id="staff-coaching-guide-content"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', coachingModalHtml);
            
            // Add close handlers
            const modal = document.getElementById('staff-coaching-guide-modal');
            const closeBtn = modal.querySelector('.help-modal-close');
            
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
        
        // 3. Goal-Setting Guide Modal (shows what students see for goals)
        if (!document.getElementById('staff-goals-guide-modal')) {
            const goalsModalHtml = `
                <div id="staff-goals-guide-modal" class="help-modal-overlay">
                    <div class="help-modal-content">
                        <div class="help-modal-header" style="background: #1976d2 !important;">
                            <h2>Student Goal-Setting Guide (What Students See)</h2>
                            <button class="help-modal-close">&times;</button>
                        </div>
                        <div class="help-modal-body">
                            <div id="staff-goals-guide-content"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', goalsModalHtml);
            
            // Add close handlers
            const modal = document.getElementById('staff-goals-guide-modal');
            const closeBtn = modal.querySelector('.help-modal-close');
            
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
        
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            // Debug: Check what we're working with
            console.log('[Staff Mobile Report Enhancement] Checking for comment sections...');
            
            // Process comment sections directly - target .comment-section elements
            const commentSections = document.querySelectorAll('.comment-section');
            console.log(`[Staff Mobile Report Enhancement] Found ${commentSections.length} comment sections directly`);
            
            if (commentSections.length > 0) {
                commentSections.forEach((section, index) => {
                // Check if buttons already exist
                if (section.querySelector('.help-writing-btn')) {
                    console.log(`[Staff Mobile Report Enhancement] Section ${index + 1} already has button`);
                    return;
                }
                
                // Look for a label or header above this section for proper identification
                const parent = section.parentElement;
                const grandparent = parent?.parentElement;
                
                // Search for labels in various locations
                let sectionLabel = null;
                
                // Check previous siblings for labels
                let prevSibling = section.previousElementSibling;
                let checkCount = 0;
                while (prevSibling && !sectionLabel && checkCount < 5) {
                    // Check if this element is a label
                    if (prevSibling.tagName === 'LABEL' || prevSibling.classList?.contains('kn-label') ||
                        prevSibling.tagName === 'H3' || prevSibling.tagName === 'H4' ||
                        prevSibling.querySelector?.('label, .kn-label')) {
                        const labelEl = prevSibling.querySelector?.('label, .kn-label') || prevSibling;
                        sectionLabel = labelEl.textContent?.trim();
                        break;
                    }
                    prevSibling = prevSibling.previousElementSibling;
                    checkCount++;
                }
                
                // If no label found, check parent for labels
                if (!sectionLabel && parent) {
                    const parentLabel = parent.querySelector('label, .kn-label, h3, h4');
                    if (parentLabel && parentLabel !== section) {
                        sectionLabel = parentLabel.textContent?.trim();
                    }
                }
                
                // Check for field classes that might indicate the section type
                const sectionClasses = section.className || '';
                const parentClasses = parent?.className || '';
                const grandparentClasses = grandparent?.className || '';
                const allClasses = `${sectionClasses} ${parentClasses} ${grandparentClasses}`;
                
                const hasField211 = allClasses.includes('field_211'); // Likely Student Response
                const hasField209 = allClasses.includes('field_209'); // Likely Coaching Record  
                const hasField217 = allClasses.includes('field_217'); // Likely Goals
                
                console.log(`[Staff Mobile Report Enhancement] Section ${index + 1} analysis:`);
                console.log(`  - Label found: "${sectionLabel || 'none'}"`);
                console.log(`  - Field classes: field_211=${hasField211}, field_209=${hasField209}, field_217=${hasField217}`);
                console.log(`  - Position: ${index + 1} of ${commentSections.length}`);
                
                // Determine section type by label, field class, or position
                let isStudentResponseSection = false;
                let isCoachingSection = false;
                let isGoalsSection = false;
                
                const labelLower = (sectionLabel || '').toLowerCase();
                
                // First priority: Check label text
                if (labelLower.includes('student') && (labelLower.includes('response') || labelLower.includes('reflection'))) {
                    isStudentResponseSection = true;
                    console.log(`  → Identified as: STUDENT RESPONSE (by label)`);//Changed arrow for consistency
                } else if (labelLower.includes('coaching') || (labelLower.includes('coach') && labelLower.includes('record'))) {
                    isCoachingSection = true;
                    console.log(`  → Identified as: COACHING RECORD (by label)`);
                } else if (labelLower.includes('goal') || labelLower.includes('action') || labelLower.includes('plan')) {
                    isGoalsSection = true;
                    console.log(`  → Identified as: GOALS/ACTION PLAN (by label)`);
                }
                // Second priority: Check field classes
                else if (hasField211) {
                    isStudentResponseSection = true;
                    console.log(`  → Identified as: STUDENT RESPONSE (by field_211)`);
                } else if (hasField209) {
                    isCoachingSection = true;
                    console.log(`  → Identified as: COACHING RECORD (by field_209)`);
                } else if (hasField217) {
                    isGoalsSection = true;
                    console.log(`  → Identified as: GOALS/ACTION PLAN (by field_217)`);
                }
                // Third priority: Use position (most reliable fallback)
                else {
                    if (index === 0) {
                        isStudentResponseSection = true;
                        console.log(`  → Identified as: STUDENT RESPONSE (by position: first)`);
                    } else if (index === 1) {
                        isCoachingSection = true;
                        console.log(`  → Identified as: COACHING RECORD (by position: middle)`);
                    } else {
                        isGoalsSection = true;
                        console.log(`  → Identified as: GOALS/ACTION PLAN (by position: last)`);
                    }
                }
                
                if (isStudentResponseSection) {
                    // Add button to show what students see
                    const studentGuideBtn = document.createElement('button');
                    studentGuideBtn.className = 'help-writing-btn student-guide-btn';
                    studentGuideBtn.innerHTML = '<span>👁️</span> See Student Response Guide';
                    studentGuideBtn.style.cssText = 'background: #079baa !important; margin-bottom: 10px !important;';
                    
                    const firstChild = section.firstElementChild;
                    if (firstChild) {
                        section.insertBefore(studentGuideBtn, firstChild);
                    } else {
                        section.appendChild(studentGuideBtn);
                    }
                    
                    studentGuideBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const modal = document.getElementById('staff-student-guide-modal');
                        const contentDiv = document.getElementById('staff-student-guide-content');
                        
                        // Show the same content students see
                        contentDiv.innerHTML = `
                            <div class="response-guide-content">
                                <div class="guide-intro">
                                    <p>This is what students see when they click "Need help writing a response?"</p>
                                    <p style="margin-top: 10px;">Your students are guided to provide detailed responses that help you understand their unique situation:</p>
                                </div>
                                
                                <h3>📊 Reflecting on Your VESPA Scores</h3>
                                <div class="guide-section">
                                    <p>Students are asked to consider:</p>
                                    <ul>
                                        <li><strong>Score accuracy</strong> - Do the scores feel right?</li>
                                        <li><strong>Surprises</strong> - Any unexpected highs or lows?</li>
                                        <li><strong>Strengths & growth areas</strong> - What the scores reveal</li>
                                    </ul>
                                    
                                    <div class="sentence-starters">
                                        <h4>Sentence starters provided:</h4>
                                        <p class="starter">"Looking at my scores, I was surprised to see..."</p>
                                        <p class="starter">"My [highest/lowest] score in [area] makes sense because..."</p>
                                    </div>
                                </div>
                                
                                <h3>📚 Current Study Experience</h3>
                                <div class="guide-section">
                                    <p>Students describe:</p>
                                    <ul>
                                        <li><strong>Daily reality</strong> - Typical study sessions</li>
                                        <li><strong>Challenges</strong> - Current difficulties</li>
                                        <li><strong>Successes</strong> - What's working well</li>
                                    </ul>
                                    
                                    <div class="sentence-starters">
                                        <h4>Examples given:</h4>
                                        <p class="starter">"Right now, I'm finding it hard to..."</p>
                                        <p class="starter">"My biggest challenge with studying is..."</p>
                                    </div>
                                </div>
                                
                                <h3>🎯 Goals & Support Needed</h3>
                                <div class="guide-section">
                                    <p>Students share:</p>
                                    <ul>
                                        <li><strong>Immediate priorities</strong></li>
                                        <li><strong>Long-term goals</strong></li>
                                        <li><strong>Support they need</strong></li>
                                    </ul>
                                </div>
                            </div>
                        `;
                        
                        modal.classList.add('active');
                        console.log('[Staff Mobile Report Enhancement] Opened student guide modal');
                    });
                }
                
                // Add coaching conversation guide button ONLY for coaching record section
                if (isCoachingSection) {
                    const coachingBtn = document.createElement('button');
                    coachingBtn.className = 'help-writing-btn coaching-guide-btn';
                    coachingBtn.innerHTML = '<span>💬</span> Coaching Conversation Guide';
                    coachingBtn.style.cssText = 'background: #5899a8 !important;';
                    
                    const firstChild = section.firstElementChild;
                    if (firstChild) {
                        section.insertBefore(coachingBtn, firstChild);
                    } else {
                        section.appendChild(coachingBtn);
                    }
                    
                    coachingBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const modal = document.getElementById('staff-coaching-guide-modal');
                        const contentDiv = document.getElementById('staff-coaching-guide-content');
                        
                        // Enhanced coaching conversation guide
                        contentDiv.innerHTML = `
                            <div class="coaching-guide-content">
                                <div class="guide-intro" style="background: #e8f4f8; padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #5899a8;">
                                    <p style="margin: 0; color: #1a4d4d; font-weight: 500;">Effective coaching conversations build trust, encourage reflection, and empower students to take ownership of their learning journey.</p>
                                </div>
                                
                                <h3>🎯 Opening the Conversation</h3>
                                <div class="guide-section">
                                    <p>Start with appreciation and curiosity:</p>
                                    <ul>
                                        <li><strong>Acknowledge their effort:</strong> "Thank you for sharing your thoughts about..."</li>
                                        <li><strong>Show you've read their response:</strong> "I noticed you mentioned..."</li>
                                        <li><strong>Express genuine interest:</strong> "I'd love to understand more about..."</li>
                                    </ul>
                                    
                                    <div class="conversation-starters">
                                        <h4>Opening phrases:</h4>
                                        <p class="starter">"I appreciate your honesty about [specific challenge]..."</p>
                                        <p class="starter">"Your reflection on [score/area] shows good self-awareness..."</p>
                                        <p class="starter">"Let's explore what you said about..."</p>
                                    </div>
                                </div>
                                
                                <h3>💭 Facilitating Reflection</h3>
                                <div class="guide-section">
                                    <p>Guide students to deeper insights:</p>
                                    <ul>
                                        <li><strong>Explore patterns:</strong> Help them see connections across themes</li>
                                        <li><strong>Challenge gently:</strong> Question assumptions without judgment</li>
                                        <li><strong>Celebrate progress:</strong> Highlight improvements, however small</li>
                                        <li><strong>Normalize struggles:</strong> Share that challenges are part of growth</li>
                                    </ul>
                                    
                                    <div class="conversation-starters">
                                        <h4>Reflective questions:</h4>
                                        <p class="starter">"What do you think is behind your [high/low] score in...?"</p>
                                        <p class="starter">"How does this connect to what you told me about...?"</p>
                                        <p class="starter">"What would success look like for you in this area?"</p>
                                        <p class="starter">"What's one small change that might make a difference?"</p>
                                    </div>
                                </div>
                                
                                <h3>📝 Collaborative Action Planning</h3>
                                <div class="guide-section">
                                    <p>Co-create next steps with the student:</p>
                                    <ul>
                                        <li><strong>Start small:</strong> Focus on 1-2 achievable actions</li>
                                        <li><strong>Be specific:</strong> "This week" not "soon"</li>
                                        <li><strong>Student-led:</strong> Let them propose solutions first</li>
                                        <li><strong>Remove barriers:</strong> Problem-solve obstacles together</li>
                                    </ul>
                                    
                                    <div class="conversation-starters">
                                        <h4>Action-focused prompts:</h4>
                                        <p class="starter">"Based on our discussion, what feels like a good first step?"</p>
                                        <p class="starter">"How can I support you with...?"</p>
                                        <p class="starter">"What might get in the way, and how can we plan for that?"</p>
                                        <p class="starter">"When would be a good time to check in on progress?"</p>
                                    </div>
                                </div>
                                
                                <h3>🌟 Closing with Confidence</h3>
                                <div class="guide-section">
                                    <p>End on an empowering note:</p>
                                    <ul>
                                        <li><strong>Summarize commitments:</strong> Both theirs and yours</li>
                                        <li><strong>Express confidence:</strong> Show you believe in them</li>
                                        <li><strong>Open door:</strong> Remind them you're available</li>
                                        <li><strong>Set follow-up:</strong> Schedule next check-in</li>
                                    </ul>
                                    
                                    <div class="conversation-starters">
                                        <h4>Closing statements:</h4>
                                        <p class="starter">"I'm confident you can make progress with..."</p>
                                        <p class="starter">"Remember, I'm here if you need support with..."</p>
                                        <p class="starter">"I look forward to hearing how [specific action] goes..."</p>
                                    </div>
                                </div>
                                
                                <div class="coaching-tips" style="background: #fff9e6; border: 1px solid #ffd700; padding: 16px; margin: 20px 0; border-radius: 8px;">
                                    <h4 style="color: #856404; margin: 0 0 12px 0;">🔑 Key Principles</h4>
                                    <ul style="margin: 0; padding-left: 24px;">
                                        <li style="color: #704000; margin-bottom: 8px;"><strong>Listen more than you speak</strong> - Their insights matter most</li>
                                        <li style="color: #704000; margin-bottom: 8px;"><strong>Ask, don't tell</strong> - Questions empower; advice can disempower</li>
                                        <li style="color: #704000; margin-bottom: 8px;"><strong>Focus on strengths</strong> - Build from what's working</li>
                                        <li style="color: #704000; margin-bottom: 8px;"><strong>Small steps count</strong> - Progress over perfection</li>
                                        <li style="color: #704000;">                        <strong>Partnership approach</strong> - You're allies, not adversaries</li>
                                    </ul>
                                </div>
                            </div>
                        `;
                        
                        modal.classList.add('active');
                        console.log('[Staff Mobile Report Enhancement] Opened coaching guide modal');
                    });
                }
                
                // Add goal-setting guide button ONLY for goals section
                if (isGoalsSection) {
                    const goalsGuideBtn = document.createElement('button');
                    goalsGuideBtn.className = 'help-writing-btn goals-guide-btn';
                    goalsGuideBtn.innerHTML = '<span>🎯</span> See Student Goal-Setting Guide';
                    goalsGuideBtn.style.cssText = 'background: #1976d2 !important; margin-bottom: 10px !important;';
                    
                    const firstChild = section.firstElementChild;
                    if (firstChild) {
                        section.insertBefore(goalsGuideBtn, firstChild);
                    } else {
                        section.appendChild(goalsGuideBtn);
                    }
                    
                    goalsGuideBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const modal = document.getElementById('staff-goals-guide-modal');
                        const contentDiv = document.getElementById('staff-goals-guide-content');
                        
                        // Show the same content students see for goal setting
                        contentDiv.innerHTML = `
                            <div class="goal-tips">
                                <p style="background: #e8f4f8; padding: 12px; border-radius: 6px; margin-bottom: 20px;">
                                    <strong>This is what students see when they click "Need help setting effective goals?"</strong>
                                </p>
                                
                                <h3>Tips for Effective Study Goals</h3>
                                <ul>
                                    <li><strong>Keep them specific and achievable</strong> - Instead of "study more", try "complete 2 practice papers this week"</li>
                                    <li><strong>Focus on approach goals</strong> - Set targets you're working towards, not things you're trying to avoid</li>
                                    <li><strong>Make them measurable</strong> - Include numbers or specific outcomes so you know when you've achieved them</li>
                                    <li><strong>Set a timeframe</strong> - Give yourself a deadline to create urgency and track progress</li>
                                </ul>
                                
                                <h3>Types of Effective Approach Goals</h3>
                                <div class="goal-type" style="background: #f8f9fa; padding: 12px; margin: 12px 0; border-radius: 6px; border-left: 4px solid #1976d2;">
                                    <h4>🎯 Performance Goals</h4>
                                    <p style="font-style: italic; color: #1976d2;">"I want to achieve 75% or higher in my next test"</p>
                                    <p class="goal-description" style="color: #666; font-size: 14px;">Focus on achieving a specific ranking or score</p>
                                </div>
                                
                                <div class="goal-type" style="background: #f8f9fa; padding: 12px; margin: 12px 0; border-radius: 6px; border-left: 4px solid #4CAF50;">
                                    <h4>📈 Mastery Goals</h4>
                                    <p style="font-style: italic; color: #4CAF50;">"I will improve my essay structure by practicing introductions daily"</p>
                                    <p class="goal-description" style="color: #666; font-size: 14px;">Focus on developing specific skills</p>
                                </div>
                                
                                <div class="goal-type" style="background: #f8f9fa; padding: 12px; margin: 12px 0; border-radius: 6px; border-left: 4px solid #ff6b35;">
                                    <h4>🏆 Personal Best Goals</h4>
                                    <p style="font-style: italic; color: #ff6b35;">"I aim to beat my previous score of 68% by at least 5%"</p>
                                    <p class="goal-description" style="color: #666; font-size: 14px;">Focus on improving your own previous performance</p>
                                </div>
                                
                                <div class="avoid-section" style="background: #fff3e0; border: 1px solid #ff9800; padding: 12px; margin: 20px 0; border-radius: 6px;">
                                    <h4 style="color: #e65100;">❌ Students Are Encouraged to Avoid These Types of Goals</h4>
                                    <ul style="color: #bf360c;">
                                        <li>"I just don't want to fail" (avoidance goal)</li>
                                        <li>"I hope I don't run out of time" (focuses on negative)</li>
                                        <li>"As long as I pass" (lacks ambition)</li>
                                    </ul>
                                </div>
                                
                                <div class="goal-prompt" style="background: #e8f4f8; padding: 16px; border-radius: 8px; margin-top: 20px; border: 2px solid #1976d2;">
                                    <p style="margin: 0; color: #0d47a1; font-weight: 600;">
                                        Students are prompted to write goals focusing on what they want to achieve, not what they want to avoid!
                                    </p>
                                </div>
                            </div>
                        `;
                        
                        modal.classList.add('active');
                        console.log('[Staff Mobile Report Enhancement] Opened student goals guide modal');
                    });
                }
                });
            }
            
            console.log(`[Staff Mobile Report Enhancement] Added help buttons to comment sections`);
            
            // If no sections were found, try a simpler approach with more delay
            if (commentSections.length === 0) {
                console.log('[Staff Mobile Report Enhancement] No sections found with primary method, trying fallback with additional delay...');
                
                // Wait a bit more for dynamic content to load
                setTimeout(() => {
                    // Look for any textareas or Quill editors on the page
                    const allTextareas = document.querySelectorAll('textarea, .ql-editor, [contenteditable="true"]');
                    console.log(`[Staff Mobile Report Enhancement] Found ${allTextareas.length} textareas/editors on page after delay`);
                
                allTextareas.forEach((textarea, index) => {
                    const container = textarea.closest('.kn-input') || textarea.parentElement;
                    if (container && !container.querySelector('.help-writing-btn')) {
                        // Add at least the coaching guide button
                        const coachingBtn = document.createElement('button');
                        coachingBtn.className = 'help-writing-btn coaching-guide-btn';
                        coachingBtn.innerHTML = '<span>💬</span> Coaching Conversation Guide';
                        coachingBtn.style.cssText = 'background: #5899a8 !important; margin-bottom: 10px !important;';
                        
                        container.insertBefore(coachingBtn, textarea);
                        
                        coachingBtn.addEventListener('click', function(e) {
                            e.stopPropagation();
                            const modal = document.getElementById('staff-coaching-guide-modal');
                            if (modal) {
                                modal.classList.add('active');
                                console.log('[Staff Mobile Report Enhancement] Opened coaching guide modal (fallback)');
                            }
                        });
                        
                        console.log(`[Staff Mobile Report Enhancement] Added fallback coaching button to textarea ${index}`);
                    }
                });
                }, 1000); // Additional delay for dynamic content
            }
        }, 500); // Short timeout for DOM ready
    }
    
    function initializeVespaPopups() {
        // Initialize for ALL devices
        console.log('[Staff Mobile Report Enhancement] Initializing VESPA popups (tap to expand) for ALL devices');
        
        // Add section headings to all VESPA sections (only on mobile)
        if (isMobileDevice()) {
            addSectionHeadings();
        }
        
        // Create modal container if it doesn't exist
        if (!document.getElementById('staff-vespa-modal-container')) {
            const modalHtml = `
                <div id="staff-vespa-modal-container" class="vespa-modal-overlay">
                    <div class="vespa-modal-content">
                        <div class="vespa-modal-header">
                            <h2 id="staff-vespa-modal-title"></h2>
                            <button class="vespa-modal-close" aria-label="Close modal">&times;</button>
                        </div>
                        <div class="vespa-modal-body">
                            <div class="vespa-modal-score"></div>
                            <div class="vespa-modal-description"></div>
                            <div class="vespa-modal-questions"></div>
                            <div class="vespa-modal-activities"></div>
                        </div>
                    </div>
                </div>
            `;
            
            // Ensure modal is added to body, not inside any container
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Add close handlers
            const modal = document.getElementById('staff-vespa-modal-container');
            const closeBtn = modal.querySelector('.vespa-modal-close');
            
            // Close button handler
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[Staff Mobile Report Enhancement] Close button clicked');
                modal.classList.remove('active');
                modal.style.display = 'none';
                document.body.style.overflow = '';
            });
            
            // Backdrop click handler
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    console.log('[Staff Mobile Report Enhancement] Backdrop clicked');
                    modal.classList.remove('active');
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                }
            });
            
            // Add escape key handler
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('active')) {
                    console.log('[Staff Mobile Report Enhancement] Escape key pressed');
                    modal.classList.remove('active');
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                }
            });
        }
        
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            // Find all VESPA report sections - adapt selectors for staff views
            const vespaSelectors = [
                '#view_2776 .vespa-report',
                '#view_3015 .vespa-report',
                '#kn-scene_1095 .vespa-report'
            ];
            
            let vespaReports = [];
            vespaSelectors.forEach(selector => {
                const reports = document.querySelectorAll(selector);
                vespaReports = vespaReports.concat(Array.from(reports));
            });
            
            vespaReports.forEach((report, idx) => {
                // Skip if already initialized
                if (report.hasAttribute('data-staff-vespa-initialized')) {
                    return;
                }
                
                // Mark as initialized
                report.setAttribute('data-staff-vespa-initialized', 'true');
                
                // Make the section clickable
                report.style.cursor = 'pointer';
                
                // Add click handler
                report.addEventListener('click', function(e) {
                    // Prevent clicking on links, buttons, text areas, or input fields
                    if (e.target.tagName === 'A' || 
                        e.target.tagName === 'BUTTON' || 
                        e.target.tagName === 'TEXTAREA' ||
                        e.target.tagName === 'INPUT' ||
                        e.target.classList.contains('ql-editor') ||
                        e.target.closest('button') ||
                        e.target.closest('.comment-section') ||
                        e.target.closest('.ql-container')) {
                        return;
                    }
                    
                    // Extract data from the section
                    const scoreElement = report.querySelector('.vespa-report-score');
                    const commentsElement = report.querySelector('.vespa-report-comments');
                    const questionsElement = report.querySelector('.vespa-report-coaching-questions');
                    
                    if (!scoreElement) return;
                    
                    // Get the section name and score
                    const scoreText = scoreElement.innerText || scoreElement.textContent;
                    const lines = scoreText.split('\n').filter(line => line.trim());
                    const sectionName = lines[0] || 'VESPA Section';
                    const score = lines[lines.length - 1] || '';
                    
                    // Get the description
                    const description = commentsElement ? commentsElement.innerHTML : '';
                    
                    // Get the coaching questions and activities
                    let questions = '';
                    let activities = '';
                    
                    if (questionsElement) {
                        const questionsHtml = questionsElement.innerHTML;
                        const parts = questionsHtml.split(/Suggested Activities:/i);
                        questions = parts[0] || '';
                        activities = parts[1] || '';
                    }
                    
                    // Determine the theme color based on section name
                    const themeColors = {
                        'VISION': '#ff8f00',
                        'EFFORT': '#86b4f0',
                        'SYSTEMS': '#72cb44',
                        'PRACTICE': '#7f31a4',
                        'ATTITUDE': '#f032e6'
                    };
                    const themeColor = themeColors[sectionName.toUpperCase()] || '#1a4d4d';
                    
                    // Populate modal
                    const modal = document.getElementById('staff-vespa-modal-container');
                    const modalHeader = modal.querySelector('.vespa-modal-header');
                    const scoreDisplay = modal.querySelector('.modal-score-display');
                    
                    // Apply theme colors
                    if (modalHeader) {
                        modalHeader.style.background = themeColor + '88';
                    }
                    if (scoreDisplay) {
                        scoreDisplay.style.background = themeColor;
                        scoreDisplay.style.color = 'white';
                    }
                    
                    modal.querySelector('#staff-vespa-modal-title').textContent = sectionName;
                    modal.querySelector('.vespa-modal-score').innerHTML = `<div class="modal-score-display" style="background: ${themeColor}; color: white;">${score}</div>`;
                    modal.querySelector('.vespa-modal-description').innerHTML = description;
                    modal.querySelector('.vespa-modal-questions').innerHTML = questions ? `<h3>Coaching Questions:</h3>${questions}` : '';
                    modal.querySelector('.vespa-modal-activities').innerHTML = activities ? `<h3>Suggested Activities:</h3>${activities}` : '';
                    
                    // Show modal
                    modal.style.display = 'flex';
                    modal.classList.add('active');
                    
                    // Lock body scroll on mobile
                    document.body.style.overflow = 'hidden';
                    
                    // Ensure modal is on top
                    modal.style.zIndex = '2147483647';
                    
                    // Intercept activity links in the modal
                    setTimeout(() => {
                        interceptActivityLinks();
                    }, 100);
                    
                    console.log(`[Staff Mobile Report Enhancement] Opened popup for ${sectionName}`);
                });
            });
            
            console.log(`[Staff Mobile Report Enhancement] Initialized ${vespaReports.length} VESPA popups`);
        }, 500);
    }
    
    function initializeTextAreaFocus() {
        // Only enhance on mobile
        if (!isMobileDevice()) {
            console.log('[Staff Mobile Report Enhancement] Skipping text area enhancements on desktop');
            return;
        }
        
        console.log('[Staff Mobile Report Enhancement] Initializing text area focus enhancements for mobile');
        
        // Set up a mutation observer to catch dynamically added text areas
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                // Check for new text areas or editors
                const newTextAreas = mutation.target.querySelectorAll('textarea:not([data-staff-focus-enhanced]), .ql-editor:not([data-staff-focus-enhanced])');
                if (newTextAreas.length > 0) {
                    enhanceTextAreas(newTextAreas);
                }
            });
        });
        
        // Start observing - adapt for staff views
        const containerSelectors = ['#view_2776', '#view_3015', '#kn-scene_1095'];
        containerSelectors.forEach(selector => {
            const reportContainer = document.querySelector(selector);
            if (reportContainer) {
                observer.observe(reportContainer, {
                    childList: true,
                    subtree: true
                });
            }
        });
        
        // Enhance existing text areas - adapt selectors for staff views
        const textAreaSelectors = [
            '#view_2776 textarea, #view_2776 .ql-editor',
            '#view_3015 textarea, #view_3015 .ql-editor',
            '#kn-scene_1095 textarea, #kn-scene_1095 .ql-editor'
        ];
        
        textAreaSelectors.forEach(selector => {
            const existingTextAreas = document.querySelectorAll(selector);
            enhanceTextAreas(existingTextAreas);
        });
        
        function enhanceTextAreas(textAreas) {
            textAreas.forEach((textArea) => {
                // Mark as enhanced
                textArea.setAttribute('data-staff-focus-enhanced', 'true');
                
                // Create an overlay backdrop for focus state
                let backdrop = null;
                
                // On focus, expand and center on screen
                textArea.addEventListener('focus', function(e) {
                    console.log('[Staff Mobile Report Enhancement] Text area focused');
                    
                    // Create backdrop if it doesn't exist
                    if (!backdrop) {
                        backdrop = document.createElement('div');
                        backdrop.className = 'textarea-focus-backdrop';
                        document.body.appendChild(backdrop);
                    }
                    
                    // Show backdrop
                    backdrop.classList.add('active');
                    
                    // Get the comment section container
                    const commentSection = textArea.closest('.comment-section') || textArea.closest('.ql-container')?.parentElement;
                    if (commentSection) {
                        commentSection.classList.add('focused-comment-section');
                    }
                    
                    // Expand the text area
                    if (textArea.tagName === 'TEXTAREA') {
                        textArea.style.minHeight = '400px';
                    } else {
                        textArea.style.minHeight = '450px';
                        const container = textArea.closest('.ql-container');
                        if (container) {
                            container.style.minHeight = '450px';
                        }
                    }
                    
                    // Center the element on screen
                    setTimeout(() => {
                        const rect = textArea.getBoundingClientRect();
                        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                        const elementHeight = rect.height;
                        const viewportHeight = window.innerHeight;
                        
                        const targetY = rect.top + scrollTop - (viewportHeight - elementHeight) / 2;
                        
                        window.scrollTo({
                            top: Math.max(0, targetY),
                            behavior: 'smooth'
                        });
                    }, 100);
                });
                
                // On blur, return to normal
                textArea.addEventListener('blur', function(e) {
                    console.log('[Staff Mobile Report Enhancement] Text area blurred');
                    
                    // Hide backdrop
                    if (backdrop) {
                        backdrop.classList.remove('active');
                        setTimeout(() => {
                            if (backdrop && !backdrop.classList.contains('active')) {
                                backdrop.remove();
                                backdrop = null;
                            }
                        }, 300);
                    }
                    
                    // Remove focused class
                    const commentSection = textArea.closest('.comment-section') || textArea.closest('.ql-container')?.parentElement;
                    if (commentSection) {
                        commentSection.classList.remove('focused-comment-section');
                    }
                    
                    // Return to normal size
                    if (textArea.tagName === 'TEXTAREA') {
                        textArea.style.minHeight = '200px';
                    } else {
                        textArea.style.minHeight = '250px';
                        const container = textArea.closest('.ql-container');
                        if (container) {
                            container.style.minHeight = '250px';
                        }
                    }
                });
            });
            
            if (textAreas.length > 0) {
                console.log(`[Staff Mobile Report Enhancement] Enhanced ${textAreas.length} text areas`);
            }
        }
    }
    
    function applyStyles() {
        const styleId = 'staff-mobile-report-enhancements-v1-0';
        
        // Remove any existing style to force refresh
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        
        // EXACT SAME LOGIC as mobileReportFix.js but adapted for staff selectors
        style.textContent = `
            /* Universal styles for Staff Coaching Report - v1.0 */
            
            /* Hide introductory questions container on ALL screen sizes */
            #view_2776 #introductory-questions-container,
            #view_3015 #introductory-questions-container,
            #kn-scene_1095 #introductory-questions-container {
                display: none !important;
            }
            
            /* RADAR CHART - Desktop/tablet: minimal changes, Mobile: enhanced */
            /* Desktop and landscape tablets - preserve original look */
            @media (min-width: 769px), (orientation: landscape) and (min-width: 600px) {
                #view_2776 #chart-container,
                #view_3015 #chart-container,
                #kn-scene_1095 #chart-container {
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    margin: 20px auto !important;
                    text-align: center !important;
                    /* NO background, padding, or other styling changes for desktop */
                }
                
                #view_2776 #chart-container canvas,
                #view_3015 #chart-container canvas,
                #kn-scene_1095 #chart-container canvas {
                    margin: 0 auto !important;
                    /* NO scaling or transformations */
                }
            }
            
            /* Mobile portrait mode only - apply enhancements */
            @media (max-width: 768px) and (orientation: portrait) {
                #view_2776 #chart-container,
                #view_3015 #chart-container,
                #kn-scene_1095 #chart-container {
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    width: 95% !important;
                    margin: 20px auto !important;
                    text-align: center !important;
                    background: linear-gradient(135deg, #f5fafa 0%, #e8f4f6 100%) !important;
                    padding: 20px !important;
                    border-radius: 12px !important;
                    box-shadow: 0 4px 20px rgba(7, 155, 170, 0.1) !important;
                    border: 1px solid rgba(7, 155, 170, 0.08) !important;
                    overflow-x: auto !important;
                }
                
                #view_2776 #chart-container canvas,
                #view_3015 #chart-container canvas,
                #kn-scene_1095 #chart-container canvas {
                    margin: 0 auto !important;
                    max-width: 100% !important;
                    height: auto !important;
                }
            }
            
            /* Mobile section headings - HIDDEN BY DEFAULT ON ALL SCREEN SIZES */
            .mobile-section-heading,
            .mobile-section-heading-comments,
            .mobile-section-heading-coaching,
            .mobile-theme-heading,
            .mobile-score-display,
            #view_2776 .mobile-section-heading,
            #view_2776 .mobile-theme-heading,
            #view_2776 .mobile-score-display,
            #view_2776 .mobile-section-heading-comments,
            #view_2776 .mobile-section-heading-coaching,
            #view_3015 .mobile-section-heading,
            #view_3015 .mobile-theme-heading,
            #view_3015 .mobile-score-display,
            #view_3015 .mobile-section-heading-comments,
            #view_3015 .mobile-section-heading-coaching,
            #kn-scene_1095 .mobile-section-heading,
            #kn-scene_1095 .mobile-theme-heading,
            #kn-scene_1095 .mobile-score-display,
            #kn-scene_1095 .mobile-section-heading-comments,
            #kn-scene_1095 .mobile-section-heading-coaching {
                display: none !important;
                visibility: hidden !important;
                height: 0 !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
                position: absolute !important;
                left: -9999px !important;
                top: -9999px !important;
                opacity: 0 !important;
                pointer-events: none !important;
            }
            
            /* Original theme content - VISIBLE BY DEFAULT ON DESKTOP */
            .original-theme-content,
            #view_2776 .original-theme-content,
            #view_3015 .original-theme-content,
            #kn-scene_1095 .original-theme-content {
                display: block !important;
                visibility: visible !important;
                height: auto !important;
                position: static !important;
                left: auto !important;
                top: auto !important;
                opacity: 1 !important;
                pointer-events: auto !important;
            }
            
            /* Help writing buttons - Responsive across all screen sizes */
            .help-writing-btn {
                background: #079baa !important;
                color: white !important;
                border: none !important;
                border-radius: 6px !important;
                padding: 12px 20px !important;
                font-size: 15px !important;
                margin-bottom: 15px !important;
                cursor: pointer !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                box-shadow: 0 2px 8px rgba(7, 155, 170, 0.3) !important;
                width: 100% !important;
                max-width: none !important;
                justify-content: center !important;
                transition: all 0.3s ease !important;
                font-weight: 500 !important;
            }
            
            /* Limit button width on very large screens */
            @media (min-width: 1200px) {
                .help-writing-btn {
                    max-width: 600px !important;
                    margin-left: auto !important;
                    margin-right: auto !important;
                }
            }
            
            .help-writing-btn:hover {
                background: #06879a !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 12px rgba(7, 155, 170, 0.4) !important;
            }
            
            .help-writing-btn:active {
                transform: scale(0.98) !important;
                box-shadow: 0 2px 4px rgba(7, 155, 170, 0.3) !important;
            }
            
            /* Help modal styles - Universal */
            .help-modal-overlay {
                display: none;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: rgba(0, 0, 0, 0.8) !important;
                z-index: 99998 !important;
                overflow-y: auto !important;
                -webkit-overflow-scrolling: touch !important;
                padding: 20px !important;
            }
            
            .help-modal-overlay.active {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            
            .help-modal-content {
                background: white !important;
                width: 90% !important;
                max-width: 700px !important;
                margin: auto !important;
                border-radius: 12px !important;
                position: relative !important;
                max-height: 90vh !important;
                overflow: hidden !important;
                display: flex !important;
                flex-direction: column !important;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3) !important;
            }
            
            .help-modal-header {
                background: #079baa !important;
                color: white !important;
                padding: 24px !important;
                border-radius: 12px 12px 0 0 !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                flex-shrink: 0 !important;
            }
            
            .help-modal-header h2 {
                margin: 0 !important;
                font-size: 24px !important;
                font-weight: 600 !important;
                line-height: 1.2 !important;
            }
            
            .help-modal-close {
                background: rgba(255, 255, 255, 0.2) !important;
                border: none !important;
                color: white !important;
                font-size: 28px !important;
                cursor: pointer !important;
                padding: 0 !important;
                width: 40px !important;
                height: 40px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border-radius: 50% !important;
                transition: all 0.3s ease !important;
                line-height: 1 !important;
            }
            
            .help-modal-close:hover {
                background: rgba(255, 255, 255, 0.3) !important;
                transform: rotate(90deg) !important;
            }
            
            .help-modal-body {
                padding: 24px !important;
                overflow-y: auto !important;
                flex: 1 !important;
            }
            
            .help-content {
                font-size: 16px !important;
                line-height: 1.6 !important;
                color: #333 !important;
            }
            
            .help-content h3 {
                color: #079baa !important;
                margin-top: 24px !important;
                margin-bottom: 16px !important;
                font-size: 20px !important;
            }
            
            .help-content h3:first-child {
                margin-top: 0 !important;
            }
            
            .help-content ul {
                margin: 16px 0 !important;
                padding-left: 24px !important;
            }
            
            .help-content li {
                margin-bottom: 12px !important;
                line-height: 1.6 !important;
                color: #555 !important;
            }
            
            .help-content li strong {
                color: #333 !important;
            }
            
            .help-content h4 {
                color: #079baa !important;
                margin: 20px 0 12px 0 !important;
                font-size: 18px !important;
            }
            
            /* Staff-specific guide styles */
            .response-guide-content,
            .coaching-guide-content {
                font-size: 16px !important;
                line-height: 1.6 !important;
            }
            
            .guide-intro {
                background: #e8f4f8 !important;
                padding: 16px !important;
                border-radius: 8px !important;
                margin-bottom: 20px !important;
                border-left: 4px solid #079baa !important;
            }
            
            .guide-intro p {
                margin: 0 0 8px 0 !important;
                color: #1a4d4d !important;
                font-weight: 500 !important;
            }
            
            .guide-intro p:last-child {
                margin-bottom: 0 !important;
            }
            
            .guide-section {
                background: #f8f9fa !important;
                padding: 16px !important;
                margin: 16px 0 !important;
                border-radius: 6px !important;
                border: 1px solid #e0e0e0 !important;
            }
            
            .guide-section p {
                margin: 0 0 12px 0 !important;
                color: #333 !important;
            }
            
            .guide-section ul {
                margin: 12px 0 !important;
                padding-left: 24px !important;
            }
            
            .guide-section li {
                margin-bottom: 10px !important;
                color: #555 !important;
            }
            
            .guide-section li strong {
                color: #1a4d4d !important;
            }
            
            .sentence-starters,
            .conversation-starters {
                background: white !important;
                padding: 14px !important;
                margin-top: 16px !important;
                border-radius: 6px !important;
                border: 1px solid #d0e5ea !important;
            }
            
            .sentence-starters h4,
            .conversation-starters h4 {
                color: #079baa !important;
                margin: 0 0 12px 0 !important;
                font-size: 15px !important;
                font-weight: 600 !important;
            }
            
            .sentence-starters .starter,
            .conversation-starters .starter {
                background: #f0f8fa !important;
                padding: 10px 14px !important;
                margin: 8px 0 !important;
                border-left: 3px solid #62d1d2 !important;
                border-radius: 4px !important;
                font-style: italic !important;
                color: #2a3c7a !important;
                font-size: 15px !important;
            }
            
            .coaching-tips {
                background: #fff9e6 !important;
                border: 1px solid #ffd700 !important;
                padding: 16px !important;
                margin: 20px 0 !important;
                border-radius: 8px !important;
            }
            
            .coaching-tips h4 {
                color: #856404 !important;
                margin: 0 0 12px 0 !important;
                font-size: 17px !important;
            }
            
            .coaching-tips ul {
                margin: 0 !important;
                padding-left: 24px !important;
            }
            
            .coaching-tips li {
                margin-bottom: 10px !important;
                color: #704000 !important;
            }
            
            .coaching-tips li strong {
                color: #856404 !important;
            }
            
            /* PrimeVue Dialog fixes for mobile */
            @media (max-width: 768px) {
                /* Fix PrimeVue dialog overlay */
                .p-dialog-mask {
                    padding: 20px !important;
                }
                
                /* Fix PrimeVue dialog sizing */
                .p-dialog {
                    width: 85vw !important;
                    max-width: 400px !important;
                    max-height: 70vh !important;
                    margin: 0 auto !important;
                }
                
                /* Fix dialog content */
                .p-dialog-content {
                    max-height: 50vh !important;
                    overflow-y: auto !important;
                    padding: 20px !important;
                    font-size: 16px !important;
                    line-height: 1.6 !important;
                }
                
                /* Fix dialog header */
                .p-dialog-header {
                    padding: 15px 20px !important;
                    flex-shrink: 0 !important;
                }
                
                /* Make close button touch-friendly */
                .p-dialog-header-close {
                    width: 44px !important;
                    height: 44px !important;
                    min-width: 44px !important;
                    min-height: 44px !important;
                }
                
                /* Ensure proper modal display on small screens */
                .p-dialog[style*="width: 95vw"] {
                    width: 85vw !important;
                    max-width: 400px !important;
                }
            }
            
            /* Mobile-only styles */
            @media (max-width: 768px) {
                /* === HEADER LAYOUT FIXES === */
                /* Fix header containers to be responsive and stack */
                #top-report-header-container,
                #bottom-report-header-container,
                #view_2776 div[id*="report-header"],
                #view_2776 .report-header,
                #view_2776 > div:first-child > div:first-child,
                #view_3015 div[id*="report-header"],
                #view_3015 .report-header,
                #view_3015 > div:first-child > div:first-child,
                #kn-scene_1095 div[id*="report-header"],
                #kn-scene_1095 .report-header {
                    display: flex !important;
                    flex-wrap: wrap !important;
                    gap: 10px !important;
                    padding: 10px !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                    justify-content: center !important;
                    align-items: center !important;
                }
                
                /* Make info containers (Student, Date, Cycle) responsive */
                #view_2776 div[id*="report-header"] > div,
                #view_2776 .field-container,
                #view_3015 div[id*="report-header"] > div,
                #view_3015 .field-container,
                #kn-scene_1095 div[id*="report-header"] > div,
                #kn-scene_1095 .field-container {
                    flex: 1 1 auto !important;
                    min-width: 250px !important;
                    max-width: 100% !important;
                    margin: 5px !important;
                    box-sizing: border-box !important;
                    text-align: center !important;
                }
                
                /* Fix for inline width styles */
                #view_2776 [style*="width:"][style*="px"],
                #view_3015 [style*="width:"][style*="px"],
                #kn-scene_1095 [style*="width:"][style*="px"] {
                    width: auto !important;
                    min-width: 200px !important;
                    max-width: 100% !important;
                }
                
                /* Fix VIEW ANSWERS button - PREVENT IT FROM BECOMING CIRCULAR */
                #view_2776 button.p-button:not(.p-button-rounded):not(.p-button-icon-only),
                #view_2776 button[aria-label*="VIEW" i][aria-label*="ANSWERS" i],
                #view_2776 button[title*="VIEW" i][title*="ANSWERS" i],
                #view_2776 .view-answers-button,
                #view_3015 button.p-button:not(.p-button-rounded):not(.p-button-icon-only),
                #view_3015 button[aria-label*="VIEW" i][aria-label*="ANSWERS" i],
                #view_3015 button[title*="VIEW" i][title*="ANSWERS" i],
                #view_3015 .view-answers-button,
                #kn-scene_1095 button.p-button:not(.p-button-rounded):not(.p-button-icon-only),
                #kn-scene_1095 button[aria-label*="VIEW" i][aria-label*="ANSWERS" i],
                #kn-scene_1095 button[title*="VIEW" i][title*="ANSWERS" i],
                #kn-scene_1095 .view-answers-button {
                    min-width: 140px !important;
                    width: auto !important;
                    height: 44px !important;
                    padding: 10px 20px !important;
                    border-radius: 6px !important; /* Rectangular shape */
                    font-size: 14px !important;
                    font-weight: 600 !important;
                    white-space: nowrap !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    background-color: #00e5db !important;
                    color: #23356f !important;
                    border: none !important;
                    box-shadow: 0 2px 8px rgba(0, 229, 219, 0.3) !important;
                    margin: 10px !important;
                }
                
                #view_2776 button.p-button:not(.p-button-rounded):hover,
                #view_3015 button.p-button:not(.p-button-rounded):hover,
                #kn-scene_1095 button.p-button:not(.p-button-rounded):hover {
                    background-color: #00c5c0 !important;
                    transform: translateY(-1px) !important;
                }
                
                /* Ensure button text is visible */
                #view_2776 button:not(.p-button-rounded) span.p-button-label,
                #view_3015 button:not(.p-button-rounded) span.p-button-label,
                #kn-scene_1095 button:not(.p-button-rounded) span.p-button-label {
                    display: inline !important;
                    visibility: visible !important;
                    font-size: 14px !important;
                }
                
                /* Fix VESPA COACHING REPORT title to wrap properly */
                #view_2776 h1,
                #view_2776 h2, 
                #view_2776 h3,
                #view_2776 .report-title,
                #view_2776 [class*="title"],
                #view_3015 h1,
                #view_3015 h2, 
                #view_3015 h3,
                #view_3015 .report-title,
                #view_3015 [class*="title"],
                #kn-scene_1095 h1,
                #kn-scene_1095 h2, 
                #kn-scene_1095 h3,
                #kn-scene_1095 .report-title,
                #kn-scene_1095 [class*="title"] {
                    white-space: normal !important;
                    word-wrap: break-word !important;
                    word-break: break-word !important;
                    overflow-wrap: break-word !important;
                    text-align: center !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    padding: 0 15px !important;
                    box-sizing: border-box !important;
                    line-height: 1.3 !important;
                }
                
                /* Special styling for VESPA title */
                #view_2776 h1:has-text("VESPA"),
                #view_2776 h2:has-text("VESPA"),
                #view_2776 *:has-text("VESPA COACHING REPORT"),
                #view_3015 h1:has-text("VESPA"),
                #view_3015 h2:has-text("VESPA"),
                #view_3015 *:has-text("VESPA COACHING REPORT"),
                #kn-scene_1095 h1:has-text("VESPA"),
                #kn-scene_1095 h2:has-text("VESPA"),
                #kn-scene_1095 *:has-text("VESPA COACHING REPORT") {
                    font-size: 22px !important;
                    margin: 15px 0 !important;
                }
                
                /* Hide only logo on mobile, keep info buttons visible */
                #view_2776 .image-logo,
                #view_2776 img[alt="Logo"],
                #view_2776 img[src*="logo"],
                #view_2776 .logo,
                #view_2776 [class*="logo"] img,
                #view_3015 .image-logo,
                #view_3015 img[alt="Logo"],
                #view_3015 img[src*="logo"],
                #view_3015 .logo,
                #view_3015 [class*="logo"] img,
                #kn-scene_1095 .image-logo,
                #kn-scene_1095 img[alt="Logo"],
                #kn-scene_1095 img[src*="logo"],
                #kn-scene_1095 .logo,
                #kn-scene_1095 [class*="logo"] img {
                    display: none !important;
                    visibility: hidden !important;
                }
                
                /* Make info buttons touch-friendly on mobile */
                #view_2776 .p-button-icon-only[aria-label*="info" i],
                #view_2776 button i.pi-info-circle,
                #view_2776 button[aria-label*="info" i],
                #view_2776 button[title*="info" i],
                #view_3015 .p-button-icon-only[aria-label*="info" i],
                #view_3015 button i.pi-info-circle,
                #view_3015 button[aria-label*="info" i],
                #view_3015 button[title*="info" i],
                #kn-scene_1095 .p-button-icon-only[aria-label*="info" i],
                #kn-scene_1095 button i.pi-info-circle,
                #kn-scene_1095 button[aria-label*="info" i],
                #kn-scene_1095 button[title*="info" i] {
                    min-width: 44px !important;
                    min-height: 44px !important;
                    padding: 8px !important;
                }
                
                /* Make text areas even larger by default on mobile */
                #view_2776 textarea,
                #view_3015 textarea,
                #kn-scene_1095 textarea {
                    min-height: 200px !important;
                    font-size: 16px !important; /* Prevent iOS zoom on focus */
                    padding: 15px !important;
                }
                
                #view_2776 .ql-editor,
                #view_2776 .ql-container,
                #view_3015 .ql-editor,
                #view_3015 .ql-container,
                #kn-scene_1095 .ql-editor,
                #kn-scene_1095 .ql-container {
                    min-height: 250px !important;
                }
                
                #view_2776 .ql-editor,
                #view_3015 .ql-editor,
                #kn-scene_1095 .ql-editor {
                    padding: 18px !important;
                    font-size: 16px !important;
                    line-height: 1.6 !important;
                }
                
                /* Backdrop for focused text areas */
                .textarea-focus-backdrop {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    background: rgba(0, 0, 0, 0.7) !important;
                    z-index: 998 !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                    transition: opacity 0.3s ease !important;
                }
                
                .textarea-focus-backdrop.active {
                    opacity: 1 !important;
                    pointer-events: auto !important;
                }
                
                /* Enhanced focused comment section */
                .focused-comment-section {
                    position: relative !important;
                    z-index: 999 !important;
                    background: white !important;
                    border-radius: 8px !important;
                    padding: 20px !important;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3) !important;
                    margin: 10px !important;
                }
                
                /* When focused, make text areas much bigger */
                #view_2776 textarea:focus,
                #view_3015 textarea:focus,
                #kn-scene_1095 textarea:focus {
                    min-height: 400px !important;
                    background: white !important;
                    border: 2px solid #1976d2 !important;
                }
                
                #view_2776 .ql-editor:focus,
                #view_2776 .ql-container:focus-within,
                #view_3015 .ql-editor:focus,
                #view_3015 .ql-container:focus-within,
                #kn-scene_1095 .ql-editor:focus,
                #kn-scene_1095 .ql-container:focus-within {
                    min-height: 450px !important;
                }
                
                #view_2776 .ql-container:focus-within,
                #view_3015 .ql-container:focus-within,
                #kn-scene_1095 .ql-container:focus-within {
                    border: 2px solid #1976d2 !important;
                    background: white !important;
                }
                
                /* Hide the rich text toolbar to maximize writing space */
                #view_2776 .ql-toolbar,
                #view_2776 .ql-snow .ql-toolbar,
                #view_2776 .ql-toolbar.ql-snow,
                #view_2776 .comment-section .ql-toolbar,
                #view_3015 .ql-toolbar,
                #view_3015 .ql-snow .ql-toolbar,
                #view_3015 .ql-toolbar.ql-snow,
                #view_3015 .comment-section .ql-toolbar,
                #kn-scene_1095 .ql-toolbar,
                #kn-scene_1095 .ql-snow .ql-toolbar,
                #kn-scene_1095 .ql-toolbar.ql-snow,
                #kn-scene_1095 .comment-section .ql-toolbar {
                    display: none !important;
                }
                
                /* Adjust container to compensate for hidden toolbar */
                #view_2776 .ql-container.ql-snow,
                #view_3015 .ql-container.ql-snow,
                #kn-scene_1095 .ql-container.ql-snow {
                    border-top: 1px solid #ccc !important;
                    border-radius: 4px !important;
                }
                
                /* Make all text inputs bigger */
                #view_2776 input[type="text"],
                #view_2776 input[type="email"],
                #view_2776 input[type="number"],
                #view_3015 input[type="text"],
                #view_3015 input[type="email"],
                #view_3015 input[type="number"],
                #kn-scene_1095 input[type="text"],
                #kn-scene_1095 input[type="email"],
                #kn-scene_1095 input[type="number"] {
                    height: 44px !important;
                    font-size: 16px !important;
                    padding: 10px !important;
                }
                
                /* Touch-friendly buttons */
                #view_2776 button,
                #view_2776 .p-button,
                #view_2776 input[type="submit"],
                #view_2776 input[type="button"],
                #view_3015 button,
                #view_3015 .p-button,
                #view_3015 input[type="submit"],
                #view_3015 input[type="button"],
                #kn-scene_1095 button,
                #kn-scene_1095 .p-button,
                #kn-scene_1095 input[type="submit"],
                #kn-scene_1095 input[type="button"] {
                    min-height: 44px !important;
                    padding: 12px 20px !important;
                }
                
                /* Smaller submit/cancel buttons in comment sections */
                #view_2776 .comment-section button[type="submit"],
                #view_2776 .comment-section .p-button,
                #view_3015 .comment-section button[type="submit"],
                #view_3015 .comment-section .p-button,
                #kn-scene_1095 .comment-section button[type="submit"],
                #kn-scene_1095 .comment-section .p-button {
                    min-height: 36px !important;
                    padding: 8px 16px !important;
                    font-size: 14px !important;
                }
                
                /* Comprehensive fix for EFFORT section consistency on mobile */
                /* Target EFFORT section by its blue color */
                #view_2776 .vespa-report:has(.vespa-report-score[style*="background-color: rgb(134, 180, 240)"]),
                #view_3015 .vespa-report:has(.vespa-report-score[style*="background-color: rgb(134, 180, 240)"]),
                #kn-scene_1095 .vespa-report:has(.vespa-report-score[style*="background-color: rgb(134, 180, 240)"]) {
                    width: 100% !important;
                    max-width: 100% !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    padding-left: 0 !important;
                    padding-right: 0 !important;
                    box-sizing: border-box !important;
                }
                
                /* Fix EFFORT score section width - preserve display type */
                #view_2776 .vespa-report-score[style*="background-color: rgb(134, 180, 240)"],
                #view_3015 .vespa-report-score[style*="background-color: rgb(134, 180, 240)"],
                #kn-scene_1095 .vespa-report-score[style*="background-color: rgb(134, 180, 240)"] {
                    max-width: 100% !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    box-sizing: border-box !important;
                }
                
                /* Fix EFFORT comments section */
                #view_2776 .vespa-report:has(.vespa-report-score[style*="background-color: rgb(134, 180, 240)"]) .vespa-report-comments,
                #view_3015 .vespa-report:has(.vespa-report-score[style*="background-color: rgb(134, 180, 240)"]) .vespa-report-comments,
                #kn-scene_1095 .vespa-report:has(.vespa-report-score[style*="background-color: rgb(134, 180, 240)"]) .vespa-report-comments {
                    max-width: 100% !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    box-sizing: border-box !important;
                }
                
                /* Fix EFFORT coaching questions section */
                #view_2776 .vespa-report:has(.vespa-report-score[style*="background-color: rgb(134, 180, 240)"]) .vespa-report-coaching-questions,
                #view_3015 .vespa-report:has(.vespa-report-score[style*="background-color: rgb(134, 180, 240)"]) .vespa-report-coaching-questions,
                #kn-scene_1095 .vespa-report:has(.vespa-report-score[style*="background-color: rgb(134, 180, 240)"]) .vespa-report-coaching-questions {
                    max-width: 100% !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    box-sizing: border-box !important;
                }
                
                /* Ensure VESPA sections maintain their layout */
                #view_2776 .vespa-report,
                #view_3015 .vespa-report,
                #kn-scene_1095 .vespa-report {
                    width: 100% !important;
                    max-width: 100% !important;
                    box-sizing: border-box !important;
                }
                
                /* Theme headings (VISION, EFFORT, etc.) - ONLY SHOW ON MOBILE */
                #view_2776 .mobile-theme-heading,
                #view_3015 .mobile-theme-heading,
                #kn-scene_1095 .mobile-theme-heading,
                .mobile-theme-heading {
                    display: block !important;
                    visibility: visible !important;
                    height: auto !important;
                    position: static !important;
                    left: auto !important;
                    top: auto !important;
                    opacity: 1 !important;
                    pointer-events: auto !important;
                    font-size: 16px !important;
                    font-weight: 600 !important;
                    color: white !important;
                    margin: 0 !important;
                    padding: 8px 12px !important;
                    text-align: center !important;
                    background: inherit !important; /* Use parent's background color */
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                }
                    
                /* Mobile score display - ONLY SHOW ON MOBILE */
                #view_2776 .mobile-score-display,
                #view_3015 .mobile-score-display,
                #kn-scene_1095 .mobile-score-display,
                .mobile-score-display {
                    display: block !important;
                    visibility: visible !important;
                    height: auto !important;
                    position: static !important;
                    left: auto !important;
                    top: auto !important;
                    opacity: 1 !important;
                    pointer-events: auto !important;
                    font-size: 48px !important;
                    font-weight: 700 !important;
                    color: white !important;
                    text-align: center !important;
                    padding: 20px 0 !important;
                    line-height: 1 !important;
                }
                    
                /* Hide original theme content on mobile */
                #view_2776 .original-theme-content,
                #view_3015 .original-theme-content,
                #kn-scene_1095 .original-theme-content,
                .original-theme-content {
                    display: none !important;
                    visibility: hidden !important;
                    position: absolute !important;
                    left: -9999px !important;
                }
                    
                /* Section headings (Comments, Coaching Questions) - ONLY SHOW ON MOBILE */
                #view_2776 .mobile-section-heading,
                #view_2776 .mobile-section-heading-comments,
                #view_2776 .mobile-section-heading-coaching,
                #view_3015 .mobile-section-heading,
                #view_3015 .mobile-section-heading-comments,
                #view_3015 .mobile-section-heading-coaching,
                #kn-scene_1095 .mobile-section-heading,
                #kn-scene_1095 .mobile-section-heading-comments,
                #kn-scene_1095 .mobile-section-heading-coaching,
                .mobile-section-heading,
                .mobile-section-heading-comments,
                .mobile-section-heading-coaching {
                    display: block !important;
                    visibility: visible !important;
                    height: auto !important;
                    position: static !important;
                    left: auto !important;
                    top: auto !important;
                    opacity: 1 !important;
                    pointer-events: auto !important;
                    font-size: 14px !important;
                    font-weight: 600 !important;
                    color: #1a4d4d !important;
                    margin: 10px 0 8px 0 !important;
                    padding: 6px 12px !important;
                    background: #f5fafa !important;
                    border-left: 3px solid #079baa !important;
                    border-radius: 2px !important;
                    text-transform: none !important;
                }
                    
                /* Adjust spacing for score sections with theme headings */
                #view_2776 .vespa-report-score,
                #view_3015 .vespa-report-score,
                #kn-scene_1095 .vespa-report-score {
                    padding-top: 0 !important;
                }
                    
                /* Ensure vertical stacking on mobile for better readability */
                #view_2776 .vespa-report,
                #view_3015 .vespa-report,
                #kn-scene_1095 .vespa-report {
                    display: block !important;
                }
                    
                #view_2776 .vespa-report > *,
                #view_3015 .vespa-report > *,
                #kn-scene_1095 .vespa-report > * {
                    display: block !important;
                    width: 100% !important;
                    margin-bottom: 15px !important;
                }
            }
                
            /* Make VESPA sections look clickable on mobile */
            #view_2776 .vespa-report,
            #view_3015 .vespa-report,
            #kn-scene_1095 .vespa-report {
                position: relative !important;
                transition: transform 0.2s ease !important;
            }
            
            #view_2776 .vespa-report:active,
            #view_3015 .vespa-report:active,
            #kn-scene_1095 .vespa-report:active {
                transform: scale(0.98) !important;
            }
            
            /* Add a subtle tap indicator */
            #view_2776 .vespa-report::after,
            #view_3015 .vespa-report::after,
            #kn-scene_1095 .vespa-report::after {
                content: "Tap to expand >";
                position: absolute;
                top: 10px;
                right: 10px;
                font-size: 12px;
                color: #666;
                background: rgba(255,255,255,0.9);
                padding: 4px 8px;
                border-radius: 4px;
                pointer-events: none;
            }
            
            /* VESPA Modal styles - always apply these but only show on mobile */
            .vespa-modal-overlay {
                display: none;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: rgba(0, 0, 0, 0.8) !important;
                z-index: 2147483647 !important; /* Maximum z-index value */
                overflow-y: auto !important;
                -webkit-overflow-scrolling: touch !important;
            }
            
            .vespa-modal-overlay.active {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 20px !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
            }
            
            /* Make VESPA sections look clickable on ALL devices */
            #view_2776 .vespa-report,
            #view_3015 .vespa-report {
                position: relative !important;
                transition: transform 0.2s ease !important;
                cursor: pointer !important;
            }
            
            #view_2776 .vespa-report:hover,
            #view_3015 .vespa-report:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
            }
            
            #view_2776 .vespa-report:active,
            #view_3015 .vespa-report:active {
                transform: scale(0.98) !important;
            }
            
            /* Add a subtle click indicator */
            #view_2776 .vespa-report::after,
            #view_3015 .vespa-report::after {
                content: "Click to expand >";
                position: absolute;
                top: 10px;
                right: 10px;
                font-size: 12px;
                color: #666;
                background: rgba(255,255,255,0.9);
                padding: 4px 8px;
                border-radius: 4px;
                pointer-events: none;
                transition: all 0.3s ease;
            }
            
            #view_2776 .vespa-report:hover::after,
            #view_3015 .vespa-report:hover::after {
                background: #079baa;
                color: white;
            }
            
            .vespa-modal-content {
                background: white !important;
                width: 90% !important;
                max-width: 500px !important;
                margin: 20px auto !important;
                border-radius: 10px !important;
                position: relative !important;
                max-height: 90vh !important;
                overflow: hidden !important;
                display: flex !important;
                flex-direction: column !important;
                z-index: 2147483647 !important;
                box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5) !important;
            }
            
            .vespa-modal-header {
                color: white !important;
                padding: 20px !important;
                border-radius: 10px 10px 0 0 !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                flex-shrink: 0 !important;
            }
            
            .vespa-modal-header h2 {
                margin: 0 !important;
                font-size: 24px !important;
                font-weight: 600 !important;
            }
            
            .vespa-modal-close {
                background: rgba(255, 255, 255, 0.2) !important;
                border: 2px solid white !important;
                color: white !important;
                font-size: 30px !important;
                cursor: pointer !important;
                padding: 0 !important;
                width: 40px !important;
                height: 40px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border-radius: 50% !important;
                transition: all 0.3s ease !important;
                position: relative !important;
                z-index: 2147483647 !important;
                line-height: 1 !important;
                font-weight: bold !important;
                -webkit-tap-highlight-color: transparent !important;
            }
            
            .vespa-modal-close:hover,
            .vespa-modal-close:active {
                background: rgba(255, 255, 255, 0.4) !important;
                transform: scale(1.1) !important;
            }
            
            .vespa-modal-body {
                padding: 20px !important;
                overflow-y: auto !important;
                flex: 1 !important;
            }
            
            .modal-score-display {
                font-size: 48px !important;
                font-weight: 700 !important;
                text-align: center !important;
                padding: 20px !important;
                margin-bottom: 20px !important;
                border-radius: 10px !important;
            }
            
            .vespa-modal-description {
                font-size: 18px !important;
                line-height: 1.8 !important;
                margin-bottom: 30px !important;
                color: #333 !important;
            }
            
            .vespa-modal-questions {
                margin-bottom: 30px !important;
            }
            
            .vespa-modal-questions h3 {
                font-size: 20px !important;
                margin-bottom: 15px !important;
                color: #1a4d4d !important;
                font-weight: 600 !important;
            }
            
            .vespa-modal-questions ol {
                font-size: 18px !important;
                line-height: 1.8 !important;
                padding-left: 20px !important;
            }
            
            .vespa-modal-questions li {
                margin-bottom: 15px !important;
                color: #333 !important;
            }
            
            .vespa-modal-activities h3 {
                font-size: 20px !important;
                margin-bottom: 15px !important;
                color: #1a4d4d !important;
                font-weight: 600 !important;
            }
            
            .vespa-modal-activities a {
                display: inline-block !important;
                margin: 5px !important;
                padding: 10px 20px !important;
                background: #e3f2fd !important;
                color: #1976d2 !important;
                text-decoration: none !important;
                border-radius: 20px !important;
                font-size: 16px !important;
                transition: all 0.3s ease !important;
            }
            
            .vespa-modal-activities a:active {
                background: #1976d2 !important;
                color: white !important;
            }
            
            /* Custom Cycle Modal Styles - Enhanced Design */
            .custom-cycle-modal-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: rgba(0, 0, 0, 0.85) !important;
                z-index: 999999 !important;
                display: none;
                align-items: center !important;
                justify-content: center !important;
            }
            
            #customStaffCycleModal {
                display: none;
            }
            
            #customStaffCycleModal[style*="display: flex"] {
                display: flex !important;
            }
            
            .custom-cycle-modal-container {
                background: white !important;
                width: 95% !important;
                max-width: 1200px !important;
                max-height: 90vh !important;
                border-radius: 16px !important;
                overflow: hidden !important;
                display: flex !important;
                flex-direction: column !important;
                box-shadow: 0 25px 70px rgba(0, 0, 0, 0.4) !important;
            }
            
            .custom-cycle-modal-header {
                padding: 20px 30px !important;
                background: linear-gradient(135deg, #23356f 0%, #079baa 100%) !important;
                color: white !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
            }
            
            .custom-cycle-modal-header h2 {
                margin: 0 !important;
                font-size: 22px !important;
                font-weight: 600 !important;
                letter-spacing: 0.5px !important;
            }
            
            .cycle-selector-bar {
                display: flex !important;
                justify-content: center !important;
                gap: 15px !important;
                padding: 15px !important;
                background: #f0f7f9 !important;
                border-bottom: 1px solid #e0e0e0 !important;
            }
            
            .cycle-btn {
                padding: 10px 30px !important;
                background: white !important;
                border: 2px solid #079baa !important;
                color: #079baa !important;
                border-radius: 25px !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
                font-weight: 600 !important;
                font-size: 15px !important;
            }
            
            .cycle-btn:hover {
                background: #e8f4f6 !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(7, 155, 170, 0.2) !important;
            }
            
            .cycle-btn.active {
                background: #079baa !important;
                color: white !important;
                border-color: #079baa !important;
                box-shadow: 0 4px 15px rgba(7, 155, 170, 0.3) !important;
            }
            
            .custom-cycle-modal-close {
                background: rgba(255, 255, 255, 0.2) !important;
                border: none !important;
                color: white !important;
                font-size: 24px !important;
                width: 36px !important;
                height: 36px !important;
                border-radius: 50% !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }
            
            .custom-cycle-modal-close:hover {
                background: rgba(255, 255, 255, 0.3) !important;
                transform: rotate(90deg) !important;
            }
            
            .custom-cycle-modal-body {
                flex: 1 !important;
                overflow-y: auto !important;
                padding: 20px !important;
                background: #fafbfc !important;
            }
            
            /* Loading spinner removed - no longer needed */
            
            /* Spinner animation removed - no longer needed */
            
            /* Enhanced Question List with Progress Bars */
            .cycle-questions-list {
                display: flex !important;
                flex-direction: column !important;
                gap: 12px !important;
            }
            
            .cycle-question-item-enhanced {
                background: white !important;
                border-radius: 10px !important;
                padding: 15px 20px !important;
                display: flex !important;
                align-items: center !important;
                gap: 15px !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
                transition: transform 0.2s ease, box-shadow 0.2s ease !important;
            }
            
            .cycle-question-item-enhanced:hover {
                transform: translateX(5px) !important;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12) !important;
            }
            
            .question-number {
                font-size: 14px !important;
                font-weight: 700 !important;
                color: #666 !important;
                min-width: 35px !important;
                text-align: center !important;
                padding: 5px !important;
                background: #f0f0f0 !important;
                border-radius: 6px !important;
            }
            
            .question-content {
                flex: 1 !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 10px !important;
            }
            
            .question-text {
                font-size: 15px !important;
                color: #333 !important;
                line-height: 1.4 !important;
            }
            
            .question-response {
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
            }
            
            .progress-bar-container {
                flex: 1 !important;
                height: 28px !important;
                background: #e8e8e8 !important;
                border-radius: 14px !important;
                position: relative !important;
                overflow: hidden !important;
            }
            
            .progress-bar-fill {
                height: 100% !important;
                border-radius: 14px !important;
                transition: width 0.5s ease !important;
                position: relative !important;
            }
            
            .progress-bar-value {
                position: absolute !important;
                right: 10px !important;
                top: 50% !important;
                transform: translateY(-50%) !important;
                font-size: 13px !important;
                font-weight: 600 !important;
                color: #333 !important;
                background: rgba(255, 255, 255, 0.9) !important;
                padding: 2px 8px !important;
                border-radius: 10px !important;
            }
            
            .question-category {
                padding: 5px 12px !important;
                border-radius: 15px !important;
                color: white !important;
                font-size: 11px !important;
                font-weight: 600 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.5px !important;
                white-space: nowrap !important;
            }
            
            /* Mobile responsiveness for modal */
            @media (max-width: 768px) {
                .custom-cycle-modal-container {
                    width: 100% !important;
                    height: 100% !important;
                    max-height: 100% !important;
                    border-radius: 0 !important;
                }
                
                .cycle-question-item-enhanced {
                    flex-direction: column !important;
                    align-items: stretch !important;
                    gap: 10px !important;
                }
                
                .question-category {
                    align-self: flex-start !important;
                }
                
                .question-text {
                    font-size: 14px !important;
                }
            }
        `;
        
        document.head.appendChild(style);
        stylesApplied = true;
        
        console.log('[Staff Mobile Report Enhancement] Styles applied successfully!');
    }
    
    // Placeholder functions for features that may not be needed for staff view
    function hideShowAnswersButton() {
        console.log('[Staff Mobile Report Enhancement] hideShowAnswersButton - not needed for staff view');
    }
    
    function fixAllModalsForMobile() {
        console.log('[Staff Mobile Report Enhancement] fixAllModalsForMobile - basic modal fixes applied');
    }
    
    function improveInfoButtonContent() {
        console.log('[Staff Mobile Report Enhancement] improveInfoButtonContent - not needed for staff view');
    }
    
    function fixInfoButtonModals() {
        console.log('[Staff Mobile Report Enhancement] fixInfoButtonModals - not needed for staff view');
    }
    
    // Multiple initialization attempts with increasing delays
    async function attemptInitialization() {
        console.log(`[Staff Mobile Report Enhancement] Initialization attempt ${initAttempts + 1}/${MAX_INIT_ATTEMPTS}`);
        
        const success = await fixStaffReport();
        
        if (!success && initAttempts < MAX_INIT_ATTEMPTS) {
            initAttempts++;
            const delay = Math.min(500 * initAttempts, 2000);
            console.log(`[Staff Mobile Report Enhancement] Retrying in ${delay}ms...`);
            setTimeout(attemptInitialization, delay);
        } else if (success) {
            console.log('[Staff Mobile Report Enhancement] Successfully initialized!');
        } else {
            console.warn('[Staff Mobile Report Enhancement] Failed to initialize after maximum attempts');
        }
    }
    
    // Initialize immediately on mobile
    if (isMobileDevice()) {
        console.log('[Staff Mobile Report Enhancement] Mobile device detected, initializing immediately');
        attemptInitialization();
    }
    
    // Also initialize with jQuery when ready
    if (typeof $ !== 'undefined') {
        $(function() {
            console.log('[Staff Mobile Report Enhancement] jQuery ready, attempting initialization');
            attemptInitialization();
        });
    } else {
        // Fallback if jQuery isn't available yet
        document.addEventListener('DOMContentLoaded', function() {
            console.log('[Staff Mobile Report Enhancement] DOM ready, attempting initialization');
            attemptInitialization();
        });
    }
    
    // Re-apply on scene render for scene_1095
    if (typeof $ !== 'undefined') {
        $(document).on('knack-scene-render.scene_1095', function() {
            console.log('[Staff Mobile Report Enhancement] Scene 1095 rendered');
            popupsInitialized = false;
            initAttempts = 0;
            attemptInitialization();
        });
        
        // Re-apply on view render for staff views
        $(document).on('knack-view-render.view_2776', function() {
            console.log('[Staff Mobile Report Enhancement] View 2776 rendered');
            popupsInitialized = false;
            initAttempts = 0;
            attemptInitialization();
            // Also specifically re-init help buttons
            setTimeout(() => {
                initializeHelpButtons();
            }, 1500);
        });
        
        $(document).on('knack-view-render.view_3015', function() {
            console.log('[Staff Mobile Report Enhancement] View 3015 rendered');
            popupsInitialized = false;
            initAttempts = 0;
            attemptInitialization();
            // Also specifically re-init help buttons
            setTimeout(() => {
                initializeHelpButtons();
            }, 1500);
        });
        
        // Also watch for any view render in scene_1095
        $(document).on('knack-view-render.any', function(event, view) {
            if (window.location.hash.includes('scene_1095') || window.location.hash.includes('mygroup-vespa-results2')) {
                console.log(`[Staff Mobile Report Enhancement] View ${view.key} rendered on coaching page`);
                setTimeout(() => {
                    attemptInitialization();
                }, 300);
                // Also specifically re-init help buttons after longer delay
                setTimeout(() => {
                    const textareas = document.querySelectorAll('textarea');
                    if (textareas.length > 0) {
                        console.log('[Staff Mobile Report Enhancement] Re-initializing help buttons for coaching page');
                        initializeHelpButtons();
                    }
                }, 2000);
            }
        });
    }
    
    // Check on hash change
    window.addEventListener('hashchange', function() {
        console.log('[Staff Mobile Report Enhancement] Hash changed, checking...');
        initAttempts = 0;
        attemptInitialization();
    });
    
    // Also check on visibility change
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && (window.location.hash.includes('scene_1095') || window.location.hash.includes('mygroup-vespa-results2'))) {
            console.log('[Staff Mobile Report Enhancement] Page became visible, rechecking...');
            attemptInitialization();
        }
    });
    
    console.log('[Staff Mobile Report Enhancement v1.0] Initialization complete');
})();
