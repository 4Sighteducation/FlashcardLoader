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

    function addPrintStyles() {
        if (document.getElementById('vespaBulkPrintStyles')) return;
        const cssUrl = 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/report/report_printing2o.css';
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
        if (params.filters) qs.append('filters', encodeURIComponent(JSON.stringify(params.filters)));
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

    // Step 1: Staff-Admin record IDs (object_5 field_86 = email)
    async function getStaffAdminRecordIds(email) {
        const data = await knackRequest('objects/object_5/records', {
            filters: { match: 'and', rules: [{ field: 'field_86', operator: 'is', value: email }] }, rows: 50
        });
        return (data.records || []).map(r => r.id);
    }

    // Step 2: Fetch students (with limit and filters)
    async function fetchStudents(staffIds, filters, maxStudents = 100) {
        if (!staffIds.length) return [];

        const baseRules = staffIds.map(id => ({ field: 'field_439', operator: 'is', value: id }));
        const studentApiFilters = { match: 'or', rules: baseRules };
        
        const uiFilterRules = [];

        // Apply UI filters
        if (filters.cycle) {
            uiFilterRules.push({ field: FIELD_MAP.cycle, operator: 'is', value: filters.cycle });
        }
        if (filters.yearGroup) {
            // field_144 is Year Group, which is a Short Text field.
            uiFilterRules.push({ field: 'field_144', operator: 'is', value: filters.yearGroup });
        }
        if (filters.group) {
            // field_223 is Group, which is a Short Text field.
            uiFilterRules.push({ field: FIELD_MAP.group, operator: 'is', value: filters.group });
        }
        if (filters.tutorId) {
            // field_145 is the connection to the Tutor object
            uiFilterRules.push({ field: 'field_145', operator: 'is', value: filters.tutorId });
        }

        // Combine base and UI filters
        const finalFilters = {
            match: 'and',
            rules: [studentApiFilters, ...uiFilterRules]
        };

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
        const getField = (obj, path) => path.split('.').reduce((o, k) => (o || {})[k], obj);

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
        const cycleKey = getCycleKey(getField(student, FIELD_MAP.cycle) || 'C1');
        const reflection = getField(student, FIELD_MAP.reflections[cycleKey] || FIELD_MAP.reflections.C1) || '';
        const goal = getField(student, FIELD_MAP.goals[cycleKey] || FIELD_MAP.goals.C1) || '';

        // Main container
        const reportPage = document.createElement('div');
        reportPage.className = 'vespa-report page';

        // -- Header --
        const reportHeader = createAndAppend(reportPage, 'div', null, 'report-header');
        
        const logoLeft = document.createElement('img');
        logoLeft.className = 'logo';
        logoLeft.alt = 'Logo';
        reportHeader.appendChild(logoLeft); // Src set later

        createAndAppend(reportHeader, 'div', 'VESPA COACHING REPORT', 'header-title');

        const headerRight = createAndAppend(reportHeader, 'div', null, 'header-right');
        const logoRight = document.createElement('img');
        logoRight.className = 'logo-right';
        logoRight.src = 'https://cdn.jsdelivr.net/gh/4Sighteducation/assets@2a84920/vespa-logo-2.png';
        logoRight.alt = 'Vespa Logo';
        headerRight.appendChild(logoRight);
        
        const metaDiv = createAndAppend(headerRight, 'div', null, 'meta');
        const studentDiv = createAndAppend(metaDiv, 'div');
        createAndAppend(studentDiv, 'strong', 'STUDENT:');
        studentDiv.append(` ${fullName}`);
        const dateDiv = createAndAppend(metaDiv, 'div');
        createAndAppend(dateDiv, 'strong', 'DATE:');
        dateDiv.append(` ${date}`);
        const cycleDiv = createAndAppend(metaDiv, 'div');
        createAndAppend(cycleDiv, 'strong', 'CYCLE:');
        cycleDiv.append(` ${cycleKey.replace('C','')}`);
        
        // -- Intro Section --
        const introSection = createAndAppend(reportPage, 'div', null, 'intro-section');
        const questionsDiv = createAndAppend(introSection, 'div', null, 'intro-questions');
        createAndAppend(questionsDiv, 'h4', 'INTRODUCTORY QUESTIONS');
        createAndAppend(questionsDiv, 'p', 'first, some general questions about your report:');
        const introList = createAndAppend(questionsDiv, 'ul');
        [
            'To what extent is the report an accurate description of your current characteristics?',
            'Does your highest score represent a personal strength? Your lowest an area for development?',
            'If you had to challenge a score, or adjust it, which would it be, and why?',
            'Think back over the last few weeks. What are you currently finding hard about study at this level?',
            'Before we look at the rest of the report, remember it\'s quite normal to feel you don\'t know what you\'re trying to achieve or why you\'re studying. But by answering the questions below honestly, reflecting on this report, and making small, manageable changes, you could soon be feeling much more positive.'
        ].forEach(q => createAndAppend(introList, 'li', q));
        createAndAppend(introSection, 'div', null, 'chart-placeholder');
        
        // -- Grid Title --
        const gridTitle = createAndAppend(reportPage, 'div', null, 'vespa-grid-title');
        createAndAppend(createAndAppend(gridTitle, 'div'), 'p', 'VESPA REPORT');
        createAndAppend(createAndAppend(gridTitle, 'div'), 'p', 'COACHING QUESTIONS');

        // -- Vespa Grid --
        const vespaGrid = createAndAppend(reportPage, 'div', null, 'vespa-grid');
        const components = ['vision', 'effort', 'systems', 'practice', 'attitude'];
        
        components.forEach(key => {
            const score = getField(student, FIELD_MAP.scores[key]) || '-';
            const bracket = scoreBracket(score);
            const templateRec = (templates[key] || {})[bracket] || {};
            const longComment = templateRec['field_845'] || '';
            const questionsRaw = (templateRec['field_853'] || '').split(/<br\s*\/?>|\n/).filter(Boolean).slice(0, 3);
            const activities = templateRec['field_847'] || '';

            const block = createAndAppend(vespaGrid, 'div', null, 'vespa-block');
            block.style.borderLeftColor = COMPONENT_COLORS[key];
            
            const scoreBlock = createAndAppend(block, 'div', null, 'block-score');
            scoreBlock.style.background = COMPONENT_COLORS[key];
            createAndAppend(scoreBlock, 'p', COMPONENT_LABELS[key]);
            createAndAppend(scoreBlock, 'p', 'Score');
            createAndAppend(scoreBlock, 'p', score, 'score-val');
            
            const bodyBlock = createAndAppend(block, 'div', null, 'block-body');
            createAndAppend(bodyBlock, 'p', longComment, 'long-comment');
            
            const questionsBlock = createAndAppend(block, 'div', null, 'block-questions');
            const qList = createAndAppend(questionsBlock, 'ul');
            questionsRaw.forEach(q => createAndAppend(qList, 'li', q));
            
            const actP = createAndAppend(questionsBlock, 'p', 'Suggested Activities: ', 'activities');
            createAndAppend(actP, 'span', activities);
        });
        
        // -- Bottom Section --
        const bottomSection = createAndAppend(reportPage, 'div', null, 'bottom-section');
        createAndAppend(bottomSection, 'h4', '(COMMENTS / STUDY GOAL)');
        
        const responseBox = createAndAppend(bottomSection, 'div', null, 'comment-box');
        createAndAppend(responseBox, 'p').innerHTML = '<strong>STUDENT RESPONSE</strong>';
        createAndAppend(responseBox, 'p', reflection);
        
        const recordBox = createAndAppend(bottomSection, 'div', null, 'comment-box');
        createAndAppend(recordBox, 'p').innerHTML = '<strong>COACHING RECORD</strong> (Currently visible to student)';
        createAndAppend(recordBox, 'p', 'Coach input will appear here...').style.fontStyle = 'italic';
        
        const goalBox = createAndAppend(bottomSection, 'div', null, 'comment-box');
        createAndAppend(goalBox, 'p').innerHTML = '<strong>STUDY GOAL/ACTION PLAN</strong>';
        createAndAppend(goalBox, 'p', goal);

        return reportPage;
    }

    // Add Filter UI
    function renderFilterUI() {
        const filterHtml = `
            <div id="bulkPrintFilters" style="padding: 15px; border: 1px solid #ccc; border-radius: 5px; margin-bottom: 15px; background: #f9f9f9;">
                <h3 style="margin-top: 0;">Filter Reports</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); grid-gap: 15px;">
                    <div>
                        <label for="filterCycle">Cycle:</label>
                        <select id="filterCycle" style="width:100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                            <option value="">All Cycles</option>
                            <option value="C1">Cycle 1</option>
                            <option value="C2">Cycle 2</option>
                            <option value="C3">Cycle 3</option>
                        </select>
                    </div>
                    <div>
                        <label for="filterYearGroup">Year Group:</label>
                        <select id="filterYearGroup" style="width:100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                            <option value="">All Year Groups</option>
                            <option value="" disabled>Loading...</option>
                        </select>
                    </div>
                    <div>
                        <label for="filterGroup">Group:</label>
                        <select id="filterGroup" style="width:100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                            <option value="">All Groups</option>
                            <option value="" disabled>Loading...</option>
                        </select>
                    </div>
                    <div>
                        <label for="filterTutor">Tutor:</label>
                        <select id="filterTutor" style="width:100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                            <option value="">All Tutors</option>
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
        const listContainer = $('#studentListContainer').empty();
        if (!listContainer.length) {
            $('<div id="studentListContainer"></div>').insertAfter('#bulkPrintFilters');
        }

        if (!students.length) {
            listContainer.html('<p>No students found matching the selected criteria.</p>');
            return;
        }

        const count = students.length;
        let html = `<p><strong>Found ${count} students.</strong> Click below to generate a print preview.</p>`;
        html += `<button id="generatePreviewBtn" class="Knack-button">Generate Preview for ${count} Students</button>`;
        html += '<div id="reportPreviewContainer" style="margin-top: 15px;"></div>';
        
        listContainer.html(html);
    }

    async function fetchFilterOptions(staffIds) {
        try {
            log('Fetching filter options for the current user...');
            
            // Fetch Tutors from object_7 - this can remain fetching all, as tutors aren't staff-specific in the same way
            const tutorResp = await knackRequest('objects/object_7/records', { rows: 1000 });
            const tutors = (tutorResp.records || [])
                .map(t => ({ id: t.id, name: t.field_95 })) // field_95 should be the Tutor's name
                .sort((a, b) => a.name.localeCompare(b.name));
            
            const tutorSelect = $('#filterTutor');
            tutorSelect.empty().append('<option value="">All Tutors</option>');
            tutors.forEach(t => {
                tutorSelect.append(`<option value="${t.id}">${t.name}</option>`);
            });

            // Fetch only the students relevant to the logged-in staff admin
            const students = await fetchStudents(staffIds, {}, 1000); // Fetch up to 1000 students for this admin
            log(`Found ${students.length} students for this user to populate filters.`);


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
            $('#filterYearGroup, #filterGroup, #filterTutor').empty().append('<option value="">Error loading options</option>').prop('disabled', true);
        }
    }

    // Replace logo URLs after DOM build
    async function setLogos(container, establishmentFieldUrl) {
        const imgs = container.querySelectorAll('img.logo');
        if (!imgs.length) return;
        let logoUrl = establishmentFieldUrl || '';
        if (!logoUrl) logoUrl = 'https://cdn.jsdelivr.net/gh/4Sighteducation/assets@main/vespa-logo.png';
        imgs.forEach(img => { img.src = logoUrl; });
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
                tutorId: $('#filterTutor').val()
            };

            // Fetch all matching students without a hard limit for the search result
            const students = await fetchStudents(staffIds, filters, 1000); // Generous limit for search
            log(`Search found ${students.length} students.`);

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
        const previewContainer = $('#reportPreviewContainer');

        if (!students || !students.length) {
            alert('No students to generate reports for.');
            return;
        }

        try {
            overlay = $('<div id="bulkPrintOverlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9998;display:flex;justify-content:center;align-items:center;color:white;font-size:20px;"></div>').appendTo('body');
            btn.text('Generating Previews...').prop('disabled', true);
            overlay.text('Loading report templates...');
            
            addPrintStyles(); // Ensure styles are present for preview
            
            const templates = await loadCoachingTemplates();
            previewContainer.empty(); // Clear previous previews

            for (let i = 0; i < students.length; i++) {
                const stu = students[i];
                overlay.text(`Building report ${i + 1} of ${students.length}...`);
                const reportElement = buildStudentHTML(stu, templates);
                if (reportElement) {
                    const reportWrapper = document.createElement('div');
                    reportWrapper.className = 'report-wrapper';
                    reportWrapper.appendChild(reportElement);
                    previewContainer.append(reportWrapper);
                }
                 // Yield to the browser to prevent freezing
                if ((i + 1) % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }

            // Get logo from the first student record
            const estLogoUrl = students[0]?.field_3206 || students[0]?.field_61 || '';
            await setLogos(previewContainer[0], estLogoUrl);

            // Add the final print button
            $('<button id="printFinalBtn" class="Knack-button">Print All Reports</button>')
                .css('margin-bottom', '15px')
                .prependTo(previewContainer)
                .on('click', function() {
                    window.print();
                });
            
            // Clean up old print container if it exists
            $('#vespaBulkPrintContainer').remove();


        } catch (e) {
            err('Error generating report previews:', e);
            alert('Error generating previews: ' + (e.message || 'Unknown error'));
        } finally {
            if (overlay) overlay.remove();
            btn.text('Preview Generated').css('background-color', '#5cb85c');
        }
    }

    // Expose init for loader (called by WorkingBridge)
    window.initializeBulkPrintApp = async function () {
        cfg = window.BULK_PRINT_CONFIG || {};
        log('Config at initialization:', cfg);
        
        log('BulkPrint app initialised. Waiting for button click.');
        
        // Render filters only once, then populate them.
        if (!$('#bulkPrintFilters').length) {
            renderFilterUI();
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
        const btn = $('#view_3062 #bulkPrintbtn').attr('id', 'searchStudentsBtn').text('Search Students');

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

