// VESPA TaskBoard - Knack Integration Script - v1.0 (Loader Compatible)
// This script must be added to Knack builder to enable communication between Knack and the embedded React app
(function() {
  // REMOVED: Initial config check - Loader will provide config before calling init.
  /*
  if (!window.VESPATASKBOARD_CONFIG) {
    console.error("VESPA TaskBoard: Missing VESPATASKBOARD_CONFIG. Please define configuration in Knack.");
    return;
  }
  */

  // --- Constants and Configuration ---
  // REMOVED: Global config reading - Moved inside initializer
  const KNACK_API_URL = 'https://api.knack.com/v1';
  // REMOVED: Internal TASKBOARD_APP_CONFIG - Loader provides necessary values
  const TASKBOARD_OBJECT = 'object_111'; // TaskBoard object
  const FIELD_MAPPING = {
    userId: 'field_3048', // User ID
    userEmail: 'field_3054', // User Email
    userName: 'field_3047', // User Name
    boardData: 'field_3052', // JSON Data field
    lastSaved: 'field_3053', // Last saved timestamp
    account: 'field_3050',   // Account connection field
    vespaCustomer: 'field_3049' // VESPA Customer connection field
  };

  // Declare variables needed within initializer in a higher scope
  let knackAppId;
  let knackApiKey;
  let taskboardAppUrl;
  let elementSelector;
  let sceneKey; // Store scene key from config
  let viewKey; // Store view key from config

  // --- Helper Functions ---
  // Safe JSON parsing function
  function safeParseJSON(jsonString, defaultVal = null) {
    if (!jsonString) return defaultVal;
    try {
      if (typeof jsonString === 'object' && jsonString !== null) return jsonString;
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn("VESPA TaskBoard: JSON parse failed:", error);
      return defaultVal;
    }
  }

  // Check if a string is a valid Knack record ID
  function isValidKnackId(id) {
    if (!id) return false;
    return typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id);
  }

  // Extract a valid record ID from various formats
  function extractValidRecordId(value) {
    if (!value) return null;
    if (typeof value === 'object') {
      let idToCheck = null;
      if (value.id) {
        idToCheck = value.id;
      } else if (value.identifier) {
        idToCheck = value.identifier;
      }
      if (idToCheck) {
        return isValidKnackId(idToCheck) ? idToCheck : null;
      }
    }
    if (typeof value === 'string') {
      return isValidKnackId(value) ? value : null;
    }
    return null;
  }

  // Debug logging helper
  function debugLog(title, data) {
    console.log(`%c[VESPA TaskBoard] ${title}`, 'color: #007bff; font-weight: bold;', data);
    return data;
  }

  // Helper to get Knack Headers (uses initialized config vars)
  function getKnackHeaders() {
      if (!knackAppId || !knackApiKey) {
          console.error("[TaskBoard] Knack App ID or API Key not initialized. Cannot get headers.");
          throw new Error("Knack configuration not initialized.");
      }
      const token = (typeof Knack !== 'undefined' && Knack.getUserToken) ? Knack.getUserToken() : null;
      if (!token) {
          console.warn("[TaskBoard] Knack user token is null or undefined. API calls may fail.");
      }
      return {
          'X-Knack-Application-Id': knackAppId,
          'X-Knack-REST-API-Key': knackApiKey,
          'Authorization': token || '',
          'Content-Type': 'application/json'
      };
  }

  // --- REMOVED: Knack Integration Initialization Listener ---
  /*
  let isInitialized = false;
  let appReadyReceived = false;
  $(document).on('knack-scene-render.scene_1188', function(event, scene) {
    console.log("VESPA TaskBoard: Scene rendered:", scene.key);
    if (!isInitialized) {
      isInitialized = true;
      initializeTaskBoard();
    } else {
      console.log("VESPA TaskBoard: Already initialized, skipping duplicate initialization");
    }
  });
  */
  let appReadyReceived = false; // Keep track if iframe is ready

  // --- Main Initializer Function (Called by Loader) ---
  window.initializeTaskboardApp = function() {
    console.log("VESPA TaskBoard: Initializing Taskboard App (Loader Compatible)");

    // --- Initialize Config-Dependent Variables --- (Uses TASKBOARD_CONFIG from loader)
    if (!window.TASKBOARD_CONFIG) {
      console.error("VESPA TaskBoard: Critical Error - window.TASKBOARD_CONFIG is not defined!");
      // Optionally display error
      return; // Stop
    }
    knackAppId = window.TASKBOARD_CONFIG.knackAppId;
    knackApiKey = window.TASKBOARD_CONFIG.knackApiKey;
    taskboardAppUrl = window.TASKBOARD_CONFIG.appUrl; // Use URL from loader config
    elementSelector = window.TASKBOARD_CONFIG.elementSelector || '.kn-rich-text'; // Use selector from loader config
    sceneKey = window.TASKBOARD_CONFIG.sceneKey; // Get scene key from loader config
    viewKey = window.TASKBOARD_CONFIG.viewKey;   // Get view key from loader config

    // Log initialized values
    debugLog("TaskBoard Initialized Config", {
        knackAppId: knackAppId ? 'Set' : 'Not Set',
        knackApiKey: knackApiKey ? 'Set' : 'Not Set',
        taskboardAppUrl,
        elementSelector,
        sceneKey,
        viewKey
    });

    if (!knackAppId || !knackApiKey || !taskboardAppUrl) {
        console.error("VESPA TaskBoard: Missing required configuration values (knackAppId, knackApiKey, or appUrl) from TASKBOARD_CONFIG.");
        return;
    }
    // --- End Config Initialization ---

    // Check if user is authenticated
    if (typeof Knack === 'undefined' || !Knack.getUserToken || !Knack.getUserAttributes || !Knack.application_id) {
      console.error("VESPA TaskBoard: Required Knack context not available.");
      return;
    }

    if (Knack.getUserToken()) {
      console.log("VESPA TaskBoard: User is authenticated");
      const userToken = Knack.getUserToken();
      const appId = Knack.application_id; // Knack's internal App ID
      const user = Knack.getUserAttributes();

      console.log("VESPA TaskBoard: Basic user info:", user);
       if (!user || typeof user !== 'object') {
          console.error("VESPA TaskBoard: Knack.getUserAttributes() did not return valid user object.");
          return;
       }
      window.currentKnackUser = user; // Store globally

      // Get complete user data (async)
      getCompleteUserData(user.id, function(completeUserData) {
        if (completeUserData) {
          window.currentKnackUser = Object.assign({}, window.currentKnackUser || user, completeUserData);
          debugLog("Enhanced global user object", window.currentKnackUser);
        } else {
          console.warn("VESPA TaskBoard: Could not get complete user data, continuing with basic info");
        }
        // Pass the necessary details to continueInitialization
        continueInitialization(userToken, appId);
      });
    } else {
      console.error("VESPA TaskBoard: User is not authenticated.");
    }
  }

  // Get complete user data from Knack
  function getCompleteUserData(userId, callback) {
    console.log("[TaskBoard] Getting complete user data for:", userId);
    if (!userId) {
        console.error("[TaskBoard] Cannot get complete user data: userId is missing.");
        callback(null);
        return;
    }
    $.ajax({
      url: `${KNACK_API_URL}/objects/object_3/records/${userId}`,
      type: 'GET',
      headers: getKnackHeaders(), // Use helper function
      data: { format: 'raw' },
      success: function(response) {
        console.log("[TaskBoard] Complete user data received.");
        debugLog("[TaskBoard] Raw Complete User Data:", response);
        callback(response);
      },
      error: function(jqXHR) {
        console.error("[TaskBoard] Error retrieving complete user data:", jqXHR.status, jqXHR.responseText);
        callback(null);
      }
    });
  }

  // Load user's taskboard data
  function loadTaskBoardUserData(userId, callback) {
    console.log(`[TaskBoard] Loading taskboard data for user ID: ${userId}`);
    if (!userId) {
        console.error("[TaskBoard] Cannot load taskboard data: userId is missing.");
        callback(null);
        return;
    }

    $.ajax({
      url: `${KNACK_API_URL}/objects/${TASKBOARD_OBJECT}/records`,
      type: 'GET',
      headers: getKnackHeaders(), // Use helper function
      data: {
        format: 'raw',
        rows_per_page: 1, // Only need one record
        filters: JSON.stringify({
          match: 'and',
          rules: [{ field: FIELD_MAPPING.userId, operator: 'is', value: userId }]
        })
      },
      success: function(response) {
        debugLog("[TaskBoard] TaskBoard data search response:", response);
        if (response && response.records && response.records.length > 0) {
          const record = response.records[0];
          console.log(`[TaskBoard] Found existing taskboard record: ${record.id}`);
          let userData = {
            recordId: record.id,
            boardData: safeParseJSON(record[FIELD_MAPPING.boardData]) || {},
            lastSaved: record[FIELD_MAPPING.lastSaved]
          };
          callback(userData);
        } else {
          console.log(`[TaskBoard] No existing taskboard record found for user ${userId}, creating new one...`);
          createTaskBoardUserRecord(userId, function(success, newRecordId) {
            if (success && newRecordId) {
              console.log(`[TaskBoard] New record created with ID: ${newRecordId}`);
              callback({
                recordId: newRecordId,
                boardData: {},
                lastSaved: null // No save yet for new record
              });
            } else {
              console.error(`[TaskBoard] Failed to create new taskboard record for user ${userId}.`);
              callback(null);
            }
          });
        }
      },
      error: function(jqXHR) {
        console.error("[TaskBoard] Error loading taskboard user data:", jqXHR.status, jqXHR.responseText);
        callback(null);
      }
    });
  }

  // Create a new taskboard user record
  function createTaskBoardUserRecord(userId, callback) {
    console.log("[TaskBoard] Creating new taskboard user record for:", userId);
    const user = window.currentKnackUser;

    if (!user || !user.email) { // Check essential fields
      console.error("[TaskBoard] Cannot create record: window.currentKnackUser is not defined or missing email.");
      callback(false, null);
      return;
    }

    // Basic data structure for a new record
    const data = {
      [FIELD_MAPPING.userId]: userId,
      [FIELD_MAPPING.userEmail]: user.email || "",
      [FIELD_MAPPING.userName]: user.name || "",
      [FIELD_MAPPING.lastSaved]: new Date().toISOString(),
      [FIELD_MAPPING.boardData]: JSON.stringify({})
    };

    // Add connection fields if valid IDs exist on the currentUser object
    // These IDs should have been derived during initialization
    if (window.currentKnackUser.account) data[FIELD_MAPPING.account] = window.currentKnackUser.account; // Use derived/complete user data
    if (window.currentKnackUser.vespaCustomer) data[FIELD_MAPPING.vespaCustomer] = window.currentKnackUser.vespaCustomer; // Use derived/complete user data

    debugLog("[TaskBoard] CREATING NEW RECORD PAYLOAD", data);

    $.ajax({
      url: `${KNACK_API_URL}/objects/${TASKBOARD_OBJECT}/records`,
      type: 'POST',
      headers: getKnackHeaders(), // Use helper function
      data: JSON.stringify(data),
      success: function(response) {
        console.log("[TaskBoard] Successfully created user record:", response);
        // Ensure response has an ID
        if (response && response.id) {
            callback(true, response.id);
        } else {
            console.error("[TaskBoard] Record creation API call succeeded but response missing ID.", response);
            callback(false, null);
        }
      },
      error: function(jqXHR) {
        console.error("[TaskBoard] Error creating user record:", jqXHR.status, jqXHR.responseText);
        callback(false, null);
      }
    });
  }

  // Handle token refresh request from React app
  function handleTokenRefresh(iframeWindow) {
    console.log("[TaskBoard] Handling token refresh request from React app");
    try {
      const currentToken = Knack.getUserToken();
      if (!currentToken) {
        console.error("[TaskBoard] Cannot get token from Knack");
        if (iframeWindow) iframeWindow.postMessage({ type: "AUTH_REFRESH_RESULT", success: false, error: "Token not available from Knack" }, taskboardAppUrl); // Use specific origin
        return;
      }
      if (iframeWindow) iframeWindow.postMessage({ type: "AUTH_REFRESH_RESULT", success: true, token: currentToken }, taskboardAppUrl); // Use specific origin
      console.log("[TaskBoard] Successfully sent current token for refresh");
    } catch (error) {
      console.error("[TaskBoard] Error refreshing token:", error);
      if (iframeWindow) iframeWindow.postMessage({ type: "AUTH_REFRESH_RESULT", success: false, error: error.message || "Unknown error refreshing token" }, taskboardAppUrl); // Use specific origin
    }
  }

  // Handle 'SAVE_DATA' request from React app
  function handleSaveDataRequest(data, iframeWindow) {
    console.log("[TaskBoard] Handling SAVE_DATA request");
    if (!data || !data.recordId) {
      console.error("[TaskBoard] SAVE_DATA request missing recordId.");
      if (iframeWindow) iframeWindow.postMessage({ type: 'SAVE_RESULT', success: false, error: "Missing recordId" }, taskboardAppUrl); // Use specific origin
      return;
    }

    const updateData = {
      [FIELD_MAPPING.lastSaved]: new Date().toISOString(),
      [FIELD_MAPPING.boardData]: JSON.stringify(data.boardData || {}) // Ensure boardData exists
    };

    debugLog("[TaskBoard] SAVE_DATA payload:", updateData);

    $.ajax({
      url: `${KNACK_API_URL}/objects/${TASKBOARD_OBJECT}/records/${data.recordId}`,
      type: 'PUT',
      headers: getKnackHeaders(), // Use helper function
      data: JSON.stringify(updateData),
      success: function() {
        console.log(`[TaskBoard] SAVE_DATA for record ${data.recordId} completed successfully.`);
        if (iframeWindow) iframeWindow.postMessage({ type: 'SAVE_RESULT', success: true, timestamp: new Date().toISOString() }, taskboardAppUrl); // Use specific origin
      },
      error: function(jqXHR) {
        console.error(`[TaskBoard] SAVE_DATA failed for record ${data.recordId}:`, jqXHR.status, jqXHR.responseText);
        if (iframeWindow) iframeWindow.postMessage({
          type: 'SAVE_RESULT',
          success: false,
          error: jqXHR.responseText || 'Unknown save error'
        }, taskboardAppUrl); // Use specific origin
      }
    });
  }

  // Handle request for updated data from React app
  function handleDataUpdateRequest(messageData, iframeWindow) {
    console.log("[TaskBoard] Handling REQUEST_UPDATED_DATA request", messageData);
    const userId = window.currentKnackUser?.id;
    let recordId = null;
    if (typeof messageData === 'object' && messageData !== null) {
      recordId = messageData.recordId || messageData.data?.recordId;
    }
    console.log("[TaskBoard] Extracted recordId for data update request:", recordId);

    if (!userId) {
      console.error("[TaskBoard] Cannot refresh data - user ID not found.");
      if (iframeWindow) iframeWindow.postMessage({ type: 'DATA_REFRESH_ERROR', error: 'User ID not found' }, taskboardAppUrl); // Use specific origin
      return;
    }

    loadTaskBoardUserData(userId, function(userData) {
      if (userData && iframeWindow) {
        // Log warning if loaded ID doesn't match requested ID
        if (recordId && userData.recordId !== recordId) {
           console.warn(`[TaskBoard] Loaded data record ID (${userData.recordId}) does not match requested record ID (${recordId}). Sending loaded data anyway.`);
        }
        console.log("[TaskBoard] Sending refreshed data to React app");
        iframeWindow.postMessage({
          type: 'KNACK_DATA', // Consistent type
          boardData: userData.boardData || {},
          recordId: userData.recordId,
          lastSaved: userData.lastSaved,
          timestamp: new Date().toISOString()
        }, taskboardAppUrl); // Use specific origin
      } else if (iframeWindow) {
        console.error("[TaskBoard] Error loading updated data or iframe invalid.");
        iframeWindow.postMessage({ type: 'DATA_REFRESH_ERROR', error: 'Failed to load data' }, taskboardAppUrl); // Use specific origin
      }
    });
  }

  // Handle record ID request
  function handleRecordIdRequest(data, iframeWindow) {
    console.log("[TaskBoard] Handling REQUEST_RECORD_ID request");
    const userId = window.currentKnackUser?.id;
    if (!userId) {
      console.error("[TaskBoard] Cannot get record ID - user ID not found.");
      if (iframeWindow) iframeWindow.postMessage({ type: 'RECORD_ID_ERROR', error: 'User ID not found' }, taskboardAppUrl); // Use specific origin
      return;
    }

    loadTaskBoardUserData(userId, function(userData) {
      if (userData && userData.recordId && iframeWindow) {
        console.log(`[TaskBoard] Responding with record ID: ${userData.recordId}`);
        iframeWindow.postMessage({
          type: 'RECORD_ID_RESPONSE',
          recordId: userData.recordId,
          timestamp: new Date().toISOString()
        }, taskboardAppUrl); // Use specific origin
      } else if (iframeWindow) {
        console.error(`[TaskBoard] Could not find or create record ID for user ${userId}`);
        iframeWindow.postMessage({
          type: 'RECORD_ID_ERROR',
          error: 'Record ID not found or could not be created',
          timestamp: new Date().toISOString()
        }, taskboardAppUrl); // Use specific origin
      }
    });
  }

  // Continue initialization after potentially fetching complete user data
  // This function now sets up the iframe and message listener
  function continueInitialization(userToken, appId /* Removed config param */) {
    const currentUser = window.currentKnackUser;
    if (!currentUser) {
        console.error("[TaskBoard] Cannot continue initialization, currentKnackUser is not defined.");
        return;
    }

    // Extract and store connection field IDs safely
    currentUser.emailId = extractValidRecordId(currentUser.id);
    currentUser.schoolId = extractValidRecordId(currentUser.school || currentUser.field_122); // Check common school field names
    currentUser.teacherId = extractValidRecordId(currentUser.tutor); // Assuming tutor field ID is consistent
    currentUser.roleId = extractValidRecordId(currentUser.role);
    // Add other specific connection IDs if needed
    currentUser.account = extractValidRecordId(currentUser.account); // Extract Account ID
    currentUser.vespaCustomer = extractValidRecordId(currentUser.vespaCustomer); // Extract Vespa Customer ID

    debugLog("[TaskBoard] FINAL CONNECTION FIELD IDs", {
      emailId: currentUser.emailId,
      schoolId: currentUser.schoolId,
      teacherId: currentUser.teacherId,
      roleId: currentUser.roleId,
      account: currentUser.account,
      vespaCustomer: currentUser.vespaCustomer
    });

    // Find or create container for the app using the globally set elementSelector
    let container = document.querySelector(elementSelector);
    // Fallback selectors (using sceneKey and viewKey from config)
    if (!container) container = document.querySelector('.kn-rich-text'); // Generic fallback
    if (!container && viewKey) {
      const viewElement = document.getElementById(viewKey) || document.querySelector('.' + viewKey);
      if (viewElement) {
        console.log(`[TaskBoard] Creating container inside ${viewKey}`);
        container = document.createElement('div');
        container.id = 'taskboard-app-container-generated';
        viewElement.appendChild(container);
      }
    }
    // Final fallback to scene
    if (!container && sceneKey) {
      const sceneElement = document.getElementById('kn-' + sceneKey); // Knack scene IDs often prefixed
      if (sceneElement) {
        console.log(`[TaskBoard] Creating container inside ${sceneKey}`);
        container = document.createElement('div');
        container.id = 'taskboard-app-container-generated';
        sceneElement.appendChild(container);
      } else {
        console.error(`[TaskBoard] Cannot find any suitable container for the app using selector: ${elementSelector} or fallbacks.`);
        return;
      }
    }
    if (!container) {
        console.error(`[TaskBoard] Final check: Still cannot find container. Aborting.`);
        return;
    }

    container.innerHTML = ''; // Clear existing content

    // Loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'taskboard-loading-indicator';
    loadingDiv.innerHTML = '<p>Loading VESPA TaskBoard...</p>';
    loadingDiv.style.padding = '20px';
    loadingDiv.style.textAlign = 'center';
    container.appendChild(loadingDiv);

    // Create iframe using the globally set taskboardAppUrl
    const iframe = document.createElement('iframe');
    iframe.id = 'taskboard-app-iframe';
    iframe.style.width = '100%';
    iframe.style.minHeight = '800px'; // Make configurable?
    iframe.style.border = 'none';
    iframe.style.display = 'none'; // Keep hidden until APP_READY
    iframe.src = taskboardAppUrl;
    container.appendChild(iframe);

    // Setup listener ONCE
    // Ensure previous listeners are removed if re-initializing might occur
    // window.removeEventListener('message', messageHandler); // Uncomment if needed

    const messageHandler = function(event) {
      // Security Check: Origin and Source
      if (event.source !== iframe.contentWindow || event.origin !== new URL(taskboardAppUrl).origin) {
        // console.warn("[TaskBoard] Ignoring message from unexpected source or origin:", event.origin);
        return;
      }

      if (!event.data || !event.data.type) {
        console.warn("[TaskBoard] Ignoring message with invalid format:", event.data);
        return;
      }

      const { type, data } = event.data;
      const iframeWindow = iframe.contentWindow;

      if (type !== 'PING') { // Reduce console noise
        console.log(`[TaskBoard] Received message type: ${type}`);
      }

      if (type === 'APP_READY') {
        // Prevent handling duplicate APP_READY messages
        if (appReadyReceived) {
          console.log("[TaskBoard] Ignoring duplicate APP_READY message");
          return;
        }
        appReadyReceived = true;
        console.log("[TaskBoard] React app reported APP_READY.");

        const userForApp = window.currentKnackUser; // Use global user object

        if (!userForApp || !userForApp.id) {
          console.error("[TaskBoard] Cannot send initial info: Current Knack user data not ready or missing ID at APP_READY.");
          if (iframeWindow) {
              iframeWindow.postMessage({ type: 'KNACK_INIT_ERROR', error: 'Knack user data not available' }, new URL(taskboardAppUrl).origin);
          }
          return;
        }

        loadingDiv.innerHTML = '<p>Loading User Data...</p>';

        loadTaskBoardUserData(userForApp.id, function(userData) {
          // Check if iframe is still valid
          if (iframe.contentWindow && iframeWindow && iframe.contentWindow === iframeWindow) {
            const initialData = {
              type: 'KNACK_USER_INFO',
              data: {
                id: userForApp.id,
                email: userForApp.email,
                name: userForApp.name || '',
                token: userToken, // Use token from outer scope
                appId: appId,     // Use Knack's internal appId
                userData: userData || {}, // Send loaded board data
                // Send derived connection IDs
                emailId: userForApp.emailId,
                schoolId: userForApp.schoolId,
                teacherId: userForApp.teacherId,
                roleId: userForApp.roleId,
                account: userForApp.account,
                vespaCustomer: userForApp.vespaCustomer
              }
            };
            debugLog("--> Sending KNACK_USER_INFO to React App", initialData.data);
            iframeWindow.postMessage(initialData, new URL(taskboardAppUrl).origin); // Use specific origin

            // Show iframe after sending initial data
            loadingDiv.style.display = 'none';
            iframe.style.display = 'block';
            console.log("[TaskBoard] initialized and visible.");
          } else {
            console.warn("[TaskBoard] Iframe window no longer valid when sending initial data.");
          }
        });
      } else {
        // Route other messages using the specific origin
        handleMessageRouter(type, data, iframeWindow);
      }
    };

    window.addEventListener('message', messageHandler);
    // Store handler reference if needed: window.taskboardMessageHandler = messageHandler;
    console.log("[TaskBoard] initialization sequence complete. Waiting for APP_READY from iframe.");
  }

  // Central Message Router
  function handleMessageRouter(type, data, iframeWindow) {
    if (!type) {
      console.warn("[TaskBoard] Received message without type.");
      return;
    }
    if (!iframeWindow) {
      console.error("[TaskBoard] iframeWindow is missing in handleMessageRouter. Cannot send response.");
      return;
    }
    // Use taskboardAppUrl (initialized globally) as the target origin
    const targetOrigin = new URL(taskboardAppUrl).origin;

    console.log(`[TaskBoard] Routing message type: ${type}`);

    switch (type) {
      case 'SAVE_DATA':
        handleSaveDataRequest(data, iframeWindow); // Origin is used inside the function now
        break;
      case 'REQUEST_UPDATED_DATA':
        handleDataUpdateRequest(data, iframeWindow); // Origin is used inside the function now
        break;
      case 'REQUEST_TOKEN_REFRESH':
        handleTokenRefresh(iframeWindow); // Origin is used inside the function now
        break;
      case 'REQUEST_RECORD_ID':
        handleRecordIdRequest(data, iframeWindow); // Origin is used inside the function now
        break;
      case 'AUTH_CONFIRMED':
        console.log("[TaskBoard] React App confirmed auth.");
        const loadingIndicator = document.getElementById('taskboard-loading-indicator');
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        const appIframe = document.getElementById('taskboard-app-iframe');
        if (appIframe) appIframe.style.display = 'block';
        break;
      default:
        console.warn(`[TaskBoard] Unhandled message type: ${type}`);
    }
  }

})(); // End IIFE
