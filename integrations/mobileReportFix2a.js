/**
 * Scene 43 Student Report Mobile Optimization & Help System
 * Optimizes the VESPA report display and adds help buttons for all devices
 * Version 4.3 - Enhanced EFFORT section fixes with MutationObserver and aggressive styling
 */

(function() {
    'use strict';
    
    console.log('[Student Report Enhancement v4.2] Script loaded at', new Date().toISOString());
    
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
    
    async function fixStudentReport() {
        // Check if we're on the student report page
        const currentScene = window.location.hash;
        if (!currentScene.includes('scene_43') && !currentScene.includes('my-report') && !currentScene.includes('vespa-results')) {
            console.log('[Student Report Enhancement] Not on student report page, skipping');
            return false;
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
            
            // Initialize features
            if (!popupsInitialized) {
                // Initialize for all screen sizes
                initializeVespaPopups();
                initializeTextAreaFocus();
                initializeHelpButtons();
                popupsInitialized = true;
                
                // Hide Show Answers button on mobile
                if (isMobileDevice()) {
                    // Try multiple times to ensure button is hidden
                    hideShowAnswersButton();
                    setTimeout(hideShowAnswersButton, 500);
                    setTimeout(hideShowAnswersButton, 1000);
                    setTimeout(hideShowAnswersButton, 2000);
                }
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
                
                // Debug: Log current styles
                console.log('[DEBUG] EFFORT section computed styles:', {
                    width: window.getComputedStyle(vespaReport).width,
                    maxWidth: window.getComputedStyle(vespaReport).maxWidth,
                    marginLeft: window.getComputedStyle(vespaReport).marginLeft,
                    marginRight: window.getComputedStyle(vespaReport).marginRight,
                    paddingLeft: window.getComputedStyle(vespaReport).paddingLeft,
                    paddingRight: window.getComputedStyle(vespaReport).paddingRight
                });
                
                // Get all parent elements up to the view container
                let parent = vespaReport.parentElement;
                while (parent && !parent.id?.includes('view_3041')) {
                    // Fix any parent containers that might be constraining width
                    parent.style.width = '100%';
                    parent.style.maxWidth = '100%';
                    parent.style.marginLeft = '0';
                    parent.style.marginRight = '0';
                    parent = parent.parentElement;
                }
                
                // Remove any inline width styles more aggressively
                vespaReport.style.cssText = vespaReport.style.cssText.replace(/width[^;]+;?/gi, '');
                vespaReport.style.cssText = vespaReport.style.cssText.replace(/max-width[^;]+;?/gi, '');
                vespaReport.style.cssText = vespaReport.style.cssText.replace(/margin-left[^;]+;?/gi, '');
                vespaReport.style.cssText = vespaReport.style.cssText.replace(/margin-right[^;]+;?/gi, '');
                
                // Now set the correct styles
                vespaReport.style.width = '100%';
                vespaReport.style.maxWidth = '100%';
                vespaReport.style.marginLeft = '0';
                vespaReport.style.marginRight = '0';
                vespaReport.style.display = 'block';
                vespaReport.style.boxSizing = 'border-box';
                
                // Find all child elements and fix their widths more aggressively
                const allChildren = vespaReport.querySelectorAll('*');
                allChildren.forEach(child => {
                    // Remove inline styles first
                    if (child.style.width || child.style.maxWidth) {
                        child.style.cssText = child.style.cssText.replace(/width[^;]+;?/gi, '');
                        child.style.cssText = child.style.cssText.replace(/max-width[^;]+;?/gi, '');
                        child.style.cssText = child.style.cssText.replace(/margin[^;]+;?/gi, '');
                    }
                    
                    // Set correct styles
                    child.style.width = '100%';
                    child.style.maxWidth = '100%';
                    child.style.marginLeft = '0';
                    child.style.marginRight = '0';
                    child.style.boxSizing = 'border-box';
                });
                
                // Specifically target the three main sections within EFFORT
                const scoreSection = vespaReport.querySelector('.vespa-report-score');
                const commentsSection = vespaReport.querySelector('.vespa-report-comments');
                const coachingSection = vespaReport.querySelector('.vespa-report-coaching-questions');
                
                [scoreSection, commentsSection, coachingSection].forEach(section => {
                    if (section) {
                        // Clear all inline styles
                        section.removeAttribute('style');
                        // Reapply the background color for the score section
                        if (section === scoreSection) {
                            section.style.backgroundColor = 'rgb(134, 180, 240)';
                        }
                        // Set width styles
                        section.style.width = '100%';
                        section.style.maxWidth = '100%';
                        section.style.marginLeft = '0';
                        section.style.marginRight = '0';
                        section.style.padding = '15px';
                        section.style.boxSizing = 'border-box';
                        section.style.display = 'block';
                    }
                });
                
                // Compare with other VESPA sections for consistency
                const allVespaReports = document.querySelectorAll('#view_3041 .vespa-report');
                if (allVespaReports.length > 0) {
                    // Get the first non-EFFORT section as reference
                    const referenceSection = Array.from(allVespaReports).find(section => 
                        !section.querySelector('.vespa-report-score[style*="background-color: rgb(134, 180, 240)"]')
                    );
                    
                    if (referenceSection) {
                        // Copy the computed width from reference section
                        const refWidth = window.getComputedStyle(referenceSection).width;
                        console.log('[DEBUG] Reference section width:', refWidth);
                        vespaReport.style.width = refWidth;
                    }
                }
                
                console.log('[Student Report Enhancement] EFFORT section width fixed with aggressive approach');
            }
        }
        
        // Also try to fix by position (EFFORT is usually the 2nd section)
        const allVespaReports = document.querySelectorAll('#view_3041 .vespa-report');
        if (allVespaReports.length >= 2) {
            const secondSection = allVespaReports[1];
            // Apply same aggressive fixes
            secondSection.style.width = '100%';
            secondSection.style.maxWidth = '100%';
            secondSection.style.marginLeft = '0';
            secondSection.style.marginRight = '0';
            secondSection.style.display = 'block';
            secondSection.style.boxSizing = 'border-box';
            
            const childElements = secondSection.querySelectorAll('*');
            childElements.forEach(child => {
                if (child.style.width && child.style.width !== '100%') {
                    child.style.width = '100%';
                }
                if (child.style.maxWidth && child.style.maxWidth !== '100%') {
                    child.style.maxWidth = '100%';
                }
                child.style.marginLeft = '0';
                child.style.marginRight = '0';
                child.style.boxSizing = 'border-box';
            });
        }
        
        // Set up a MutationObserver to fix EFFORT section if it gets modified
        setupEffortSectionObserver();
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
        
        // Create modal container if it doesn't exist
        if (!document.getElementById('vespa-modal-container')) {
            const modalHtml = `
                <div id="vespa-modal-container" class="vespa-modal-overlay">
                    <div class="vespa-modal-content">
                        <div class="vespa-modal-header">
                            <h2 id="vespa-modal-title"></h2>
                            <button class="vespa-modal-close">&times;</button>
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
            
            // Add close handlers
            const modal = document.getElementById('vespa-modal-container');
            const closeBtn = modal.querySelector('.vespa-modal-close');
            
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
                    
                    // Populate modal
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
                    modal.classList.add('active');
                    
                    console.log(`[Student Report Enhancement] Opened popup for ${sectionName}`);
                });
            });
            
            console.log(`[Student Report Enhancement] Initialized ${vespaReports.length} VESPA popups`);
        }, 500);
    }
    
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
        const styleId = 'student-report-enhancements-v4-2';
        
        // Remove any existing style to force refresh
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        
        // Universal and mobile-optimized styles
        style.textContent = `
            /* Universal styles for Student Report - v4.2 */
            
            /* Hide introductory questions container on ALL screen sizes */
            #view_3041 #introductory-questions-container {
                display: none !important;
            }
            
            /* Help writing buttons - Universal across all screen sizes */
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
                max-width: 350px !important;
                justify-content: center !important;
                transition: all 0.3s ease !important;
                font-weight: 500 !important;
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
            
            /* Mobile-only styles */
            @media (max-width: 768px) {
                /* Hide logo and info buttons on mobile */
                #view_3041 .image-logo,
                #view_3041 img[alt="Logo"],
                #view_3041 img[src*="logo"],
                #view_3041 .logo,
                #view_3041 [class*="logo"] img,
                #view_3041 .info-icon,
                #view_3041 .pi-info-circle,
                #view_3041 i[class*="info"] {
                    display: none !important;
                }
                
                /* Keep the chart visible but make it responsive */
                #view_3041 #chart-container {
                    max-width: 100% !important;
                    overflow-x: auto !important;
                }
                
                #view_3041 #chart-container canvas {
                    max-width: 100% !important;
                    height: auto !important;
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
                
                /* Fix EFFORT score section width */
                #view_3041 .vespa-report-score[style*="background-color: rgb(134, 180, 240)"] {
                    display: block !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    padding-left: 15px !important;
                    padding-right: 15px !important;
                    box-sizing: border-box !important;
                }
                
                /* Fix EFFORT comments section */
                #view_3041 .vespa-report:has(.vespa-report-score[style*="background-color: rgb(134, 180, 240)"]) .vespa-report-comments {
                    width: 100% !important;
                    max-width: 100% !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    padding-left: 15px !important;
                    padding-right: 15px !important;
                    box-sizing: border-box !important;
                }
                
                /* Fix EFFORT coaching questions section */
                #view_3041 .vespa-report:has(.vespa-report-score[style*="background-color: rgb(134, 180, 240)"]) .vespa-report-coaching-questions {
                    width: 100% !important;
                    max-width: 100% !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    padding-left: 15px !important;
                    padding-right: 15px !important;
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
                    width: 100% !important;
                    max-width: 100% !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    padding-left: 15px !important;
                    padding-right: 15px !important;
                    box-sizing: border-box !important;
                }
                
                /* Force all VESPA sections to have consistent structure */
                #view_3041 .vespa-report {
                    width: 100% !important;
                    max-width: 100% !important;
                    display: block !important;
                    box-sizing: border-box !important;
                }
                
                #view_3041 .vespa-report > * {
                    width: 100% !important;
                    max-width: 100% !important;
                    box-sizing: border-box !important;
                }
                
                /* Override any inline widths on EFFORT section elements */
                #view_3041 [style*="background-color: rgb(134, 180, 240)"],
                #view_3041 [style*="background-color: rgb(134, 180, 240)"] ~ * {
                    width: 100% !important;
                    max-width: 100% !important;
                }
                
                /* Target EFFORT section parent containers */
                #view_3041 div:has(> .vespa-report-score[style*="background-color: rgb(134, 180, 240)"]) {
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding-left: 0 !important;
                    padding-right: 0 !important;
                    display: block !important;
                    box-sizing: border-box !important;
                }
                
                /* Target any element containing EFFORT section */
                #view_3041 *:has(.vespa-report-score[style*="background-color: rgb(134, 180, 240)"]) {
                    width: 100% !important;
                    max-width: 100% !important;
                }
                
                /* Use attribute selectors for more specificity */
                #view_3041 [style*="134"][style*="180"][style*="240"] {
                    width: 100% !important;
                    max-width: 100% !important;
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    padding-left: 15px !important;
                    padding-right: 15px !important;
                    box-sizing: border-box !important;
                    display: block !important;
                }
                
                /* Target siblings of EFFORT score section */
                #view_3041 .vespa-report-score[style*="background-color: rgb(134, 180, 240)"] ~ .vespa-report-comments,
                #view_3041 .vespa-report-score[style*="background-color: rgb(134, 180, 240)"] ~ .vespa-report-coaching-questions {
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding: 15px !important;
                    box-sizing: border-box !important;
                    display: block !important;
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
                z-index: 99999 !important;
                overflow-y: auto !important;
                -webkit-overflow-scrolling: touch !important;
            }
            
            .vespa-modal-overlay.active {
                display: flex !important;
                align-items: flex-start !important;
                justify-content: center !important;
                padding: 20px 0 !important;
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
                background: none !important;
                border: none !important;
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
                transition: background 0.3s ease !important;
            }
            
            .vespa-modal-close:hover {
                background: rgba(255, 255, 255, 0.2) !important;
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
        
        console.log('[Student Report Enhancement] Styles applied successfully!');
    }
    
    function hideShowAnswersButton() {
        // Only run on mobile
        if (!isMobileDevice()) return;
        
        console.log('[Student Report Enhancement] Looking for Show Answers button...');
        
        // Find and hide the Show Answers button by checking button text
        const buttons = document.querySelectorAll('#view_3041 button');
        let hiddenCount = 0;
        
        buttons.forEach(button => {
            const buttonText = (button.textContent || button.innerText || '').trim();
            
            if (buttonText.toLowerCase() === 'show answers' || 
                buttonText.toLowerCase().includes('show answer') ||
                buttonText.toLowerCase() === 'show') {
                button.style.display = 'none';
                button.style.visibility = 'hidden';
                button.setAttribute('aria-hidden', 'true');
                hiddenCount++;
                console.log(`[Student Report Enhancement] Hid button with text: "${buttonText}"`);
            }
        });
        
        // Also check the bottom header area where Show Answers typically appears
        const bottomHeader = document.querySelector('#view_3041 #bottom-report-header-container');
        if (bottomHeader) {
            const bottomButtons = bottomHeader.querySelectorAll('button');
            bottomButtons.forEach((button, index) => {
                const buttonText = (button.textContent || button.innerText || '').trim();
                // First button in bottom header is typically Show Answers
                if (index === 0 || buttonText.toLowerCase().includes('answer')) {
                    button.style.display = 'none';
                    button.style.visibility = 'hidden';
                    button.setAttribute('aria-hidden', 'true');
                    hiddenCount++;
                    console.log(`[Student Report Enhancement] Hid bottom header button: "${buttonText}"`);
                }
            });
        }
        
        console.log(`[Student Report Enhancement] Total buttons hidden: ${hiddenCount}`);
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
    
    console.log('[Student Report Enhancement v4.3] Initialization complete');
})();
