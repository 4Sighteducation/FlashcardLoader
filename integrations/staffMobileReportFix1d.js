/**
 * Scene 1095 Staff Coaching Report Mobile Optimization & Help System
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
    
    // More robust mobile detection
    function isMobileDevice() {
        const isMobile = window.innerWidth <= 768 || 
                        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                        ('ontouchstart' in window) ||
                        (navigator.maxTouchPoints > 0);
        console.log('[Staff Mobile Report Enhancement] Mobile detection:', isMobile, 'Width:', window.innerWidth, 'UserAgent:', navigator.userAgent);
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
        
        // SKIP FOR EMULATED STUDENTS - Check if user has both staff and student roles
        const user = Knack.getUserAttributes();
        if (user && user.roles) {
            const hasStaffRole = user.roles.includes('object_7');
            const hasStudentRole = user.roles.includes('object_6');
            if (hasStaffRole && hasStudentRole && currentScene.includes('vespa-results')) {
                console.log('[Staff Mobile Report Enhancement] Emulated student viewing own report - skipping mobile fixes to prevent score display issues');
                return false;
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
                // Initialize for all screen sizes
                initializeVespaPopups();
                initializeTextAreaFocus();
                initializeHelpButtons();
                improveInfoButtonContent(); // Universal info button improvements
                popupsInitialized = true;
                
                // Mobile-specific initializations
                if (isMobileDevice()) {
                    // Try multiple times to ensure button is hidden
                    hideShowAnswersButton();
                    setTimeout(hideShowAnswersButton, 500);
                    setTimeout(hideShowAnswersButton, 1000);
                    setTimeout(hideShowAnswersButton, 2000);
                    
                    // Fix all modal types on mobile
                    fixAllModalsForMobile();
                }
                
                // Fix info button modals on all screen sizes
                fixInfoButtonModals();
            }
            
            // Enable pinch-to-zoom on mobile
            if (isMobileDevice()) {
                enableZoom();
                // Fix EFFORT section width issues
                fixEffortSection();
                // Add mobile section headings - THIS IS THE KEY MISSING PIECE!
                addSectionHeadings();
            }
            
            return true;
        } catch (error) {
            console.error('[Staff Mobile Report Enhancement] Error during initialization:', error);
            return false;
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
    
    function initializeHelpButtons() {
        console.log('[Staff Mobile Report Enhancement] Initializing help buttons');
        
        // Create response guide modal if it doesn't exist
        if (!document.getElementById('staff-response-guide-modal')) {
            const modalHtml = `
                <div id="staff-response-guide-modal" class="help-modal-overlay">
                    <div class="help-modal-content">
                        <div class="help-modal-header">
                            <h2>Response Guide</h2>
                            <button class="help-modal-close">&times;</button>
                        </div>
                        <div class="help-modal-body">
                            <div id="staff-response-guide-content"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Add close handlers
            const modal = document.getElementById('staff-response-guide-modal');
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
            // Find all comment sections - adapt selectors for staff views
            const commentSelectors = [
                '#view_2776 .comment-section',
                '#view_3015 .comment-section',
                '#kn-scene_1095 .comment-section'
            ];
            
            let commentSections = [];
            commentSelectors.forEach(selector => {
                const sections = document.querySelectorAll(selector);
                commentSections = commentSections.concat(Array.from(sections));
            });
            
            commentSections.forEach((section, index) => {
                // Check if button already exists
                if (section.querySelector('.help-writing-btn')) {
                    return;
                }
                
                // Add help button for staff coaching comments
                const helpButton = document.createElement('button');
                helpButton.className = 'help-writing-btn';
                helpButton.innerHTML = '<span>💡</span> Need help writing coaching feedback?';
                
                // Insert the button at the top of the comment section
                const firstChild = section.firstElementChild;
                if (firstChild) {
                    section.insertBefore(helpButton, firstChild);
                } else {
                    section.appendChild(helpButton);
                }
                
                // Add click handler
                helpButton.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const modal = document.getElementById('staff-response-guide-modal');
                    const contentDiv = document.getElementById('staff-response-guide-content');
                    
                    // Generic coaching guidance content
                    contentDiv.innerHTML = `
                        <div class="help-content">
                            <h3>Effective Coaching Feedback Tips</h3>
                            <ul>
                                <li><strong>Be specific and actionable</strong> - Give concrete steps the student can take</li>
                                <li><strong>Focus on growth</strong> - Highlight what they're doing well and how to build on it</li>
                                <li><strong>Ask guiding questions</strong> - Help students discover insights themselves</li>
                                <li><strong>Connect to goals</strong> - Relate feedback to their academic or personal objectives</li>
                                <li><strong>Be encouraging</strong> - Maintain a positive, supportive tone</li>
                            </ul>
                            
                            <h4>Sample Coaching Phrases:</h4>
                            <ul>
                                <li>"I noticed you... Consider trying..."</li>
                                <li>"Your strength in... could help you with..."</li>
                                <li>"What would happen if you..."</li>
                                <li>"How might you apply this to..."</li>
                            </ul>
                        </div>
                    `;
                    
                    // Show modal
                    modal.classList.add('active');
                    
                    console.log('[Staff Mobile Report Enhancement] Opened coaching guide modal');
                });
            });
            
            console.log(`[Staff Mobile Report Enhancement] Added help buttons to ${commentSections.length} comment sections`);
        }, 500);
    }
    
    function initializeVespaPopups() {
        // Only initialize on mobile
        if (!isMobileDevice()) {
            console.log('[Staff Mobile Report Enhancement] Skipping VESPA popups on desktop');
            return;
        }
        
        console.log('[Staff Mobile Report Enhancement] Initializing VESPA popups for mobile');
        
        // Add section headings to all VESPA sections (only on mobile)
        addSectionHeadings();
        
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
        });
        
        $(document).on('knack-view-render.view_3015', function() {
            console.log('[Staff Mobile Report Enhancement] View 3015 rendered');
            popupsInitialized = false;
            initAttempts = 0;
            attemptInitialization();
        });
        
        // Also watch for any view render in scene_1095
        $(document).on('knack-view-render.any', function(event, view) {
            if (window.location.hash.includes('scene_1095') || window.location.hash.includes('mygroup-vespa-results2')) {
                console.log(`[Staff Mobile Report Enhancement] View ${view.key} rendered on coaching page`);
                setTimeout(() => {
                    attemptInitialization();
                }, 300);
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

