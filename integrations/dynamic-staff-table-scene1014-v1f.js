// Dynamic Staff Table Override v2.0 - Staff Admin Focus
// Enhances existing table in scene_1014 (view_2772) for Staff Admins
// Adds role-based student access while preserving existing report functionality

(function() {
    'use strict';
    
    const DEBUG = true;
    const log = (message, data = null) => {
        if (DEBUG) {
            console.log(`[TableOverride-v2] ${message}`, data || '');
        }
    };

    log('🚀 Dynamic Staff Table Override v2.0 Initializing...');

    // Configuration for scene_1014 (Staff Admin page) only
    const SCENE_CONFIG = {
        name: 'Staff Admin Page',
        scene: 'scene_1014', 
        tableContainer: '#view_2772',
        tableSelector: '#view_2772 .kn-table',
        reportContainer: '#view_2772 .kn-rich_text__content'
    };

    // Configuration
    const CONFIG = {
        apiBaseUrl: 'https://api.knack.com/v1/pages',
        apiHeaders: {
            'X-Knack-Application-Id': '5ee90912c38ae7001510c1a9',
            'X-Knack-REST-API-Key': '8f733aa5-dd35-4464-8348-64824d1f5f0d'
        },
        
        // Role-based API endpoints for fetching students
        roleEndpoints: {
            'Tutor': 'scene_1095/views/view_2716', // Current working endpoint
            'Staff Admin': 'scene_1014/views/view_2772', // Staff admin endpoint
            'Head of Year': 'scene_1095/views/view_2716', // Can be customized later
            'Subject Teacher': 'scene_1095/views/view_2716' // Can be customized later
        },
        
        // Staff role detection from field_73 (profile IDs)
        staffRoles: {
            'Tutor': ['profile_7'],
            'Head of Year': ['profile_7'], 
            'Subject Teacher': ['profile_7'],
            'Staff Admin': ['profile_5', 'profile_21'] // profile_5 is the actual Staff Admin profile
        }
    };

    // Utility Functions
    function isStaffAdminScene() {
        // Check if we're on scene_1014 (Staff Admin page)
        if (typeof Knack !== 'undefined' && Knack.scene && Knack.scene.key === 'scene_1014') {
            return true;
        }
        
        // Check URL hash
        const hash = window.location.hash;
        if (hash.includes('coaching-staff-admin')) return true;
        
        // Check DOM elements
        if (document.querySelector('#kn-scene_1014')) return true;
        
        return false;
    }

    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }

    // Get user information and determine role
    async function getUserInfo() {
        try {
            log('Getting user info...');
            
            const userAttributes = (typeof Knack !== 'undefined' && Knack.getUserAttributes) 
                ? Knack.getUserAttributes() 
                : null;
            
            if (!userAttributes) {
                throw new Error('Unable to get user attributes');
            }
            
            const userEmail = userAttributes.email || userAttributes.values?.email;
            const field73 = userAttributes.values?.field_73 || userAttributes.field_73 || [];
            
            // Determine role from field_73 (profile keys)
            let userRole = 'Tutor'; // Default fallback
            
            // Check for Staff Admin profiles (profile_5 or profile_21)
            if (field73.includes('profile_5') || field73.includes('profile_21')) {
                userRole = 'Staff Admin';
            } else if (field73.includes('profile_7')) {
                // Could add more specific role detection here later
                userRole = 'Tutor';
            }
            
            log('User role determined:', userRole);
            
            return {
                email: userEmail,
                role: userRole,
                attributes: userAttributes,
                profileIds: field73
            };
        } catch (error) {
            log('Error getting user info:', error);
            throw error;
        }
    }

    // Fetch additional students for Staff Admins
    async function fetchAdditionalStudents(userInfo) {
        try {
            if (userInfo.role !== 'Staff Admin') {
                log('Not a Staff Admin, no additional students to fetch');
                return [];
            }

            log('Fetching additional students for Staff Admin...');
            
            // For Staff Admins, get all students from view_2772 (their current endpoint)
            const endpoint = CONFIG.roleEndpoints[userInfo.role];
            const url = `${CONFIG.apiBaseUrl}/${endpoint}/records?rows_per_page=1000`;
            
            log('API URL:', url);
            
            const response = await fetch(url, {
                headers: CONFIG.apiHeaders
            });
            
            if (!response.ok) {
                throw new Error(`API call failed: ${response.status}`);
            }
            
            const data = await response.json();
            log('Additional students fetched:', data.records?.length || 0);
            
            return data.records || [];
        } catch (error) {
            log('Error fetching additional students:', error);
            return [];
        }
    }

    // Extract student data from records
    function extractStudentData(records) {
        return records.map((record, index) => {
            // Try multiple field patterns for student name
            let studentName = 'Unknown Student';
            if (record.field_2301) {
                studentName = record.field_2301;
            } else if (record.field_2301_raw) {
                studentName = record.field_2301_raw;
            } else if (record.Student && record.Student.identifier) {
                studentName = record.Student.identifier;
            }
            
            // Extract report response
            let reportResponse = 'N/A';
            if (record.field_2302) {
                reportResponse = record.field_2302;
            } else if (record.field_2302_raw) {
                reportResponse = record.field_2302_raw;
            }
            
            return {
                name: studentName,
                reportResponse: reportResponse,
                object10Id: record.id,
                rowIndex: index,
                record: record
            };
        });
    }

    // Create table row HTML
    function createTableRow(student, isAdditional = false) {
        const additionalClass = isAdditional ? 'additional-student-row' : '';
        const additionalLabel = isAdditional ? ' (Staff Admin Access)' : '';
        
        return `
            <tr class="kn-table-row ${additionalClass}" data-object10-id="${student.object10Id}">
                <td class="kn-table-cell">
                    <span class="student-name">${student.name}${additionalLabel}</span>
                </td>
                <td class="kn-table-cell">
                    <span class="report-response">${student.reportResponse}</span>
                </td>
                <td class="kn-table-cell">
                    <a href="#" class="kn-button kn-button-small enhanced-report-btn" 
                       onclick="triggerEnhancedReport('${student.object10Id}', '${student.name}'); return false;">
                        Report
                    </a>
                </td>
            </tr>
        `;
    }

    // Enhanced report trigger function for Staff Admin page
    window.triggerEnhancedReport = function(object10Id, studentName) {
        log(`🚀 Enhanced report trigger for: ${studentName} (ID: ${object10Id})`);
        
        try {
            // Look for existing report buttons in view_2772
            const hiddenButtons = document.querySelectorAll(`${SCENE_CONFIG.tableContainer} a[href*="${object10Id}"]`);
            
            if (hiddenButtons.length > 0) {
                log('Found existing report button in view_2772, clicking...');
                hiddenButtons[0].click();
                return;
            }
            
            // Fallback: Look for any report button with this ID anywhere on the page
            const allButtons = document.querySelectorAll(`a[href*="${object10Id}"]`);
            if (allButtons.length > 0) {
                log('Found fallback report button, clicking...');
                allButtons[0].click();
                return;
            }
            
            // If no button found, try to trigger via existing report system
            log('No existing report button found, attempting alternative trigger...');
            
            // Set global variable that the existing report system might use
            if (typeof window.currentReportObject10Id !== 'undefined') {
                window.currentReportObject10Id = object10Id;
                log('Set currentReportObject10Id for external report system');
            }
            
            // Try to find and click any "Report" button to trigger the system
            const genericReportButtons = document.querySelectorAll('a, button');
            for (let button of genericReportButtons) {
                if (button.textContent && button.textContent.toLowerCase().includes('report')) {
                    log('Attempting to trigger generic report button');
                    button.click();
                    break;
                }
            }
            
        } catch (error) {
            log('Error triggering enhanced report:', error);
            alert(`Unable to generate report for ${studentName}. Please try using the original table or contact support.`);
        }
    };

    // Add enhanced styles
    function addEnhancedStyles() {
        if (document.getElementById('enhanced-table-styles')) return;
        
        const styles = `
            <style id="enhanced-table-styles">
                .additional-student-row {
                    background-color: #f0f8ff !important;
                    border-left: 3px solid #079baa !important;
                }
                
                .additional-student-row:hover {
                    background-color: #e6f3ff !important;
                }
                
                .enhanced-report-btn {
                    background: linear-gradient(135deg, #079baa 0%, #00e5db 100%) !important;
                    color: white !important;
                    border: none !important;
                    padding: 6px 12px !important;
                    border-radius: 4px !important;
                    text-decoration: none !important;
                    font-size: 12px !important;
                    transition: all 0.3s ease !important;
                }
                
                .enhanced-report-btn:hover {
                    transform: translateY(-1px) !important;
                    box-shadow: 0 4px 12px rgba(7, 155, 170, 0.3) !important;
                    color: white !important;
                    text-decoration: none !important;
                }
                
                .student-name {
                    font-weight: 500 !important;
                    color: #23356f !important;
                }
                
                .enhanced-table-info {
                    background: #e8f4f8;
                    padding: 10px;
                    margin: 10px 0;
                    border-radius: 4px;
                    border-left: 4px solid #079baa;
                    font-size: 14px;
                    color: #333;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
        log('Enhanced styles added');
    }

    // Main enhancement function - Staff Admin focus
    async function enhanceStaffAdminTable() {
        try {
            // Check if we're on the Staff Admin scene
            if (!isStaffAdminScene()) {
                log('Not on Staff Admin scene (scene_1014), skipping enhancement');
                return;
            }
            
            log(`Enhancing table for ${SCENE_CONFIG.name}`);
            
            // Add enhanced styles
            addEnhancedStyles();
            
            // Wait for the table container to exist
            log('Waiting for table container:', SCENE_CONFIG.tableContainer);
            await waitForElement(SCENE_CONFIG.tableContainer, 15000);
            
            // Get user info
            const userInfo = await getUserInfo();
            log('User info:', userInfo);
            
            // Only enhance for Staff Admins
            if (userInfo.role !== 'Staff Admin') {
                log('User is not a Staff Admin, skipping table enhancement');
                return;
            }
            
            log('Staff Admin detected - enhancing table with additional students');
            
            // Wait for existing table to load
            await waitForElement(SCENE_CONFIG.tableSelector, 10000);
            
            // Fetch additional students
            const additionalRecords = await fetchAdditionalStudents(userInfo);
            
            if (additionalRecords.length > 0) {
                const additionalStudents = extractStudentData(additionalRecords);
                log(`Adding ${additionalStudents.length} additional students`);
                
                // Find the table body
                const tableBody = document.querySelector(`${SCENE_CONFIG.tableSelector} tbody`);
                if (tableBody) {
                    // Add info message above the table
                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'enhanced-table-info';
                    infoDiv.innerHTML = `
                        <strong>🎯 Staff Admin Access Enhanced:</strong> 
                        Showing ${additionalStudents.length} additional students from your establishment.
                        <br><small>Blue-highlighted rows indicate expanded access beyond your direct tutees.</small>
                    `;
                    
                    const tableContainer = document.querySelector(SCENE_CONFIG.tableContainer);
                    if (tableContainer) {
                        tableContainer.insertBefore(infoDiv, tableContainer.firstChild);
                    }
                    
                    // Add additional rows to the table
                    additionalStudents.forEach(student => {
                        const rowHTML = createTableRow(student, true);
                        tableBody.insertAdjacentHTML('beforeend', rowHTML);
                    });
                    
                    log('✅ Additional students added successfully to Staff Admin table');
                } else {
                    log('❌ Could not find table body to add students');
                }
            } else {
                log('No additional students found for Staff Admin');
            }
            
        } catch (error) {
            log('❌ Error enhancing Staff Admin table:', error);
        }
    }

    // Initialize when DOM is ready and table loads
    function initialize() {
        log('Initializing table override...');
        
        // Wait for Knack to be available
        if (typeof Knack === 'undefined') {
            setTimeout(initialize, 500);
            return;
        }
        
        // Start enhancement process
        setTimeout(enhanceStaffAdminTable, 1000); // Give existing table time to load
    }

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    log('Dynamic Staff Table Override v2.0 loaded');

})();
