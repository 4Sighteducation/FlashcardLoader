/*
 * Bulk VESPA Report Printing
 * Version: 2g
 * Loaded by WorkingBridge.js as "bulkPrint" app (scene_1227, view_3062)
 * Required global: BULK_PRINT_CONFIG (injected by loader)
 *
 * Flow:
 *  1. Resolve logged-in Staff-Admin record ID(s).
 *  2. Fetch connected Object_10 student records (field_439 links).
 *  3. Fetch ALL Object_33 coaching-comment templates once.
 *  4. Build one-page HTML report per student (A4 portrait, fits single page).
 *  5. Inject printable DOM and call window.print().
 */
(function () {
    // Ensure single attachment
    if (window.VESPA_BULK_PRINT_INITIALISED) return;
    window.VESPA_BULK_PRINT_INITIALISED = true;

    // Helper – safe console
    const log = (...m) => console.log('[BulkPrint]', ...m);
    const err = (...m) => console.error('[BulkPrint]', ...m);

    // --- CONFIG ---
    // Don't read config here - it's not set yet!
    let cfg = {};

    const FIELD_MAP = {
        // Object_10
        email: 'field_197_raw.email',
        first: 'field_187_raw.first',
        last: 'field_187_raw.last',
        group: 'field_223',
        cycle: 'field_146_raw',
        dateCompleted: 'field_855', // dd/mm/YYYY
        scores: {
            vision: 'field_147',
            effort: 'field_148',
            systems: 'field_149',
            practice: 'field_150',
            attitude: 'field_151',
            overall: 'field_152'
        },
        reflections: {
            C1: 'field_2302',
            C2: 'field_2303',
            C3: 'field_2304'
        },
        goals: {
            C1: 'field_2499',
            C2: 'field_2493',
            C3: 'field_2494'
        }
    };
    const COMPONENT_COLORS = {
        vision: '#ff8f00',
        effort: '#86b4f0',
        systems: '#72cb44',
        practice: '#7f31a4',
        attitude: '#d56c91'
    };

    const COMPONENT_LABELS = {
        vision: 'VISION',
        effort: 'EFFORT',
        systems: 'SYSTEMS',
        practice: 'PRACTICE',
        attitude: 'ATTITUDE'
    };

    // Map cycle codes to their historical VESPA score field IDs
    const SCORE_CYCLE_MAP = {
        C1: { vision: 'field_155', effort: 'field_156', systems: 'field_157', practice: 'field_158', attitude: 'field_159', overall: 'field_160' },
        C2: { vision: 'field_161', effort: 'field_162', systems: 'field_163', practice: 'field_164', attitude: 'field_165', overall: 'field_166' },
        C3: { vision: 'field_167', effort: 'field_168', systems: 'field_169', practice: 'field_170', attitude: 'field_171', overall: 'field_172' }
    };

    function addPrintStyles() {
        if (document.getElementById('vespaBulkPrintStyles')) return;
        // Updated to version 2p for better A4 portrait styling and modal support
        const cssUrl = 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/report/report_printing2x.css';
        const link = document.createElement('link');
        link.id = 'vespaBulkPrintStyles';
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = cssUrl;
        document.head.appendChild(link);
        log('Print styles added.');
    }

    function removePrintStyles() {
        $('#vespaBulkPrintStyles').remove();
        log('Print styles removed.');
    }

    // Util: build Knack REST request
    async function knackRequest(path, params = {}) {
        const headers = {
            'X-Knack-Application-Id': cfg.knackAppId,
            'X-Knack-REST-API-Key': cfg.knackApiKey,
            'Content-Type': 'application/json'
        };
        const qs = new URLSearchParams({ rows_per_page: params.rows || 1000, page: params.page || 1 });
        if (params.filters) qs.append('filters', JSON.stringify(params.filters));
        const url = `https://api.knack.com/v1/${path}?${qs.toString()}`;
        
        log('Making API request to:', url);
        log('With headers:', headers);
        
        const res = await fetch(url, { headers });
        if (!res.ok) {
            const errorText = await res.text();
            err('API request failed:', { status: res.status, statusText: res.statusText, body: errorText });
            throw new Error(`${res.status} ${res.statusText}: ${errorText}`);
        }
        const data = await res.json();
        log('API response received:', data);
        return data;
    }

    // Get user role from Knack - fetch from Object_3 field_73
    async function getUserRole() {
        const user = Knack.getUserAttributes();
        log('Full user object:', user);
        
        // Initialize role flags
        let isStaffAdmin = false;
        let isTutor = false;
        let isHeadOfYear = false;
        let isSubjectTeacher = false;
        let roleNames = [];
        let roles = '';
        
        try {
            // Fetch the user's Object_3 record to get their role from field_73
            if (user?.id) {
                const userRecord = await knackRequest(`objects/object_3/records/${user.id}`);
                const roleField = userRecord?.field_73 || userRecord?.field_73_raw || '';
                
                log('User role from field_73:', roleField);
                
                // Handle if it's an array or string
                if (Array.isArray(roleField)) {
                    roles = roleField.join(',');
                } else if (typeof roleField === 'string') {
                    roles = roleField;
                }
                
                // Check for specific roles (case-insensitive)
                const rolesLower = roles.toLowerCase();
                isStaffAdmin = rolesLower.includes('staff admin');
                isTutor = rolesLower.includes('tutor');
                isHeadOfYear = rolesLower.includes('head of year');
                isSubjectTeacher = rolesLower.includes('subject teacher');
                
                // Build role names array
                if (isStaffAdmin) roleNames.push('Staff Admin');
                if (isTutor) roleNames.push('Tutor');
                if (isHeadOfYear) roleNames.push('Head of Year');
                if (isSubjectTeacher) roleNames.push('Subject Teacher');
            }
        } catch (e) {
            log('Error fetching user role from Object_3:', e);
            
            // Fallback: check if roles contains object IDs
            if (user?.roles) {
                const roleString = Array.isArray(user.roles) ? user.roles.join(',') : user.roles.toString();
                if (roleString.includes('object_5')) {
                    isStaffAdmin = true;
                    roleNames.push('Staff Admin');
                }
                if (roleString.includes('object_7')) {
                    isTutor = true;
                    roleNames.push('Tutor');
                }
                roles = roleNames.join(',');
            }
        }
        
        log('User roles:', roles);
        
        // If user has Staff Admin role, always treat them as Staff Admin
        const primaryRole = isStaffAdmin ? 'Staff Admin' : 
                           isTutor ? 'Tutor' :
                           isHeadOfYear ? 'Head of Year' :
                           isSubjectTeacher ? 'Subject Teacher' : null;
        
        return {
            roles,
            primaryRole,
            isStaffAdmin,
            isTutor,
            isHeadOfYear,
            isSubjectTeacher,
            hasAccess: isStaffAdmin || isTutor || isHeadOfYear || isSubjectTeacher
        };
    }

    // Step 1: Staff-Admin record IDs (object_5 field_86 = email)
    async function getStaffAdminRecordIds(email) {
        const data = await knackRequest('objects/object_5/records', {
            filters: { match: 'and', rules: [{ field: 'field_86', operator: 'is', value: email }] }, rows: 50
        });
        const ids = (data.records || []).map(r => r.id);
        // In practice there should be exactly one Staff-Admin record per user, but
        // the database currently contains historical duplicates.  Using the first
        // ID prevents us from matching students from other establishments that
        // happen to point at one of the duplicate records.
        return ids.length ? [ids[0]] : [];
    }

    // Step 2: Fetch students (with limit and filters)
    async function fetchStudents(staffIds, filters, maxStudents = 100) {
        const userRole = await getUserRole();
        
        // For non-admin users, we need to fetch students differently
        if (!userRole.isStaffAdmin && (userRole.isTutor || userRole.isHeadOfYear || userRole.isSubjectTeacher)) {
            return fetchStudentsForNonAdmin(filters, maxStudents);
        }
        
        if (!staffIds.length) return [];

        /*
         * --------------------------------------------------
         * 1.  STAFF-ADMIN FILTER (field_439)
         * --------------------------------------------------
         * For connection fields the Knack REST API actually accepts the normal
         *   operator: "is"  (with a Record ID) – provided we don't wrap it in
         *   an unnecessary { match:"or" } block when there is only one ID.
         */
        let staffRules;
        if (staffIds.length === 1) {
            staffRules = [{ field: 'field_439', operator: 'is', value: staffIds[0] }];
        } else {
            staffRules = [{ match: 'or', rules: staffIds.map(id => ({ field: 'field_439', operator: 'is', value: id })) }];
        }

        /*
         * --------------------------------------------------
         * 2.  ESTABLISHMENT FILTER (field_133)
         * --------------------------------------------------
         * Every Object_10 record also carries a connection to its Organisation
         * via field_133.  We fetch the first staff-admin record to discover
         * which organisation they belong to and add an AND condition so that
         * records from other schools never leak in.
         */
        let establishmentRule = null;
        try {
            const staffRec = await knackRequest(`objects/object_5/records/${staffIds[0]}`);
            const estId = staffRec?.record?.field_133_raw || staffRec?.record?.field_133;
            if (estId) {
                establishmentRule = { field: 'field_133', operator: 'is', value: Array.isArray(estId) ? estId[0] : estId };
            }
        } catch (e) {
            err('Could not resolve establishment for staff admin', e);
        }

        /*
         * --------------------------------------------------
         * 3.  USER-SELECTED UI FILTERS  (cycle / year group / etc.)
         * --------------------------------------------------
         */
        const uiFilterRules = [];

        if (filters.cycle) {
            uiFilterRules.push({ field: FIELD_MAP.cycle, operator: 'is', value: filters.cycle });
        }
        if (filters.yearGroup) {
            uiFilterRules.push({ field: 'field_144', operator: 'is', value: filters.yearGroup });
        }
        if (filters.group) {
            uiFilterRules.push({ field: FIELD_MAP.group, operator: 'is', value: filters.group });
        }
        if (filters.tutorId) {
            uiFilterRules.push({ field: 'field_145', operator: 'is', value: filters.tutorId });
        }
        if (filters.subjectTeacherId) {
            uiFilterRules.push({ field: 'field_2191', operator: 'is', value: filters.subjectTeacherId });
        }

        /*
         * --------------------------------------------------
         * 4.  BUILD THE FINAL FILTER OBJECT
         * --------------------------------------------------
         */
        const finalRules = [...staffRules];
        if (establishmentRule) finalRules.push(establishmentRule);
        finalRules.push(...uiFilterRules);

        const finalFilters = { match: 'and', rules: finalRules };

        const allStudents = [];
        let page = 1;
        const rowsPerPage = Math.min(maxStudents, 500);
        
        while (allStudents.length < maxStudents) {
            log(`Fetching page ${page} of students...`);
            const resp = await knackRequest('objects/object_10/records', { 
                filters: finalFilters, 
                page, 
                rows: rowsPerPage 
            });
            
            allStudents.push(...resp.records);
            
            // Stop if we've reached the max or there are no more pages
            if (allStudents.length >= maxStudents || resp.current_page >= resp.total_pages) {
                break;
            }
            
            page++;
        }
        
        // Return only up to maxStudents
        return allStudents.slice(0, maxStudents);
    }

    // Fetch students for non-admin users (Tutors, Head of Year, Subject Teachers)
    async function fetchStudentsForNonAdmin(filters, maxStudents = 100) {
        const user = Knack.getUserAttributes();
        const userRole = await getUserRole();
        
        log('Fetching students for non-admin user:', userRole.primaryRole);
        
        // Build filters based on user role
        const rules = [];
        
        // Get the user's record ID based on their role
        if (userRole.isTutor) {
            // For tutors, find their tutor record
            const tutorData = await knackRequest('objects/object_7/records', {
                filters: { match: 'and', rules: [{ field: 'field_95', operator: 'contains', value: user.name }] },
                rows: 10
            });
            if (tutorData.records && tutorData.records.length > 0) {
                const tutorId = tutorData.records[0].id;
                // Filter by tutor connection (field_145)
                rules.push({ field: 'field_145', operator: 'is', value: tutorId });
            } else {
                log('No tutor record found for user');
                return []; // No access if no tutor record found
            }
        } else if (userRole.isSubjectTeacher) {
            // For subject teachers, we need to find students where they are in field_2191
            // First, get the user's account record to find their ID
            const userAccount = await knackRequest('objects/object_3/records', {
                filters: { match: 'and', rules: [{ field: 'field_66', operator: 'contains', value: user.name }] },
                rows: 10
            });
            
            if (userAccount.records && userAccount.records.length > 0) {
                const teacherId = userAccount.records[0].id;
                // Filter by subject teacher connection (field_2191)
                rules.push({ field: 'field_2191', operator: 'is', value: teacherId });
            } else {
                log('No teacher record found for user');
                return [];
            }
        } else if (userRole.isHeadOfYear) {
            // For Head of Year, they typically see all students in their year groups
            // This would need to be configured based on your specific setup
            // For now, we'll need to determine which year groups they oversee
            // This might require an additional field or configuration
            log('Head of Year access - needs configuration for year group assignment');
            // You may need to add logic here based on how Head of Year assignments work in your system
        }
        
        // Add user-selected filters
        if (filters.cycle) {
            rules.push({ field: 'field_146_raw', operator: 'is', value: filters.cycle });
        }
        if (filters.yearGroup) {
            rules.push({ field: 'field_144', operator: 'is', value: filters.yearGroup });
        }
        if (filters.group) {
            rules.push({ field: 'field_223', operator: 'is', value: filters.group });
        }
        if (filters.searchTerm) {
            // Search by student name (field_187 contains full name)
            rules.push({ field: 'field_187', operator: 'contains', value: filters.searchTerm });
        }
        
        const finalFilters = rules.length > 0 ? { match: 'and', rules } : undefined;
        
        const allStudents = [];
        let page = 1;
        const rowsPerPage = Math.min(maxStudents, 500);
        
        while (allStudents.length < maxStudents) {
            log(`Fetching page ${page} of students for ${userRole.primaryRole}...`);
            const resp = await knackRequest('objects/object_10/records', { 
                filters: finalFilters, 
                page, 
                rows: rowsPerPage 
            });
            
            allStudents.push(...resp.records);
            
            if (allStudents.length >= maxStudents || resp.current_page >= resp.total_pages) {
                break;
            }
            
            page++;
        }
        
        log(`Found ${allStudents.length} students for ${userRole.primaryRole}`);
        return allStudents.slice(0, maxStudents);
    }

    // Step 3: Fetch coaching template records (Object_33)
    async function loadCoachingTemplates() {
        const data = await knackRequest('objects/object_33/records', { rows: 1000 });
        const map = {}; // {component}{bracket} = record
        (data.records || []).forEach(r => {
            const component = (r['field_844_raw'] || '').toLowerCase();
            const bracket = (r['field_842_raw'] || '').toLowerCase();
            if (!map[component]) map[component] = {};
            map[component][bracket] = r;
        });
        return map;
    }

    // Helpers
    function scoreBracket(score) {
        const n = Number(score);
        if (n <= 2) return 'very low';
        if (n <= 5) return 'low';
        if (n <= 7) return 'medium';
        return 'high';
    }

    function getCycleKey(raw) {
        // field_146_raw stores something like "C1" / "C2" / "C3"
        // It can be an array if it's a connection, so we'll handle that.
        if (Array.isArray(raw) && raw.length > 0) {
            return (raw[0].identifier || '').toUpperCase();
        }
        return (raw || '').toString().toUpperCase();
    }

    // Build report HTML per student
    function buildStudentHTML(student, templates) {
        const getField = (obj, path) => {
            if (!path) return '';
            return path.split('.').reduce((o, k) => (o || {})[k], obj);
        };

        // Helper to create an element with text and append it
        const createAndAppend = (parent, tag, text, className) => {
            const el = document.createElement(tag);
            if (text) el.textContent = text;
            if (className) el.className = className;
            parent.appendChild(el);
            return el;
        };

        const fullName = `${getField(student, FIELD_MAP.first) || ''} ${getField(student, FIELD_MAP.last) || ''}`.trim();
        const date = getField(student, FIELD_MAP.dateCompleted) || '';
        const group = getField(student, FIELD_MAP.group) || '';
        const cycleKey = getCycleKey(getField(student, FIELD_MAP.cycle) || 'C1');
        const reflection = (getField(student, FIELD_MAP.reflections[cycleKey] || FIELD_MAP.reflections.C1) || '').replace(/<[^>]*>/g, ' ').trim();
        const goal = (getField(student, FIELD_MAP.goals[cycleKey] || FIELD_MAP.goals.C1) || '').replace(/<[^>]*>/g, ' ').trim();

        const goalReviewFieldMap = { C1: 'field_2500', C2: 'field_2495', C3: 'field_2498' };
        const goalReviewDate = (getField(student, goalReviewFieldMap[cycleKey]) || '').replace(/<[^>]*>/g,' ').trim();

        // Main container
        const reportPage = document.createElement('div');
        reportPage.className = 'vespa-report page';

        // -- Page Header with logos and student info --
        const pageHeader = createAndAppend(reportPage, 'div', null, 'page-header');
        
        // VESPA Logo
        const logoLeft = document.createElement('img');
        logoLeft.className = 'logo-left';
        logoLeft.src = 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/report/vespalogo.png';
        logoLeft.alt = 'VESPA Logo';
        logoLeft.onerror = () => {
            // Fallback to text if image fails
            const textLogo = document.createElement('div');
            textLogo.className = 'logo-left';
            textLogo.style.cssText = 'font-weight: bold; color: #4A6FA4; font-size: 16px; line-height: 30px;';
            textLogo.textContent = 'VESPA';
            logoLeft.replaceWith(textLogo);
        };
        pageHeader.appendChild(logoLeft);
        
        // Student Info
        const headerInfo = createAndAppend(pageHeader, 'div', null, 'header-info');
        const studentDiv = createAndAppend(headerInfo, 'div');
        createAndAppend(studentDiv, 'strong', 'STUDENT:');
        createAndAppend(studentDiv, 'span', ` ${fullName}`);
        
        const dateDiv = createAndAppend(headerInfo, 'div');
        createAndAppend(dateDiv, 'strong', 'DATE:');
        createAndAppend(dateDiv, 'span', ` ${date}`);
        
        const cycleDiv = createAndAppend(headerInfo, 'div');
        createAndAppend(cycleDiv, 'strong', 'CYCLE:');
        createAndAppend(cycleDiv, 'span', ` ${cycleKey.replace('C','')}`);

        // School Logo - will be replaced by setLogos function
        const logoRight = document.createElement('img');
        logoRight.className = 'logo-right';
        logoRight.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiNlMGUwZTAiLz4KPHRleHQgeD0iMjAiIHk9IjI2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2NjYiPkxPR088L3RleHQ+Cjwvc3ZnPg==';
        logoRight.alt = 'School Logo';
        pageHeader.appendChild(logoRight);
        
        // -- Report Title --
        const reportHeader = createAndAppend(reportPage, 'div', null, 'report-header');
        createAndAppend(reportHeader, 'h1', 'VESPA COACHING REPORT', 'header-title');
        
        // -----------------------------------------------------------
        //  NEW ROW-BASED LAYOUT (one row per component)
        // -----------------------------------------------------------

        const components = ['vision', 'effort', 'systems', 'practice', 'attitude'];

        // Title row - REMOVED to save space
        // const gridTitle = createAndAppend(reportPage, 'div', null, 'vespa-grid-title');
        // createAndAppend(gridTitle, 'div', 'Score', 'title-score');
        // createAndAppend(gridTitle, 'div', 'Report Comment', 'title-report');
        // createAndAppend(gridTitle, 'div', 'Coaching Questions', 'title-qs');

        // Grid wrapper
        const vespaGrid = createAndAppend(reportPage, 'div', null, 'vespa-grid');

        components.forEach(key => {
            const scoresMap = SCORE_CYCLE_MAP[cycleKey] || FIELD_MAP.scores;
            const score = getField(student, scoresMap[key]) || '-';

            // Support template aliasing (e.g. "system" vs "systems")
            const templateGroup = templates[key] || templates[key.replace(/s$/, '')] || {};
            const bracket = scoreBracket(score);
            const templateRec = templateGroup[bracket] || {};

            const qsSrc = templateRec && templateRec['field_853'] ? templateRec['field_853'] : '';
            const questionsRaw = qsSrc.split(/<br\s*\/?>|\n/).filter(Boolean).slice(0, 3);
            const longComment = (templateRec['field_845'] || '').replace(/<[^>]*>/g,' ').trim();
            const activities = templateRec['field_847'] || '';

            // Row container
            const block = createAndAppend(vespaGrid, 'div', null, 'vespa-block');
            block.style.borderLeftColor = COMPONENT_COLORS[key];

            // --- Column 1: Score ---
            const blockScore = createAndAppend(block, 'div', null, 'block-score');
            blockScore.style.backgroundColor = COMPONENT_COLORS[key];
            blockScore.style.color = '#fff';
            createAndAppend(blockScore, 'p', COMPONENT_LABELS[key]);
            const scoreVal = createAndAppend(blockScore, 'p', null, 'score-val');
            scoreVal.textContent = score;

            // --- Column 2: Report Comment ---
            createAndAppend(block, 'div', longComment, 'block-body');

            // --- Column 3: Coaching Questions ---
            const qWrapper = createAndAppend(block, 'div', null, 'block-questions');
            if (questionsRaw.length) {
                const ul = createAndAppend(qWrapper, 'ul', null, 'coach-qs');
                questionsRaw.forEach(q => createAndAppend(ul, 'li', q));
            }
            if (activities) {
                const actDiv = createAndAppend(qWrapper, 'div', null, 'activities');
                createAndAppend(actDiv, 'span', 'Suggested Activities: ');
                createAndAppend(actDiv, 'span', activities);
            }
        });
        
        // -- Bottom Section --
        const bottomSection = createAndAppend(reportPage, 'div', null, 'bottom-section');
        createAndAppend(bottomSection, 'h4', '(COMMENTS / STUDY GOAL)');
        
        const bottomRow = createAndAppend(bottomSection, 'div', null, 'bottom-row');
        
        const responseBox = createAndAppend(bottomRow, 'div', null, 'comment-box');
        createAndAppend(responseBox, 'div', 'STUDENT RESPONSE', 'box-title');
        createAndAppend(responseBox, 'p', reflection || 'After reviewing my VESPA scores, I recognise that I need to focus on goal-setting and expand my revision methods. I\'m eager to develop clearer objectives for my studies and explore various study practices to improve these areas.');
        
        const goalBox = createAndAppend(bottomRow, 'div', null, 'comment-box');
        createAndAppend(goalBox, 'div', 'STUDY GOAL/ACTION PLAN', 'box-title');
        createAndAppend(goalBox, 'p', goal || 'I will create and follow a detailed study plan that includes specific goals for each subject to improve my Vision and Practice scores within the next six weeks.');
        if (goalReviewDate) {
            createAndAppend(goalBox, 'p', `Review Date: ${goalReviewDate}`, 'goal-review-date');
        }
        
        return reportPage;
    }

    // Add Filter UI
    function renderFilterUI() {
        const filterHtml = `
            <style>
                #bulkPrintFilters {
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                    border-radius: 12px;
                    padding: 25px;
                    margin-bottom: 20px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                }
                #bulkPrintFilters h3 {
                    margin: 0 0 20px 0;
                    color: #2c3e50;
                    font-size: 1.5rem;
                    font-weight: 600;
                }
                .filter-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                    margin-bottom: 20px;
                }
                .filter-item {
                    position: relative;
                }
                .filter-item label {
                    display: block;
                    margin-bottom: 8px;
                    color: #34495e;
                    font-weight: 600;
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .filter-item select, .filter-item input {
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px solid #e0e6ed;
                    border-radius: 8px;
                    background: white;
                    font-size: 1rem;
                    color: #2c3e50;
                    transition: all 0.3s ease;
                }
                .filter-item select {
                    cursor: pointer;
                    appearance: none;
                    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2334495e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
                    background-repeat: no-repeat;
                    background-position: right 12px center;
                    background-size: 20px;
                    padding-right: 40px;
                }
                .filter-item select:hover, .filter-item input:hover {
                    border-color: #3498db;
                    box-shadow: 0 2px 8px rgba(52, 152, 219, 0.2);
                }
                .filter-item select:focus, .filter-item input:focus {
                    outline: none;
                    border-color: #2980b9;
                    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
                }
                .filter-summary {
                    background: rgba(255,255,255,0.8);
                    border-radius: 8px;
                    padding: 12px 16px;
                    margin-bottom: 20px;
                    display: none;
                }
                .filter-summary.active {
                    display: block;
                }
                .filter-tag {
                    display: inline-block;
                    background: #3498db;
                    color: white;
                    padding: 6px 12px;
                    border-radius: 16px;
                    font-size: 0.85rem;
                    margin-right: 8px;
                    margin-bottom: 8px;
                }
                .search-section {
                    margin-bottom: 20px;
                    padding: 15px;
                    background: rgba(255,255,255,0.5);
                    border-radius: 8px;
                }
                .search-section h4 {
                    margin: 0 0 10px 0;
                    color: #2c3e50;
                    font-size: 1.1rem;
                }
            </style>
            <div id="bulkPrintFilters">
                <h3>🔍 Filter Student Reports</h3>
                
                <div class="search-section">
                    <h4>🔎 Search for Student</h4>
                    <div class="filter-item">
                        <input type="text" id="studentSearch" placeholder="Type student name to search..." />
                    </div>
                </div>
                
                <div id="filterSummary" class="filter-summary">
                    <strong>Active Filters:</strong> <span id="activeFiltersList"></span>
                </div>
                <div class="filter-grid">
                    <div class="filter-item">
                        <label for="filterCycle">📅 Cycle</label>
                        <select id="filterCycle">
                            <option value="">All Cycles</option>
                            <option value="C1">Cycle 1</option>
                            <option value="C2">Cycle 2</option>
                            <option value="C3">Cycle 3</option>
                        </select>
                    </div>
                    <div class="filter-item">
                        <label for="filterYearGroup">📚 Year Group</label>
                        <select id="filterYearGroup">
                            <option value="">All Year Groups</option>
                            <option value="" disabled>Loading...</option>
                        </select>
                    </div>
                    <div class="filter-item">
                        <label for="filterGroup">👥 Group</label>
                        <select id="filterGroup">
                            <option value="">All Groups</option>
                            <option value="" disabled>Loading...</option>
                        </select>
                    </div>
                    <div class="filter-item">
                        <label for="filterTutor">👨‍🏫 Tutor</label>
                        <select id="filterTutor">
                            <option value="">All Tutors</option>
                            <option value="" disabled>Loading...</option>
                        </select>
                    </div>
                    <div class="filter-item" id="subjectTeacherFilter" style="display:none;">
                        <label for="filterSubjectTeacher">📚 Subject Teacher</label>
                        <select id="filterSubjectTeacher">
                            <option value="">All Subject Teachers</option>
                            <option value="" disabled>Loading...</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
        // Insert filters before the print button
        $('#bulkPrintbtn').before(filterHtml);
    }

    // New: Renders a preview of the fetched students
    function renderStudentPreview(students) {
        let listContainer = $('#studentListContainer');
        if (!listContainer.length) {
            listContainer = $('<div id="studentListContainer" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px;"></div>').insertAfter('#bulkPrintFilters');
        }
        listContainer.empty();
        
        if (!students.length) {
            listContainer.html('<p style="color: #e74c3c; font-weight: 600;">⚠️ No students found matching the selected criteria.</p>');
            return;
        }

        const count = students.length;
        let html = `<p style="font-size: 1.1rem; color: #2c3e50;"><strong style="color: #27ae60;">✓ Found ${count} students</strong> matching your criteria.</p>`;
        html += `<button id="generatePreviewBtn" class="Knack-button" style="background: #3498db; border: none; padding: 12px 24px; font-size: 1rem; border-radius: 6px; cursor: pointer; transition: all 0.3s;">📄 Generate Preview for ${count} Students</button>`;
        
        listContainer.html(html);
    }

    // Create modal HTML
    function createReportModal() {
        const modalHtml = `
            <style>
                .report-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.7);
                    z-index: 9999;
                    display: none;
                    overflow: auto;
                }
                .report-modal {
                    position: relative;
                    width: 90%;
                    max-width: 900px;
                    margin: 30px auto;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                }
                .report-modal-header {
                    background: #2c3e50;
                    color: white;
                    padding: 20px 30px;
                    border-radius: 12px 12px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .report-modal-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 28px;
                    cursor: pointer;
                    padding: 0;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background 0.3s;
                }
                .report-modal-close:hover {
                    background: rgba(255,255,255,0.1);
                }
                .report-modal-body {
                    padding: 30px;
                    max-height: calc(100vh - 200px);
                    overflow-y: auto;
                    background: #f5f5f5;
                }
                .report-modal-controls {
                    display: flex;
                    gap: 15px;
                    margin-bottom: 20px;
                    padding: 15px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .report-wrapper {
                    background: white;
                    margin-bottom: 30px;
                    border-radius: 8px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    overflow: hidden;
                    position: relative;
                }
                .report-delete-btn {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: #e74c3c;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    font-size: 18px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s;
                    z-index: 10;
                }
                .report-delete-btn:hover {
                    background: #c0392b;
                    transform: scale(1.1);
                }
                @page {
                    size: A4 portrait;
                    margin: 4mm; /* Hyper-aggressive page margins */
                }
                /* Row-based Layout Styles - FINAL COMPACT VERSION */
                .vespa-report {
                    width: 100%;
                    max-width: 210mm;
                    margin: 0 auto;
                    padding: 5mm; /* Reduced padding to fit on one page */
                    box-sizing: border-box;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: white;
                    position: relative; /* For absolute positioning of logo */
                }
                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                    padding: 8px 0;
                    border-bottom: 2px solid #e0e0e0;
                }
                .logo-left {
                    height: 30px; /* Small VESPA logo */
                    opacity: 0.8;
                }
                .header-info {
                    display: flex;
                    gap: 20px;
                    align-items: center;
                    background: #f0f4f8;
                    padding: 6px 15px;
                    border-radius: 6px;
                    font-size: 9pt;
                    flex: 1;
                    margin: 0 15px;
                }
                .header-info > div {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    white-space: nowrap;
                }
                .header-info strong {
                    color: #2c3e50;
                    font-weight: 600;
                }
                .logo-right {
                    height: 40px; /* School logo */
                }
                .report-header {
                    text-align: center;
                    margin-bottom: 10px;
                }
                .header-title {
                    font-size: 24pt;
                    font-weight: 800;
                    color: #2c3e50;
                    letter-spacing: 1px;
                    margin: 0;
                }
                /* Main Grid */
                .vespa-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                    margin-bottom: 8px; /* Reduced space before bottom section */
                }
                /* Component Row Block */
                .vespa-block {
                    display: grid;
                    grid-template-columns: 75px 1.4fr 1.2fr; /* Balanced - report comments smaller, questions still have space */
                    gap: 10px; /* Reduced gap */
                    min-height: auto;
                    border: 1px solid #e0e0e0;
                    border-left-width: 5px;
                    border-radius: 6px; /* Slightly less rounded */
                    margin-bottom: 6px; /* Reduced space */
                    background: #fafafa;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05); /* Subtle shadow for depth */
                }
                /* Score Column */
                .block-score {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 8px 5px; /* Reduced */
                    border-radius: 0;
                    text-align: center;
                    color: white;
                }
                .block-score p:first-child {
                    font-size: 11px; /* Reduced */
                    font-weight: 700;
                    margin: 0 0 4px 0; /* Reduced */
                }
                .score-val {
                    font-size: 36px; /* Reduced */
                    font-weight: 700;
                    line-height: 1;
                    margin: 0;
                }
                /* Report Comment Column */
                .block-body {
                    padding: 4px 6px; /* Minimal padding for smaller column */
                    font-size: 7.5pt; /* Smaller for narrower column */
                    line-height: 1.2; /* Tight line height */
                    color: #444;
                    display: flex;
                    align-items: center;
                }
                /* Coaching Questions Column */
                .block-questions {
                    padding: 4px 8px; /* More padding for larger column */
                    font-size: 8pt; /* Normal size for wider column */
                    border-left: 1px solid #d0d0d0; /* Darker, more uniform border */
                }
                .coach-qs {
                    margin: 0;
                    padding-left: 0; /* Remove indent */
                    list-style-type: none; /* Remove bullets */
                }
                .coach-qs li {
                    margin-bottom: 3px; /* Slightly more space between items */
                    line-height: 1.25; /* Slightly more readable */
                    color: #555;
                    padding-left: 0; /* Ensure no indent */
                    font-style: italic;
                    font-weight: 600; /* Semi-bold */
                }
                .activities {
                    margin-top: 6px; /* Reduced */
                    padding-top: 6px; /* Reduced */
                    border-top: 1px solid #e8e8e8;
                    font-size: 7.5pt; /* Reduced */
                    color: #666;
                }
                .activities span:first-of-type {
                    font-weight: 600;
                }
                /* Bottom Section */
                .bottom-section {
                    margin-top: 3px; /* Ultra-aggressive reduction */
                    padding-top: 3px; /* Ultra-aggressive reduction */
                    border-top: 1px solid #e0e0e0; /* Thinner border */
                }
                .bottom-section h4 {
                    display: none; /* Hide the title */
                }
                .bottom-row {
                    display: grid;
                    grid-template-columns: 1fr; /* Back to stacked layout */
                    gap: 8px; /* Reduced gap */
                }
                .comment-box {
                    border: 1px solid #e0e0e0;
                    border-radius: 6px; /* More rounded for modern look */
                    padding: 8px 10px; /* Reduced padding */
                    background: #f8f9fa;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05); /* Subtle shadow */
                }
                .box-title {
                    font-weight: 700;
                    margin-bottom: 5px; /* Reduced space */
                    font-size: 9pt; /* Smaller */
                    color: #2c3e50;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .comment-box p {
                    font-size: 8pt; /* Smaller */
                    line-height: 1.3; /* Tighter */
                    color: #444;
                    margin: 0;
                }
                .goal-review-date {
                    font-style: italic;
                    color: #666;
                    margin-top: 6px; /* Reduced */
                    font-size: 7.5pt; /* Reduced */
                }
                @media print {
                    .report-modal-overlay {
                        position: static;
                        background: none;
                    }
                    .report-modal, .report-wrapper {
                        width: 100%;
                        max-width: none;
                        margin: 0;
                        box-shadow: none;
                        border-radius: 0;
                    }
                    .report-modal-header,
                    .report-modal-controls,
                    .report-delete-btn {
                        display: none !important;
                    }
                    .report-modal-body {
                        padding: 0;
                        max-height: none;
                        background: white;
                    }
                    .report-wrapper {
                        page-break-after: always;
                    }
                     .report-wrapper:last-child {
                        page-break-after: auto;
                    }
                    .vespa-report {
                        page-break-inside: avoid;
                        padding: 5mm !important; /* Maintain reduced padding in print */
                    }
                }
            </style>
            <div class="report-modal-overlay" id="reportModalOverlay">
                <div class="report-modal">
                    <div class="report-modal-header">
                        <h2 style="margin: 0;">📋 VESPA Report Preview</h2>
                        <button class="report-modal-close" id="closeModalBtn">×</button>
                    </div>
                    <div class="report-modal-body">
                        <div class="report-modal-controls">
                            <button id="printModalBtn" class="Knack-button" style="background: #27ae60; border: none; padding: 10px 20px; font-size: 1rem; border-radius: 6px; cursor: pointer;">
                                🖨️ Print All Reports
                            </button>
                            <span id="reportCount" style="display: flex; align-items: center; color: #7f8c8d;"></span>
                        </div>
                        <div id="modalReportContainer"></div>
                    </div>
                </div>
            </div>
        `;
        return modalHtml;
    }

    async function fetchFilterOptions(staffIds) {
        try {
            const userRole = await getUserRole();
            const user = Knack.getUserAttributes();
            log('Fetching filter options for user role:', userRole.primaryRole);
            
            // For Staff Admin - show all connected tutors and subject teachers
            if (userRole.isStaffAdmin) {
                // Fetch Tutors connected to this staff admin via field_225
                const tutorFilters = [];
                if (staffIds.length === 1) {
                    tutorFilters.push({ field: 'field_225', operator: 'is', value: staffIds[0] });
                } else if (staffIds.length > 1) {
                    tutorFilters.push({ 
                        match: 'or', 
                        rules: staffIds.map(id => ({ field: 'field_225', operator: 'is', value: id }))
                    });
                }
                
                const tutorResp = await knackRequest('objects/object_7/records', { 
                    filters: tutorFilters.length > 0 ? { match: 'and', rules: tutorFilters } : undefined,
                    rows: 1000 
                });
                const tutors = (tutorResp.records || [])
                    .map(t => ({ id: t.id, name: t.field_95 }))
                    .sort((a, b) => a.name.localeCompare(b.name));
                
                const tutorSelect = $('#filterTutor');
                tutorSelect.empty().append('<option value="">All Tutors</option>');
                tutors.forEach(t => {
                    tutorSelect.append(`<option value="${t.id}">${t.name}</option>`);
                });
                
                // Show and populate Subject Teacher filter for Staff Admin
                $('#subjectTeacherFilter').show();
                
                // Fetch Subject Teachers (field_2191 connections)
                const subjectTeacherResp = await knackRequest('objects/object_10/records', {
                    filters: { match: 'and', rules: staffIds.map(id => ({ field: 'field_439', operator: 'is', value: id })) },
                    rows: 1000
                });
                
                // Extract unique subject teachers from field_2191
                const subjectTeacherSet = new Set();
                (subjectTeacherResp.records || []).forEach(student => {
                    const teachers = student.field_2191_raw || [];
                    teachers.forEach(teacher => {
                        if (teacher && teacher.identifier) {
                            subjectTeacherSet.add(JSON.stringify({ id: teacher.id, name: teacher.identifier }));
                        }
                    });
                });
                
                const subjectTeachers = Array.from(subjectTeacherSet)
                    .map(t => JSON.parse(t))
                    .sort((a, b) => a.name.localeCompare(b.name));
                
                const subjectTeacherSelect = $('#filterSubjectTeacher');
                subjectTeacherSelect.empty().append('<option value="">All Subject Teachers</option>');
                subjectTeachers.forEach(t => {
                    subjectTeacherSelect.append(`<option value="${t.id}">${t.name}</option>`);
                });
                
                log(`Loaded ${tutors.length} tutors and ${subjectTeachers.length} subject teachers`);
            } else {
                // For non-admin users, only show their own name in relevant filter
                if (userRole.isTutor) {
                    // Find their tutor record
                    const tutorData = await knackRequest('objects/object_7/records', {
                        filters: { match: 'and', rules: [{ field: 'field_95', operator: 'contains', value: user.name }] },
                        rows: 10
                    });
                    
                    const tutorSelect = $('#filterTutor');
                    tutorSelect.empty();
                    if (tutorData.records && tutorData.records.length > 0) {
                        const tutorRecord = tutorData.records[0];
                        tutorSelect.append(`<option value="${tutorRecord.id}" selected>${tutorRecord.field_95}</option>`);
                        tutorSelect.prop('disabled', true); // Disable since they can only see their own
                    }
                } else {
                    // Hide tutor filter for non-tutors
                    $('#filterTutor').parent().hide();
                }
                
                // Hide subject teacher filter for non-admin users
                $('#subjectTeacherFilter').hide();
            }

            // Fetch students to derive year group & group options
            const students = await fetchStudents(staffIds, {}, 1000);

            // For non-admin users, only show year groups and groups they have access to
            const yearGroups = [...new Set(students.map(s => s.field_144).filter(Boolean))].sort();
            const yearGroupSelect = $('#filterYearGroup');
            yearGroupSelect.empty().append('<option value="">All Year Groups</option>');
            yearGroups.forEach(yg => {
                yearGroupSelect.append(`<option value="${yg}">${yg}</option>`);
            });

            const groups = [...new Set(students.map(s => s.field_223).filter(Boolean))].sort();
            const groupSelect = $('#filterGroup');
            groupSelect.empty().append('<option value="">All Groups</option>');
            groups.forEach(g => {
                groupSelect.append(`<option value="${g}">${g}</option>`);
            });

            log('Filter options loaded.');

        } catch (e) {
            err('Could not load filter options', e);
            $('#filterYearGroup, #filterGroup, #filterTutor, #filterSubjectTeacher').empty().append('<option value="">Error loading options</option>').prop('disabled', true);
        }
    }

    // Replace logo URLs after DOM build
    async function setLogos(container, primaryUrl, fallbackUrl = '') {
        const schoolLogos = container.querySelectorAll('img.logo-right');
        if (!schoolLogos.length) return;
        
        log('setLogos called with primary:', primaryUrl, 'fallback:', fallbackUrl);
        
        let logoUrl = primaryUrl || '';
        
        // Handle Knack image field format
        if (logoUrl && typeof logoUrl === 'object') {
            log('Logo is an object:', logoUrl);
            // Knack image fields return an object with a 'url' property
            logoUrl = logoUrl.url || logoUrl.thumb_url || logoUrl.full_url || '';
        }
        
        // Handle various URL anomalies and redirects
        if (logoUrl) {
            // 1. Bing Image Search redirects
            if (logoUrl.includes('bing.com')) {
                const match = logoUrl.match(/riu=([^&]+)/);
                if (match && match[1]) {
                    logoUrl = decodeURIComponent(match[1]);
                }
            }
            
            // 2. Google Image Search redirects
            else if (logoUrl.includes('google.com/url')) {
                const match = logoUrl.match(/[?&]url=([^&]+)/);
                if (match && match[1]) {
                    logoUrl = decodeURIComponent(match[1]);
                }
            }
            
            // 3. Google User Content (from Google Drive/Photos)
            else if (logoUrl.includes('googleusercontent.com')) {
                // These URLs often expire, but we'll try to use them
                // Add size parameters if missing
                if (!logoUrl.includes('=w') && !logoUrl.includes('=s')) {
                    logoUrl += '=s200'; // Request 200px size
                }
            }
            
            // 4. Data URLs (base64 encoded images)
            else if (logoUrl.startsWith('data:image')) {
                // These are fine as-is, but check they're not truncated
                if (logoUrl.length < 100) {
                    logoUrl = ''; // Too short to be valid
                }
            }
            
            // 5. Relative URLs (convert to absolute)
            else if (!logoUrl.startsWith('http') && !logoUrl.startsWith('//')) {
                // If it's a relative URL, we can't use it directly
                logoUrl = '';
            }
            
            // 6. Protocol-relative URLs
            else if (logoUrl.startsWith('//')) {
                logoUrl = 'https:' + logoUrl;
            }
            
            // 7. Remove any HTML tags that might have been included
            logoUrl = logoUrl.replace(/<[^>]*>/g, '');
            
            // 8. Trim whitespace and quotes
            logoUrl = logoUrl.trim().replace(/^["']|["']$/g, '');
            
            // 9. Check for common tracking parameters and remove them
            if (logoUrl.includes('?')) {
                // Remove common tracking parameters but keep image-related ones
                logoUrl = logoUrl.replace(/[?&](utm_[^&]+|fbclid|gclid|msclkid)=[^&]*/g, '');
                // Clean up any resulting double ? or &
                logoUrl = logoUrl.replace(/[?&]+/g, '?').replace(/\?$/, '');
            }
        }
        
        // Final validation
        const isValidUrl = logoUrl && 
                          (logoUrl.startsWith('http') || logoUrl.startsWith('data:image')) &&
                          !logoUrl.includes('bing.com') && 
                          !logoUrl.includes('google.com/url');
        
        if (!isValidUrl) {
            // Use placeholder as fallback (data URL to avoid CORS)
            logoUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiNlMGUwZTAiLz4KPHRleHQgeD0iMjAiIHk9IjI2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2NjYiPkxPR088L3RleHQ+Cjwvc3ZnPg==';
        }
        
        // Apply to all school logos with error handling
        schoolLogos.forEach(img => { 
            // Do NOT set crossOrigin here; some S3 assets aren't CORS-enabled and the attribute blocks loading.
            // Add loading and error handlers
            img.onload = () => {
                // Check if image actually loaded (sometimes returns 1x1 pixel on error)
                if (img.naturalWidth < 10 || img.naturalHeight < 10) {
                    console.warn('Logo appears to be invalid (too small):', logoUrl);
                    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiNlMGUwZTAiLz4KPHRleHQgeD0iMjAiIHk9IjI2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2NjYiPkxPR088L3RleHQ+Cjwvc3ZnPg==';
                }
            };
            
            img.onerror = () => {
                console.warn('Failed to load school logo:', logoUrl);
                // Try the fallback URL if we haven't already
                if (fallbackUrl && img.dataset.fallbackTried !== 'yes') {
                    img.dataset.fallbackTried = 'yes';
                    img.src = fallbackUrl;
                    return;
                }
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiNlMGUwZTAiLz4KPHRleHQgeD0iMjAiIHk9IjI2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2NjYiPkxPR088L3RleHQ+Cjwvc3ZnPg==';
                // Prevent infinite error loop
                img.onerror = null;
                img.onload = null;
                // Remove crossorigin for placeholder
                img.removeAttribute('crossorigin');
            };
            
            // Set the source
            img.src = logoUrl;
        });
    }

    // New main execution function triggered by "Search Students"
    async function searchStudents() {
        const btn = $('#searchStudentsBtn');
        const originalText = btn.text();
        let overlay;

        try {
            overlay = $('<div id="bulkPrintOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9998;display:flex;justify-content:center;align-items:center;color:white;font-size:20px;"></div>').appendTo('body');
            btn.text('Searching...').prop('disabled', true);
            overlay.text('Fetching student data...');

            const user = Knack.getUserAttributes();
            if (!user || !user.email) throw new Error('Cannot determine logged-in user');
            
            const staffIds = await getStaffAdminRecordIds(user.email);
            if (!staffIds.length) throw new Error('No Staff-Admin record found for user');
            
            const filters = {
                cycle: $('#filterCycle').val(),
                yearGroup: $('#filterYearGroup').val(),
                group: $('#filterGroup').val(),
                tutorId: $('#filterTutor').val(),
                subjectTeacherId: $('#filterSubjectTeacher').val(),
                searchTerm: $('#studentSearch').val().trim()
            };

            // Fetch all matching students without a hard limit for the search result
            let students = await fetchStudents(staffIds, filters, 1000); // Generous limit for search

            // If a specific cycle is chosen, ensure students actually have scores recorded
            if (filters.cycle) {
                const cycleScores = SCORE_CYCLE_MAP[filters.cycle] || {};
                students = students.filter(stu => {
                    const visionField = cycleScores.vision || FIELD_MAP.scores.vision;
                    const visionScore = stu[visionField];
                    return visionScore !== undefined && visionScore !== null && visionScore !== '';
                });
            }

            log(`Search found ${students.length} students after validating cycle data.`);

            renderStudentPreview(students);
            
            // Re-bind click handler for the new preview button
            $('#generatePreviewBtn').on('click', function() {
                generateReportPreview(students);
            });

        } catch(e) {
            err('Error in searchStudents function:', e);
            alert('Error searching for students: ' + (e.message || 'Unknown error'));
        } finally {
            if (overlay) overlay.remove();
            btn.text(originalText).prop('disabled', false);
        }
    }

    // New function to generate and display the report previews
    async function generateReportPreview(students) {
        const btn = $('#generatePreviewBtn');
        const originalText = btn.text();
        let overlay;

        // Ensure helper variables exist to avoid ReferenceErrors later in the function
        const firstStu = students && students.length ? students[0] : null; // cache first student record
        let schoolUploadUrl = ''; // will be populated when an uploaded logo is detected

        if (!students || !students.length) {
            alert('No students to generate reports for.');
            return;
        }

        // Create modal if it doesn't exist
        if (!$('#reportModalOverlay').length) {
            $('body').append(createReportModal());
            
            // Bind modal events
            $('#closeModalBtn').on('click', function() {
                $('#reportModalOverlay').fadeOut();
            });
            
            $('#reportModalOverlay').on('click', function(e) {
                if ($(e.target).is('#reportModalOverlay')) {
                    $(this).fadeOut();
                }
            });
            
            $('#printModalBtn').on('click', function() {
                printReportsFromModal();
            });
        }

        try {
            overlay = $('<div id="bulkPrintOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9998;display:flex;justify-content:center;align-items:center;color:white;font-size:20px;"></div>').appendTo('body');
            btn.text('Generating Previews...').prop('disabled', true);
            overlay.text('Loading report templates...');
            
            const templates = await loadCoachingTemplates();
            const modalContainer = $('#modalReportContainer').empty();

            for (let i = 0; i < students.length; i++) {
                const stu = students[i];
                overlay.text(`Building report ${i + 1} of ${students.length}...`);
                const reportElement = buildStudentHTML(stu, templates);
                if (reportElement) {
                    const reportWrapper = document.createElement('div');
                    reportWrapper.className = 'report-wrapper';
                    reportWrapper.appendChild(reportElement);
                    
                    // Add delete button
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'report-delete-btn';
                    deleteBtn.innerHTML = '×';
                    deleteBtn.title = 'Remove this report from print';
                    deleteBtn.onclick = function() {
                        if (confirm('Remove this report from the print preview?')) {
                            $(reportWrapper).fadeOut(300, function() {
                                $(this).remove();
                                updateReportCount();
                            });
                        }
                    };
                    reportWrapper.appendChild(deleteBtn);
                    
                    modalContainer.append(reportWrapper);
                }
                 // Yield to the browser to prevent freezing
                if ((i + 1) % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }

            // Get logo from the first student record
            if (students.length > 0) {
                // Log all fields to find where the logo might be
                log('First student record fields:', Object.keys(students[0]).filter(k => k.includes('field')).sort());
                
                // Check various possible logo fields
                const logoFields = ['field_61', 'field_61_raw', 'field_3206', 'field_3206_raw', 'field_133', 'field_133_raw'];
                logoFields.forEach(field => {
                    if (students[0][field]) {
                        log(`Found data in ${field}:`, students[0][field]);
                    }
                });
            }
            
            // Try to get school/account ID from student record
            let estLogoUrl = '';
            // field_133 should be the connection to the school/account (Object_2)
            let schoolId = students[0]?.field_133_raw;
            
            // Handle if it's an array (Knack connection fields often return arrays)
            if (Array.isArray(schoolId) && schoolId.length > 0) {
                schoolId = schoolId[0].id || schoolId[0];
            }
            
            if (schoolId) {
                try {
                    log('Fetching school/account record from Object_2:', schoolId);
                    // Fetch the school/account record to get logo
                    const schoolData = await knackRequest(`objects/object_2/records/${schoolId}`);
                    
                    // Check if the response structure is different
                    log('School data response structure:', Object.keys(schoolData));
                    
                    // The response might just be the record directly, not wrapped in a 'record' property
                    const record = schoolData?.record || schoolData;
                    
                    if (record && record.id) {
                        // Log the entire record to see what we're getting
                        log('Full school record:', record);
                        
                        log('School record fields:', Object.keys(record).filter(k => k.includes('field')).sort());
                        
                        // Log specific fields we're looking for
                        log('field_61:', record.field_61);
                        log('field_61_raw:', record.field_61_raw);
                        log('field_3206:', record.field_3206);
                        log('field_3206_raw:', record.field_3206_raw);
                        
                        // Also check for any image fields
                        const imageFields = Object.keys(record).filter(k => {
                            const val = record[k];
                            return val && (typeof val === 'string' && (val.includes('.png') || val.includes('.jpg') || val.includes('http')));
                        });
                        if (imageFields.length > 0) {
                            log('Found potential image fields:', imageFields);
                            imageFields.forEach(field => {
                                log(`${field}:`, record[field]);
                            });
                        }
                        
                        // Check for logo in various fields – prefer the school-uploaded image as it is CORS-safe

                        // FIRST: look for an uploaded logo (image field_61)
                        if (record.field_61_raw && typeof record.field_61_raw === 'object') {
                            const s3Url = record.field_61_raw.url || record.field_61_raw.thumb_url || record.field_61_raw.full_url || '';
                            if (s3Url) {
                                schoolUploadUrl = s3Url; // store for fallback regardless
                                estLogoUrl = s3Url;        // prefer this
                                log('Using uploaded logo from field_61:', s3Url);
                            }
                        }

                        // SECOND: if we still haven't found a logo, try the URL field (field_3206)
                        if (!estLogoUrl && record.field_3206_raw) {
                            // field_3206_raw can be an object {url, label} or a raw string
                            if (typeof record.field_3206_raw === 'object' && record.field_3206_raw.url) {
                                estLogoUrl = record.field_3206_raw.url;
                            } else if (typeof record.field_3206_raw === 'string') {
                                estLogoUrl = record.field_3206_raw;
                            }
                            log('Using external URL from field_3206:', estLogoUrl);
                        }
                         
                        // Also try formatted field_61 if still no URL
                        if (!estLogoUrl && record.field_61) {
                             // This might be an <img> tag
                             const imgMatch = record.field_61.match(/src=["']([^"']+)["']/);
                             if (imgMatch) {
                                 estLogoUrl = imgMatch[1];
                                 log('Extracted URL from field_61 img tag:', estLogoUrl);
                             }
                         }
                        
                        // THIRD: If still no logo, it will fallback to VESPA logo in setLogos function
                        
                        log('School logo URL:', estLogoUrl);
                    }
                } catch (e) {
                    log('Error fetching school record:', e);
                }
            } else {
                log('No school ID found in student record');
            }
            
            // Determine a potential uploaded logo URL from field_61 (we do this regardless so we can use as a fallback)
            let uploadLogoUrl = schoolUploadUrl || '';

            // Fallback to student record fields if we still have no primary URL
            if (!estLogoUrl) {
                estLogoUrl = firstStu?.field_3206_raw?.url || firstStu?.field_3206 || '';
            }

            // Final cleanup: upgrade http -> https if possible
            const upgradeToHttps = (url) => {
                if (url && url.startsWith('http://')) {
                    return url.replace('http://', 'https://');
                }
                return url;
            };
            estLogoUrl = upgradeToHttps(estLogoUrl);
            uploadLogoUrl = upgradeToHttps(uploadLogoUrl);

            await setLogos(modalContainer[0], estLogoUrl, uploadLogoUrl);

            // Update report count
            $('#reportCount').text(`${students.length} reports ready to print`);
            
            // Show modal
            $('#reportModalOverlay').fadeIn();

        } catch (e) {
            err('Error generating report previews:', e);
            alert('Error generating previews: ' + (e.message || 'Unknown error'));
        } finally {
            if (overlay) overlay.remove();
            btn.text('Preview Generated').css('background-color', '#5cb85c');
        }
    }

    // Add filter change tracking
    function updateActiveFilters() {
        const filters = {
            cycle: $('#filterCycle').val(),
            yearGroup: $('#filterYearGroup').val(),  
            group: $('#filterGroup').val(),
            tutorId: $('#filterTutor').val(),
            subjectTeacherId: $('#filterSubjectTeacher').val(),
            searchTerm: $('#studentSearch').val().trim()
        };
        
        const activeFilters = [];
        if (filters.cycle) activeFilters.push(`Cycle ${filters.cycle.replace('C', '')}`);
        if (filters.yearGroup) activeFilters.push(`Year ${filters.yearGroup}`);
        if (filters.group) activeFilters.push(`Group ${filters.group}`);
        if (filters.tutorId) {
            const tutorName = $('#filterTutor option:selected').text();
            if (tutorName && tutorName !== 'All Tutors') activeFilters.push(`Tutor: ${tutorName}`);
        }
        if (filters.subjectTeacherId) {
            const teacherName = $('#filterSubjectTeacher option:selected').text();
            if (teacherName && teacherName !== 'All Subject Teachers') activeFilters.push(`Subject Teacher: ${teacherName}`);
        }
        if (filters.searchTerm) activeFilters.push(`Search: "${filters.searchTerm}"`);
        
        if (activeFilters.length > 0) {
            $('#filterSummary').addClass('active');
            $('#activeFiltersList').html(activeFilters.map(f => `<span class="filter-tag">${f}</span>`).join(''));
        } else {
            $('#filterSummary').removeClass('active');
        }
    }

    // Update report count after deletion
    function updateReportCount() {
        const remainingReports = $('#modalReportContainer .report-wrapper').length;
        $('#reportCount').text(`${remainingReports} reports ready to print`);
        
        // Disable print button if no reports remain
        if (remainingReports === 0) {
            $('#printModalBtn').prop('disabled', true).css('opacity', '0.5');
        }
    }

    function printReportsFromModal() {
        const modalContent = $('#modalReportContainer').html();
        const originalBody = $('body').html();
        const printContainer = $('<div id="print-container"></div>');

        // Create a dedicated print stylesheet
        let printStyleSheet = document.getElementById('bulkPrintFinalStyles');
        if (!printStyleSheet) {
            printStyleSheet = document.createElement('style');
            printStyleSheet.id = 'bulkPrintFinalStyles';
            document.head.appendChild(printStyleSheet);
        }
        
        // Define the styles for printing, very similar to your working example
        printStyleSheet.innerHTML = `
            @media print {
                body * { 
                    visibility: hidden !important; 
                }
                #print-container, #print-container * { 
                    visibility: visible !important; 
                }
                #print-container { 
                    position: absolute !important; 
                    left: 0 !important; 
                    top: 0 !important; 
                    width: 100% !important;
                }
                .report-wrapper {
                    page-break-after: always !important;
                    box-shadow: none !important;
                    border: none !important;
                    margin: 0 !important;
                }
                .report-wrapper:last-child {
                    page-break-after: auto !important;
                }
                .vespa-report {
                    padding: 10mm !important; /* Adjust padding for print */
                }
                .block-score, .vespa-block {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
            }
        `;
        
        // Prepare the body for printing
        $('body').children().hide();
        $('body').append(printContainer);
        printContainer.html($('#modalReportContainer').html());

        // Use a timeout to ensure the DOM is updated before printing
        setTimeout(() => {
            window.print();

            // Cleanup after printing
            printContainer.remove();
            $('body').children().show();
            $(printStyleSheet).remove();
        }, 500); // 500ms delay to be safe
    }

    // Expose init for loader (called by WorkingBridge)
    window.initializeBulkPrintApp = async function () {
        cfg = window.BULK_PRINT_CONFIG || {};
        log('Config at initialization:', cfg);
        
        // Check user access
        const userRole = await getUserRole();
        const user = Knack.getUserAttributes();
        
        // TEMPORARY: If no roles detected, assume Staff Admin for testing
        if (!userRole.roles && user?.email) {
            log('WARNING: No roles detected, temporarily allowing access for testing');
            userRole.hasAccess = true;
            userRole.isStaffAdmin = true;
            userRole.primaryRole = 'Staff Admin';
        }
        
        if (!userRole.hasAccess) {
            log('User does not have access to bulk print feature');
            $('#bulkPrintbtn').hide();
            return;
        }
        
        log('BulkPrint app initialised. User role:', userRole.roles);
        log('Waiting for button click.');
        
        // Render filters only once, then populate them.
        if (!$('#bulkPrintFilters').length) {
            renderFilterUI();
            
            // Bind filter change events
            $('#filterCycle, #filterYearGroup, #filterGroup, #filterTutor, #filterSubjectTeacher').on('change', function() {
                updateActiveFilters();
                // Clear any existing preview when filters change
                $('#studentListContainer').empty();
            });
            
            // Bind search input with debounce
            let searchTimeout;
            $('#studentSearch').on('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    updateActiveFilters();
                    $('#studentListContainer').empty();
                }, 500); // Wait 500ms after user stops typing
            });
            
            try {
                const user = Knack.getUserAttributes();
                if (!user || !user.email) throw new Error('Cannot determine logged-in user for filter population');
                const staffIds = await getStaffAdminRecordIds(user.email);
                await fetchFilterOptions(staffIds);
            } catch (e) {
                err('Failed to initialize filter options:', e);
            }
        }
        
        // Debug: Check if we're on the right view
        console.log('[BulkPrint] Current scene:', Knack.scene?.key);
        console.log('[BulkPrint] Looking for button #bulkPrintbtn in view_3062');
        
        // Change the button text and ID for clarity
        const btn = $('#view_3062 #bulkPrintbtn')
            .attr('id', 'searchStudentsBtn')
            .text('🔍 Search Students')
            .css({
                'background': '#3498db',
                'border': 'none',
                'padding': '12px 24px',
                'font-size': '1.1rem',
                'border-radius': '6px',
                'cursor': 'pointer',
                'transition': 'all 0.3s',
                'box-shadow': '0 2px 5px rgba(52, 152, 219, 0.3)'
            })
            .hover(
                function() { $(this).css('background', '#2980b9'); },
                function() { $(this).css('background', '#3498db'); }
            );

        if (btn.length && !btn.data('bulk-print-bound')) {
            console.log('[BulkPrint] Button found, binding click handler');
            btn.data('bulk-print-bound', true); // Mark as bound
            btn.off('click.bulk').on('click.bulk', function (e) {
                e.preventDefault();
                searchStudents();
            });
        }
    };
    
    // Also log when script loads
    console.log('[BulkPrint] Script loaded successfully (v2g)');
})();

