/**
 * Scene 43 Student Report Mobile Optimization
 * Optimizes the VESPA report display for mobile devices only
 * Version 4.0 - Adds popup functionality for VESPA sections on mobile
 */

(function() {
    'use strict';
    
    console.log('[Student Report Mobile Fix v4.0] Script loaded');
    
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
                popupsInitialized = true;
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
        
        vespaReports.forEach((report) => {
            // Make the section clickable
            report.style.cursor = 'pointer';
            
            // Add click handler
            report.addEventListener('click', function(e) {
                // Prevent clicking on links or buttons within
                if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
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
                
                // Populate modal
                const modal = document.getElementById('vespa-modal-container');
                modal.querySelector('#vespa-modal-title').textContent = sectionName;
                modal.querySelector('.vespa-modal-score').innerHTML = `<div class="modal-score-display">${score}</div>`;
                modal.querySelector('.vespa-modal-description').innerHTML = description;
                modal.querySelector('.vespa-modal-questions').innerHTML = questions;
                modal.querySelector('.vespa-modal-activities').innerHTML = activities ? `<h3>Suggested Activities:</h3>${activities}` : '';
                
                // Show modal
                modal.classList.add('active');
                
                console.log(`[Student Report Mobile Fix] Opened popup for ${sectionName}`);
            });
        });
        
        console.log(`[Student Report Mobile Fix] Initialized ${vespaReports.length} VESPA popups`);
    }
    
    function applyMobileStyles() {
        const styleId = 'student-report-mobile-fixes-v4';
        
        // Remove any existing style to force refresh
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        
        // Mobile-optimized styles with popup functionality
        style.textContent = `
            /* Mobile-only styles for Student Report - v4.0 with popups */
            @media (max-width: 768px) {
                /* Hide chart, introductory questions, and logo */
                #view_3041 #chart-container,
                #view_3041 #bottom-report-header-container,
                #view_3041 #introductory-questions-container,
                #view_3041 .image-logo,
                #view_3041 img[alt="Logo"],
                #view_3041 img[src*="logo"],
                #view_3041 .logo,
                #view_3041 [class*="logo"] img {
                    display: none !important;
                }
                
                /* Make text areas much bigger */
                #view_3041 textarea,
                #view_3041 .ql-editor,
                #view_3041 .ql-container,
                #view_3041 [contenteditable="true"] {
                    min-height: 150px !important;
                    height: auto !important;
                    font-size: 16px !important; /* Prevent iOS zoom on focus */
                }
                
                /* Rich text editor specific adjustments */
                #view_3041 .ql-container {
                    min-height: 200px !important;
                }
                
                #view_3041 .ql-editor {
                    min-height: 180px !important;
                    padding: 12px !important;
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
                
                /* Ensure consistent VESPA section rendering */
                #view_3041 .vespa-report-score {
                    display: block !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                }
                
                #view_3041 .vespa-report-score p {
                    display: block !important;
                    width: 100% !important;
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
                display: block !important;
            }
            
            .vespa-modal-content {
                background: white !important;
                margin: 20px !important;
                border-radius: 10px !important;
                min-height: calc(100vh - 40px) !important;
                position: relative !important;
            }
            
            .vespa-modal-header {
                background: #1a4d4d !important;
                color: white !important;
                padding: 20px !important;
                border-radius: 10px 10px 0 0 !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                position: sticky !important;
                top: 0 !important;
                z-index: 100 !important;
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
            }
            
            .modal-score-display {
                font-size: 48px !important;
                font-weight: 700 !important;
                text-align: center !important;
                padding: 20px !important;
                margin-bottom: 20px !important;
                background: #f0f0f0 !important;
                border-radius: 10px !important;
                color: #1a4d4d !important;
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
    
    console.log('[Student Report Mobile Fix v4.0] Initialization complete');
})();
