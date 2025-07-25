/**
 * Scene 43 Student Report Mobile Optimization
 * Optimizes the VESPA report display for mobile devices only
 * Version 3.9 - Moved help button to response sections, larger comment boxes, fixed Show Answers hiding
 */

(function() {
    'use strict';
    
    console.log('[Student Report Mobile Fix v3.9] Script loaded');
    
    let stylesApplied = false;
    let popupsInitialized = false;
    
    function fixStudentReportMobile() {
        // Check if we're on the student report page
        const currentScene = window.location.hash;
        if (!currentScene.includes('scene_43') && !currentScene.includes('my-report') && !currentScene.includes('vespa-results')) {
            console.log('[Student Report Mobile Fix] Not on student report page, skipping');
            return;
        }
        
        // Check if the report container exists
        const reportContainer = document.querySelector('#view_3041 #report-container');
        if (!reportContainer) {
            console.log('[Student Report Mobile Fix] Report container not found, waiting...');
            return;
        }
        
        console.log('[Student Report Mobile Fix] Report container found! Applying mobile optimizations');
        
        // Apply CSS fixes (only once)
        if (!stylesApplied) {
            applyMobileStyles();
        }
        
        // Initialize popups for mobile only
        if (!popupsInitialized && window.innerWidth <= 768) {
            setTimeout(() => {
                initializeVespaPopups();
                initializeTextAreaFocus();
                initializeHelpButtons();
                popupsInitialized = true;
                
                // Hide Show Answers button after everything else is initialized
                setTimeout(() => {
                    hideShowAnswersButton();
                }, 200);
            }, 500);
        }
        
        // Enable pinch-to-zoom
        enableZoom();
    }
    
    function enableZoom() {
        // Remove or update viewport meta to allow zooming
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.content = 'width=device-width, initial-scale=1.0';
            console.log('[Student Report Mobile Fix] Zoom enabled');
        }
    }
    
    function initializeHelpButtons() {
        console.log('[Student Report Mobile Fix] Initializing help buttons in response sections');
        
        // Create intro questions modal if it doesn't exist
        if (!document.getElementById('intro-questions-modal')) {
            const modalHtml = `
                <div id="intro-questions-modal" class="intro-modal-overlay">
                    <div class="intro-modal-content">
                        <div class="intro-modal-header">
                            <h2>Response Guide</h2>
                            <button class="intro-modal-close">&times;</button>
                        </div>
                        <div class="intro-modal-body">
                            <div id="intro-questions-content"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Add close handlers
            const modal = document.getElementById('intro-questions-modal');
            const closeBtn = modal.querySelector('.intro-modal-close');
            
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
        
        // Find all comment sections
        const commentSections = document.querySelectorAll('#view_3041 .comment-section');
        
        commentSections.forEach((section, index) => {
            // Check if button already exists
            if (section.querySelector('.help-writing-btn')) {
                return;
            }
            
            // Create the help button
            const helpButton = document.createElement('button');
            helpButton.className = 'help-writing-btn';
            helpButton.innerHTML = '<span>💡</span> Need help writing a response?';
            helpButton.setAttribute('data-section-index', index);
            
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
                const modal = document.getElementById('intro-questions-modal');
                const contentDiv = document.getElementById('intro-questions-content');
                
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
                
                console.log('[Student Report Mobile Fix] Opened help modal from response section');
            });
        });
        
        console.log(`[Student Report Mobile Fix] Added help buttons to ${commentSections.length} response sections`);
    }
    
    function initializeVespaPopups() {
        console.log('[Student Report Mobile Fix] Initializing VESPA popups');
        
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
                
                console.log(`[Student Report Mobile Fix] Opened popup for ${sectionName}`);
            });
        });
        
        console.log(`[Student Report Mobile Fix] Initialized ${vespaReports.length} VESPA popups`);
    }
    
    function initializeTextAreaFocus() {
        console.log('[Student Report Mobile Fix] Initializing text area focus enhancements');
        
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
                    console.log('[Student Report Mobile Fix] Text area focused');
                    
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
                    console.log('[Student Report Mobile Fix] Text area blurred');
                    
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
                    console.log('[Student Report Mobile Fix] Touch start on text area');
                    // Don't prevent default - let the touch event through
                }, { passive: true });
            });
            
            if (textAreas.length > 0) {
                console.log(`[Student Report Mobile Fix] Enhanced ${textAreas.length} text areas`);
            }
        }
    }
    
    function applyMobileStyles() {
        const styleId = 'student-report-mobile-fixes-v3-9';
        
        // Remove any existing style to force refresh
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        
        // Mobile-optimized styles
        style.textContent = `
            /* Mobile-only styles for Student Report - v3.9 enhanced */
            @media (max-width: 768px) {
                /* Hide introductory questions container, logo, and info buttons */
                /* NOTE: Chart is now kept visible, Show Answers hidden via JS */
                #view_3041 #introductory-questions-container,
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
                
                /* Help writing button */
                .help-writing-btn {
                    background: #4CAF50 !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 8px !important;
                    padding: 10px 16px !important;
                    font-size: 14px !important;
                    margin-bottom: 10px !important;
                    cursor: pointer !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 6px !important;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
                    width: 100% !important;
                    justify-content: center !important;
                }
                
                .help-writing-btn:active {
                    transform: scale(0.98) !important;
                    background: #45a049 !important;
                }
                
                /* Make text areas even larger by default */
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
                
                /* Gentle fix for EFFORT section consistency */
                #view_3041 .vespa-report-score[style*="background-color: rgb(134, 180, 240)"] {
                    display: block !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
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
            }
            
            /* Intro questions modal styles */
            .intro-modal-overlay {
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
            }
            
            .intro-modal-overlay.active {
                display: flex !important;
                align-items: flex-start !important;
                justify-content: center !important;
                padding: 20px 0 !important;
            }
            
            .intro-modal-content {
                background: white !important;
                width: 90% !important;
                max-width: 600px !important;
                margin: 20px auto !important;
                border-radius: 10px !important;
                position: relative !important;
                max-height: 90vh !important;
                overflow: hidden !important;
                display: flex !important;
                flex-direction: column !important;
            }
            
            .intro-modal-header {
                background: #4CAF50 !important;
                color: white !important;
                padding: 20px !important;
                border-radius: 10px 10px 0 0 !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                flex-shrink: 0 !important;
            }
            
            .intro-modal-header h2 {
                margin: 0 !important;
                font-size: 24px !important;
                font-weight: 600 !important;
            }
            
            .intro-modal-close {
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
            
            .intro-modal-close:hover {
                background: rgba(255, 255, 255, 0.2) !important;
            }
            
            .intro-modal-body {
                padding: 20px !important;
                overflow-y: auto !important;
                flex: 1 !important;
            }
            
            .help-content {
                font-size: 16px !important;
                line-height: 1.6 !important;
            }
            
            /* Modal styles - always apply these */
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
        
        console.log('[Student Report Mobile Fix] Mobile styles applied successfully!');
    }
    
    function hideShowAnswersButton() {
        // Only run on mobile
        if (window.innerWidth > 768) return;
        
        console.log('[Student Report Mobile Fix] Looking for Show Answers button...');
        
        // Find and hide the Show Answers button by checking button text
        const buttons = document.querySelectorAll('#view_3041 button');
        let hiddenCount = 0;
        
        buttons.forEach(button => {
            const buttonText = (button.textContent || button.innerText || '').trim();
            console.log(`[Student Report Mobile Fix] Checking button with text: "${buttonText}"`);
            
            if (buttonText.toLowerCase() === 'show answers' || 
                buttonText.toLowerCase().includes('show answer') ||
                buttonText.toLowerCase() === 'show') {
                button.style.display = 'none';
                button.style.visibility = 'hidden';
                hiddenCount++;
                console.log(`[Student Report Mobile Fix] Hid button with text: "${buttonText}"`);
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
                    hiddenCount++;
                    console.log(`[Student Report Mobile Fix] Hid bottom header button: "${buttonText}"`);
                }
            });
        }
        
        console.log(`[Student Report Mobile Fix] Total buttons hidden: ${hiddenCount}`);
    }
    
    // Initialize with a delay to ensure Vue app is loaded
    setTimeout(() => {
        console.log('[Student Report Mobile Fix] Initial check...');
        fixStudentReportMobile();
    }, 1000);
    
    // Re-apply on scene render
    $(document).on('knack-scene-render.scene_43', function() {
        console.log('[Student Report Mobile Fix] Scene 43 rendered');
        popupsInitialized = false; // Reset to reinitialize popups
        setTimeout(() => {
            fixStudentReportMobile();
        }, 500);
    });
    
    // Re-apply on view render
    $(document).on('knack-view-render.view_3041', function() {
        console.log('[Student Report Mobile Fix] View 3041 rendered');
        popupsInitialized = false; // Reset to reinitialize popups
        setTimeout(() => {
            fixStudentReportMobile();
        }, 500);
    });
    
    // Also watch for any view render in scene_43 or vespa-results
    $(document).on('knack-view-render.any', function(event, view) {
        if (window.location.hash.includes('scene_43') || window.location.hash.includes('my-report') || window.location.hash.includes('vespa-results')) {
            console.log(`[Student Report Mobile Fix] View ${view.key} rendered on report page`);
            setTimeout(() => {
                fixStudentReportMobile();
            }, 300);
        }
    });
    
    // Check on hash change
    window.addEventListener('hashchange', function() {
        console.log('[Student Report Mobile Fix] Hash changed, checking...');
        setTimeout(() => {
            fixStudentReportMobile();
        }, 500);
    });
    
    console.log('[Student Report Mobile Fix v3.9] Initialization complete');
})();

