/**
 * VESPA Questionnaire Validator v1.0
 * Intercepts questionnaire navigation and validates user eligibility
 * Shows instructional video for eligible users or informative message for ineligible users
 */

(function() {
    'use strict';
    
    const DEBUG_MODE = true;
    const VIDEO_URL = 'https://muse.ai/embed/BtVw4Dd';
    
    // Configuration
    const CONFIG = {
        apiUrl: 'https://api.knack.com/v1',
        appId: '5ee90912c38ae7001510c1a9',
        apiKey: '8f733aa5-dd35-4464-8348-64824d1f5f0d',
        
        // Object and Field mappings
        objects: {
            users: 'object_10',           // User records
            cycleDates: 'object_66',      // Cycle dates
            accounts: 'object_1'          // Account records
        },
        
        fields: {
            // Object_10 (Users) fields
            currentCycle: 'field_146',        // Current cycle number
            cycle1Score: 'field_155',         // Cycle 1 score (to check completion)
            cycle2Score: 'field_156',         // Cycle 2 score
            cycle3Score: 'field_157',         // Cycle 3 score
            connectedCustomer: 'field_133',   // Connected VESPA Customer
            
            // Object_66 (Cycle Dates) fields
            cycleCustomer: 'field_1585',      // Connected VESPA Customer
            cycleNumber: 'field_1579',        // Cycle number (1, 2, or 3)
            startDate: 'field_1678',          // Cycle start date
            endDate: 'field_1580',            // Cycle end date
            cycleUnlocked: 'field_1679',      // Boolean - override to unlock
            
            // Object_1 (Accounts) fields
            accountCustomer: 'field_122'      // Connected VESPA Customer in account
        }
    };
    
    function log(message, data) {
        if (DEBUG_MODE) {
            console.log(`[Questionnaire Validator] ${message}`, data || '');
        }
    }
    
    function formatDate(dateStr) {
        if (!dateStr) return 'Not set';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
    }
    
    // Fetch user's Object_10 record
    async function fetchUserRecord() {
        try {
            const user = Knack.getUserAttributes();
            if (!user || !user.id) {
                throw new Error('No user logged in');
            }
            
            log('Fetching user record for account ID:', user.id);
            
            // Search Object_10 for records connected to this account
            const url = `${CONFIG.apiUrl}/objects/${CONFIG.objects.users}/records`;
            const filters = {
                match: 'and',
                rules: [{
                    field: 'field_2', // Account connection field in Object_10
                    operator: 'is',
                    value: user.id
                }]
            };
            
            const response = await $.ajax({
                url: url,
                type: 'GET',
                headers: {
                    'X-Knack-Application-Id': CONFIG.appId,
                    'X-Knack-REST-API-KEY': CONFIG.apiKey,
                    'content-type': 'application/json'
                },
                data: {
                    filters: JSON.stringify(filters)
                }
            });
            
            if (response.records && response.records.length > 0) {
                log('Found user record:', response.records[0]);
                return response.records[0];
            }
            
            throw new Error('No Object_10 record found for user');
            
        } catch (error) {
            log('Error fetching user record:', error);
            throw error;
        }
    }
    
    // Fetch cycle dates for the user's customer
    async function fetchCycleDates(customerValue) {
        try {
            if (!customerValue || customerValue === 'None') {
                log('No customer value, returning empty cycle dates');
                return [];
            }
            
            const url = `${CONFIG.apiUrl}/objects/${CONFIG.objects.cycleDates}/records`;
            const filters = {
                match: 'and',
                rules: [{
                    field: CONFIG.fields.cycleCustomer,
                    operator: 'is',
                    value: customerValue
                }]
            };
            
            const response = await $.ajax({
                url: url,
                type: 'GET',
                headers: {
                    'X-Knack-Application-Id': CONFIG.appId,
                    'X-Knack-REST-API-KEY': CONFIG.apiKey,
                    'content-type': 'application/json'
                },
                data: {
                    filters: JSON.stringify(filters),
                    sort_field: CONFIG.fields.cycleNumber,
                    sort_order: 'asc'
                }
            });
            
            log('Fetched cycle dates:', response.records);
            return response.records || [];
            
        } catch (error) {
            log('Error fetching cycle dates:', error);
            return [];
        }
    }
    
    // Main validation logic
    async function validateQuestionnaireAccess() {
        try {
            // Fetch user's Object_10 record
            const userRecord = await fetchUserRecord();
            const userId = userRecord.id;
            
            // Get user's connected customer
            let customerValue = userRecord[CONFIG.fields.connectedCustomer];
            
            // If no customer in Object_10, check account
            if (!customerValue || customerValue === 'None') {
                const account = Knack.getUserAttributes();
                if (account && account.values) {
                    customerValue = account.values[CONFIG.fields.accountCustomer];
                }
            }
            
            log('Customer value:', customerValue);
            
            // Fetch cycle dates
            const cycleDates = await fetchCycleDates(customerValue);
            
            // Get current date
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Get user's current cycle (default to 1 if null or undefined)
            let currentCycle = userRecord[CONFIG.fields.currentCycle];
            if (!currentCycle || currentCycle < 1) {
                currentCycle = 1;
            }
            
            log('User current cycle:', currentCycle);
            
            // Check if user has completed questionnaires
            const hasCompletedCycle1 = userRecord[CONFIG.fields.cycle1Score] && userRecord[CONFIG.fields.cycle1Score] !== '';
            const hasCompletedCycle2 = userRecord[CONFIG.fields.cycle2Score] && userRecord[CONFIG.fields.cycle2Score] !== '';
            const hasCompletedCycle3 = userRecord[CONFIG.fields.cycle3Score] && userRecord[CONFIG.fields.cycle3Score] !== '';
            
            // Find next cycle to complete
            let nextCycle = 1;
            if (hasCompletedCycle1) nextCycle = 2;
            if (hasCompletedCycle2) nextCycle = 3;
            if (hasCompletedCycle3) {
                // All cycles completed
                return {
                    allowed: false,
                    reason: 'all_completed',
                    message: 'You have completed all three VESPA questionnaire cycles.',
                    userRecord: userRecord
                };
            }
            
            // If no cycle dates, allow questionnaire
            if (cycleDates.length === 0) {
                log('No cycle dates found, allowing questionnaire');
                return {
                    allowed: true,
                    cycleNumber: nextCycle,
                    userRecord: userRecord
                };
            }
            
            // Check each cycle date
            for (const cycleDate of cycleDates) {
                const cycleNum = parseInt(cycleDate[CONFIG.fields.cycleNumber]);
                
                // Skip if this isn't the next cycle to complete
                if (cycleNum !== nextCycle) continue;
                
                // Check if cycle is unlocked (override)
                if (cycleDate[CONFIG.fields.cycleUnlocked] === true || 
                    cycleDate[CONFIG.fields.cycleUnlocked] === 'Yes') {
                    log(`Cycle ${cycleNum} is unlocked, allowing access`);
                    return {
                        allowed: true,
                        cycleNumber: cycleNum,
                        userRecord: userRecord
                    };
                }
                
                // Check date range
                const startDate = new Date(cycleDate[CONFIG.fields.startDate]);
                const endDate = new Date(cycleDate[CONFIG.fields.endDate]);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                
                if (today >= startDate && today <= endDate) {
                    // Within date range
                    return {
                        allowed: true,
                        cycleNumber: cycleNum,
                        userRecord: userRecord
                    };
                } else if (today < startDate) {
                    // Before start date
                    return {
                        allowed: false,
                        reason: 'before_start',
                        message: `The questionnaire for Cycle ${cycleNum} will open on ${formatDate(cycleDate[CONFIG.fields.startDate])}.`,
                        nextStartDate: formatDate(cycleDate[CONFIG.fields.startDate]),
                        userRecord: userRecord
                    };
                } else {
                    // After end date
                    // Check if there's a next cycle
                    const nextCycleDate = cycleDates.find(cd => 
                        parseInt(cd[CONFIG.fields.cycleNumber]) === cycleNum + 1
                    );
                    
                    if (nextCycleDate) {
                        return {
                            allowed: false,
                            reason: 'missed_cycle',
                            message: `You missed the deadline for Cycle ${cycleNum}. The next cycle starts on ${formatDate(nextCycleDate[CONFIG.fields.startDate])}.`,
                            nextStartDate: formatDate(nextCycleDate[CONFIG.fields.startDate]),
                            userRecord: userRecord
                        };
                    } else {
                        return {
                            allowed: false,
                            reason: 'after_end',
                            message: `The questionnaire period for Cycle ${cycleNum} has ended.`,
                            userRecord: userRecord
                        };
                    }
                }
            }
            
            // No matching cycle found
            return {
                allowed: false,
                reason: 'no_active_cycle',
                message: 'There is no active questionnaire cycle at this time.',
                userRecord: userRecord
            };
            
        } catch (error) {
            log('Validation error:', error);
            return {
                allowed: false,
                reason: 'error',
                message: 'Unable to verify questionnaire access. Please try again later.',
                error: error.message
            };
        }
    }
    
    // Create and show the popup
    function showPopup(validationResult) {
        // Remove any existing popup
        $('.vespa-questionnaire-popup').remove();
        
        const isAllowed = validationResult.allowed;
        
        let popupContent;
        
        if (isAllowed) {
            // Show video popup for allowed users
            popupContent = `
                <div class="popup-header">
                    <h2>VESPA Questionnaire Instructions</h2>
                    <button class="popup-close">&times;</button>
                </div>
                <div class="popup-body">
                    <p>Please watch this short video before starting the questionnaire:</p>
                    <div class="video-container">
                        <iframe src="${VIDEO_URL}" 
                                width="100%" 
                                height="400" 
                                frameborder="0" 
                                allowfullscreen>
                        </iframe>
                    </div>
                    <div class="popup-actions">
                        <button class="btn-primary proceed-btn">Proceed to Questionnaire</button>
                        <button class="btn-secondary close-btn">Close</button>
                    </div>
                </div>
            `;
        } else {
            // Show informative message for not allowed users
            let additionalInfo = '';
            if (validationResult.nextStartDate) {
                additionalInfo = `<p><strong>Next available date:</strong> ${validationResult.nextStartDate}</p>`;
            }
            
            popupContent = `
                <div class="popup-header">
                    <h2>Questionnaire Not Available</h2>
                    <button class="popup-close">&times;</button>
                </div>
                <div class="popup-body">
                    <div class="message-icon">
                        <i class="fa fa-info-circle"></i>
                    </div>
                    <p>${validationResult.message}</p>
                    ${additionalInfo}
                    <p class="help-text">If you believe this is incorrect, please speak to your tutor.</p>
                    <div class="popup-actions">
                        <button class="btn-primary view-report-btn">View Current Report</button>
                        <button class="btn-secondary home-btn">Return to Home</button>
                    </div>
                </div>
            `;
        }
        
        // Create popup HTML
        const popupHtml = `
            <div class="vespa-questionnaire-popup-overlay"></div>
            <div class="vespa-questionnaire-popup">
                ${popupContent}
            </div>
        `;
        
        // Add popup to page
        $('body').append(popupHtml);
        
        // Add styles
        addPopupStyles();
        
        // Setup event handlers
        setupPopupEvents(validationResult);
        
        // Show popup with animation
        setTimeout(() => {
            $('.vespa-questionnaire-popup-overlay, .vespa-questionnaire-popup').addClass('show');
        }, 10);
    }
    
    // Add popup styles
    function addPopupStyles() {
        if ($('#questionnaire-popup-styles').length > 0) return;
        
        const styles = `
            <style id="questionnaire-popup-styles">
                .vespa-questionnaire-popup-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    z-index: 99998;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                .vespa-questionnaire-popup {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) scale(0.9);
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                    max-width: 700px;
                    width: 90%;
                    max-height: 90vh;
                    overflow: hidden;
                    z-index: 99999;
                    opacity: 0;
                    transition: all 0.3s ease;
                }
                
                .vespa-questionnaire-popup-overlay.show,
                .vespa-questionnaire-popup.show {
                    opacity: 1;
                }
                
                .vespa-questionnaire-popup.show {
                    transform: translate(-50%, -50%) scale(1);
                }
                
                .popup-header {
                    background: #079baa;
                    color: white;
                    padding: 20px;
                    position: relative;
                }
                
                .popup-header h2 {
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                }
                
                .popup-close {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: none;
                    border: none;
                    color: white;
                    font-size: 28px;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.2s ease;
                }
                
                .popup-close:hover {
                    transform: scale(1.2);
                }
                
                .popup-body {
                    padding: 30px;
                    overflow-y: auto;
                    max-height: calc(90vh - 80px);
                }
                
                .video-container {
                    margin: 20px 0;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
                }
                
                .message-icon {
                    text-align: center;
                    margin-bottom: 20px;
                }
                
                .message-icon i {
                    font-size: 64px;
                    color: #ff9800;
                }
                
                .popup-body p {
                    font-size: 16px;
                    line-height: 1.6;
                    margin: 10px 0;
                }
                
                .help-text {
                    color: #666;
                    font-style: italic;
                    margin-top: 20px !important;
                }
                
                .popup-actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 25px;
                    justify-content: center;
                    flex-wrap: wrap;
                }
                
                .popup-actions button {
                    padding: 12px 24px;
                    border-radius: 6px;
                    font-size: 16px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: none;
                    min-width: 150px;
                }
                
                .btn-primary {
                    background: #079baa;
                    color: white;
                }
                
                .btn-primary:hover {
                    background: #067a86;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(7, 155, 170, 0.3);
                }
                
                .btn-secondary {
                    background: #f0f0f0;
                    color: #333;
                }
                
                .btn-secondary:hover {
                    background: #e0e0e0;
                    transform: translateY(-2px);
                }
                
                @media (max-width: 600px) {
                    .vespa-questionnaire-popup {
                        width: 95%;
                        max-height: 95vh;
                    }
                    
                    .popup-body {
                        padding: 20px;
                    }
                    
                    .video-container iframe {
                        height: 250px;
                    }
                    
                    .popup-actions {
                        flex-direction: column;
                    }
                    
                    .popup-actions button {
                        width: 100%;
                    }
                }
            </style>
        `;
        
        $('head').append(styles);
    }
    
    // Setup popup event handlers
    function setupPopupEvents(validationResult) {
        // Close button handlers
        $('.popup-close, .close-btn').on('click', function() {
            closePopup();
        });
        
        // Overlay click to close
        $('.vespa-questionnaire-popup-overlay').on('click', function() {
            closePopup();
        });
        
        // Proceed to questionnaire button
        $('.proceed-btn').on('click', function() {
            closePopup();
            // Navigate to questionnaire with Object_10 ID
            const questionnaireUrl = `#add-q/questionnaireqs/${validationResult.userRecord.id}`;
            log('Navigating to:', questionnaireUrl);
            window.location.hash = questionnaireUrl;
        });
        
        // View report button
        $('.view-report-btn').on('click', function() {
            closePopup();
            window.location.hash = '#vespa-results';
        });
        
        // Home button
        $('.home-btn').on('click', function() {
            closePopup();
            window.location.hash = '#landing-page/';
        });
    }
    
    // Close popup
    function closePopup() {
        $('.vespa-questionnaire-popup-overlay, .vespa-questionnaire-popup').removeClass('show');
        setTimeout(() => {
            $('.vespa-questionnaire-popup-overlay, .vespa-questionnaire-popup').remove();
        }, 300);
    }
    
    // Intercept questionnaire navigation
    function interceptQuestionnaireClick(e) {
        // Check if this is a questionnaire link
        const target = $(e.currentTarget);
        const href = target.attr('href');
        const scene = target.data('scene');
        
        if (href === '#add-q' || scene === 'scene_358') {
            e.preventDefault();
            e.stopPropagation();
            
            log('Intercepted questionnaire navigation');
            
            // Show loading state
            target.addClass('loading');
            target.find('span').text('Checking...');
            
            // Run validation
            validateQuestionnaireAccess().then(result => {
                log('Validation result:', result);
                
                // Restore button state
                target.removeClass('loading');
                target.find('span').text('VESPA Questionnaire');
                
                // Show appropriate popup
                showPopup(result);
                
            }).catch(error => {
                log('Validation error:', error);
                
                // Restore button state
                target.removeClass('loading');
                target.find('span').text('VESPA Questionnaire');
                
                // Show error popup
                showPopup({
                    allowed: false,
                    reason: 'error',
                    message: 'Unable to check questionnaire access. Please try again later.'
                });
            });
        }
    }
    
    // Initialize the validator
    function initializeQuestionnaireValidator() {
        const config = window.QUESTIONNAIRE_VALIDATOR_CONFIG;
        
        // Check if validator is enabled
        if (config && config.enabled === false) {
            log('Questionnaire validator is DISABLED via config');
            return; // Don't initialize if disabled
        }
        
        log('Initializing questionnaire validator');
        
        // Setup click interceptor using event delegation
        $(document).on('click', 'a[href="#add-q"], a[data-scene="scene_358"]', interceptQuestionnaireClick);
        
        // Also intercept any direct navigation attempts
        $(window).on('hashchange', function() {
            if (window.location.hash === '#add-q' || window.location.hash.includes('#add-q/')) {
                // If someone tries to navigate directly, redirect to home and show message
                if (!window._questionnaireValidated) {
                    window.location.hash = '#landing-page/';
                    setTimeout(() => {
                        showPopup({
                            allowed: false,
                            reason: 'direct_access',
                            message: 'Please use the VESPA Questionnaire button in the navigation menu to access the questionnaire.'
                        });
                    }, 500);
                }
            }
        });
        
        log('Questionnaire validator initialized');
    }
    
    // Make function globally available
    window.initializeQuestionnaireValidator = initializeQuestionnaireValidator;
    
    // Auto-initialize when DOM is ready
    $(document).ready(function() {
        // Check if we're dealing with a student user
        const user = Knack.getUserAttributes();
        if (user && user.profiles && user.profiles.includes('profile_6')) {
            log('Student user detected, checking if validator should initialize');
            
            // Wait a moment for config to be set by KnackAppLoader
            setTimeout(() => {
                initializeQuestionnaireValidator();
            }, 100);
        }
    });
    
})(); 
