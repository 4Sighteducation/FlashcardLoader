// MyAcademicProfilePage.js - Student Academic Profile Display Script
(function() {
  // --- Configuration (will be populated by the loader) ---
  let SCRIPT_CONFIG = {
    knackAppId: '',
    knackApiKey: '',
    elementSelector: '', // Target element for rendering
    scriptUrl: '', // Will be populated by the loader, used to derive CSS URL
    debugMode: false,
    // Constants for object/field names
    HOMEPAGE_OBJECT: 'object_112', // User Profile object
    FIELD_MAPPING: { // Relevant fields from object_112
      userId: 'field_3064',
      studentName: 'field_3066',
      vespaCustomer: 'field_3069',
      tutorGroup: 'field_3077',
      yearGroup: 'field_3078',
      attendance: 'field_3076',
      // Subject fields (sub1 to sub15)
      sub1: 'field_3080', sub2: 'field_3081', sub3: 'field_3082',
      sub4: 'field_3083', sub5: 'field_3084', sub6: 'field_3085',
      sub7: 'field_3086', sub8: 'field_3087', sub9: 'field_3088',
      sub10: 'field_3089', sub11: 'field_3090', sub12: 'field_3091',
      sub13: 'field_3092', sub14: 'field_3093', sub15: 'field_3094'
    },
    VESPA_SCORES_OBJECT: 'object_10',
    VESPA_SCORES_EMAIL_FIELD: 'field_197',
    VESPA_SCORES_FIELDS: {
      vision: 'field_147', effort: 'field_148', systems: 'field_149',
      practice: 'field_150', attitude: 'field_151', overall: 'field_152'
    },
    VESPA_SCORE_COLORS: {
      vision: '#ff8f00', effort: '#86b4f0', systems: '#72cb44',
      practice: '#7f31a4', attitude: '#f032e6', overall: '#f3f553'
    }
  };
  const KNACK_API_URL = 'https://api.knack.com/v1';

  // --- Helper Functions (adapted from copyofHomepage.js) ---
  function debugLog(title, data) {
    if (!SCRIPT_CONFIG.debugMode) return;
    console.log(`%c[MyAcademicProfile] ${title}`, 'color: #4CAF50; font-weight: bold; font-size: 12px;');
    try {
      if (data !== undefined) console.log(JSON.parse(JSON.stringify(data, null, 2)));
    } catch (e) {
      console.log("Data (raw, stringify failed or not applicable):", data);
    }
    return data;
  }

  function safeParseJSON(jsonString, defaultVal = null) {
    if (!jsonString) return defaultVal;
    try {
      if (typeof jsonString === 'object' && jsonString !== null) return jsonString;
      return JSON.parse(jsonString);
    } catch (error) {
      debugLog("JSON parse failed", { error: error.message, stringSample: String(jsonString).substring(0, 100) });
      return defaultVal;
    }
  }

  function isValidKnackId(id) {
    if (!id) return false;
    return typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id);
  }

  function extractValidRecordId(value) {
    if (!value) return null;
    if (typeof value === 'object' && value !== null) {
      if (value.id && isValidKnackId(value.id)) return value.id;
      if (value.identifier && isValidKnackId(value.identifier)) return value.identifier;
      if (Array.isArray(value) && value.length === 1) {
        if (typeof value[0] === 'object' && value[0].id && isValidKnackId(value[0].id)) return value[0].id;
        if (typeof value[0] === 'string' && isValidKnackId(value[0])) return value[0];
      }
      if (value._id && isValidKnackId(value._id)) return value._id;
    }
    if (typeof value === 'string' && isValidKnackId(value)) return value;
    return null;
  }

  function sanitizeField(value) {
    if (value === null || value === undefined) return "";
    const strValue = String(value);
    let sanitized = strValue.replace(/<[^>]*?>/g, "");
    sanitized = sanitized.replace(/[_~`#]/g, ""); 
    sanitized = sanitized
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '\\"').replace(/&#039;/g, "'").replace(/&nbsp;/g, " ");
    return sanitized.trim();
  }

  function formatAsPercentage(value) {
    if (value === null || value === undefined || String(value).trim() === '' || String(value).trim().toLowerCase() === 'n/a') return 'N/A';
    const num = parseFloat(String(value));
    if (isNaN(num)) return sanitizeField(String(value));
    return String(Math.round(num * 100)) + '%';
  }

  function retryApiCall(apiCall, maxRetries = 3, delay = 1000) {
    return new Promise((resolve, reject) => {
      const attempt = (retryCount) => {
        apiCall()
          .then(resolve)
          .catch((error) => {
            const attemptsMade = retryCount + 1;
            debugLog(`API call failed (Attempt ${attemptsMade}/${maxRetries})`, { status: error.status, statusText: error.statusText });
            if (retryCount < maxRetries - 1) {
              setTimeout(() => attempt(retryCount + 1), delay * Math.pow(2, retryCount));
            } else {
              reject(error);
            }
          });
      };
      attempt(0);
    });
  }

  function getKnackHeaders() {
    if (typeof Knack === 'undefined' || typeof Knack.getUserToken !== 'function') {
      debugLog("Knack object or getUserToken function not available.");
      throw new Error("Knack authentication context not available.");
    }
    const token = Knack.getUserToken();
    return {
      'X-Knack-Application-Id': SCRIPT_CONFIG.knackAppId,
      'X-Knack-REST-API-Key': SCRIPT_CONFIG.knackApiKey,
      'Authorization': token || '',
      'Content-Type': 'application/json'
    };
  }

  // --- Data Fetching ---
  async function fetchUserProfileFromObject112(userId) {
    if (!userId) {
      debugLog("Cannot fetch user profile: userId is missing.");
      return null;
    }
    debugLog(`Fetching user profile from ${SCRIPT_CONFIG.HOMEPAGE_OBJECT} for user ID: ${userId}`);
    const findFilters = encodeURIComponent(JSON.stringify({
      match: 'and',
      rules: [{ field: SCRIPT_CONFIG.FIELD_MAPPING.userId, operator: 'is', value: userId }]
    }));

    try {
      const response = await retryApiCall(() =>
        new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/${SCRIPT_CONFIG.HOMEPAGE_OBJECT}/records?filters=${findFilters}`,
            type: 'GET',
            headers: getKnackHeaders(),
            data: { format: 'raw' },
            success: resolve,
            error: reject
          });
        })
      );
      if (response && response.records && response.records.length > 0) {
        debugLog(`Found user profile record: ${response.records[0].id}`, response.records[0]);
        return response.records[0];
      }
      debugLog(`No user profile found in ${SCRIPT_CONFIG.HOMEPAGE_OBJECT} for user: ${userId}`);
      return null;
    } catch (error) {
      debugLog('Error fetching user profile', { error: error.message, stack: error.stack });
      return null;
    }
  }

  async function fetchVespaScores(userEmail) {
    if (!userEmail) {
      debugLog("Cannot fetch VESPA scores: userEmail is missing.");
      return null;
    }
    debugLog(`Fetching VESPA scores for email: ${userEmail}`);
    const findFilters = encodeURIComponent(JSON.stringify({
      match: 'and',
      rules: [{ field: SCRIPT_CONFIG.VESPA_SCORES_EMAIL_FIELD, operator: 'is', value: userEmail }]
    }));
    const fieldsToRequest = Object.values(SCRIPT_CONFIG.VESPA_SCORES_FIELDS).join(',');

    try {
      const response = await retryApiCall(() =>
        new Promise((resolve, reject) => {
          $.ajax({
            url: `${KNACK_API_URL}/objects/${SCRIPT_CONFIG.VESPA_SCORES_OBJECT}/records?filters=${findFilters}&fields=${fieldsToRequest}`,
            type: 'GET',
            headers: getKnackHeaders(),
            data: { format: 'raw' },
            success: resolve,
            error: reject
          });
        })
      );
      if (response && response.records && response.records.length > 0) {
        const record = response.records[0];
        const scores = {};
        for (const key in SCRIPT_CONFIG.VESPA_SCORES_FIELDS) {
          scores[key] = sanitizeField(record[SCRIPT_CONFIG.VESPA_SCORES_FIELDS[key]] || 'N/A');
        }
        debugLog('Processed VESPA scores:', scores);
        return scores;
      }
      debugLog(`No VESPA scores record found for ${userEmail}`);
      return null;
    } catch (error) {
      debugLog('Error fetching VESPA scores', { error: error.message, stack: error.stack });
      return null;
    }
  }

  // --- UI Rendering (adapted from copyofHomepage.js) ---
  function renderProfileSection(profileData, vespaScoresData) {
    const name = sanitizeField(profileData[SCRIPT_CONFIG.FIELD_MAPPING.studentName]);
    let schoolDisplay = 'N/A';
    const schoolFieldVal = profileData[SCRIPT_CONFIG.FIELD_MAPPING.vespaCustomer];
    if (schoolFieldVal) {
      if (typeof schoolFieldVal === 'object' && schoolFieldVal !== null) {
        if (schoolFieldVal.identifier) schoolDisplay = sanitizeField(schoolFieldVal.identifier);
        else if (schoolFieldVal.name) schoolDisplay = sanitizeField(schoolFieldVal.name);
        else if (Array.isArray(schoolFieldVal) && schoolFieldVal.length > 0 && schoolFieldVal[0].identifier) {
             schoolDisplay = sanitizeField(schoolFieldVal[0].identifier);
        } else {
             const schoolText = schoolFieldVal.text || (Array.isArray(schoolFieldVal) && schoolFieldVal[0] && schoolFieldVal[0].text);
             if (schoolText) schoolDisplay = sanitizeField(schoolText);
             else schoolDisplay = "VESPA ACADEMY";
        }
      } else if (typeof schoolFieldVal === 'string') {
        schoolDisplay = sanitizeField(schoolFieldVal);
      }
    }

    const tutorGroup = sanitizeField(profileData[SCRIPT_CONFIG.FIELD_MAPPING.tutorGroup]);
    const yearGroup = sanitizeField(profileData[SCRIPT_CONFIG.FIELD_MAPPING.yearGroup]);
    const attendance = sanitizeField(profileData[SCRIPT_CONFIG.FIELD_MAPPING.attendance]);

    const subjectData = [];
    for (let i = 1; i <= 15; i++) {
      const fieldKey = `sub${i}`;
      const fieldId = SCRIPT_CONFIG.FIELD_MAPPING[fieldKey];
      if (profileData[fieldId]) {
        const subject = safeParseJSON(profileData[fieldId]);
        if (subject && subject.subject) subjectData.push(subject);
      }
    }

    function getGradeColorClass(grade, minExpected, examType) {
      if (!grade || !minExpected || grade === 'N/A' || minExpected === 'N/A') return '';
      const gradeStr = String(grade);
      const minExpectedStr = String(minExpected);
      const gradeOrder = ['A*', 'A', 'B', 'C', 'D', 'E', 'U'];
      const gradeVal = gradeOrder.indexOf(gradeStr.toUpperCase());
      const minExpectedVal = gradeOrder.indexOf(minExpectedStr.toUpperCase());
      if (gradeVal !== -1 && minExpectedVal !== -1) {
        if (gradeVal < minExpectedVal) return (minExpectedVal - gradeVal >= 2) ? 'grade-significantly-above' : 'grade-above';
        if (gradeVal === minExpectedVal) return 'grade-matching';
        if (gradeVal - minExpectedVal === 1) return 'grade-one-below';
        if (gradeVal - minExpectedVal === 2) return 'grade-two-below';
        if (gradeVal - minExpectedVal >= 3) return 'grade-far-below';
        return '';
      }
      const numGrade = parseFloat(gradeStr);
      const numMinExpected = parseFloat(minExpectedStr);
      if (!isNaN(numGrade) && !isNaN(numMinExpected)) {
        const diff = numGrade - numMinExpected;
        if (diff >= 2) return 'grade-significantly-above';
        if (diff === 1) return 'grade-above';
        if (diff === 0) return 'grade-matching';
        if (diff === -1) return 'grade-one-below';
        if (diff === -2) return 'grade-two-below';
        if (diff <= -3) return 'grade-far-below';
        return '';
      }
      if (examType === 'Vocational') {
        const vocationGradeValues = {
          'D*': 4, 'D*D*': 8, 'D*D*D*': 12, 'D': 3, 'DD': 6, 'DDD': 9,
          'M': 2, 'MM': 4, 'MMM': 6, 'P': 1, 'PP': 2, 'PPP': 3,
          'D*D': 7, 'D*DD': 10, 'DM': 5, 'DMM': 7, 'MP': 3, 'MPP': 4
        };
        const currentGradeValue = vocationGradeValues[gradeStr.toUpperCase()] || 0;
        const expectedGradeValue = vocationGradeValues[minExpectedStr.toUpperCase()] || 0;
        if (currentGradeValue && expectedGradeValue) {
          const diff = currentGradeValue - expectedGradeValue;
          if (diff >= 2) return 'grade-significantly-above';
          if (diff === 1) return 'grade-above';
          if (diff === 0) return 'grade-matching';
          if (diff === -1) return 'grade-one-below';
          if (diff === -2) return 'grade-two-below';
          if (diff <= -3) return 'grade-far-below';
          return '';
        }
      }
      if (gradeStr === minExpectedStr) return 'grade-matching';
      return '';
    }

    let subjectsHTML = '';
    if (subjectData.length > 0) {
      subjectData.forEach(subject => {
        let cardType = '';
        const examType = (subject.examType || '').trim();
        if (examType === 'GCSE') cardType = 'gcse';
        else if (examType === 'Vocational') cardType = 'vocational';
        const currentGradeClass = getGradeColorClass(subject.currentGrade, subject.minimumExpectedGrade, examType);
        const targetGradeClass = getGradeColorClass(subject.targetGrade, subject.minimumExpectedGrade, examType);
        let optionalGradesHTML = '';
        if (subject.effortGrade && subject.effortGrade !== 'N/A') {
          optionalGradesHTML += `<div class="optional-grade-item"><span class="optional-grade-label">Eff:</span>${subject.effortGrade}</div>`;
        }
        if (subject.behaviourGrade && subject.behaviourGrade !== 'N/A') {
          optionalGradesHTML += `<div class="optional-grade-item"><span class="optional-grade-label">Beh:</span>${subject.behaviourGrade}</div>`;
        }
        if (subject.subjectAttendance && subject.subjectAttendance !== 'N/A') {
          optionalGradesHTML += `<div class="optional-grade-item"><span class="optional-grade-label">Att:</span>${formatAsPercentage(subject.subjectAttendance)}</div>`;
        }
        subjectsHTML += `
          <div class="subject-card ${cardType}">
            <div class="subject-name">${sanitizeField(subject.subject || '')}</div>
            <div class="subject-meta">
              ${subject.examType ? sanitizeField(subject.examType) : 'N/A'}
              ${subject.examBoard ? ` • ${sanitizeField(subject.examBoard)}` : ''}
            </div>
            <div class="grades-container">
              <div class="grade-item"><div class="grade-label">EXG</div><div class="grade-value grade-exg">${sanitizeField(subject.minimumExpectedGrade || 'N/A')}</div></div>
              <div class="grade-item"><div class="grade-label">Current</div><div class="grade-value ${currentGradeClass}">${sanitizeField(subject.currentGrade || 'N/A')}</div></div>
              <div class="grade-item"><div class="grade-label">Target</div><div class="grade-value ${targetGradeClass}">${sanitizeField(subject.targetGrade || 'N/A')}</div></div>
            </div>
            ${optionalGradesHTML ? `<div class="optional-grades-container">${optionalGradesHTML}</div>` : ''}
          </div>
        `;
      });
    }

    return `
      <div class="vespa-profile-display">
        <section class="vespa-section profile-section">
          <h2 class="vespa-section-title">
            Student Profile
            <span class="profile-info-button" title="Understanding Your Grades">i</span>
          </h2>
          <div class="profile-info">
            <div class="profile-details">
              <div class="profile-name">${name}</div>
              <div class="profile-item"><span class="profile-label">School:</span><span class="profile-value">${schoolDisplay}</span></div>
              ${yearGroup ? `<div class="profile-item"><span class="profile-label">Year Group:</span><span class="profile-value">${yearGroup}</span></div>` : ''}
              ${tutorGroup ? `<div class="profile-item"><span class="profile-label">Tutor Group:</span><span class="profile-value">${tutorGroup}</span></div>` : ''}
              ${attendance ? `<div class="profile-item"><span class="profile-label">Attendance:</span><span class="profile-value">${attendance}</span></div>` : ''}
            </div>
            <div class="subjects-container"><div class="subjects-grid">${subjectsHTML}</div></div>
          </div>
          ${vespaScoresData ? renderVespaCirclesHTML(vespaScoresData) : ''}
        </section>
        <div id="profileGradeInfoTooltipContainer"></div>
      </div>
    `;
  }

  function renderVespaCirclesHTML(scoresData) {
    if (!scoresData) return '';
    let scoresCircleHTML = '';
    const scoreOrder = ['vision', 'effort', 'systems', 'practice', 'attitude', 'overall'];
    scoreOrder.forEach(key => {
      if (scoresData[key] && scoresData[key] !== 'N/A') {
        const scoreValue = sanitizeField(scoresData[key]);
        const color = SCRIPT_CONFIG.VESPA_SCORE_COLORS[key] || '#cccccc';
        const textColor = (key === 'overall' && color === '#f3f553') ? '#333333' : '#ffffff';
        scoresCircleHTML += `
          <div class="vespa-score-item">
            <div class="vespa-score-circle" style="background-color: ${color}; color: ${textColor};">
              <span>${scoreValue}</span>
            </div>
            <div class="vespa-score-label">${key.toUpperCase()}</div>
          </div>`;
      }
    });
    if (!scoresCircleHTML) return '';
    return `
      <div class="profile-vespa-scores-container">
        <h3 class="profile-vespa-scores-title">Current VESPA Scores</h3>
        <div class="vespa-scores-grid">${scoresCircleHTML}</div>
      </div>`;
  }
  
  function setupProfileInfoTooltip(containerElementSelector) {
    const infoButton = document.querySelector(`${containerElementSelector} .profile-info-button`);
    const tooltipContainer = document.querySelector(`${containerElementSelector} #profileGradeInfoTooltipContainer`);
    if (infoButton && tooltipContainer) {
      infoButton.addEventListener('click', () => {
        const existingTooltip = document.getElementById('profileGradeInfoTooltip-MyAcademicProfile');
        if (existingTooltip) existingTooltip.remove();
        
        // Restoring the full tooltip HTML content with correct apostrophes
        const tooltipHTML = `
          <div id="profileGradeInfoTooltip-MyAcademicProfile" class="profile-info-tooltip" style="position: fixed;">
            <span class="profile-info-tooltip-close">&times;</span>
            <h4>Understanding Your Grades:</h4>
            <p><strong>1) EXG (Expected Grade):</strong><br>This is what your previous grades suggest you might achieve in this subject. It's calculated using your GCSE results (or other previous grades) and comparing them to how students with similar grades have done in the past. Think of it as a starting point based on your academic history, not a limit on what you can achieve.</p>
            <p><strong>2) Current Grade:</strong><br>This is the grade you're working at right now, based on your recent work, tests, and classroom performance. Your teachers look at everything you've done so far in this subject to determine where you currently stand. This helps you see your progress and identify areas where you might need to focus.</p>
            <p><strong>3) Target Grade:</strong><br>This is the grade your teachers believe you can realistically achieve with consistent effort. It's challenging but possible, based on your teachers' experience with students like you and their understanding of your personal potential. This target gives you something specific to aim for as you continue your studies.</p>
          </div>
        `;
        
        tooltipContainer.innerHTML = tooltipHTML;
        const tooltipElement = document.getElementById('profileGradeInfoTooltip-MyAcademicProfile');
        setTimeout(() => { if (tooltipElement) tooltipElement.classList.add('visible'); }, 10);
        const closeButton = tooltipElement.querySelector('.profile-info-tooltip-close');
        if (closeButton) {
          closeButton.addEventListener('click', () => {
            tooltipElement.classList.remove('visible');
            setTimeout(() => { if (tooltipElement && tooltipElement.parentNode) tooltipElement.parentNode.removeChild(tooltipElement); }, 300);
          });
        }
      });
    } else {
      debugLog("Profile info button or tooltip container not found for tooltip setup.", {infoButton, tooltipContainer});
    }
  }

  function applyStyles() {
    const styleId = 'my-academic-profile-styles-link';
    if (document.getElementById(styleId)) {
      debugLog("Styles already applied via external stylesheet.");
      return;
    }
    const styleElement = document.createElement('link');
    styleElement.id = styleId;
    styleElement.rel = 'stylesheet';
    styleElement.type = 'text/css';
    let cssUrl = '';
    if (SCRIPT_CONFIG.scriptUrl) {
        cssUrl = SCRIPT_CONFIG.scriptUrl.replace(/\.js(\?.*)?$/, '.css'); // Handle potential query strings in .js URL
    } else if (window.MY_ACADEMIC_PROFILE_CONFIG && window.MY_ACADEMIC_PROFILE_CONFIG.scriptUrl) {
        cssUrl = window.MY_ACADEMIC_PROFILE_CONFIG.scriptUrl.replace(/\.js(\?.*)?$/, '.css');
    } else {
        cssUrl = 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/report/MyAcademicProfilePage.css';
        debugLog("Warning: CSS URL is using a hardcoded fallback. Ensure SCRIPT_CONFIG.scriptUrl is correctly set by the loader.", cssUrl);
    }
    if (!cssUrl) {
        debugLog("Error: Could not determine CSS URL. Styles not applied.");
        return;
    }
    styleElement.href = cssUrl;
    debugLog("Applying external stylesheet:", styleElement.href);
    document.head.appendChild(styleElement);
  }

  // --- Main Initialization Function ---
  window.initializeMyAcademicProfilePage = async function() {
    if (window.MY_ACADEMIC_PROFILE_CONFIG) {
      SCRIPT_CONFIG = { ...SCRIPT_CONFIG, ...window.MY_ACADEMIC_PROFILE_CONFIG };
    } else {
      console.error("[MyAcademicProfile] Error: MY_ACADEMIC_PROFILE_CONFIG not found.");
      return;
    }
    debugLog("Initializing My Academic Profile Page with config", SCRIPT_CONFIG);

    if (typeof Knack === 'undefined' || typeof Knack.getUserAttributes !== 'function') {
      debugLog("Knack context or getUserAttributes not available.");
      return;
    }
    const user = Knack.getUserAttributes();
    if (!user || !user.id) {
      debugLog("Cannot get Knack user attributes or user ID.");
      return;
    }
    debugLog("Current Knack user", user);

    const container = document.querySelector(SCRIPT_CONFIG.elementSelector);
    if (!container) {
      debugLog(`Target container "${SCRIPT_CONFIG.elementSelector}" not found.`);
      return;
    }
    container.innerHTML = '<p style="padding:20px; text-align:center; color:#079baa;">Loading academic profile...</p>';
    
    applyStyles(); // Apply CSS placeholders for now

    try {
      const userProfile = await fetchUserProfileFromObject112(user.id);
      if (!userProfile) {
        container.innerHTML = '<p style="padding:20px; text-align:center; color:#FF9800;">Could not load academic profile. Please ensure you have visited the homepage first.</p>';
        return;
      }
      let vespaScores = null;
      if (user.email) {
        vespaScores = await fetchVespaScores(user.email);
      }
      container.innerHTML = renderProfileSection(userProfile, vespaScores);
      setupProfileInfoTooltip(SCRIPT_CONFIG.elementSelector);
    } catch (error) {
      debugLog("Error during academic profile initialization", { error: error.message, stack: error.stack });
      container.innerHTML = '<p style="padding:20px; text-align:center; color:#F44336;">An error occurred while loading the academic profile.</p>';
    }
  };
})(); 
