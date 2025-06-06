/*
 * VESPA Report Bulk Printing Application
 * Loaded by WorkingBridge.js
 * Target: scene_1224, view_3060
 */

// Ensure the global namespace for initializers if it doesn't exist
window.VESPA_APPS = window.VESPA_APPS || {};

function initializeBulkPrintApp() {
    const config = window.BULK_PRINT_CONFIG;
    if (!config) {
        console.error('[BulkPrintApp] Configuration not found. Exiting.');
        return;
    }

    const {
        knackAppId,
        knackApiKey,
        debugMode,
        elementSelector,
        objectKeys
    } = config;

    // Field mappings for Object_10 (VESPA Results)
    const FIELD_KEYS = {
        studentEmail: 'field_197_raw.email',
        studentFirstName: 'field_187_raw.first',
        studentLastName: 'field_187_raw.last',
        studentLevel: 'field_568_raw',
        currentMCycle: 'field_146_raw',
        establishmentConnection: 'field_133',
        // Current cycle scores (fields 147-152)
        vision: 'field_147',
        effort: 'field_148',
        systems: 'field_149',
        practice: 'field_150',
        attitude: 'field_151',
        overall: 'field_152',
        // Report Response Comments
        rrc1: 'field_2302',
        rrc2: 'field_2303',
        rrc3: 'field_2304',
        // Goals
        goal1: 'field_2499',
        goal2: 'field_2493',
        goal3: 'field_2494'
    };

    // Cycle-specific VESPA score fields
    const VESPA_CYCLE_FIELDS = {
        'C1': {
            vision: 'field_155', effort: 'field_156', systems: 'field_157',
            practice: 'field_158', attitude: 'field_159', overall: 'field_160'
        },
        'C2': {
            vision: 'field_161', effort: 'field_162', systems: 'field_163',
            practice: 'field_164', attitude: 'field_165', overall: 'field_166'
        },
        'C3': {
            vision: 'field_167', effort: 'field_168', systems: 'field_169',
            practice: 'field_170', attitude: 'field_171', overall: 'field_172'
        }
    };

    // VESPA element configurations with colors and coaching questions
    const VESPA_ELEMENTS = {
        vision: {
            name: 'VISION',
            color: '#ff8f00',
            description: 'At the moment you may be the type of person who finds thinking about the future challenging or uncomfortable. It might feel much easier to just ignore it. You might have very little idea what you\'d like to do when you leave education and you are probably undecided about university, employment or other options. It\'s unlikely that you set yourself goals and when you do you often find that you don\'t stick to them. You may feel you\'re not in control of your life, and have yet to work out what path you will follow. Are you yet clear on what you don\'t want your life to be like? Could you arrange a conversation with your tutor or careers advisor?',
            questions: [
                'If you could only do one subject in lots of detail, which would it be and why?',
                'Describe a lesson you have enjoyed recently.',
                'What obstacles do you think you may have to overcome while studying at this level?',
                'Activities: 21st Birthday, Perfect Day'
            ]
        },
        effort: {
            name: 'EFFORT',
            color: '#86b4f0',
            description: 'It\'s very likely you are currently not achieving what you could be and deep down you know that you are not working hard enough to achieve your goals. Most of the time you do close to the minimum amount of work required to complete a task. This approach may have become a habit over some time. You may feel bored and distracted when you study, and you prefer to avoid engaging in classes or study periods. It\'s unlikely you spend much time with very hard-working students.',
            questions: [
                'How many hours have you studied for this week outside the classroom? How many hours do you think you should be studying?',
                'Are you working as hard as you did last year or earlier in your school career?',
                'For your last homework, was your objective... to avoid doing it for as long as possible... to complete it as quickly as possible... or to get the best possible grade?',
                'Activities: 1-10 Scale, 10 Minute Rule'
            ]
        },
        systems: {
            name: 'SYSTEMS',
            color: '#72cb44',
            description: 'Your systems score suggests that at the moment you prefer not to organise your time, and as a result you often miss deadlines. You probably don\'t complete your homework on time and need extensions to get work done. You may be constantly trying to catch up and feel stressed and under pressure. Your notes and files are likely to be disorganised, and you have crucial handouts missing. There is a proven relationship between success and a person\'s ability to create systems to organise themselves. Have you ever used a planner or diary to organise your time? Who could help you get your notes in order?',
            questions: [
                'Would you rather spend 1 hour working in class or 1 hr working at home? Why?',
                'How do you know what work is currently outstanding?',
                'How would change one aspect about the way you work that would it be and how would you change it?',
                'Activities: Energy Line, Breakfast Club'
            ]
        },
        practice: {
            name: 'PRACTICE',
            color: '#7f31a4',
            description: 'You are able to revise using familiar techniques, perhaps ones you\'ve used a lot before.Often your revision is passive and you may feel bored. You don\'t revise in the most efficient way; you may study the topics you\'re already familiar with and rarely push yourself to revise things that you are not sure of. You avoid high-stakes practice under timed conditions, even though you might, deep-down, know this would be good for you. How can you make sure your revision or practice is more targeted? What could encourage you to push yourself outside your comfort zone more?',
            questions: [
                'Choose a subject. If you had one hour, and no homework, what would you do to help your learning in it?',
                'Do you do past paper questions? Describe the last time you tried something under timed conditions.',
                'What\'s the hardest exam question you expect to face? What are you doing about it?',
                'Activities: Leitner Box, 2 Slow 1 Fast'
            ]
        },
        attitude: {
            name: 'ATTITUDE',
            color: '#d56c91',
            description: 'Currently you may tend to feel quite anxious on the build-up to assessments or exams. You might well feel angry at your situation and with yourself. It\'s likely that you will often doubt your own ability and won\'t feel very positive, even if you have revised. A disappointing result in assessments is likely to knock you further back. You are likely to feel that intelligence is something that is fixed and that no matter how hard you work you can\'t improve. As a result, you rarely push yourself. Have you considered sharing your situation with a teacher or tutor?',
            questions: [
                'When something goes wrong what do you do?',
                'Think of something you\'re good at?',
                'Tell me how you got good at it?',
                'Activities: Vampire Test, There and Back'
            ]
        }
    };

    // Role configurations (same as coach summary)
    const ROLE_CONFIGS = {
        'object_7': { 
            roleNameForLog: 'Tutor',
            roleObjectKey: 'object_7', 
            emailFieldKey: 'field_96', 
            object10ConnectionField: 'field_145' 
        },
        'object_5': { 
            roleNameForLog: 'Staff Admin',
            roleObjectKey: 'object_5', 
            emailFieldKey: 'field_86', 
            object10ConnectionField: 'field_439' 
        },
        'object_25': { 
            roleNameForLog: 'Head of Year/Dept',
            roleObjectKey: 'object_25', 
            emailFieldKey: 'field_553', 
            object10ConnectionField: 'field_429' 
        },
        'object_78': { 
            roleNameForLog: 'Subject Teacher',
            roleObjectKey: 'object_78', 
            emailFieldKey: 'field_1879',
            object10ConnectionField: 'field_2191' 
        }
    };

    if (debugMode) {
        console.log('[BulkPrintApp] Initializing with config:', config);
    }

    // Create modal instead of using the target element directly
    let modalContainer = document.getElementById('bulkPrintModal');
    if (!modalContainer) {
        // Create modal structure
        modalContainer = document.createElement('div');
        modalContainer.id = 'bulkPrintModal';
        modalContainer.className = 'bulk-print-modal';
        modalContainer.innerHTML = `
            <div class="bulk-print-modal-overlay"></div>
            <div class="bulk-print-modal-content">
                <div class="bulk-print-modal-header">
                    <h2>VESPA Reports - Bulk Print</h2>
                    <button class="bulk-print-modal-close" onclick="document.getElementById('bulkPrintModal').style.display='none';">&times;</button>
                </div>
                <div class="bulk-print-modal-body" id="bulkPrintModalBody">
                    <!-- Content will be inserted here -->
                </div>
            </div>
        `;
        document.body.appendChild(modalContainer);
    }
    
    // Show the modal
    modalContainer.style.display = 'block';
    
    // Use the modal body as our target element
    const targetElement = document.getElementById('bulkPrintModalBody');
    if (!targetElement) {
        console.error(`[BulkPrintApp] Modal body element not found. Exiting.`);
        return;
    }

    // API request helper
    async function makeKnackApiRequest(urlPath, filters = null, page = 1, rowsPerPage = 100) {
        const headers = {
            'X-Knack-Application-Id': knackAppId,
            'X-Knack-REST-API-Key': knackApiKey,
            'Content-Type': 'application/json'
        };
        let fullUrl = `https://api.knack.com/v1/${urlPath}`;
        const params = new URLSearchParams();
        params.append('rows_per_page', rowsPerPage);
        params.append('page', page);

        if (filters) {
            params.append('filters', encodeURIComponent(JSON.stringify(filters)));
        }
        fullUrl += `?${params.toString()}`;

        if (debugMode) {
            console.log(`[BulkPrintApp] API Request URL: ${fullUrl}`);
            if (filters) {
                console.log(`[BulkPrintApp] Decoded filters:`, JSON.stringify(filters, null, 2));
            }
        }

        const response = await fetch(fullUrl, { headers });
        if (!response.ok) {
            const errorData = await response.text();
            console.error('[BulkPrintApp] Knack API Error:', response.status, errorData);
            throw new Error(`Knack API request failed: ${response.status} - ${urlPath}`);
        }
        return response.json();
    }

    // Get role record IDs for the logged-in user
    async function getRoleRecordIds(userEmail, userRoles) {
        const roleRecordIdsMap = {}; 

        for (const roleObjectKeyFromKnack of userRoles) {
            const roleConfig = ROLE_CONFIGS[roleObjectKeyFromKnack];
            if (roleConfig) {
                const roleNameToLog = roleConfig.roleNameForLog || roleObjectKeyFromKnack;
                if (debugMode) console.log(`[BulkPrintApp] Checking role config for: ${roleNameToLog}`);
                try {
                    const roleRecordData = await makeKnackApiRequest(
                        `objects/${roleConfig.roleObjectKey}/records`,
                        { match: 'and', rules: [{ field: roleConfig.emailFieldKey, operator: 'is', value: userEmail }] }
                    );
                    if (roleRecordData.records && roleRecordData.records.length > 0) {
                        const recordId = roleRecordData.records[0].id;
                        if (debugMode) console.log(`[BulkPrintApp] Found ${roleNameToLog} record ID: ${recordId}`);
                        
                        if (!roleRecordIdsMap[roleConfig.object10ConnectionField]) {
                            roleRecordIdsMap[roleConfig.object10ConnectionField] = [];
                        }
                        roleRecordIdsMap[roleConfig.object10ConnectionField].push(recordId);
                    }
                } catch (error) {
                    console.error(`[BulkPrintApp] Error fetching record ID for role ${roleNameToLog}:`, error);
                }
            }
        }
        return roleRecordIdsMap;
    }

    // Fetch all connected students
    async function fetchAllConnectedStudents(roleRecordIdsMap) {
        if (Object.keys(roleRecordIdsMap).length === 0) {
            if (debugMode) console.log("[BulkPrintApp] No role record IDs found.");
            return [];
        }

        const studentApiRules = [];
        for (const connectionField in roleRecordIdsMap) {
            const idsForThisConnection = roleRecordIdsMap[connectionField];
            idsForThisConnection.forEach(id => {
                // Use 'is' operator like the coach summary does
                studentApiRules.push({ 
                    field: connectionField, 
                    operator: 'is', 
                    value: id 
                });
                
                if (debugMode) {
                    console.log(`[BulkPrintApp] Added filter rule: ${connectionField} is ${id}`);
                }
            });
        }

        if (studentApiRules.length === 0) {
            return [];
        }

        const filters = { match: 'or', rules: studentApiRules };
        
        if (debugMode) {
            console.log('[BulkPrintApp] Filter being sent to API:', JSON.stringify(filters, null, 2));
            console.log('[BulkPrintApp] Number of filter rules:', studentApiRules.length);
        }
        
        let allStudents = [];
        let page = 1;
        let hasMore = true;
        const maxPages = 10; // Safety limit

        while (hasMore && page <= maxPages) {
            const studentData = await makeKnackApiRequest(`objects/${objectKeys.vespaResults}/records`, filters, page);
            
            if (debugMode) {
                console.log(`[BulkPrintApp] Page ${page}: Found ${studentData.records?.length || 0} records. Total pages: ${studentData.total_pages}, Current page: ${studentData.current_page}`);
            }
            
            // If no records returned, stop pagination
            if (!studentData.records || studentData.records.length === 0) {
                if (debugMode) console.log(`[BulkPrintApp] No records on page ${page}, stopping pagination`);
                break;
            }
            
            allStudents = allStudents.concat(studentData.records);
            hasMore = studentData.current_page < studentData.total_pages;
            page++;
        }
        
        if (page > maxPages && hasMore) {
            console.warn(`[BulkPrintApp] Reached maximum page limit (${maxPages}), stopping pagination`);
        }

        if (debugMode) {
            console.log(`[BulkPrintApp] Total students fetched: ${allStudents.length}`);
            
            // Check if we're getting too many students (indicating filter failure)
            if (allStudents.length > 100) {
                console.warn(`[BulkPrintApp] WARNING: Fetched ${allStudents.length} students. This seems too high for a single tutor. The filter might not be working correctly.`);
                
                // Sample check: Look at first few students to see if they have the expected tutor connection
                const sampleSize = Math.min(5, allStudents.length);
                console.log(`[BulkPrintApp] Checking first ${sampleSize} students for tutor connection...`);
                
                for (let i = 0; i < sampleSize; i++) {
                    const student = allStudents[i];
                    const tutorConnection = student.field_145 || student.field_145_raw;
                    console.log(`[BulkPrintApp] Student ${i + 1}: ${student.field_187_raw?.first} ${student.field_187_raw?.last}, Tutor connection: ${JSON.stringify(tutorConnection)}`);
                }
            }
        }
        
        return allStudents;
    }

    // Fetch school logo
    async function fetchSchoolLogo(establishmentId) {
        try {
            const establishmentData = await makeKnackApiRequest(
                `objects/object_2/records/${establishmentId}`
            );
            
            if (establishmentData) {
                // Try field_3206 first (URL), then field_61 (image file)
                return establishmentData.field_3206 || 
                       (establishmentData.field_61_raw && establishmentData.field_61_raw.url) || 
                       null;
            }
        } catch (error) {
            console.error('[BulkPrintApp] Error fetching school logo:', error);
        }
        return null;
    }

    // Generate report HTML for a single student
    function generateStudentReport(student, schoolLogoUrl, reportDate) {
        const getField = (fieldKey, defaultValue = '') => student[fieldKey] || defaultValue;
        
        const firstName = getField(FIELD_KEYS.studentFirstName, '');
        const lastName = getField(FIELD_KEYS.studentLastName, '');
        const fullName = (firstName + ' ' + lastName).trim() || 'N/A';
        
        const currentCycle = String(getField(FIELD_KEYS.currentMCycle, 'C1'));
        const cycleNumber = currentCycle.replace('C', '');
        
        // Get the appropriate score fields based on cycle
        let scoreFields = VESPA_CYCLE_FIELDS[currentCycle] || VESPA_CYCLE_FIELDS['C1'];
        
        // Get scores
        const scores = {
            vision: getField(scoreFields.vision, '0'),
            effort: getField(scoreFields.effort, '0'),
            systems: getField(scoreFields.systems, '0'),
            practice: getField(scoreFields.practice, '0'),
            attitude: getField(scoreFields.attitude, '0')
        };

        // Get comments and goals
        const studentComment = getField(FIELD_KEYS.rrc1, '') + ' ' + 
                             getField(FIELD_KEYS.rrc2, '') + ' ' + 
                             getField(FIELD_KEYS.rrc3, '');
        
        const actionPlan = getField(FIELD_KEYS.goal1, '') + ' ' + 
                          getField(FIELD_KEYS.goal2, '') + ' ' + 
                          getField(FIELD_KEYS.goal3, '');

        // Generate VESPA elements HTML
        let vespaElementsHtml = '';
        for (const [key, element] of Object.entries(VESPA_ELEMENTS)) {
            const score = scores[key];
            vespaElementsHtml += `
                <div class="vespa-element">
                    <div class="vespa-score-box" style="background-color: ${element.color}">
                        <div class="vespa-name">${element.name}</div>
                        <div class="vespa-score-label">Score</div>
                        <div class="vespa-score-value">${score}</div>
                    </div>
                    <div class="vespa-content">
                        <div class="vespa-description">${element.description}</div>
                        <div class="coaching-questions">
                            <strong>COACHING QUESTIONS:</strong><br>
                            ${element.questions.map(q => `<em>${q}</em>`).join('<br>')}
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="vespa-report-page">
                <div class="report-header">
                    ${schoolLogoUrl ? `<img src="${schoolLogoUrl}" alt="School Logo" class="school-logo">` : ''}
                    <h1 class="report-title">VESPA COACHING REPORT</h1>
                    <div class="school-name">${getField('field_133_raw.identifier', 'School Name')}</div>
                </div>
                
                <div class="student-info-grid">
                    <div class="info-box">
                        <strong>STUDENT:</strong> ${fullName}
                    </div>
                    <div class="info-box">
                        <strong>GROUP:</strong> ${getField(FIELD_KEYS.studentLevel, 'N/A')}
                    </div>
                    <div class="info-box">
                        <strong>DATE:</strong> ${reportDate}
                    </div>
                    <div class="info-box">
                        <strong>CYCLE:</strong> ${cycleNumber}
                    </div>
                </div>

                <div class="report-content">
                    <div class="vespa-section">
                        <div class="section-header">
                            <span class="vespa-score-header">VESPA SCORE:</span>
                            <span class="comments-header">COMMENTS:</span>
                            <span class="questions-header">COACHING QUESTIONS:</span>
                        </div>
                        ${vespaElementsHtml}
                    </div>

                    <div class="student-response-section">
                        <h3>STUDENT COMMENT / STUDY GOAL:</h3>
                        <div class="response-box">
                            <div class="response-label">COMMENT:</div>
                            <div class="response-content">${studentComment.trim() || 'No comment provided'}</div>
                        </div>
                        <div class="response-box">
                            <div class="response-label">ACTION PLAN:</div>
                            <div class="response-content">${actionPlan.trim() || 'No action plan provided'}</div>
                        </div>
                        <div class="review-date">
                            Action Plan Review Date: _________________
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Add print styles
    function addPrintStyles() {
        let printStyleSheet = document.getElementById('bulkPrintStyles');
        if (printStyleSheet) printStyleSheet.remove();
        
        printStyleSheet = document.createElement('style');
        printStyleSheet.id = 'bulkPrintStyles';
        document.head.appendChild(printStyleSheet);
        
        printStyleSheet.innerHTML = `
            /* Modal styles */
            .bulk-print-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
            }
            
            .bulk-print-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
            }
            
            .bulk-print-modal-content {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90%;
                max-width: 1200px;
                height: 90%;
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                display: flex;
                flex-direction: column;
            }
            
            .bulk-print-modal-header {
                padding: 20px;
                border-bottom: 1px solid #e0e0e0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .bulk-print-modal-header h2 {
                margin: 0;
                color: #333;
            }
            
            .bulk-print-modal-close {
                background: none;
                border: none;
                font-size: 28px;
                cursor: pointer;
                color: #999;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .bulk-print-modal-close:hover {
                color: #333;
            }
            
            .bulk-print-modal-body {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }
            
            /* Screen styles */
            .bulk-print-container {
                padding: 20px;
                background-color: #f5f5f5;
            }
            
            .print-preview-info {
                background-color: #fff;
                padding: 15px;
                margin-bottom: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .loading-message {
                text-align: center;
                padding: 40px;
                font-size: 18px;
                color: #666;
            }
            
            /* Report styles */
            .vespa-report-page {
                background-color: white;
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto 20px;
                padding: 15mm;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                box-sizing: border-box;
                font-family: Arial, sans-serif;
                font-size: 10pt;
                line-height: 1.4;
            }
            
            .report-header {
                text-align: center;
                margin-bottom: 20px;
                position: relative;
            }
            
            .school-logo {
                position: absolute;
                left: 0;
                top: 0;
                width: 80px;
                height: auto;
            }
            
            .report-title {
                color: #4ECDC4;
                font-size: 24pt;
                margin: 0;
                font-weight: normal;
            }
            
            .school-name {
                font-size: 14pt;
                margin-top: 5px;
            }
            
            .student-info-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .info-box {
                border: 2px solid #333;
                padding: 8px;
                text-align: center;
                font-size: 9pt;
            }
            
            .section-header {
                display: grid;
                grid-template-columns: 120px 1fr 1fr;
                font-weight: bold;
                margin-bottom: 10px;
                font-size: 9pt;
                color: #4ECDC4;
            }
            
            .vespa-element {
                display: grid;
                grid-template-columns: 120px 1fr;
                margin-bottom: 15px;
                min-height: 100px;
            }
            
            .vespa-score-box {
                color: white;
                padding: 10px;
                text-align: center;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }
            
            .vespa-name {
                font-weight: bold;
                font-size: 11pt;
                margin-bottom: 5px;
            }
            
            .vespa-score-label {
                font-size: 8pt;
                margin-bottom: 3px;
            }
            
            .vespa-score-value {
                font-size: 36pt;
                font-weight: bold;
                line-height: 1;
            }
            
            .vespa-content {
                padding: 10px 15px;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                font-size: 8pt;
                line-height: 1.3;
            }
            
            .vespa-description {
                text-align: justify;
            }
            
            .coaching-questions {
                font-size: 8pt;
            }
            
            .coaching-questions em {
                display: block;
                margin: 3px 0;
                font-style: italic;
            }
            
            .student-response-section {
                margin-top: 20px;
                border-top: 2px solid #4ECDC4;
                padding-top: 15px;
            }
            
            .student-response-section h3 {
                color: #4ECDC4;
                font-size: 11pt;
                margin-bottom: 10px;
            }
            
            .response-box {
                border: 1px solid #ccc;
                margin-bottom: 10px;
                min-height: 60px;
            }
            
            .response-label {
                background-color: #f0f0f0;
                padding: 5px 10px;
                font-weight: bold;
                font-size: 9pt;
            }
            
            .response-content {
                padding: 10px;
                font-size: 9pt;
                line-height: 1.4;
            }
            
            .review-date {
                text-align: right;
                font-style: italic;
                font-size: 9pt;
                margin-top: 10px;
            }
            
            /* Print styles */
            @media print {
                body * {
                    visibility: hidden;
                }
                
                .bulk-print-modal {
                    display: block !important;
                    position: static !important;
                    width: auto !important;
                    height: auto !important;
                }
                
                .bulk-print-modal-overlay,
                .bulk-print-modal-header {
                    display: none !important;
                }
                
                .bulk-print-modal-content {
                    position: static !important;
                    transform: none !important;
                    width: 100% !important;
                    max-width: none !important;
                    height: auto !important;
                    box-shadow: none !important;
                    border-radius: 0 !important;
                }
                
                .bulk-print-modal-body {
                    padding: 0 !important;
                    overflow: visible !important;
                }
                
                .bulk-print-container,
                .bulk-print-container * {
                    visibility: visible;
                }
                
                .bulk-print-container {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    background-color: white;
                    padding: 0;
                }
                
                .print-preview-info {
                    display: none !important;
                }
                
                .vespa-report-page {
                    width: 100%;
                    margin: 0;
                    padding: 15mm;
                    box-shadow: none;
                    page-break-after: always;
                    page-break-inside: avoid;
                }
                
                .vespa-report-page:last-child {
                    page-break-after: auto;
                }
                
                /* Ensure colors print */
                .vespa-score-box {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                /* Adjust font sizes for print */
                .report-title {
                    font-size: 20pt;
                }
                
                .vespa-score-value {
                    font-size: 30pt;
                }
            }
        `;
    }

    // Main execution
    async function main() {
        if (debugMode) console.log('[BulkPrintApp] Starting bulk print generation...');
        
        // Clear existing content and show loading
        targetElement.innerHTML = '<div class="bulk-print-container"><div class="loading-message">Generating reports... Please wait...</div></div>';
        
        // Add print styles
        addPrintStyles();
        
        try {
            // Get logged-in user info
            const loggedInUser = Knack.getUserAttributes();
            if (!loggedInUser || !loggedInUser.email) {
                throw new Error('Could not identify logged-in user');
            }
            
            const userEmail = loggedInUser.email;
            const userRoles = Knack.getUserRoles() || [];
            
            if (debugMode) {
                console.log('[BulkPrintApp] User Email:', userEmail);
                console.log('[BulkPrintApp] User Roles:', userRoles);
            }
            
            // Get role record IDs
            const roleRecordIdsMap = await getRoleRecordIds(userEmail, userRoles);
            
            // Fetch all connected students
            const students = await fetchAllConnectedStudents(roleRecordIdsMap);
            
            if (debugMode) console.log(`[BulkPrintApp] Found ${students.length} students`);
            
            if (students.length === 0) {
                targetElement.innerHTML = '<div class="bulk-print-container"><div class="loading-message">No students found connected to your account.</div></div>';
                return;
            }
            
            // Get current date
            const reportDate = new Date().toLocaleDateString('en-GB');
            
            // Generate container HTML
            let containerHtml = `
                <div class="bulk-print-container">
                    <div class="print-preview-info">
                        <h2>VESPA Report Bulk Print Preview</h2>
                        <p>Found ${students.length} student reports. Click the browser's print button or press Ctrl+P (Cmd+P on Mac) to print all reports.</p>
                        <p>Each report will print on a separate page.</p>
                    </div>
                    <div class="reports-container">
            `;
            
            // Process each student
            for (const student of students) {
                let schoolLogoUrl = null;
                
                // Try to get school logo if establishment connection exists
                if (student[FIELD_KEYS.establishmentConnection]) {
                    let establishmentId = null;
                    
                    // Handle different formats of connection field data
                    if (Array.isArray(student[FIELD_KEYS.establishmentConnection]) && student[FIELD_KEYS.establishmentConnection][0]) {
                        establishmentId = student[FIELD_KEYS.establishmentConnection][0].id;
                    } else if (typeof student[FIELD_KEYS.establishmentConnection] === 'string') {
                        establishmentId = student[FIELD_KEYS.establishmentConnection];
                    } else if (student[FIELD_KEYS.establishmentConnection].id) {
                        establishmentId = student[FIELD_KEYS.establishmentConnection].id;
                    }
                    
                    if (establishmentId) {
                        schoolLogoUrl = await fetchSchoolLogo(establishmentId);
                    }
                }
                
                // Generate report HTML
                containerHtml += generateStudentReport(student, schoolLogoUrl, reportDate);
            }
            
            containerHtml += '</div></div>';
            
            // Update the target element
            targetElement.innerHTML = containerHtml;
            
            // Auto-trigger print dialog after a short delay
            setTimeout(() => {
                window.print();
                
                // Close modal after print dialog is closed
                // Note: There's no reliable cross-browser way to detect print cancel,
                // but we can add a close button and let users close it manually
                setTimeout(() => {
                    // Add a message that printing is complete
                    const printInfo = document.querySelector('.print-preview-info');
                    if (printInfo) {
                        printInfo.innerHTML += '<p style="margin-top: 20px; font-weight: bold;">Print dialog closed. You can close this window using the X button above.</p>';
                    }
                }, 1000);
            }, 1000);
            
        } catch (error) {
            console.error('[BulkPrintApp] Error generating reports:', error);
            targetElement.innerHTML = `
                <div class="bulk-print-container">
                    <div class="loading-message" style="color: red;">
                        Error generating reports: ${error.message}
                    </div>
                </div>
            `;
        }
    }

    // Initialize the app
    main();
}

// Register the initializer
window.initializeBulkPrintApp = initializeBulkPrintApp;
