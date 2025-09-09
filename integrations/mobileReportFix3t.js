/**
 * Scene 43 Student Report Mobile Optimization & Help System
 * Optimizes the VESPA report display and adds help buttons for all devices
 * Version 5.1 - Minimal fix: Mobile-only radar chart + modal remnant fix
 * Based on working happyreport1.js with only essential fixes added
 */

(function() {
    'use strict';
    
    console.log('[Student Report Enhancement v5.1] Script loaded at', new Date().toISOString());
    
    let stylesApplied = false;
    let popupsInitialized = false;
    let initAttempts = 0;
    const MAX_INIT_ATTEMPTS = 10;
    
    // More robust mobile detection - FIXED v2
    function isMobileDevice() {
        // Check multiple conditions for mobile detection
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const smallWidth = window.innerWidth <= 768;
        const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Consider it mobile if it has touch AND (small width OR mobile user agent)
        const isMobile = hasTouch && (smallWidth || mobileUserAgent);
        
        console.log('[Student Report Enhancement] Mobile detection:', isMobile, 'Width:', window.innerWidth, 'Touch:', hasTouch, 'UA Mobile:', mobileUserAgent);
        return isMobile;
    }
    
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            function checkElement() {
                const element = document.querySelector(selector);
                if (element) {
                    console.log(`[Student Report Enhancement] Found element: ${selector}`);
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    console.warn(`[Student Report Enhancement] Timeout waiting for element: ${selector}`);
                    reject(new Error(`Element ${selector} not found after ${timeout}ms`));
                } else {
                    setTimeout(checkElement, 100);
                }
            }
            
            checkElement();
        });
    }
    
    async function fixStudentReport() {
        // Check if we're on the student report page
        const currentScene = window.location.hash;
        if (!currentScene.includes('scene_43') && !currentScene.includes('my-report') && !currentScene.includes('vespa-results')) {
            console.log('[Student Report Enhancement] Not on student report page, skipping');
            return false;
        }
        
        // SKIP FOR EMULATED STUDENTS - Check if user has both staff and student roles
        const user = Knack.getUserAttributes();
        if (user && user.roles) {
            const hasStaffRole = user.roles.includes('object_7');
            const hasStudentRole = user.roles.includes('object_6');
            if (hasStaffRole && hasStudentRole) {
                console.log('[Student Report Enhancement] Emulated student detected - skipping mobile fixes to prevent score display issues');
                return false;
            }
        }
        
        try {
            // Wait for the report container with timeout
            const reportContainer = await waitForElement('#view_3041 #report-container', 5000);
            
            console.log('[Student Report Enhancement] Report container found! Applying enhancements');
            
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
                console.log('[Student Report Enhancement] Desktop detected - force hiding mobile elements');
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
            }
            
            return true;
        } catch (error) {
            console.error('[Student Report Enhancement] Error during initialization:', error);
            return false;
        }
    }
    
    function fixViewAnswersButton() {
        console.log('[Student Report Enhancement] Fixing VIEW ANSWERS button');
        
        // Debug: Log all buttons found
        const allButtons = document.querySelectorAll('button.p-button');
        console.log(`[Student Report Enhancement] Found ${allButtons.length} p-button elements`);
        
        // Find the VIEW ANSWERS button - it incorrectly has p-button-rounded class
        const viewBtn = Array.from(allButtons).find(b => {
            const hasViewAnswers = b.textContent.includes('VIEW ANSWERS');
            if (hasViewAnswers) {
                console.log('[Student Report Enhancement] Found VIEW ANSWERS button with classes:', b.className);
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
            
            console.log('[Student Report Enhancement] VIEW ANSWERS button fixed with enhanced styles');
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
            console.log('[Student Report Enhancement] Header wrapping fixed');
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
            console.log('[Student Report Enhancement] Zoom enabled');
        }
    }
    
    function fixEffortSection() {
        console.log('[Student Report Enhancement] Fixing EFFORT section width issues');
        
        // Find the EFFORT section by its blue color
        const effortSection = document.querySelector('#view_3041 .vespa-report-score[style*="background-color: rgb(134, 180, 240)"]');
        
        if (effortSection) {
            // Get the parent vespa-report container
            const vespaReport = effortSection.closest('.vespa-report');
            
            if (vespaReport) {
                console.log('[Student Report Enhancement] Found EFFORT section, applying fixes');
                
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
                while (parent && !parent.id?.includes('view_3041')) {
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
                    // Don't force width or display changes
                }
                
                // Fix coaching section width
                if (coachingSection) {
                    coachingSection.style.maxWidth = '100%';
                    coachingSection.style.boxSizing = 'border-box';
                    // Don't force width or display changes
                }
                
                // Add section headings ONLY on mobile
                if (isMobileDevice()) {
                    console.log('[Student Report Enhancement] Adding section headings from fixEffortSection');
                    addSectionHeadings();
                } else {
                    console.log('[Student Report Enhancement] Desktop detected in fixEffortSection - skipping headings');
                }
                
                // Compare with other VESPA sections for consistency
                const allVespaReports = document.querySelectorAll('#view_3041 .vespa-report');
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
                
                console.log('[Student Report Enhancement] EFFORT section width fixed with preserved layout');
            }
        }
        
        // Set up a MutationObserver to fix EFFORT section if it gets modified
        setupEffortSectionObserver();
    }
    
    function addSectionHeadings() {
        // Only add headings on mobile
        if (!isMobileDevice()) {
            console.log('[Student Report Enhancement] Skipping section headings on desktop (width: ' + window.innerWidth + ')');
            
            // Extra safety: remove any mobile headings that might exist
            const mobileHeadings = document.querySelectorAll('.mobile-theme-heading, .mobile-score-display, .mobile-section-heading, .mobile-section-heading-comments, .mobile-section-heading-coaching');
            if (mobileHeadings.length > 0) {
                console.log('[Student Report Enhancement] Found ' + mobileHeadings.length + ' mobile headings on desktop - removing them');
                mobileHeadings.forEach(heading => heading.remove());
            }
            return;
        }
        
        console.log('[Student Report Enhancement] Adding section headings for mobile');
        
        // Add headings to all VESPA sections on mobile
        const allVespaReports = document.querySelectorAll('#view_3041 .vespa-report');
        
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
                        console.log('[Student Report Enhancement] Could not parse score for', themeName);
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
        
        console.log('[Student Report Enhancement] Added section headings for mobile view');
    }
    
    function setupEffortSectionObserver() {
        // Only set up once
        if (window.effortSectionObserver) {
            return;
        }
        
        console.log('[Student Report Enhancement] Setting up EFFORT section observer');
        
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
                console.log('[Student Report Enhancement] EFFORT section modified, reapplying fixes');
                // Use a small delay to ensure all changes are complete
                setTimeout(() => {
                    fixEffortSection();
                }, 50);
            }
        });
        
        // Observe the report container
        const reportContainer = document.querySelector('#view_3041');
        if (reportContainer) {
            observer.observe(reportContainer, {
                attributes: true,
                attributeFilter: ['style'],
                subtree: true,
                childList: true
            });
            
            window.effortSectionObserver = observer;
        }
    }
    
    function initializeHelpButtons() {
        console.log('[Student Report Enhancement] Initializing help buttons');
        
        // Create response guide modal if it doesn't exist
        if (!document.getElementById('response-guide-modal')) {
            const modalHtml = `
                <div id="response-guide-modal" class="help-modal-overlay">
                    <div class="help-modal-content">
                        <div class="help-modal-header">
                            <h2>Response Guide</h2>
                            <button class="help-modal-close">&times;</button>
                        </div>
                        <div class="help-modal-body">
                            <div id="response-guide-content"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Add close handlers
            const modal = document.getElementById('response-guide-modal');
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
        
        // Create goal-setting modal if it doesn't exist
        if (!document.getElementById('goal-setting-modal')) {
            const goalModalHtml = `
                <div id="goal-setting-modal" class="help-modal-overlay">
                    <div class="help-modal-content">
                        <div class="help-modal-header">
                            <h2>Setting Effective Study Goals</h2>
                            <button class="help-modal-close">&times;</button>
                        </div>
                        <div class="help-modal-body">
                            <div id="goal-setting-content">
                                <div class="goal-tips">
                                    <h3>Tips for Effective Study Goals</h3>
                                    <ul>
                                        <li><strong>Keep them specific and achievable</strong> - Instead of "study more", try "complete 2 practice papers this week"</li>
                                        <li><strong>Focus on approach goals</strong> - Set targets you're working towards, not things you're trying to avoid</li>
                                        <li><strong>Make them measurable</strong> - Include numbers or specific outcomes so you know when you've achieved them</li>
                                        <li><strong>Set a timeframe</strong> - Give yourself a deadline to create urgency and track progress</li>
                                    </ul>
                                    
                                    <h3>Types of Effective Approach Goals</h3>
                                    <div class="goal-type">
                                        <h4>🎯 Performance Goals</h4>
                                        <p>"I want to achieve 75% or higher in my next test"</p>
                                        <p class="goal-description">Focus on achieving a specific ranking or score</p>
                                    </div>
                                    
                                    <div class="goal-type">
                                        <h4>📈 Mastery Goals</h4>
                                        <p>"I will improve my essay structure by practicing introductions daily"</p>
                                        <p class="goal-description">Focus on developing specific skills</p>
                                    </div>
                                    
                                    <div class="goal-type">
                                        <h4>🏆 Personal Best Goals</h4>
                                        <p>"I aim to beat my previous score of 68% by at least 5%"</p>
                                        <p class="goal-description">Focus on improving your own previous performance</p>
                                    </div>
                                    
                                    <div class="avoid-section">
                                        <h4>❌ Avoid These Types of Goals</h4>
                                        <ul>
                                            <li>"I just don't want to fail" (avoidance goal)</li>
                                            <li>"I hope I don't run out of time" (focuses on negative)</li>
                                            <li>"As long as I pass" (lacks ambition)</li>
                                        </ul>
                                    </div>
                                    
                                    <div class="goal-prompt">
                                        <p><strong>Now write your study goals focusing on what you want to achieve, not what you want to avoid!</strong></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', goalModalHtml);
            
            // Add close handlers
            const goalModal = document.getElementById('goal-setting-modal');
            const closeBtn = goalModal.querySelector('.help-modal-close');
            
            closeBtn.addEventListener('click', () => {
                goalModal.classList.remove('active');
            });
            
            goalModal.addEventListener('click', (e) => {
                if (e.target === goalModal) {
                    goalModal.classList.remove('active');
                }
            });
        }
        
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            // Debug: First check what we have on the page
            console.log('[Student Report Enhancement] Checking for comment sections...');
            const textareas = document.querySelectorAll('textarea, .ql-editor, [contenteditable="true"]');
            console.log(`[Student Report Enhancement] Found ${textareas.length} textareas/editors on page`);
            
            // Find all comment sections - try multiple selectors
            let commentSections = document.querySelectorAll('#view_3041 .comment-section');
            
            // If no .comment-section found, look for textareas and their containers
            if (commentSections.length === 0) {
                console.log('[Student Report Enhancement] No .comment-section found, looking for textarea containers...');
                const containers = [];
                textareas.forEach(textarea => {
                    const container = textarea.closest('.kn-input') || textarea.closest('.field') || textarea.parentElement;
                    if (container && !containers.includes(container)) {
                        containers.push(container);
                    }
                });
                commentSections = containers;
            }
            
            commentSections.forEach((section, index) => {
                // Check if button already exists
                if (section.querySelector('.help-writing-btn')) {
                    return;
                }
                
                // Determine if this is the goals section (usually the second one)
                const isGoalsSection = index === 1 || section.textContent.includes('goal') || section.textContent.includes('Goal');
                
                if (index === 0) {
                    // First section - regular response help
                    const helpButton = document.createElement('button');
                    helpButton.className = 'help-writing-btn';
                    helpButton.innerHTML = '<span>💡</span> Need help writing a response?';
                    
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
                        const modal = document.getElementById('response-guide-modal');
                        const contentDiv = document.getElementById('response-guide-content');
                        
                        // Enhanced response guide content
                        contentDiv.innerHTML = `
                            <div class="response-guide-content">
                                <div class="guide-intro">
                                    <p>Your response helps your tutor/mentor understand your unique situation and provide personalized support. Be honest and specific - there are no wrong answers!</p>
                                </div>
                                
                                <h3>📊 Reflecting on Your VESPA Scores</h3>
                                <div class="guide-section">
                                    <p>Consider how accurately the report reflects your current study habits:</p>
                                    <ul>
                                        <li><strong>Do the scores feel right?</strong> Which ones resonate most with your experience?</li>
                                        <li><strong>Any surprises?</strong> Were any scores higher or lower than expected?</li>
                                        <li><strong>Your strengths:</strong> What's your highest score telling you?</li>
                                        <li><strong>Growth areas:</strong> What might your lowest score suggest?</li>
                                    </ul>
                                    
                                    <div class="sentence-starters">
                                        <h4>Try starting with:</h4>
                                        <p class="starter">"Looking at my scores, I was surprised to see..."</p>
                                        <p class="starter">"My [highest/lowest] score in [area] makes sense because..."</p>
                                        <p class="starter">"I think the report is [very/somewhat/not very] accurate because..."</p>
                                        <p class="starter">"If I could adjust one score, it would be [area] because..."</p>
                                    </div>
                                </div>
                                
                                <h3>📚 Your Current Study Experience</h3>
                                <div class="guide-section">
                                    <p>Help your tutor/mentor understand what studying is really like for you right now:</p>
                                    <ul>
                                        <li><strong>Daily reality:</strong> What does a typical study session look like?</li>
                                        <li><strong>Challenges:</strong> What's been particularly difficult lately?</li>
                                        <li><strong>Successes:</strong> What study strategies are working well?</li>
                                        <li><strong>Time management:</strong> How do you balance study with other commitments?</li>
                                    </ul>
                                    
                                    <div class="sentence-starters">
                                        <h4>Express yourself with:</h4>
                                        <p class="starter">"Right now, I'm finding it hard to..."</p>
                                        <p class="starter">"My biggest challenge with studying is..."</p>
                                        <p class="starter">"I usually study by... but I'm not sure if..."</p>
                                        <p class="starter">"Something that's been working well for me is..."</p>
                                        <p class="starter">"I struggle most when..."</p>
                                    </div>
                                </div>
                                
                                <h3>🎯 What You Want to Achieve</h3>
                                <div class="guide-section">
                                    <p>Share what matters most to you academically:</p>
                                    <ul>
                                        <li><strong>Immediate concerns:</strong> What needs attention first?</li>
                                        <li><strong>Long-term goals:</strong> Where do you want to be?</li>
                                        <li><strong>Support needed:</strong> What kind of help would be most valuable?</li>
                                        <li><strong>Motivation:</strong> What drives you to succeed?</li>
                                    </ul>
                                    
                                    <div class="sentence-starters">
                                        <h4>Share your thoughts:</h4>
                                        <p class="starter">"What I really need help with is..."</p>
                                        <p class="starter">"I'm motivated by..."</p>
                                        <p class="starter">"My main priority right now is..."</p>
                                        <p class="starter">"I'd like to improve my ability to..."</p>
                                    </div>
                                </div>
                                
                                <div class="guide-tips">
                                    <h4>💡 Tips for a Great Response</h4>
                                    <ul>
                                        <li><strong>Be specific:</strong> Instead of "I procrastinate," try "I often leave essays until 2 days before they're due"</li>
                                        <li><strong>Include context:</strong> Mention relevant factors (work commitments, health, family responsibilities)</li>
                                        <li><strong>Be honest:</strong> Your tutor/mentor is here to help, not judge</li>
                                        <li><strong>Ask for what you need:</strong> If you want specific strategies or support, say so!</li>
                                    </ul>
                                </div>
                                
                                <div class="response-prompt">
                                    <p><strong>Remember:</strong> This is the start of a conversation. Your tutor/mentor will use your response to tailor their support specifically to you. The more open and detailed you are, the more helpful they can be!</p>
                                </div>
                            </div>
                        `;
                        
                        // Show modal
                        modal.classList.add('active');
                        
                        console.log('[Student Report Enhancement] Opened enhanced response guide modal');
                    });
                } else if (isGoalsSection) {
                    // Goals section - goal-setting help
                    const goalButton = document.createElement('button');
                    goalButton.className = 'help-writing-btn goal-help-btn';
                    goalButton.innerHTML = '<span>🎯</span> Need help setting effective goals?';
                    
                    // Insert the button at the top of the comment section
                    const firstChild = section.firstElementChild;
                    if (firstChild) {
                        section.insertBefore(goalButton, firstChild);
                    } else {
                        section.appendChild(goalButton);
                    }
                    
                    // Add click handler
                    goalButton.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const modal = document.getElementById('goal-setting-modal');
                        modal.classList.add('active');
                        console.log('[Student Report Enhancement] Opened goal-setting modal');
                    });
                }
            });
            
            console.log(`[Student Report Enhancement] Added help buttons to comment sections`);
        }, 500);
    }
    
    // New function to intercept and style activity links
    function initializeViewAnswersEnhancement() {
        console.log('[Student Report Enhancement] Initializing View Answers enhancement for ALL devices...');
        
        // Check if already initialized to prevent duplicates
        if (window._studentViewAnswersEnhancementInitialized) {
            console.log('[Student Report Enhancement] View Answers enhancement already initialized, skipping...');
            return;
        }
        window._studentViewAnswersEnhancementInitialized = true;
        
        let currentCycle = 1;
        
        // ========== CREATE CUSTOM CYCLE MODAL ==========
        createCustomCycleModal();
        
        // ========== API-BASED DATA FETCHING ==========
        async function fetchCycleDataFromAPI() {
            console.log('[Student Report Enhancement] Fetching cycle data from API...');
            
            try {
                // Get current student ID
                const user = Knack.getUserAttributes();
                const studentId = user.id;
                console.log(`[Student Report Enhancement] Student ID: ${studentId}`);
                
                // Get Object_10 ID from Object_6 record
                const studentUrl = `https://api.knack.com/v1/objects/object_6/records/${studentId}`;
                const studentRecord = await $.ajax({
                    url: studentUrl,
                    type: 'GET',
                    headers: {
                        'X-Knack-Application-Id': Knack.application_id,
                        'X-Knack-REST-API-Key': 'knack',
                        'Authorization': Knack.getUserToken()
                    }
                });
                
                // Extract Object_10 ID from field_182
                let object10Id = null;
                if (studentRecord && studentRecord.field_182) {
                    if (Array.isArray(studentRecord.field_182) && studentRecord.field_182.length > 0) {
                        object10Id = studentRecord.field_182[0].id;
                    } else if (studentRecord.field_182.id) {
                        object10Id = studentRecord.field_182.id;
                    }
                }
                
                if (!object10Id) {
                    console.error('[Student Report Enhancement] No Object_10 ID found');
                    return null;
                }
                
                console.log(`[Student Report Enhancement] Object_10 ID: ${object10Id}`);
                
                // Get Object_29 record
                const filters = {
                    match: 'and',
                    rules: [{
                        field: 'field_792',
                        operator: 'is',
                        value: object10Id
                    }]
                };
                
                const object29Url = `https://api.knack.com/v1/objects/object_29/records?filters=${encodeURIComponent(JSON.stringify(filters))}`;
                const object29Response = await $.ajax({
                    url: object29Url,
                    type: 'GET',
                    headers: {
                        'X-Knack-Application-Id': Knack.application_id,
                        'X-Knack-REST-API-Key': 'knack',
                        'Authorization': Knack.getUserToken()
                    }
                });
                
                if (object29Response && object29Response.records && object29Response.records.length > 0) {
                    const cycleData = object29Response.records[0];
                    console.log(`[Student Report Enhancement] Found Object_29 data with ${Object.keys(cycleData).length} fields`);
                    
                    // Store globally for modal to use
                    window.studentCycleDataFromAPI = cycleData;
                    return cycleData;
                }
                
                console.warn('[Student Report Enhancement] No Object_29 record found');
                return null;
                
            } catch (error) {
                console.error('[Student Report Enhancement] Error fetching cycle data:', error);
                return null;
            }
        }
        
        // ========== CREATE CUSTOM MODAL HTML ==========
        function createCustomCycleModal() {
            // Remove existing modal if present
            const existing = document.getElementById('customStudentCycleModal');
            if (existing) existing.remove();
            
            const modalHtml = `
                <div id="customStudentCycleModal" class="custom-cycle-modal-overlay">
                    <div class="custom-cycle-modal-container">
                        <div class="custom-cycle-modal-header">
                            <h2>Your VESPA Responses - Cycle <span id="studentCycleNumber">${currentCycle}</span></h2>
                            <div class="cycle-selector">
                                <button class="cycle-btn ${currentCycle === 1 ? 'active' : ''}" data-cycle="1">Cycle 1</button>
                                <button class="cycle-btn ${currentCycle === 2 ? 'active' : ''}" data-cycle="2">Cycle 2</button>
                                <button class="cycle-btn ${currentCycle === 3 ? 'active' : ''}" data-cycle="3">Cycle 3</button>
                            </div>
                            <button class="custom-cycle-modal-close">✕</button>
                        </div>
                        <div class="custom-cycle-modal-body">
                            <div class="cycle-data-loading">
                                <div class="spinner"></div>
                                <p>Loading your cycle data...</p>
                            </div>
                            <div class="cycle-data-content" style="display: none;"></div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Add event listeners
            const modal = document.getElementById('customStudentCycleModal');
            modal.querySelector('.custom-cycle-modal-close').addEventListener('click', () => {
                modal.style.display = 'none';
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
            
            // Cycle button listeners
            modal.querySelectorAll('.cycle-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    currentCycle = parseInt(btn.dataset.cycle);
                    renderModalContent(currentCycle);
                });
            });
        }
        
        // ========== RENDER MODAL CONTENT ==========
        async function renderModalContent(cycle) {
            const modal = document.getElementById('customStudentCycleModal');
            const contentDiv = modal.querySelector('.cycle-data-content');
            const loadingDiv = modal.querySelector('.cycle-data-loading');
            
            // Show loading
            loadingDiv.style.display = 'flex';
            contentDiv.style.display = 'none';
            
            // Get or fetch data
            let data = window.studentCycleDataFromAPI;
            if (!data) {
                data = await fetchCycleDataFromAPI();
            }
            
            if (!data) {
                contentDiv.innerHTML = '<p style="text-align: center; color: #666;">Unable to load cycle data. Please try again.</p>';
                loadingDiv.style.display = 'none';
                contentDiv.style.display = 'block';
                return;
            }
            
            // Render the data
            const cycleFieldMappings = getCycleFieldMappings();
            let html = '<div class="cycle-questions-grid">';
            
            cycleFieldMappings.forEach(mapping => {
                const fieldKey = cycle === 1 ? mapping.fieldIdCycle1 : 
                               cycle === 2 ? mapping.fieldIdCycle2 : 
                               mapping.fieldIdCycle3;
                const value = data[fieldKey] || data[fieldKey + '_raw'] || '—';
                
                html += `
                    <div class="cycle-question-item">
                        <div class="question-label">${mapping.questionId}</div>
                        <div class="question-value">${value}</div>
                    </div>
                `;
            });
            
            html += '</div>';
            
            // Update modal
            contentDiv.innerHTML = html;
            loadingDiv.style.display = 'none';
            contentDiv.style.display = 'block';
            
            // Update header
            document.getElementById('studentCycleNumber').textContent = cycle;
            
            // Update active button
            modal.querySelectorAll('.cycle-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.cycle == cycle);
            });
        }
        
        // Helper function to get field mappings
        function getCycleFieldMappings() {
            return [
                { questionId: "Q1", fieldIdCycle1: "field_1953", fieldIdCycle2: "field_1955", fieldIdCycle3: "field_1956" },
                { questionId: "Q2", fieldIdCycle1: "field_1954", fieldIdCycle2: "field_1957", fieldIdCycle3: "field_1958" },
                { questionId: "Q3", fieldIdCycle1: "field_1959", fieldIdCycle2: "field_1960", fieldIdCycle3: "field_1961" },
                { questionId: "Q4", fieldIdCycle1: "field_1962", fieldIdCycle2: "field_1963", fieldIdCycle3: "field_1964" },
                { questionId: "Q5", fieldIdCycle1: "field_1965", fieldIdCycle2: "field_1966", fieldIdCycle3: "field_1967" },
                { questionId: "Q6", fieldIdCycle1: "field_1968", fieldIdCycle2: "field_1969", fieldIdCycle3: "field_1970" },
                { questionId: "Q7", fieldIdCycle1: "field_1971", fieldIdCycle2: "field_1972", fieldIdCycle3: "field_1973" },
                { questionId: "Q8", fieldIdCycle1: "field_1974", fieldIdCycle2: "field_1975", fieldIdCycle3: "field_1976" },
                { questionId: "Q9", fieldIdCycle1: "field_1977", fieldIdCycle2: "field_1978", fieldIdCycle3: "field_1979" },
                { questionId: "Q10", fieldIdCycle1: "field_1980", fieldIdCycle2: "field_1981", fieldIdCycle3: "field_1982" },
                { questionId: "Q11", fieldIdCycle1: "field_1983", fieldIdCycle2: "field_1984", fieldIdCycle3: "field_1985" },
                { questionId: "Q12", fieldIdCycle1: "field_1986", fieldIdCycle2: "field_1987", fieldIdCycle3: "field_1988" },
                { questionId: "Q13", fieldIdCycle1: "field_1989", fieldIdCycle2: "field_1990", fieldIdCycle3: "field_1991" },
                { questionId: "Q14", fieldIdCycle1: "field_1992", fieldIdCycle2: "field_1993", fieldIdCycle3: "field_1994" },
                { questionId: "Q15", fieldIdCycle1: "field_1995", fieldIdCycle2: "field_1996", fieldIdCycle3: "field_1997" },
                { questionId: "Q16", fieldIdCycle1: "field_1998", fieldIdCycle2: "field_1999", fieldIdCycle3: "field_2000" },
                { questionId: "Q17", fieldIdCycle1: "field_2001", fieldIdCycle2: "field_2002", fieldIdCycle3: "field_2003" },
                { questionId: "Q18", fieldIdCycle1: "field_2004", fieldIdCycle2: "field_2005", fieldIdCycle3: "field_2006" },
                { questionId: "Q19", fieldIdCycle1: "field_2007", fieldIdCycle2: "field_2008", fieldIdCycle3: "field_2009" },
                { questionId: "Q20", fieldIdCycle1: "field_2010", fieldIdCycle2: "field_2011", fieldIdCycle3: "field_2012" },
                { questionId: "Q21", fieldIdCycle1: "field_2013", fieldIdCycle2: "field_2014", fieldIdCycle3: "field_2015" },
                { questionId: "Q22", fieldIdCycle1: "field_2016", fieldIdCycle2: "field_2017", fieldIdCycle3: "field_2018" },
                { questionId: "Q23", fieldIdCycle1: "field_2019", fieldIdCycle2: "field_2020", fieldIdCycle3: "field_2021" },
                { questionId: "Q24", fieldIdCycle1: "field_2022", fieldIdCycle2: "field_2023", fieldIdCycle3: "field_2024" },
                { questionId: "Q25", fieldIdCycle1: "field_2025", fieldIdCycle2: "field_2026", fieldIdCycle3: "field_2027" },
                { questionId: "Q26", fieldIdCycle1: "field_2028", fieldIdCycle2: "field_2029", fieldIdCycle3: "field_2030" },
                { questionId: "Q27", fieldIdCycle1: "field_2031", fieldIdCycle2: "field_2032", fieldIdCycle3: "field_2033" },
                { questionId: "Q28", fieldIdCycle1: "field_2034", fieldIdCycle2: "field_2035", fieldIdCycle3: "field_2036" },
                { questionId: "Q29", fieldIdCycle1: "field_2037", fieldIdCycle2: "field_2038", fieldIdCycle3: "field_2039" }
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
                    newBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        console.log('[Student Report Enhancement] View Answers clicked - showing custom modal');
                        
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
                        const modal = document.getElementById('customStudentCycleModal');
                        modal.style.display = 'flex';
                        await renderModalContent(currentCycle);
                    });
                    
                    console.log('[Student Report Enhancement] View Answers button overridden with custom modal');
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
        
        // OLD INTERCEPTOR CODE - DISABLED BUT KEPT FOR REFERENCE
        /* const cycleFieldMappings = [
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
        ]; */
        
        /* OLD INTERCEPTOR CODE - DISABLED
        // Extract cycle data from hidden table (view_69)
        function extractCycleData() {
            const allData = {};
            
            // Check Knack model
            if (window.Knack?.models?.view_69?.data) {
                const dataCollection = window.Knack.models.view_69.data;
                if (dataCollection.models && dataCollection.models.length > 0) {
                    dataCollection.models.forEach(model => {
                        const record = model.attributes || model.toJSON();
                        Object.assign(allData, record);
                    });
                }
            }
            
            // Also check DOM
            const table = document.querySelector('#view_69');
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
                    console.log(`[Student Report Enhancement] ${mapping.questionId}: ${value} (Cycle ${cycle})`);
                }
            });
            
            window.studentCycleData = cycleData;
            console.log(`[Student Report Enhancement] Loaded ${Object.keys(cycleData).length} values for Cycle ${cycle}`);
            return cycleData;
        }
        
        // INTERCEPT API CALLS TO REPLACE WITH CYCLE DATA
        function interceptQuestionnaireData() {
            console.log('[Student Report Enhancement] Installing questionnaire data interceptor...');
            
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
            
            if (!window._studentXHRIntercepted) {
                window._studentXHRIntercepted = true;
                
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
                                console.log('[Student Report Enhancement] Intercepted questionnaire response');
                                
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
                                                    console.log(`[Student Report Enhancement] Replacing ${currentField}: ${record[currentField]} → ${cycleValue} (Cycle ${currentCycle})`);
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
                                    
                                    console.log(`[Student Report Enhancement] Modified response for Cycle ${currentCycle}`);
                                }
                            } catch (error) {
                                console.error('[Student Report Enhancement] Error intercepting response:', error);
                            }
                            
                            if (originalOnLoad) {
                                originalOnLoad.apply(xhr, arguments);
                            }
                        };
                    }
                    
                    return originalSend.apply(this, arguments);
                };
                
                console.log('[Student Report Enhancement] XMLHttpRequest interceptor installed');
            }
        }
        
        // Debug: Check if we're on the right page
        console.log('[Student Report Enhancement] Current URL hash:', window.location.hash);
        
        // Track cycle button clicks
        function initializeCycleTracking() {
            const cycleButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
                const text = btn.textContent.trim();
                return text === '1' || text === '2' || text === '3' || 
                       text.includes('Cycle 1') || text.includes('Cycle 2') || text.includes('Cycle 3');
            });
            
            console.log(`[Student Report Enhancement] Found ${cycleButtons.length} cycle buttons`);
            
            cycleButtons.forEach((btn, index) => {
                // Check if already has listener to prevent duplicates
                if (btn.dataset.studentCycleListenerAdded) return;
                btn.dataset.studentCycleListenerAdded = 'true';
                
                btn.addEventListener('click', function() {
                    const btnText = this.textContent.trim();
                    if (btnText === '1' || btnText.includes('Cycle 1')) currentCycle = 1;
                    else if (btnText === '2' || btnText.includes('Cycle 2')) currentCycle = 2;
                    else if (btnText === '3' || btnText.includes('Cycle 3')) currentCycle = 3;
                    
                    console.log(`[Student Report Enhancement] Cycle ${currentCycle} selected`);
                    
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
            console.log('[Student Report Enhancement] Modal enhancement DISABLED to prevent crashes');
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
        
        console.log('[Student Report Enhancement] View Answers button search result:', viewAnswersBtn ? 'FOUND' : 'NOT FOUND');
        
        if (viewAnswersBtn && !viewAnswersBtn.dataset.studentEnhancementListenerAdded) {
            viewAnswersBtn.dataset.studentEnhancementListenerAdded = 'true';
            console.log('[Student Report Enhancement] View Answers button details:', {
                text: viewAnswersBtn.textContent,
                classes: viewAnswersBtn.className,
                ariaLabel: viewAnswersBtn.getAttribute('aria-label')
            });
            
            // Add a safe click handler that loads cycle data
            viewAnswersBtn.addEventListener('click', function(e) {
                console.log('[Student Report Enhancement] View Answers clicked - Cycle', currentCycle);
                
                // Load cycle-specific data when button is clicked
                const cycleData = getCycleSpecificData(currentCycle);
                console.log('[Student Report Enhancement] Cycle data loaded:', Object.keys(cycleData).length, 'fields');
                
                // Store globally for debugging
                window.studentCycleData = cycleData;
                console.log('[Student Report Enhancement] Cycle data available at window.studentCycleData');
            });
        }
        
        // Only set up ONE mutation observer for modals to prevent performance issues
        if (!window._studentModalObserverInitialized) {
            window._studentModalObserverInitialized = true;
            
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
                                if (modal && modal.textContent.includes('Question') && !modal.dataset.studentEnhanced) {
                                    modal.dataset.studentEnhanced = 'true';
                                    modalsToEnhance.push(modal);
                                }
                            }
                        }
                    });
                });
                
                // Do not enhance modals - this was causing crashes
                if (modalsToEnhance.length > 0) {
                    console.log('[Student Report Enhancement] Modal detected but enhancement disabled to prevent crashes');
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
                console.error('[Student Report Enhancement] Error in cycle tracking:', error);
            }
        }
        
        console.log('[Student Report Enhancement] View Answers enhancement initialized');
        
        // Initialize the interceptor after all functions are defined
        interceptQuestionnaireData();
        */ // END OF OLD INTERCEPTOR CODE
    }
    
    function interceptActivityLinks() {
        console.log('[Student Report Enhancement] Intercepting activity links...');
        
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
        
        // Process all activity links
        const selectors = [
            '#view_3041 a[href*="start-activity"]',
            '#view_3041 a[href*="/activity/"]',
            '#view_3041 .vespa-report-coaching-questions a',
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
                
                console.log(`[Student Report Enhancement] Updated activity link: ${newUrl}`);
            });
        });
    }
    
    function initializeVespaPopups() {
        // Initialize for ALL devices
        console.log('[Student Report Enhancement] Initializing VESPA popups (tap to expand) for ALL devices');
        
        // Add section headings to all VESPA sections (only on mobile)
        if (isMobileDevice()) {
            addSectionHeadings();
        }
        
        // IMPORTANT: Keep the original modal creation from happyreport1.js
        // Create modal container if it doesn't exist
        if (!document.getElementById('vespa-modal-container')) {
            const modalHtml = `
                <div id="vespa-modal-container" class="vespa-modal-overlay">
                    <div class="vespa-modal-content">
                        <div class="vespa-modal-header">
                            <h2 id="vespa-modal-title"></h2>
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
            
            // Double-check modal is at body level
            const modalCheck = document.getElementById('vespa-modal-container');
            if (modalCheck && modalCheck.parentElement !== document.body) {
                console.warn('[Student Report Enhancement] Modal not at body level, moving it');
                document.body.appendChild(modalCheck);
            }
            
            // Add close handlers
            const modal = document.getElementById('vespa-modal-container');
            const closeBtn = modal.querySelector('.vespa-modal-close');
            
            // Close button handler
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[Student Report Enhancement] Close button clicked');
                modal.classList.remove('active');
                modal.style.display = 'none';
                // Also try to reset body scroll
                document.body.style.overflow = '';
            });
            
            // Backdrop click handler
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    console.log('[Student Report Enhancement] Backdrop clicked');
                    modal.classList.remove('active');
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                }
            });
            
            // Add touch event for mobile
            closeBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[Student Report Enhancement] Close button touched');
                modal.classList.remove('active');
                modal.style.display = 'none';
                document.body.style.overflow = '';
            });
            
            // Add escape key handler
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('active')) {
                    console.log('[Student Report Enhancement] Escape key pressed');
                    modal.classList.remove('active');
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                }
            });
        }
        
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            // Find all VESPA report sections
            const vespaReports = document.querySelectorAll('#view_3041 .vespa-report');
            
            vespaReports.forEach((report, idx) => {
                // Skip if already initialized
                if (report.hasAttribute('data-vespa-initialized')) {
                    return;
                }
                
                // Mark as initialized
                report.setAttribute('data-vespa-initialized', 'true');
                
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
                    
                    // Populate modal (using existing modal, not creating new one)
                    const modal = document.getElementById('vespa-modal-container');
                    const modalHeader = modal.querySelector('.vespa-modal-header');
                    const scoreDisplay = modal.querySelector('.modal-score-display');
                    
                    // Apply theme colors
                    if (modalHeader) {
                        modalHeader.style.background = themeColor + '88'; // Lighter shade with transparency
                    }
                    if (scoreDisplay) {
                        scoreDisplay.style.background = themeColor;
                        scoreDisplay.style.color = 'white';
                    }
                    
                    modal.querySelector('#vespa-modal-title').textContent = sectionName;
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
                    
                    console.log(`[Student Report Enhancement] Opened popup for ${sectionName}`);
                });
            });
            
            console.log(`[Student Report Enhancement] Initialized ${vespaReports.length} VESPA popups`);
        }, 500);
    }
    
    // Include ALL helper functions from happyreport1.js
    function initializeTextAreaFocus() {
        // Only enhance on mobile
        if (!isMobileDevice()) {
            console.log('[Student Report Enhancement] Skipping text area enhancements on desktop');
            return;
        }
        
        console.log('[Student Report Enhancement] Initializing text area focus enhancements for mobile');
        
        // Set up a mutation observer to catch dynamically added text areas
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                // Check for new text areas or editors
                const newTextAreas = mutation.target.querySelectorAll('textarea:not([data-focus-enhanced]), .ql-editor:not([data-focus-enhanced])');
                if (newTextAreas.length > 0) {
                    enhanceTextAreas(newTextAreas);
                }
            });
        });
        
        // Start observing
        const reportContainer = document.querySelector('#view_3041');
        if (reportContainer) {
            observer.observe(reportContainer, {
                childList: true,
                subtree: true
            });
        }
        
        // Enhance existing text areas
        const existingTextAreas = document.querySelectorAll('#view_3041 textarea, #view_3041 .ql-editor');
        enhanceTextAreas(existingTextAreas);
        
        function enhanceTextAreas(textAreas) {
            textAreas.forEach((textArea) => {
                // Mark as enhanced
                textArea.setAttribute('data-focus-enhanced', 'true');
                
                // Create an overlay backdrop for focus state
                let backdrop = null;
                
                // On focus, expand and center on screen
                textArea.addEventListener('focus', function(e) {
                    console.log('[Student Report Enhancement] Text area focused');
                    
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
                    
                    // Expand the text area even more
                    if (textArea.tagName === 'TEXTAREA') {
                        textArea.style.minHeight = '400px';
                    } else {
                        textArea.style.minHeight = '450px';
                        // Also expand the container
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
                        
                        // Calculate scroll position to center the element
                        const targetY = rect.top + scrollTop - (viewportHeight - elementHeight) / 2;
                        
                        window.scrollTo({
                            top: Math.max(0, targetY),
                            behavior: 'smooth'
                        });
                    }, 100);
                });
                
                // On blur, return to normal
                textArea.addEventListener('blur', function(e) {
                    console.log('[Student Report Enhancement] Text area blurred');
                    
                    // Hide backdrop
                    if (backdrop) {
                        backdrop.classList.remove('active');
                        // Clean up backdrop after animation
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
                    
                    // Return to normal size (but still larger than before)
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
                
                // Ensure touch events work properly
                textArea.addEventListener('touchstart', function(e) {
                    console.log('[Student Report Enhancement] Touch start on text area');
                    // Don't prevent default - let the touch event through
                }, { passive: true });
            });
            
            if (textAreas.length > 0) {
                console.log(`[Student Report Enhancement] Enhanced ${textAreas.length} text areas`);
            }
        }
    }
    
    function applyStyles() {
        const styleId = 'student-report-enhancements-v5-1';
        
        // Remove any existing style to force refresh
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        
        // Universal and mobile-optimized styles
        style.textContent = `
            /* Universal styles for Student Report - v5.1 */
            
            /* Hide introductory questions container on ALL screen sizes */
            #view_3041 #introductory-questions-container {
                display: none !important;
            }
            
            /* RADAR CHART - Desktop/tablet: minimal changes, Mobile: enhanced */
            /* Desktop and landscape tablets - preserve original look */
            @media (min-width: 769px), (orientation: landscape) and (min-width: 600px) {
                #view_3041 #chart-container {
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    margin: 20px auto !important;
                    text-align: center !important;
                    /* NO background, padding, or other styling changes for desktop */
                }
                
                #view_3041 #chart-container canvas {
                    margin: 0 auto !important;
                    /* NO scaling or transformations */
                }
            }
            
            /* Mobile portrait mode only - apply enhancements */
            @media (max-width: 768px) and (orientation: portrait) {
                #view_3041 #chart-container {
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
                
                #view_3041 #chart-container canvas {
                    margin: 0 auto !important;
                    max-width: 100% !important;
                    height: auto !important;
                }
            }
            
            /* FIX FOR VESPA MODAL REMNANTS - Ensure proper hiding when not active */
            #vespa-modal-container {
                display: none !important;
            }
            
            #vespa-modal-container.active {
                display: flex !important;
            }
            
            /* Additional cleanup for any remnants */
            body > #vespa-modal-container:not(.active) {
                position: absolute !important;
                left: -9999px !important;
                top: -9999px !important;
                width: 1px !important;
                height: 1px !important;
                overflow: hidden !important;
                visibility: hidden !important;
                opacity: 0 !important;
            }
            
            /* Mobile section headings - HIDDEN BY DEFAULT ON ALL SCREEN SIZES */
            .mobile-section-heading,
            .mobile-section-heading-comments,
            .mobile-section-heading-coaching,
            .mobile-theme-heading,
            .mobile-score-display,
            #view_3041 .mobile-section-heading,
            #view_3041 .mobile-theme-heading,
            #view_3041 .mobile-score-display,
            #view_3041 .mobile-section-heading-comments,
            #view_3041 .mobile-section-heading-coaching,
            #view_3041 .field-field_1130 .mobile-theme-heading,
            #view_3041 .field-field_1131 .mobile-theme-heading,
            #view_3041 .field-field_1132 .mobile-theme-heading,
            #view_3041 .field-field_1133 .mobile-theme-heading,
            #view_3041 .field-field_1134 .mobile-theme-heading {
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
            #view_3041 .original-theme-content {
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
            
            .help-writing-btn.goal-help-btn {
                background: #1976d2 !important;
                box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3) !important;
            }
            
            .help-writing-btn.goal-help-btn:hover {
                background: #1565c0 !important;
                box-shadow: 0 4px 12px rgba(25, 118, 210, 0.4) !important;
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
            
            #goal-setting-modal .help-modal-header {
                background: #1976d2 !important;
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
            
            /* Response Guide specific styles */
            .response-guide-content {
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
                margin: 0 !important;
                color: #1a4d4d !important;
                font-weight: 500 !important;
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
            
            .sentence-starters {
                background: white !important;
                padding: 14px !important;
                margin-top: 16px !important;
                border-radius: 6px !important;
                border: 1px solid #d0e5ea !important;
            }
            
            .sentence-starters h4 {
                color: #079baa !important;
                margin: 0 0 12px 0 !important;
                font-size: 15px !important;
                font-weight: 600 !important;
            }
            
            .sentence-starters .starter {
                background: #f0f8fa !important;
                padding: 10px 14px !important;
                margin: 8px 0 !important;
                border-left: 3px solid #62d1d2 !important;
                border-radius: 4px !important;
                font-style: italic !important;
                color: #2a3c7a !important;
                font-size: 15px !important;
            }
            
            .guide-tips {
                background: #fff9e6 !important;
                border: 1px solid #ffd700 !important;
                padding: 16px !important;
                margin: 20px 0 !important;
                border-radius: 8px !important;
            }
            
            .guide-tips h4 {
                color: #856404 !important;
                margin: 0 0 12px 0 !important;
                font-size: 17px !important;
            }
            
            .guide-tips ul {
                margin: 0 !important;
                padding-left: 24px !important;
            }
            
            .guide-tips li {
                margin-bottom: 10px !important;
                color: #704000 !important;
            }
            
            .guide-tips li strong {
                color: #856404 !important;
            }
            
            .response-prompt {
                background: linear-gradient(135deg, #e3f2fd 0%, #d8ebf7 100%) !important;
                padding: 18px !important;
                border-radius: 8px !important;
                margin-top: 20px !important;
                border: 1px solid #1976d2 !important;
                text-align: center !important;
            }
            
            .response-prompt p {
                margin: 0 !important;
                color: #1565c0 !important;
                font-size: 16px !important;
                line-height: 1.5 !important;
            }
            
            .response-prompt strong {
                color: #0d47a1 !important;
            }
            
            /* Responsive adjustments for response guide */
            @media (max-width: 768px) {
                .sentence-starters .starter {
                    font-size: 14px !important;
                    padding: 8px 12px !important;
                }
                
                .guide-section,
                .guide-tips {
                    padding: 12px !important;
                }
                
                .response-guide-content h3 {
                    font-size: 18px !important;
                }
            }
            
            /* Goal setting specific styles */
            .goal-tips h3 {
                color: #1976d2 !important;
                margin-top: 24px !important;
                margin-bottom: 16px !important;
                font-size: 20px !important;
            }
            
            .goal-tips h3:first-child {
                margin-top: 0 !important;
            }
            
            .goal-tips ul {
                margin: 16px 0 !important;
                padding-left: 24px !important;
            }
            
            .goal-tips li {
                margin-bottom: 12px !important;
                line-height: 1.6 !important;
                color: #555 !important;
            }
            
            .goal-tips li strong {
                color: #333 !important;
            }
            
            .goal-type {
                background: #f8f9fa !important;
                border-left: 4px solid #1976d2 !important;
                padding: 16px !important;
                margin: 16px 0 !important;
                border-radius: 4px !important;
            }
            
            .goal-type h4 {
                color: #1976d2 !important;
                margin: 0 0 8px 0 !important;
                font-size: 18px !important;
            }
            
            .goal-type p {
                margin: 4px 0 !important;
                color: #333 !important;
            }
            
            .goal-type .goal-description {
                font-size: 14px !important;
                color: #666 !important;
                font-style: italic !important;
            }
            
            .avoid-section {
                background: #fff3cd !important;
                border-left: 4px solid #ffc107 !important;
                padding: 16px !important;
                margin: 20px 0 !important;
                border-radius: 4px !important;
            }
            
            .avoid-section h4 {
                color: #856404 !important;
                margin: 0 0 12px 0 !important;
            }
            
            .avoid-section ul {
                margin: 0 !important;
                padding-left: 20px !important;
            }
            
            .avoid-section li {
                color: #856404 !important;
                margin-bottom: 8px !important;
            }
            
            .goal-prompt {
                background: #e3f2fd !important;
                padding: 20px !important;
                border-radius: 8px !important;
                margin-top: 24px !important;
                text-align: center !important;
            }
            
            .goal-prompt p {
                margin: 0 !important;
                font-size: 17px !important;
                color: #1565c0 !important;
                font-weight: 500 !important;
            }
            
            /* Ensure VESPA modals are always on top of everything */
            .vespa-modal-overlay.active {
                z-index: 2147483647 !important;
            }
            
            /* Fix any potential Knack modal conflicts */
            .kn-modal-bg,
            .modal-backdrop {
                z-index: 9998 !important; /* Below our modals */
            }
            
            /* Make VESPA sections look clickable on ALL devices */
            #view_3041 .vespa-report {
                position: relative !important;
                transition: transform 0.2s ease !important;
                cursor: pointer !important;
            }
            
            #view_3041 .vespa-report:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
            }
            
            #view_3041 .vespa-report:active {
                transform: scale(0.98) !important;
            }
            
            /* Add a subtle tap/click indicator */
            #view_3041 .vespa-report::after {
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
            
            #view_3041 .vespa-report:hover::after {
                background: #079baa;
                color: white;
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
                #view_3041 div[id*="report-header"],
                #view_3041 .report-header,
                #view_3041 > div:first-child > div:first-child {
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
                #view_3041 div[id*="report-header"] > div,
                #view_3041 .field-container {
                    flex: 1 1 auto !important;
                    min-width: 250px !important;
                    max-width: 100% !important;
                    margin: 5px !important;
                    box-sizing: border-box !important;
                    text-align: center !important;
                }
                
                /* Fix for inline width styles */
                #view_3041 [style*="width:"][style*="px"] {
                    width: auto !important;
                    min-width: 200px !important;
                    max-width: 100% !important;
                }
                
                /* Fix VIEW ANSWERS button - PREVENT IT FROM BECOMING CIRCULAR */
                #view_3041 button:not(.p-button-rounded):not([aria-label*="cycle" i]) {
                    /* Only target buttons that are NOT cycle buttons */
                }
                
                #view_3041 button.p-button:not(.p-button-rounded):not(.p-button-icon-only),
                #view_3041 button[aria-label*="VIEW" i][aria-label*="ANSWERS" i],
                #view_3041 button[title*="VIEW" i][title*="ANSWERS" i],
                #view_3041 .view-answers-button {
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
                
                #view_3041 button.p-button:not(.p-button-rounded):hover {
                    background-color: #00c5c0 !important;
                    transform: translateY(-1px) !important;
                }
                
                /* Ensure button text is visible */
                #view_3041 button:not(.p-button-rounded) span.p-button-label {
                    display: inline !important;
                    visibility: visible !important;
                    font-size: 14px !important;
                }
                
                /* Fix VESPA COACHING REPORT title to wrap properly */
                #view_3041 h1,
                #view_3041 h2, 
                #view_3041 h3,
                #view_3041 .report-title,
                #view_3041 [class*="title"] {
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
                #view_3041 h1:has-text("VESPA"),
                #view_3041 h2:has-text("VESPA"),
                #view_3041 *:has-text("VESPA COACHING REPORT") {
                    font-size: 22px !important;
                    margin: 15px 0 !important;
                }
                
                /* Hide only logo on mobile, keep info buttons visible */
                #view_3041 .image-logo,
                #view_3041 img[alt="Logo"],
                #view_3041 img[src*="logo"],
                #view_3041 .logo,
                #view_3041 [class*="logo"] img {
                    display: none !important;
                    visibility: hidden !important;
                }
                
                /* Make info buttons touch-friendly on mobile */
                #view_3041 .p-button-icon-only[aria-label*="info" i],
                #view_3041 button i.pi-info-circle,
                #view_3041 button[aria-label*="info" i],
                #view_3041 button[title*="info" i] {
                    min-width: 44px !important;
                    min-height: 44px !important;
                    padding: 8px !important;
                }
                
                /* Make text areas even larger by default on mobile */
                #view_3041 textarea {
                    min-height: 200px !important;
                    font-size: 16px !important; /* Prevent iOS zoom on focus */
                    padding: 15px !important;
                }
                
                #view_3041 .ql-editor,
                #view_3041 .ql-container {
                    min-height: 250px !important;
                }
                
                #view_3041 .ql-editor {
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
                #view_3041 textarea:focus {
                    min-height: 400px !important;
                    background: white !important;
                    border: 2px solid #1976d2 !important;
                }
                
                #view_3041 .ql-editor:focus,
                #view_3041 .ql-container:focus-within {
                    min-height: 450px !important;
                }
                
                #view_3041 .ql-container:focus-within {
                    border: 2px solid #1976d2 !important;
                    background: white !important;
                }
                
                /* Hide the rich text toolbar to maximize writing space */
                #view_3041 .ql-toolbar,
                #view_3041 .ql-snow .ql-toolbar,
                #view_3041 .ql-toolbar.ql-snow,
                #view_3041 .comment-section .ql-toolbar {
                    display: none !important;
                }
                
                /* Adjust container to compensate for hidden toolbar */
                #view_3041 .ql-container.ql-snow {
                    border-top: 1px solid #ccc !important;
                    border-radius: 4px !important;
                }
                
                /* Make all text inputs bigger */
                #view_3041 input[type="text"],
                #view_3041 input[type="email"],
                #view_3041 input[type="number"] {
                    height: 44px !important;
                    font-size: 16px !important;
                    padding: 10px !important;
                }
                
                /* Touch-friendly buttons */
                #view_3041 button,
                #view_3041 .p-button,
                #view_3041 input[type="submit"],
                #view_3041 input[type="button"] {
                    min-height: 44px !important;
                    padding: 12px 20px !important;
                }
                
                /* Smaller submit/cancel buttons in comment sections */
                #view_3041 .comment-section button[type="submit"],
                #view_3041 .comment-section .p-button {
                    min-height: 36px !important;
                    padding: 8px 16px !important;
                    font-size: 14px !important;
                }
                
                /* Comprehensive fix for EFFORT section consistency on mobile */
                /* Target EFFORT section by its blue color */
                #view_3041 .vespa-report:has(.vespa-report-score[style*="background-color: rgb(134, 180, 240)"]) {
                    width: 100% !important;
                    max-width: 100% !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    padding-left: 0 !important;
                    padding-right: 0 !important;
                    box-sizing: border-box !important;
                }
                
                /* Fix EFFORT score section width - preserve display type */
                #view_3041 .vespa-report-score[style*="background-color: rgb(134, 180, 240)"] {
                    max-width: 100% !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    box-sizing: border-box !important;
                }
                
                /* Fix EFFORT comments section */
                #view_3041 .vespa-report:has(.vespa-report-score[style*="background-color: rgb(134, 180, 240)"]) .vespa-report-comments {
                    max-width: 100% !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    box-sizing: border-box !important;
                }
                
                /* Fix EFFORT coaching questions section */
                #view_3041 .vespa-report:has(.vespa-report-score[style*="background-color: rgb(134, 180, 240)"]) .vespa-report-coaching-questions {
                    max-width: 100% !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    box-sizing: border-box !important;
                }
                
                /* Fallback for browsers that don't support :has() */
                /* Target EFFORT section by position (usually 2nd section) */
                #view_3041 .vespa-report:nth-child(2) {
                    width: 100% !important;
                    max-width: 100% !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    padding-left: 0 !important;
                    padding-right: 0 !important;
                    box-sizing: border-box !important;
                }
                
                #view_3041 .vespa-report:nth-child(2) .vespa-report-score,
                #view_3041 .vespa-report:nth-child(2) .vespa-report-comments,
                #view_3041 .vespa-report:nth-child(2) .vespa-report-coaching-questions {
                    max-width: 100% !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    box-sizing: border-box !important;
                }
                
                /* Ensure VESPA sections maintain their layout */
                #view_3041 .vespa-report {
                    width: 100% !important;
                    max-width: 100% !important;
                    box-sizing: border-box !important;
                }
                
                /* Override any inline widths on EFFORT section elements WITHOUT forcing display changes */
                #view_3041 [style*="background-color: rgb(134, 180, 240)"],
                #view_3041 [style*="background-color: rgb(134, 180, 240)"] ~ * {
                    max-width: 100% !important;
                }
                /* Theme headings (VISION, EFFORT, etc.) - ONLY SHOW ON MOBILE */
                #view_3041 .mobile-theme-heading,
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
                    #view_3041 .mobile-score-display,
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
                    #view_3041 .original-theme-content,
                    .original-theme-content {
                        display: none !important;
                        visibility: hidden !important;
                        position: absolute !important;
                        left: -9999px !important;
                    }
                    
                    /* Section headings (Comments, Coaching Questions) - ONLY SHOW ON MOBILE */
                    #view_3041 .mobile-section-heading,
                    #view_3041 .mobile-section-heading-comments,
                    #view_3041 .mobile-section-heading-coaching,
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
                    #view_3041 .vespa-report-score {
                        padding-top: 0 !important;
                    }
                    
                    /* Ensure vertical stacking on mobile for better readability */
                    #view_3041 .vespa-report {
                        display: block !important;
                    }
                    
                    #view_3041 .vespa-report > * {
                        display: block !important;
                        width: 100% !important;
                        margin-bottom: 15px !important;
                    }
                }
                
                /* Make VESPA sections look clickable - REMOVED MOBILE RESTRICTION */
                
                /* Prevent tap indicator on comment sections */
                #view_3041 .comment-section {
                    position: relative !important;
                }
                
                /* Hide print button on very small screens */
                @media (max-width: 480px) {
                    #view_3041 #print-button {
                        display: none !important;
                    }
                }
                
                /* Reduce cycle button size on mobile */
                @media (max-width: 768px) {
                    #view_3041 .cycle-button,
                    #view_3041 .p-button.p-button-rounded,
                    #view_3041 button[class*="cycle"],
                    #view_3041 #bottom-report-header-container button.p-button-rounded,
                    #view_3041 #top-report-header-container button.p-button-rounded {
                        width: 36px !important;
                        height: 36px !important;
                        min-width: 36px !important;
                        min-height: 36px !important;
                        font-size: 14px !important;
                        padding: 0 !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        border-radius: 50% !important;
                    }
                    
                    /* Ensure the cycle button container doesn't add extra space */
                    #view_3041 .cycle-button-container,
                    #view_3041 div[class*="cycle-button"],
                    #view_3041 #bottom-report-header-container,
                    #view_3041 #top-report-header-container {
                        display: flex !important;
                        gap: 8px !important;
                        justify-content: center !important;
                        margin: 10px 0 !important;
                    }
                }
                
                /* Ensure proper scrolling */
                body {
                    overflow-x: hidden !important;
                    -webkit-overflow-scrolling: touch !important;
                }
                
                /* Mobile modal adjustments */
                .help-modal-content {
                    margin: 10px !important;
                    width: calc(100% - 20px) !important;
                }
                
                .help-modal-header {
                    padding: 20px 16px !important;
                }
                
                .help-modal-body {
                    padding: 20px 16px !important;
                }
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
            
            /* Custom Cycle Modal Styles */
            .custom-cycle-modal-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: rgba(0, 0, 0, 0.7) !important;
                z-index: 999999 !important;
                display: none;
                align-items: center !important;
                justify-content: center !important;
            }
            
            #customStudentCycleModal {
                display: none;
            }
            
            #customStudentCycleModal[style*="display: flex"] {
                display: flex !important;
            }
            
            .custom-cycle-modal-container {
                background: white !important;
                width: 90% !important;
                max-width: 900px !important;
                max-height: 85vh !important;
                border-radius: 20px !important;
                overflow: hidden !important;
                display: flex !important;
                flex-direction: column !important;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
            }
            
            .custom-cycle-modal-header {
                padding: 25px 30px !important;
                background: linear-gradient(135deg, #079baa 0%, #7bd8d0 100%) !important;
                color: white !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
            }
            
            .custom-cycle-modal-header h2 {
                margin: 0 !important;
                font-size: 24px !important;
                font-weight: 600 !important;
            }
            
            .cycle-selector {
                display: flex !important;
                gap: 10px !important;
            }
            
            .cycle-btn {
                padding: 8px 20px !important;
                background: rgba(255, 255, 255, 0.2) !important;
                border: 2px solid rgba(255, 255, 255, 0.5) !important;
                color: white !important;
                border-radius: 25px !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
                font-weight: 500 !important;
            }
            
            .cycle-btn:hover {
                background: rgba(255, 255, 255, 0.3) !important;
                transform: translateY(-2px) !important;
            }
            
            .cycle-btn.active {
                background: white !important;
                color: #079baa !important;
                border-color: white !important;
            }
            
            .custom-cycle-modal-close {
                background: rgba(255, 255, 255, 0.2) !important;
                border: none !important;
                color: white !important;
                font-size: 24px !important;
                width: 40px !important;
                height: 40px !important;
                border-radius: 50% !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
            }
            
            .custom-cycle-modal-close:hover {
                background: rgba(255, 255, 255, 0.3) !important;
                transform: rotate(90deg) !important;
            }
            
            .custom-cycle-modal-body {
                flex: 1 !important;
                overflow-y: auto !important;
                padding: 30px !important;
                background: #f8f9fa !important;
            }
            
            .cycle-data-loading {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                min-height: 400px !important;
            }
            
            .spinner {
                width: 50px !important;
                height: 50px !important;
                border: 4px solid #e0e0e0 !important;
                border-top: 4px solid #079baa !important;
                border-radius: 50% !important;
                animation: spin 1s linear infinite !important;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .cycle-questions-grid {
                display: grid !important;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
                gap: 20px !important;
            }
            
            .cycle-question-item {
                background: white !important;
                padding: 20px !important;
                border-radius: 10px !important;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05) !important;
            }
            
            .question-label {
                font-size: 14px !important;
                color: #666 !important;
                margin-bottom: 10px !important;
                font-weight: 600 !important;
            }
            
            .question-value {
                font-size: 28px !important;
                font-weight: bold !important;
                color: #079baa !important;
            }
        `;
        
        document.head.appendChild(style);
        stylesApplied = true;
        
        console.log('[Student Report Enhancement] Styles applied successfully!');
    }
    
    // Include ALL remaining helper functions from happyreport1.js
    function hideShowAnswersButton() {
        // ... [keep entire function as-is from happyreport1.js]
    }
    
    function fixAllModalsForMobile() {
        // ... [keep entire function as-is from happyreport1.js]
    }
    
    function fixShowAnswersModal() {
        // ... [keep entire function as-is from happyreport1.js]  
    }
    
    function improveInfoButtonContent() {
        // ... [keep entire function as-is from happyreport1.js]
    }
    
    function fixInfoButtonModals() {
        // ... [keep entire function as-is from happyreport1.js]
    }
    
    // Multiple initialization attempts with increasing delays
    async function attemptInitialization() {
        console.log(`[Student Report Enhancement] Initialization attempt ${initAttempts + 1}/${MAX_INIT_ATTEMPTS}`);
        
        const success = await fixStudentReport();
        
        if (!success && initAttempts < MAX_INIT_ATTEMPTS) {
            initAttempts++;
            const delay = Math.min(500 * initAttempts, 2000); // Exponential backoff up to 2 seconds
            console.log(`[Student Report Enhancement] Retrying in ${delay}ms...`);
            setTimeout(attemptInitialization, delay);
        } else if (success) {
            console.log('[Student Report Enhancement] Successfully initialized!');
        } else {
            console.warn('[Student Report Enhancement] Failed to initialize after maximum attempts');
        }
    }
    
    // Initialize immediately on mobile (don't wait for jQuery)
    if (isMobileDevice()) {
        console.log('[Student Report Enhancement] Mobile device detected, initializing immediately');
        attemptInitialization();
    }
    
    // Also initialize with jQuery when ready
    if (typeof $ !== 'undefined') {
        $(function() {
            console.log('[Student Report Enhancement] jQuery ready, attempting initialization');
            attemptInitialization();
        });
    } else {
        // Fallback if jQuery isn't available yet
        document.addEventListener('DOMContentLoaded', function() {
            console.log('[Student Report Enhancement] DOM ready, attempting initialization');
            attemptInitialization();
        });
    }
    
    // Re-apply on scene render
    if (typeof $ !== 'undefined') {
        $(document).on('knack-scene-render.scene_43', function() {
            console.log('[Student Report Enhancement] Scene 43 rendered');
            popupsInitialized = false; // Reset to reinitialize popups
            initAttempts = 0; // Reset attempts
            attemptInitialization();
        });
        
        // Re-apply on view render
        $(document).on('knack-view-render.view_3041', function() {
            console.log('[Student Report Enhancement] View 3041 rendered');
            popupsInitialized = false; // Reset to reinitialize popups
            initAttempts = 0; // Reset attempts
            attemptInitialization();
        });
        
        // Also watch for any view render in scene_43 or vespa-results
        $(document).on('knack-view-render.any', function(event, view) {
            if (window.location.hash.includes('scene_43') || window.location.hash.includes('my-report') || window.location.hash.includes('vespa-results')) {
                console.log(`[Student Report Enhancement] View ${view.key} rendered on report page`);
                setTimeout(() => {
                    attemptInitialization();
                }, 300);
            }
        });
    }
    
    // Check on hash change
    window.addEventListener('hashchange', function() {
        console.log('[Student Report Enhancement] Hash changed, checking...');
        initAttempts = 0; // Reset attempts
        attemptInitialization();
    });
    
    // Also check on visibility change (for when switching tabs)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && (window.location.hash.includes('scene_43') || window.location.hash.includes('my-report'))) {
            console.log('[Student Report Enhancement] Page became visible, rechecking...');
            attemptInitialization();
        }
    });
    
    console.log('[Student Report Enhancement v5.1] Initialization complete');
})();
