// Dynamic Staff Table for Scene 1014 - Production Version
// Based on successful role-based-connection-test.js findings
// Loads role-appropriate students and creates functional report buttons

(function() {
    'use strict';
    
    const DEBUG = true;
    const log = (message, data = null) => {
        if (DEBUG) {
            console.log(`[DynamicTable-1014] ${message}`, data || '');
        }
    };

    log('🚀 Dynamic Staff Table (Scene 1014) Initializing...');

    // Configuration
    const CONFIG = {
        targetContainer: '#view_2772 .kn-rich_text__content',
        originalTableSelector: '#view_2772 .kn-table',
        apiBaseUrl: 'https://api.knack.com/v1/pages',
        sceneViewUrl: 'scene_1095/views/view_2716',
        reportTriggerUrl: 'scene_515/views/view_1346/records/',
        
        // Role-based connection fields (from our successful test)
        roleConnections: {
            'Tutor': 'field_225',           // Object_7 connection
            'Head of Dept': 'field_559',    // Object_25 connection  
            'Head of Year': 'field_432',    // Object_18 connection
            'Subject Teacher': 'field_2190' // Object_78 connection
        },
        
        // Staff role detection from field_73 (using profile IDs)
        staffRoles: {
            'Tutor': ['profile_7'], // Staff profile
            'Head of Dept': ['profile_7'], 
            'Head of Year': ['profile_7'],
            'Subject Teacher': ['profile_7'],
            'Staff Admin': ['profile_21'] // Super user profile (if exists)
        }
    };

    // Utility Functions
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

    function getUserInfo() {
        try {
            const userAttributes = Knack.getUserAttributes();
            const userEmail = userAttributes.email;
            const field73Values = userAttributes.values.field_73 || [];
            
            log('User attributes:', userAttributes);
            log('User email:', userEmail);
            log('Field 73 values:', field73Values);
            
            // Determine user role
            let userRole = 'Unknown';
            for (const [role, keywords] of Object.entries(CONFIG.staffRoles)) {
                if (field73Values.some(value => keywords.includes(value))) {
                    userRole = role;
                    break;
                }
            }
            
            log('Determined role:', userRole);
            
            return {
                email: userEmail,
                role: userRole,
                attributes: userAttributes,
                connectionField: CONFIG.roleConnections[userRole]
            };
        } catch (error) {
            log('Error getting user info:', error);
            return null;
        }
    }

    async function fetchStudentsForRole(userInfo) {
        try {
            log('Fetching students for role:', userInfo.role);
            
            if (userInfo.role === 'Staff Admin') {
                // Staff Admin gets all students - use the original view without filters
                log('Staff Admin detected - fetching all students');
                const response = await fetch(`${CONFIG.apiBaseUrl}/${CONFIG.sceneViewUrl}/records/?page=1&rows_per_page=1000`, {
                    headers: {
                        'X-Knack-Application-Id': Knack.app_id,
                        'Authorization': Knack.getUserToken()
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`API call failed: ${response.status}`);
                }
                
                const data = await response.json();
                log('Staff Admin API response:', data);
                return data.records || [];
            }
            
            if (!userInfo.connectionField) {
                log('No connection field found for role:', userInfo.role);
                return [];
            }
            
            // Get user's connection ID from their profile
            const connectionId = userInfo.attributes.id;
            log('Using connection ID:', connectionId);
            
            // Build filter for role-based connection
            const filter = {
                "match": "and",
                "rules": [{
                    "field": userInfo.connectionField,
                    "operator": "is",
                    "value": [connectionId]
                }]
            };
            
            const filterString = encodeURIComponent(JSON.stringify(filter));
            const url = `${CONFIG.apiBaseUrl}/${CONFIG.sceneViewUrl}/records/?filters=${filterString}&page=1&rows_per_page=1000`;
            
            log('Fetching with URL:', url);
            
            const response = await fetch(url, {
                headers: {
                    'X-Knack-Application-Id': Knack.app_id,
                    'Authorization': Knack.getUserToken()
                }
            });
            
            if (!response.ok) {
                throw new Error(`API call failed: ${response.status}`);
            }
            
            const data = await response.json();
            log('Role-based API response:', data);
            return data.records || [];
            
        } catch (error) {
            log('Error fetching students:', error);
            return [];
        }
    }

    function extractStudentData(records) {
        return records.map(record => {
            // Extract student name (field_2300_raw should contain the student name)
            const studentName = record.field_2300_raw || record.field_2300 || 'Unknown Student';
            
            // Extract Object_10 ID (field_182_raw should contain the connection to Object_10)
            const object10Id = record.field_182_raw?.id || record.field_182?.id || record.field_182 || null;
            
            // Extract report response (field_2301_raw)
            const reportResponse = record.field_2301_raw || record.field_2301 || 'No';
            
            log('Extracted student data:', {
                name: studentName,
                object10Id: object10Id,
                reportResponse: reportResponse
            });
            
            return {
                name: studentName,
                object10Id: object10Id,
                reportResponse: reportResponse
            };
        }).filter(student => student.object10Id); // Only include students with valid Object_10 IDs
    }

    function createTableHTML(students) {
        if (students.length === 0) {
            return `
                <div class="dynamic-staff-table-container">
                    <div class="no-students-message" style="text-align: center; padding: 20px; color: #666;">
                        <h3>No Students Found</h3>
                        <p>No students are currently assigned to your role.</p>
                    </div>
                </div>
            `;
        }

        const tableRows = students.map((student, index) => `
            <tr class="p-row-${index % 2 === 0 ? 'even' : 'odd'}" data-p-index="${index}">
                <td class="student-name-column">
                    <strong>${student.name}</strong>
                </td>
                <td class="report-response-column" style="text-align: center;">
                    ${student.reportResponse}
                </td>
                <td class="button-column" style="text-align: center;">
                    <button 
                        class="p-button p-component p-button-rounded p-button-sm view-report-button"
                        onclick="window.dynamicTableReportHandler('${student.object10Id}', '${student.name.replace(/'/g, "\\'")}')"
                        data-object10-id="${student.object10Id}"
                        data-student-name="${student.name}"
                    >
                        Report
                    </button>
                </td>
            </tr>
        `).join('');

        return `
            <div class="dynamic-staff-table-container">
                <div class="table-header" style="margin-bottom: 15px;">
                    <h3 style="color: #2f8dcb; margin: 0;">Student Reports (${students.length} students)</h3>
                </div>
                <div class="p-datatable p-component">
                    <div class="p-datatable-wrapper">
                        <table class="p-datatable-table">
                            <thead class="p-datatable-thead">
                                <tr>
                                    <th class="p-sortable-column" style="width: 40%;">
                                        <span class="p-column-title">Student Name</span>
                                    </th>
                                    <th class="p-sortable-column" style="width: 30%; text-align: center;">
                                        <span class="p-column-title">Report Response</span>
                                    </th>
                                    <th style="width: 30%; text-align: center;">
                                        <span class="p-column-title">Action</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="p-datatable-tbody">
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <style>
                .dynamic-staff-table-container {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                
                .p-datatable {
                    border: 1px solid #e0e0e0;
                    border-radius: 6px;
                    overflow: hidden;
                }
                
                .p-datatable-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                
                .p-datatable-thead th {
                    background: #f8f9fa;
                    padding: 12px;
                    border-bottom: 2px solid #dee2e6;
                    font-weight: 600;
                    color: #495057;
                }
                
                .p-datatable-tbody td {
                    padding: 12px;
                    border-bottom: 1px solid #e9ecef;
                }
                
                .p-row-even {
                    background-color: #f8f9fa;
                }
                
                .p-row-odd {
                    background-color: white;
                }
                
                .view-report-button {
                    background: #2f8dcb;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 20px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: background-color 0.2s;
                }
                
                .view-report-button:hover {
                    background: #23356f;
                }
                
                .student-name-column {
                    font-weight: 500;
                    color: #2c3e50;
                }
                
                .no-students-message {
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                    border-radius: 6px;
                }
            </style>
        `;
    }

    async function triggerReport(object10Id, studentName) {
        try {
            log('🚀 Triggering report for Object_10 ID:', object10Id, 'Student:', studentName);
            
            // Set the global variable that the external report system expects
            window.currentReportObject10Id = object10Id;
            log('Set global variable currentReportObject10Id:', object10Id);
            
            // Build the API call that we discovered triggers the report
            const filter = {
                "match": "and",
                "rules": [{
                    "field": "field_182",
                    "operator": "is", 
                    "value": [object10Id]
                }]
            };
            
            const filterString = encodeURIComponent(JSON.stringify(filter));
            const url = `${CONFIG.apiBaseUrl}/${CONFIG.reportTriggerUrl}?filters=${filterString}&page=1&rows_per_page=1000`;
            
            log('Making report trigger API call:', url);
            
            const response = await fetch(url, {
                headers: {
                    'X-Knack-Application-Id': Knack.app_id,
                    'Authorization': Knack.getUserToken()
                }
            });
            
            log('Report trigger response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                log('Report trigger successful:', data);
                
                // Navigate to the report view
                const reportHash = `#mygroup-vespa-results2/`;
                log('Navigating to report hash:', reportHash);
                window.location.hash = reportHash;
                
            } else {
                log('Report trigger failed with status:', response.status);
            }
            
        } catch (error) {
            log('Error triggering report:', error);
        }
    }

    // Global function for report button clicks
    window.dynamicTableReportHandler = function(object10Id, studentName) {
        log('Report button clicked for:', studentName, 'Object10 ID:', object10Id);
        triggerReport(object10Id, studentName);
    };

    async function replaceTableContent(container, students) {
        try {
            log('Replacing table content for', students.length, 'students');
            
            const tableHTML = createTableHTML(students);
            container.innerHTML = tableHTML;
            
            log('✅ Table content replaced successfully!');
            
        } catch (error) {
            log('Error replacing table content:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #d32f2f;">
                    <h3>Error Loading Students</h3>
                    <p>There was an error loading the student data. Please refresh the page and try again.</p>
                </div>
            `;
        }
    }

    // Main initialization function
    async function initializeDynamicTable() {
        try {
            log('🎯 Initializing Dynamic Staff Table for Scene 1014...');
            
            // Wait for the target container to be available
            log('Waiting for container:', CONFIG.targetContainer);
            const container = await waitForElement(CONFIG.targetContainer);
            log('Found container:', container);
            
            // Get user information and role
            const userInfo = getUserInfo();
            if (!userInfo) {
                throw new Error('Could not get user information');
            }
            
            log('User info obtained:', userInfo);
            
            // Show loading message
            container.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div style="display: inline-block; padding: 15px 30px; background: #f0f8ff; border: 1px solid #2f8dcb; border-radius: 6px;">
                        <strong style="color: #2f8dcb;">Loading Students Reports. This might take a moment...</strong>
                    </div>
                </div>
            `;
            
            // Fetch students based on role
            const studentRecords = await fetchStudentsForRole(userInfo);
            log('Fetched student records:', studentRecords);
            
            // Extract and process student data
            const students = extractStudentData(studentRecords);
            log('Processed students:', students);
            
            // Replace the table content
            await replaceTableContent(container, students);
            
            log('✅ Dynamic Staff Table initialized successfully!');
            
        } catch (error) {
            log('❌ Error initializing Dynamic Staff Table:', error);
            
            // Try to show error in container if possible
            const container = document.querySelector(CONFIG.targetContainer);
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #d32f2f;">
                        <h3>Initialization Error</h3>
                        <p>Could not initialize the dynamic staff table: ${error.message}</p>
                        <p><small>Please check the console for more details.</small></p>
                    </div>
                `;
            }
        }
    }

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDynamicTable);
    } else {
        // DOM is already ready
        initializeDynamicTable();
    }

    log('Dynamic Staff Table script loaded');

})();
