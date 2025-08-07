/**
 * Scene 43 Student Report Mobile Optimization & Help System
 * Optimizes the VESPA report display and adds help buttons for all devices
 * Version 5.3 - Fixed modal remnants and enhanced radar chart
 */

(function() {
    'use strict';
    
    console.log('[Student Report Enhancement v5.3] Script loaded at', new Date().toISOString());
    
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
        console.log('[Student Report Enhancement] Mobile detection:', isMobile, 'Width:', window.innerWidth, 'UserAgent:', navigator.userAgent);
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
    
    // Clean up any existing modals before initializing
    function cleanupExistingModals() {
        const existingModals = document.querySelectorAll('#vespa-modal-container');
        existingModals.forEach(modal => {
            modal.remove();
            console.log('[Student Report Enhancement] Removed existing modal container');
        });
    }
    
    async function fixStudentReport() {
        // Check if we're on the student report page
        const currentScene = window.location.hash;
        if (!currentScene.includes('scene_43') && !currentScene.includes('my-report') && !currentScene.includes('vespa-results')) {
            console.log('[Student Report Enhancement] Not on student report page, skipping');
            return false;
        }
        
        try {
            // Clean up any existing modals first
            cleanupExistingModals();
            
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
            }
            
            return true;
        } catch (error) {
            console.error('[Student Report Enhancement] Error during initialization:', error);
            return false;
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
                }
                
                // Fix coaching section width
                if (coachingSection) {
                    coachingSection.style.maxWidth = '100%';
                    coachingSection.style.boxSizing = 'border-box';
                }
                
                // Add section headings ONLY on mobile
                if (isMobileDevice()) {
                    console.log('[Student Report Enhancement] Adding section headings from fixEffortSection');
                    addSectionHeadings();
                } else {
                    console.log('[Student Report Enhancement] Desktop detected in fixEffortSection - skipping headings');
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
                    const scoreNumber = lines[lines.length - 1]; // Usually the last line is the score
                    if (scoreNumber && /^\d+$/.test(scoreNumber)) {
                        const scoreDisplay = document.createElement('div');
                        scoreDisplay.className = 'mobile-score-display';
                        scoreDisplay.textContent = scoreNumber;
                        scoreSection.appendChild(scoreDisplay);
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
            // Find all comment sections
            const commentSections = document.querySelectorAll('#view_3041 .comment-section');
            
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
                        
                        // Get the intro questions content
                        const introQuestionsEl = document.querySelector('#view_3041 #introductory-questions-container');
                        if (introQuestionsEl) {
                            contentDiv.innerHTML = `
                                <div class="help-content">
                                    <p style="font-style: italic; margin-bottom: 20px;">Use these questions to help guide your response:</p>
                                    ${introQuestionsEl.innerHTML}
                                </div>
                            `;
                        } else {
                            contentDiv.innerHTML = '<p>No introductory questions available.</p>';
                        }
                        
                        // Show modal
                        modal.classList.add('active');
                        
                        console.log('[Student Report Enhancement] Opened response guide modal');
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
    
    function initializeVespaPopups() {
        // Only initialize on mobile
        if (!isMobileDevice()) {
            console.log('[Student Report Enhancement] Skipping VESPA popups on desktop');
            return;
        }
        
        console.log('[Student Report Enhancement] Initializing VESPA popups for mobile');
        
        // Add section headings to all VESPA sections (only on mobile)
        addSectionHeadings();
        
        // Clean up any existing modal before creating a new one
        cleanupExistingModals();
        
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
                    
                    // Clean up any existing modal first
                    cleanupExistingModals();
                    
                    // Create modal dynamically
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
                    document.body.insertAdjacentHTML('beforeend', modalHtml);
                    const modal = document.getElementById('vespa-modal-container');
                    
                    // Add close handlers
                    const closeBtn = modal.querySelector('.vespa-modal-close');
                    
                    const closeModal = () => {
                        modal.classList.remove('active');
                        modal.style.display = 'none';
                        document.body.style.overflow = '';
                        // Remove the modal completely after closing
                        setTimeout(() => {
                            if (modal && modal.parentNode) {
                                modal.parentNode.removeChild(modal);
                            }
                        }, 300);
                    };
                    
                    closeBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        closeModal();
                    });
                    
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) {
                            closeModal();
                        }
                    });
                    
                    // Add escape key handler
                    const escapeHandler = (e) => {
                        if (e.key === 'Escape' && modal.classList.contains('active')) {
                            closeModal();
                            document.removeEventListener('keydown', escapeHandler);
                        }
                    };
                    document.addEventListener('keydown', escapeHandler);
                    
                    // Populate modal
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
                    
                    console.log(`[Student Report Enhancement] Opened popup for ${sectionName}`);
                });
            });
            
            console.log(`[Student Report Enhancement] Initialized ${vespaReports.length} VESPA popups`);
        }, 500);
    }
    
    // Other helper functions remain the same (initializeTextAreaFocus, hideShowAnswersButton, etc.)
    // ... [keeping other functions as they were in the original code for brevity]
    
    function applyStyles() {
        const styleId = 'student-report-enhancements-v5-3';
        
        // Remove any existing style to force refresh
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        
        // Enhanced styles with radar chart improvements and modal fixes
        style.textContent = `
            /* Universal styles for Student Report - v5.3 */
            
            /* Hide introductory questions container on ALL screen sizes */
            #view_3041 #introductory-questions-container {
                display: none !important;
            }
            
            /* ENHANCED RADAR CHART STYLING - Larger and more prominent */
            #view_3041 #chart-container {
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                width: 95% !important;
                max-width: 1400px !important; /* Increased from 1200px */
                margin: 30px auto !important; /* More margin */
                text-align: center !important;
                /* Enhanced gradient background with animation */
                background: linear-gradient(135deg, 
                    #f0f9fa 0%, 
                    #e1f5f7 25%, 
                    #d4f1f4 50%, 
                    #c8edee 75%, 
                    #bce9e8 100%) !important;
                padding: 40px !important; /* Increased padding */
                border-radius: 16px !important; /* Smoother corners */
                box-shadow: 
                    0 6px 30px rgba(7, 155, 170, 0.15),
                    0 2px 10px rgba(7, 155, 170, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
                border: 2px solid rgba(7, 155, 170, 0.12) !important;
                position: relative !important;
                overflow: hidden !important;
            }
            
            /* Add subtle animated glow effect */
            #view_3041 #chart-container::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, 
                    rgba(7, 155, 170, 0.05) 0%, 
                    transparent 70%);
                animation: pulse 4s ease-in-out infinite;
                pointer-events: none;
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 0.5; }
                50% { transform: scale(1.05); opacity: 0.3; }
            }
            
            /* Make the canvas larger on desktop */
            @media (min-width: 769px) {
                #view_3041 #chart-container canvas {
                    margin: 0 auto !important;
                    transform: scale(1.15) !important; /* Slightly enlarge the chart */
                    transform-origin: center !important;
                }
            }
            
            /* FIX FOR VESPA MODAL REMNANTS - Ensure it's always hidden when not active */
            #vespa-modal-container {
                display: none !important;
                position: fixed !important;
                visibility: hidden !important;
                opacity: 0 !important;
            }
            
            #vespa-modal-container.active {
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                animation: fadeIn 0.3s ease-in-out;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            /* Clean up any modal remnants that might appear */
            body > #vespa-modal-container:not(.active) {
                display: none !important;
                position: absolute !important;
                left: -9999px !important;
                top: -9999px !important;
                width: 1px !important;
                height: 1px !important;
                overflow: hidden !important;
            }
            
            /* Mobile section headings - HIDDEN BY DEFAULT ON ALL SCREEN SIZES */
            .mobile-section-heading,
            .mobile-section-heading-comments,
            .mobile-section-heading-coaching,
            .mobile-theme-heading,
            .mobile-score-display {
                display: none !important;
                visibility: hidden !important;
            }
            
            /* Original theme content - VISIBLE BY DEFAULT ON DESKTOP */
            .original-theme-content {
                display: block !important;
                visibility: visible !important;
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
            
            /* Mobile-only styles */
            @media (max-width: 768px) {
                /* Keep the chart visible but responsive */
                #view_3041 #chart-container {
                    width: 98% !important;
                    padding: 25px 15px !important; /* Adjusted padding for mobile */
                    margin: 15px auto !important;
                }
                
                /* Don't scale the canvas on mobile to prevent overflow */
                #view_3041 #chart-container canvas {
                    transform: none !important;
                    max-width: 100% !important;
                    height: auto !important;
                }
                
                /* Show mobile headings ONLY on mobile */
                .mobile-theme-heading,
                .mobile-score-display,
                .mobile-section-heading,
                .mobile-section-heading-comments,
                .mobile-section-heading-coaching {
                    display: block !important;
                    visibility: visible !important;
                }
                
                /* Hide original theme content on mobile */
                .original-theme-content {
                    display: none !important;
                    visibility: hidden !important;
                }
                
                /* VESPA Modal styles - only show on mobile */
                .vespa-modal-overlay {
                    display: none;
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    background: rgba(0, 0, 0, 0.8) !important;
                    z-index: 2147483647 !important;
                    overflow-y: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                }
                
                .vespa-modal-overlay.active {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 20px !important;
                }
                
                /* Make VESPA sections look clickable on mobile */
                #view_3041 .vespa-report {
                    position: relative !important;
                    transition: transform 0.2s ease !important;
                }
                
                #view_3041 .vespa-report:active {
                    transform: scale(0.98) !important;
                }
                
                /* Add a subtle tap indicator */
                #view_3041 .vespa-report::after {
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
            }
            
            /* Ensure VESPA modals are always properly hidden when inactive */
            .vespa-modal-overlay:not(.active) {
                pointer-events: none !important;
                z-index: -1 !important;
            }
        `;
        
        document.head.appendChild(style);
        stylesApplied = true;
        
        console.log('[Student Report Enhancement] Styles applied successfully!');
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
            // Final cleanup check
            setTimeout(cleanupExistingModals, 1000);
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
            cleanupExistingModals(); // Clean up before reinitializing
            popupsInitialized = false; // Reset to reinitialize popups
            initAttempts = 0; // Reset attempts
            attemptInitialization();
        });
        
        // Re-apply on view render
        $(document).on('knack-view-render.view_3041', function() {
            console.log('[Student Report Enhancement] View 3041 rendered');
            cleanupExistingModals(); // Clean up before reinitializing
            popupsInitialized = false; // Reset to reinitialize popups
            initAttempts = 0; // Reset attempts
            attemptInitialization();
        });
    }
    
    // Check on hash change
    window.addEventListener('hashchange', function() {
        console.log('[Student Report Enhancement] Hash changed, checking...');
        cleanupExistingModals(); // Clean up when navigating
        initAttempts = 0; // Reset attempts
        attemptInitialization();
    });
    
    // Clean up modals when leaving the page
    window.addEventListener('beforeunload', function() {
        cleanupExistingModals();
    });
    
    console.log('[Student Report Enhancement v5.3] Initialization complete');
})();
