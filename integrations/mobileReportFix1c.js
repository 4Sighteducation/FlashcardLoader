/**
 * Scene 43 Student Report Mobile Optimization
 * Optimizes the VESPA report display for mobile devices only
 * Version 1.2 - Fixed URL detection for vespa-results hash
 */

(function() {
    'use strict';
    
    console.log('[Student Report Mobile Fix v1.2] Script loaded');
    
    let stylesApplied = false;
    let modalsInitialized = false;
    
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
        
        // Apply DOM fixes and initialize modals
        setTimeout(() => {
            applyDOMFixes();
            if (!modalsInitialized) {
                initializeCommentModals();
                modalsInitialized = true;
            }
        }, 500);
    }
    
    function applyMobileStyles() {
        const styleId = 'student-report-mobile-fixes-v1';
        
        // Remove any existing style to force refresh
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        
        // Only apply styles on mobile devices
        style.textContent = `
            /* Mobile-only styles for Student Report */
            @media (max-width: 768px) {
                /* Hide desktop elements */
                #view_3041 .image-logo {
                    display: none !important;
                }
                
                /* Overall container adjustments */
                #view_3041 #report-container {
                    padding: 5px !important;
                    overflow-x: hidden !important;
                    background: #f5f5f5 !important;
                }
                
                /* RADICAL HEADER REDESIGN */
                #report-header-container {
                    background: linear-gradient(135deg, #1a4d4d 0%, #2d7a7a 100%) !important;
                    color: white !important;
                    padding: 15px !important;
                    margin: -5px -5px 15px -5px !important;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.2) !important;
                }
                
                #header-title {
                    margin-bottom: 15px !important;
                }
                
                #title-text {
                    font-size: 18px !important;
                    text-align: center !important;
                    margin: 0 !important;
                    color: white !important;
                    font-weight: 600 !important;
                    letter-spacing: 1px !important;
                }
                
                /* Student info - card style */
                #student-info {
                    background: rgba(255,255,255,0.1) !important;
                    border-radius: 10px !important;
                    padding: 15px !important;
                    margin-bottom: 15px !important;
                }
                
                #student-info .info-container {
                    margin: 8px 0 !important;
                }
                
                #student-info p {
                    color: white !important;
                    font-size: 14px !important;
                    margin: 0 !important;
                }
                
                /* Cycle buttons - horizontal scroll */
                #cycle-buttons {
                    display: flex !important;
                    align-items: center !important;
                    gap: 10px !important;
                    justify-content: center !important;
                }
                
                #cycle-buttons p {
                    margin-right: 10px !important;
                }
                
                #cycle-buttons .p-button {
                    min-width: 45px !important;
                    min-height: 45px !important;
                    font-size: 18px !important;
                    border-radius: 50% !important;
                    border: 2px solid white !important;
                    background: transparent !important;
                    color: white !important;
                }
                
                #cycle-buttons .p-button[style*="rgb(0, 235, 143)"] {
                    background: #00eb8f !important;
                    color: #1a4d4d !important;
                    border-color: #00eb8f !important;
                }
                
                /* View Answers button - prominent CTA */
                #answers-button {
                    margin-top: 15px !important;
                }
                
                #answers-button .p-button {
                    width: 100% !important;
                    padding: 15px !important;
                    font-size: 16px !important;
                    background: #00eb8f !important;
                    color: #1a4d4d !important;
                    border: none !important;
                    border-radius: 25px !important;
                    font-weight: 600 !important;
                    box-shadow: 0 4px 10px rgba(0,235,143,0.3) !important;
                }
                
                /* Chart - make it a card */
                #bottom-report-header-container {
                    background: white !important;
                    border-radius: 15px !important;
                    padding: 20px !important;
                    margin: 15px 0 !important;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1) !important;
                }
                
                #chart-container {
                    width: 100% !important;
                    height: 200px !important;
                    margin-bottom: 20px !important;
                }
                
                #chart-container canvas {
                    width: 100% !important;
                    height: 200px !important;
                    max-width: 100% !important;
                }
                
                /* Introductory questions - collapsible style */
                #introductory-questions-container {
                    background: #f9f9f9 !important;
                    border-radius: 10px !important;
                    padding: 15px !important;
                    font-size: 13px !important;
                }
                
                #introductory-questions-container > p:first-child {
                    font-weight: 600 !important;
                    color: #1a4d4d !important;
                    margin-bottom: 10px !important;
                    font-size: 15px !important;
                }
                
                #introductory-questions-container ul {
                    padding-left: 20px !important;
                    margin: 0 !important;
                }
                
                #introductory-questions-container li {
                    margin-bottom: 8px !important;
                    line-height: 1.4 !important;
                }
                
                /* VESPA REPORT CARDS - Radical redesign */
                #report-body-container {
                    padding: 0 5px !important;
                }
                
                #vespa-report-title {
                    display: none !important; /* Hide title on mobile */
                }
                
                .vespa-report {
                    background: white !important;
                    border-radius: 15px !important;
                    margin-bottom: 15px !important;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.1) !important;
                    overflow: hidden !important;
                    transition: transform 0.2s ease !important;
                }
                
                .vespa-report:active {
                    transform: scale(0.98) !important;
                }
                
                /* Score header - horizontal layout */
                .vespa-report-score {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    padding: 20px !important;
                    position: relative !important;
                    overflow: hidden !important;
                }
                
                .vespa-report-score::after {
                    content: '' !important;
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.1) 100%) !important;
                    pointer-events: none !important;
                }
                
                .vespa-report-score p:first-child {
                    font-size: 20px !important;
                    font-weight: 700 !important;
                    margin: 0 !important;
                    color: white !important;
                    text-transform: uppercase !important;
                    letter-spacing: 1px !important;
                    z-index: 1 !important;
                    position: relative !important;
                }
                
                .vespa-report-score p:nth-child(2) {
                    display: none !important;
                }
                
                .vespa-report-score p:last-child {
                    font-size: 36px !important;
                    font-weight: 700 !important;
                    margin: 0 !important;
                    color: white !important;
                    z-index: 1 !important;
                    position: relative !important;
                }
                
                /* Content sections - collapsible appearance */
                .vespa-report-comments,
                .vespa-report-coaching-questions {
                    padding: 20px !important;
                    font-size: 14px !important;
                    line-height: 1.6 !important;
                    background: #fafafa !important;
                }
                
                .vespa-report-comments {
                    border-bottom: 1px solid #eee !important;
                }
                
                .vespa-report-coaching-questions {
                    background: white !important;
                }
                
                .vespa-report-coaching-questions ol {
                    padding-left: 25px !important;
                    margin: 15px 0 !important;
                }
                
                .vespa-report-coaching-questions li {
                    margin-bottom: 12px !important;
                    color: #333 !important;
                }
                
                /* Activity links as chips */
                .vespa-report-coaching-questions > p {
                    margin-top: 20px !important;
                    padding-top: 20px !important;
                    border-top: 1px solid #eee !important;
                }
                
                .vespa-report-coaching-questions a {
                    display: inline-block !important;
                    margin: 5px 5px 5px 0 !important;
                    padding: 10px 16px !important;
                    background: #e3f2fd !important;
                    border-radius: 20px !important;
                    text-decoration: none !important;
                    font-size: 13px !important;
                    color: #1976d2 !important;
                    font-weight: 500 !important;
                    transition: all 0.3s ease !important;
                }
                
                .vespa-report-coaching-questions a:active {
                    background: #1976d2 !important;
                    color: white !important;
                }
                
                /* COMMENTS SECTION - Card style */
                #report-comment-container {
                    background: white !important;
                    border-radius: 15px !important;
                    padding: 20px !important;
                    margin: 20px 5px !important;
                    box-shadow: 0 3px 10px rgba(0,0,0,0.1) !important;
                }
                
                #comment-title {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    margin-bottom: 20px !important;
                    padding-bottom: 15px !important;
                    border-bottom: 2px solid #1a4d4d !important;
                }
                
                #comment-title p {
                    font-size: 18px !important;
                    font-weight: 600 !important;
                    color: #1a4d4d !important;
                    margin: 0 !important;
                }
                
                .comment-section {
                    background: #f9f9f9 !important;
                    border-radius: 10px !important;
                    padding: 15px !important;
                    margin-bottom: 15px !important;
                }
                
                .comment-title-container {
                    margin-bottom: 15px !important;
                }
                
                .comment-title {
                    font-size: 16px !important;
                    font-weight: 600 !important;
                    color: #333 !important;
                }
                
                /* Comment buttons - full width and prominent */
                .add-new-comment .p-button {
                    width: 100% !important;
                    min-height: 50px !important;
                    font-size: 16px !important;
                    background: #1a4d4d !important;
                    color: white !important;
                    border: none !important;
                    border-radius: 10px !important;
                    font-weight: 500 !important;
                    box-shadow: 0 3px 8px rgba(26,77,77,0.3) !important;
                    transition: all 0.3s ease !important;
                }
                
                .add-new-comment .p-button:active {
                    transform: scale(0.98) !important;
                    box-shadow: 0 1px 4px rgba(26,77,77,0.3) !important;
                }
                
                /* Fixed print button */
                #buttons-container {
                    position: fixed !important;
                    top: 10px !important;
                    right: 10px !important;
                    z-index: 1000 !important;
                }
                
                #print-button {
                    background: white !important;
                    color: #333 !important;
                    border: 1px solid #ddd !important;
                    padding: 8px 16px !important;
                    border-radius: 20px !important;
                    font-size: 14px !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
                }
                
                .back-button-container {
                    display: none !important;
                }
                
                /* Info icons */
                .info-icon {
                    font-size: 20px !important;
                    color: #666 !important;
                    padding: 5px !important;
                }
                
                /* Modal styles for comments */
                .comment-modal {
                    display: none;
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    background: rgba(0,0,0,0.7) !important;
                    z-index: 9999 !important;
                    animation: fadeIn 0.3s ease !important;
                }
                
                .comment-modal.active {
                    display: block !important;
                }
                
                .comment-modal-content {
                    position: absolute !important;
                    bottom: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    background: white !important;
                    border-radius: 20px 20px 0 0 !important;
                    padding: 20px !important;
                    max-height: 80vh !important;
                    overflow-y: auto !important;
                    animation: slideUp 0.3s ease !important;
                }
                
                .comment-modal-header {
                    display: flex !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    margin-bottom: 20px !important;
                    padding-bottom: 15px !important;
                    border-bottom: 1px solid #eee !important;
                }
                
                .comment-modal-title {
                    font-size: 20px !important;
                    font-weight: 600 !important;
                    color: #1a4d4d !important;
                }
                
                .comment-modal-close {
                    font-size: 24px !important;
                    color: #666 !important;
                    cursor: pointer !important;
                    padding: 5px !important;
                    line-height: 1 !important;
                }
                
                .comment-modal-textarea {
                    width: 100% !important;
                    min-height: 200px !important;
                    padding: 15px !important;
                    border: 2px solid #ddd !important;
                    border-radius: 10px !important;
                    font-size: 16px !important;
                    resize: vertical !important;
                    font-family: inherit !important;
                    margin-bottom: 20px !important;
                }
                
                .comment-modal-textarea:focus {
                    outline: none !important;
                    border-color: #1a4d4d !important;
                }
                
                .comment-modal-buttons {
                    display: flex !important;
                    gap: 10px !important;
                }
                
                .comment-modal-save,
                .comment-modal-cancel {
                    flex: 1 !important;
                    padding: 15px !important;
                    border: none !important;
                    border-radius: 10px !important;
                    font-size: 16px !important;
                    font-weight: 500 !important;
                    cursor: pointer !important;
                    transition: all 0.3s ease !important;
                }
                
                .comment-modal-save {
                    background: #1a4d4d !important;
                    color: white !important;
                }
                
                .comment-modal-cancel {
                    background: #f0f0f0 !important;
                    color: #666 !important;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                
                /* Ensure proper spacing at the bottom */
                #view_3041 {
                    padding-bottom: 20px !important;
                }
                
                /* Hide elements on very small screens */
                @media (max-width: 480px) {
                    #title-text {
                        font-size: 16px !important;
                    }
                    
                    .vespa-report-score p:first-child {
                        font-size: 18px !important;
                    }
                    
                    .vespa-report-score p:last-child {
                        font-size: 32px !important;
                    }
                }
            }
            
            /* Print styles - ensure report prints well */
            @media print {
                #print-button,
                #buttons-container,
                .comment-modal {
                    display: none !important;
                }
                
                #view_3041 #report-container {
                    padding: 0 !important;
                }
                
                .vespa-report {
                    page-break-inside: avoid !important;
                }
            }
        `;
        
        document.head.appendChild(style);
        stylesApplied = true;
        
        console.log('[Student Report Mobile Fix] Mobile styles applied successfully!');
    }
    
    function applyDOMFixes() {
        // Add viewport meta tag if not present (important for mobile)
        if (!document.querySelector('meta[name="viewport"]')) {
            const viewport = document.createElement('meta');
            viewport.name = 'viewport';
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            document.head.appendChild(viewport);
        }
        
        // Make chart responsive
        const canvas = document.querySelector('#chart-container canvas');
        if (canvas) {
            canvas.style.maxWidth = '100%';
            canvas.style.height = 'auto';
        }
        
        console.log('[Student Report Mobile Fix] DOM fixes applied');
    }
    
    function initializeCommentModals() {
        console.log('[Student Report Mobile Fix] Initializing comment modals');
        
        // Only initialize on mobile
        if (window.innerWidth > 768) {
            console.log('[Student Report Mobile Fix] Not mobile, skipping modal initialization');
            return;
        }
        
        // Find all "Add Comment" buttons
        const commentButtons = document.querySelectorAll('.add-new-comment .p-button');
        
        commentButtons.forEach((button, index) => {
            // Get the comment section title
            const section = button.closest('.comment-section');
            const title = section.querySelector('.comment-title')?.textContent || 'Add Comment';
            
            // Create modal for this button
            const modal = createCommentModal(title, index);
            document.body.appendChild(modal);
            
            // Replace button click handler
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`[Student Report Mobile Fix] Opening modal for: ${title}`);
                modal.classList.add('active');
                modal.querySelector('.comment-modal-textarea').focus();
            });
        });
        
        console.log(`[Student Report Mobile Fix] Initialized ${commentButtons.length} comment modals`);
    }
    
    function createCommentModal(title, index) {
        const modal = document.createElement('div');
        modal.className = 'comment-modal';
        modal.id = `comment-modal-${index}`;
        
        modal.innerHTML = `
            <div class="comment-modal-content">
                <div class="comment-modal-header">
                    <h3 class="comment-modal-title">${title}</h3>
                    <span class="comment-modal-close">&times;</span>
                </div>
                <textarea class="comment-modal-textarea" placeholder="Enter your ${title.toLowerCase()} here..."></textarea>
                <div class="comment-modal-buttons">
                    <button class="comment-modal-cancel">Cancel</button>
                    <button class="comment-modal-save">Save</button>
                </div>
            </div>
        `;
        
        // Close button handler
        modal.querySelector('.comment-modal-close').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        // Cancel button handler
        modal.querySelector('.comment-modal-cancel').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        // Save button handler (placeholder - would need to integrate with actual save logic)
        modal.querySelector('.comment-modal-save').addEventListener('click', () => {
            const text = modal.querySelector('.comment-modal-textarea').value;
            console.log(`[Student Report Mobile Fix] Would save comment: ${text}`);
            // Here you would integrate with the actual save functionality
            modal.classList.remove('active');
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
        
        return modal;
    }
    
    // Initialize with a longer delay to ensure Vue app is loaded
    setTimeout(() => {
        console.log('[Student Report Mobile Fix] Initial check...');
        fixStudentReportMobile();
    }, 1000);
    
    // Re-apply on scene render
    $(document).on('knack-scene-render.scene_43', function() {
        console.log('[Student Report Mobile Fix] Scene 43 rendered');
        modalsInitialized = false; // Reset to reinitialize modals
        setTimeout(() => {
            fixStudentReportMobile();
        }, 500);
    });
    
    // Re-apply on view render
    $(document).on('knack-view-render.view_3041', function() {
        console.log('[Student Report Mobile Fix] View 3041 rendered');
        modalsInitialized = false; // Reset to reinitialize modals
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
    
    console.log('[Student Report Mobile Fix v1.2] Initialization complete');
})();
