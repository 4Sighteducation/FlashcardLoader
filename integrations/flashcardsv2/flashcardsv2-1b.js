
// Establish namespace if not already created
window.VESPA = window.VESPA || {};
window.VESPA.Flashcards = window.VESPA.Flashcards || {};

// Configuration module
(function() {
    'use strict';

    // Reference the configuration namespace
    var Config = window.VESPA.Flashcards.config = window.VESPA.Flashcards.config || {};

    /**
     * Knack API and object constants
     */
    Config.KNACK_API_URL = 'https://api.knack.com/v1';
    Config.FLASHCARD_OBJECT = 'object_116'; // Flashcard storage object
    Config.USER_OBJECT = 'object_3'; // Knack user object
    Config.TRANSLATION_CACHE_OBJECT = 'object_117'; // Translation cache object

    /**
     * Field mappings from our internal data model to Knack fields
     */
    Config.FIELD_MAPPING = {
        // User fields
        userId: 'field_3212',
        userEmail: 'field_3245',
        userName: 'field_3010',
        accountConnection: 'field_3214',
        vespaCustomerConnection: 'field_3213',
        tutorConnection: 'field_3215',
        staffadminConnection: 'field_3244',
        userRole: 'field_73',
        
        // Card data fields
        cardBankData: 'field_3220',
        lastSaved: 'field_3222',
        box1Data: 'field_3233',
        box2Data: 'field_3234',
        box3Data: 'field_3235',
        box4Data: 'field_3236',
        box5Data: 'field_3237',
        colorMapping: 'field_3238',
        topicLists: 'field_3239',
        metaData: 'field_3240',
        schemaVersion: 'field_3242',
        topicMetadata: 'field_3243',
        
        // Translation fields
        sourceText: 'field_3247',
        targetLanguage: 'field_3246',
        translatedText: 'field_3248',
        useCount: 'field_3249',
        lastUsed: 'field_3250'
    };

    /**
     * Translation field mappings (for ease of reference)
     */
    Config.TRANSLATION_FIELDS = {
        sourceText: Config.FIELD_MAPPING.sourceText,
        targetLanguage: Config.FIELD_MAPPING.targetLanguage,
        translatedText: Config.FIELD_MAPPING.translatedText,
        useCount: Config.FIELD_MAPPING.useCount,
        lastUsed: Config.FIELD_MAPPING.lastUsed
    };

    /**
     * Current schema version
     */
    Config.SCHEMA_VERSION = '2.0';

    /**
     * Default configuration for the app - these can be overridden by window.VESPA_CONFIG
     */
    Config.DEFAULT_APP_CONFIG = {
        minHeight: '800px',
        elementSelector: '.kn-rich-text', // Default element selector
        debug: false, // Debug mode off by default
        cacheSize: 500, // Number of translations to cache in localStorage
        retryLimit: 3, // Number of times to retry API calls
        retryDelay: 1000, // Initial delay for retry (doubles each retry)
        
        // API URLs and endpoints with defaults
        knackAppId: '',
        knackApiKey: '',
        appUrl: '',
        azureTranslatorKey: '',
        azureTranslatorRegion: 'ukwest',
        azureTranslatorEndpoint: 'https://api.cognitive.microsofttranslator.com'
    };

    /**
     * Box scheduling configuration (in milliseconds)
     */
    Config.BOX_SCHEDULE = {
        box1: 24 * 60 * 60 * 1000, // 1 day
        box2: 2 * 24 * 60 * 60 * 1000, // 2 days
        box3: 3 * 24 * 60 * 60 * 1000, // 3 days
        box4: 7 * 24 * 60 * 60 * 1000, // 7 days
        box5: 30 * 24 * 60 * 60 * 1000 // 30 days
    };

    // Log module loaded
    console.log("VESPA Flashcards: Config module loaded");
})();


// --- End of Config module ---
// --- Start of PrintUtils module ---

// Establish namespace if not already created
window.VESPA = window.VESPA || {};
window.VESPA.Flashcards = window.VESPA.Flashcards || {};

// Utilities module
(function() {
    'use strict';

    // Reference the utilities namespace
    var Utils = window.VESPA.Flashcards.utils = window.VESPA.Flashcards.utils || {};
    
    // Reference the config namespace
    var Config = window.VESPA.Flashcards.config;

    /**
     * Enhanced debug logging with formatting
     * @param {string} title - Log title
     * @param {any} data - Data to log
     * @returns {any} - Returns the data for chaining
     */
    Utils.debugLog = function(title, data) {
        // Check if debugging is enabled
        if (window.VESPA_CONFIG && window.VESPA_CONFIG.debug) {
            console.log(`%c[VESPA Flashcards] ${title}`, 'color: #5d00ff; font-weight: bold; font-size: 12px;');
            
            // Attempt to deep clone for logging to avoid showing proxies or complex objects directly
            try {
                console.log(JSON.parse(JSON.stringify(data, null, 2)));
            } catch (e) {
                console.log("Data could not be fully serialized for logging:", data); // Log original if clone fails
            }
        }
        return data; // Return data for chaining
    };

    /**
     * Get Knack API headers
     * @returns {Object} - API headers object
     */
    Utils.getKnackHeaders = function() {
        // Try multiple configuration sources in order of priority
        const directConfig = window.VESPA_CONFIG || {};
        const runtimeConfig = window.VESPA.Flashcards.config.RUNTIME || {};
        const instanceConfig = window.VESPA.Flashcards.app.instance?.config || {};
        
        // Use the first valid credentials found from any source
        const knackAppId = directConfig.knackAppId || runtimeConfig.knackAppId || instanceConfig.knackAppId || '';
        const knackApiKey = directConfig.knackApiKey || runtimeConfig.knackApiKey || instanceConfig.knackApiKey || '';
        
        // Add debug logging to help troubleshoot
        if (!knackAppId || !knackApiKey) {
            console.warn("[Utils] Missing Knack credentials in configuration.", { 
                directConfig: Boolean(directConfig.knackAppId), 
                runtimeConfig: Boolean(runtimeConfig.knackAppId),
                instanceConfig: Boolean(instanceConfig.knackAppId)
            });
        }
        
        // Ensure Knack and getUserToken are available
        if (typeof Knack === 'undefined' || typeof Knack.getUserToken !== 'function') {
            console.error("[Utils] Knack object or getUserToken function not available.");
            throw new Error("Knack authentication context not available.");
        }
        
        const token = Knack.getUserToken();
        if (!token) {
            console.warn("[Utils] Knack user token is null or undefined. API calls may fail.");
        }
        
        return {
            'X-Knack-Application-Id': knackAppId,
            'X-Knack-REST-API-Key': knackApiKey,
            'Authorization': token || '', // Send empty string if token is null
            'Content-Type': 'application/json'
        };
    };

    /**
     * Generic retry function for API calls
     * @param {Function} apiCall - Function that returns a Promise
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} delay - Initial delay in ms
     * @returns {Promise<any>} - Promise that resolves with the API response
     */
    Utils.retryApiCall = function(apiCall, maxRetries, delay) {
        // Default values from config or hardcoded defaults
        maxRetries = maxRetries || (window.VESPA_CONFIG && window.VESPA_CONFIG.retryLimit) || 3;
        delay = delay || (window.VESPA_CONFIG && window.VESPA_CONFIG.retryDelay) || 1000;
        
        return new Promise((resolve, reject) => {
            const attempt = (retryCount) => {
                apiCall()
                    .then(resolve)
                    .catch((error) => {
                        const attemptsMade = retryCount + 1;
                        console.warn(`API call failed (Attempt ${attemptsMade}/${maxRetries}):`, error.status, error.statusText, error.responseText);
                        
                        // Retry on any failure up to maxRetries
                        if (retryCount < maxRetries - 1) { // Retry maxRetries-1 times
                            const retryDelay = delay * Math.pow(2, retryCount); // Exponential backoff
                            console.log(`Retrying API call in ${retryDelay}ms...`);
                            setTimeout(() => attempt(retryCount + 1), retryDelay);
                        } else {
                            console.error(`API call failed after ${maxRetries} attempts.`);
                            reject(error); // Max retries reached
                        }
                    });
            };
            attempt(0);
        });
    };

    /**
     * Base64 encode a string with safe error handling
     * @param {string} str - String to encode
     * @returns {string} - Base64 encoded string
     */
    Utils.safeBase64Encode = function(str) {
        try {
            // For browsers
            return btoa(encodeURIComponent(str));
        } catch (e) {
            console.error('Error in base64 encoding:', e);
            // Return a fallback that's at least somewhat encoded
            return str;
        }
    };

    /**
     * Base64 decode a string with safe error handling
     * @param {string} str - Base64 encoded string
     * @returns {string} - Decoded string
     */
    Utils.safeBase64Decode = function(str) {
        if (!str) return '';
        try {
            // For browsers
            return decodeURIComponent(atob(str));
        } catch (e) {
            console.error('Error in base64 decoding:', e);
            return str;
        }
    };

    /**
     * Safely encode URI component with base64 fallback for large strings
     * @param {string} str - String to encode
     * @returns {string} - Encoded string
     */
    Utils.safeEncodeURIComponent = function(str) {
        try {
            // For complex, long strings, use Base64 encoding
            if (typeof str === 'string' && (str.length > 4000 || /[^\u0000-\u007f]/.test(str))) {
                return 'B64:' + Utils.safeBase64Encode(str);
            }
            return encodeURIComponent(String(str));
        } catch (e) {
            console.error("Error encoding URI component:", e, "Input:", str);
            // Try Base64 as a fallback
            try {
                return 'B64:' + Utils.safeBase64Encode(String(str));
            } catch (e2) {
                console.error("Base64 encoding fallback failed:", e2);
                return String(str);
            }
        }
    };

    /**
     * Safe URI component decoding function
     * @param {string} str - Encoded string
     * @returns {string} - Decoded string
     */
    Utils.safeDecodeURIComponent = function(str) {
        if (!str) return str;
        
        // Check if it's Base64 encoded
        if (typeof str === 'string' && str.startsWith('B64:')) {
            try {
                return Utils.safeBase64Decode(str.substring(4)); // Skip "B64:" prefix
            } catch (e) {
                console.error("Failed to decode B64-encoded string:", e);
                // Fall through to standard decoding as a fallback
            }
        }
        
        // Check if it looks like it needs decoding
        if (typeof str === 'string' && !str.includes('%')) return str;
        try {
            // Handle plus signs as spaces which sometimes occur
            return decodeURIComponent(str.replace(/\+/g, ' '));
        } catch (error) {
            console.error("Error decoding URI component:", error, "String:", String(str).substring(0, 100));
            try {
                // Attempt to fix potentially invalid % sequences
                const cleaned = String(str).replace(/%(?![0-9A-Fa-f]{2})/g, '%25');
                return decodeURIComponent(cleaned.replace(/\+/g, ' '));
            } catch (secondError) {
                console.error("Second attempt to decode failed:", secondError);
                return String(str); // Return original string if all fails
            }
        }
    };

    /**
     * Parse field data with safe error handling
     * @param {string} fieldValue - Field value to parse
     * @param {string} fieldName - Field name for better error messages
     * @returns {any} - Parsed field value
     */
    Utils.parseField = function(fieldValue, fieldName = 'Unknown field') {
        if (!fieldValue) return '';
        
        try {
            // First try standard decoding
            const decodedValue = Utils.safeDecodeURIComponent(fieldValue);
            
            // Try to parse JSON if it looks like JSON
            if ((decodedValue.startsWith('{') && decodedValue.endsWith('}')) || 
                (decodedValue.startsWith('[') && decodedValue.endsWith(']'))) {
                return Utils.safeParseJSON(decodedValue);
            }
            
            return decodedValue;
        } catch (decodeError) {
            console.error(`Error decoding ${fieldName}:`, decodeError);
            
            // Check if this might be base64 encoded
            if (typeof fieldValue === 'string' && /^[A-Za-z0-9+/=]+$/.test(fieldValue)) {
                try {
                    const decoded = Utils.safeBase64Decode(fieldValue);
                    return Utils.safeParseJSON(decoded, fieldValue);
                } catch (base64Error) {
                    console.error(`Base64 decode failed for ${fieldName}:`, base64Error);
                }
            }
            
            // If all else fails, return original value
            console.warn(`Using raw value for ${fieldName} due to decode errors`);
            return fieldValue;
        }
    };

    /**
     * Safe JSON parsing function
     * @param {string} jsonString - JSON string to parse
     * @param {any} defaultVal - Default value if parsing fails
     * @returns {any} - Parsed JSON or default value
     */
    Utils.safeParseJSON = function(jsonString, defaultVal = null) {
        if (!jsonString) return defaultVal;
        try {
            // If it's already an object, return it directly
            if (typeof jsonString === 'object' && jsonString !== null) return jsonString;
            // Attempt standard parsing
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn("Initial JSON parse failed:", error);
            // Attempt recovery for common issues
            try {
                // Remove potential leading/trailing whitespace or BOM
                const cleanedString = String(jsonString).trim().replace(/^\uFEFF/, '');
                // Try common fixes like escaped quotes, trailing commas
                const recovered = cleanedString
                    .replace(/\\"/g, '"') // Fix incorrectly escaped quotes
                    .replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas
                const result = JSON.parse(recovered);
                console.log("JSON recovery successful.");
                return result;
            } catch (secondError) {
                console.error("JSON recovery failed:", secondError);
                // Return the default value if all parsing fails
                return defaultVal;
            }
        }
    };

    /**
     * Check if a string is a valid Knack record ID
     * @param {string} id - ID to check
     * @returns {boolean} - Whether the ID is valid
     */
    Utils.isValidKnackId = function(id) {
        if (!id) return false;
        return typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id);
    };

    /**
     * Clean HTML from ID string
     * @param {string} idString - ID string that may contain HTML
     * @returns {string|null} - Cleaned ID or null
     */
    Utils.cleanHtmlFromId = function(idString) {
        if (!idString) return null;
        if (typeof idString === 'object' && idString.id) {
            return Utils.cleanHtmlFromId(idString.id);
        }
        
        const str = String(idString);
        if (str.includes('<')) {
            console.warn("Cleaning HTML from potential ID:", str);
            // Match Knack's span format: <span class="kn-tag ..."><a href=...>ID</a></span>
            // Or simpler formats like <span class="...">ID</span>
            const spanMatch = str.match(/<span[^>]*>([^<]+)<\/span>/) || str.match(/<a[^>]*>([^<]+)<\/a>/);
            if (spanMatch && spanMatch[1]) {
                const potentialId = spanMatch[1].trim();
                console.log("Extracted potential ID from HTML:", potentialId);
                return potentialId;
            }
            // Fallback: strip all HTML tags
            const stripped = str.replace(/<[^>]+>/g, '').trim();
            console.log("Stripped HTML:", stripped);
            return stripped;
        }
        return str;
    };

    /**
     * Extract a valid record ID from various formats
     * @param {any} value - Value that may contain a record ID
     * @returns {string|null} - Extracted record ID or null
     */
    Utils.extractValidRecordId = function(value) {
        if (!value) return null;

        // If it's already an object (like Knack connection field data)
        if (typeof value === 'object') {
            // Check common properties: 'id', 'identifier', or if it's an array with one object
            let idToCheck = null;
            if (value.id) {
                idToCheck = value.id;
            } else if (value.identifier) {
                idToCheck = value.identifier;
            } else if (Array.isArray(value) && value.length === 1 && value[0].id) {
                idToCheck = value[0].id;
            } else if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'string') {
                idToCheck = value[0];
            }

            if (idToCheck) {
                const cleanedId = Utils.cleanHtmlFromId(idToCheck); // Clean potential HTML
                return Utils.isValidKnackId(cleanedId) ? cleanedId : null;
            }
        }

        // If it's a string
        if (typeof value === 'string') {
            const cleanedId = Utils.cleanHtmlFromId(value); // Clean potential HTML
            return Utils.isValidKnackId(cleanedId) ? cleanedId : null;
        }

        return null;
    };

    /**
     * Safely remove HTML from strings
     * @param {string} value - String to sanitize
     * @returns {string} - Sanitized string
     */
    Utils.sanitizeField = function(value) {
        if (value === null || value === undefined) return "";
        const strValue = String(value);
        // Remove HTML tags using a non-greedy match
        let sanitized = strValue.replace(/<[^>]*?>/g, "");
        // Remove common markdown characters
        sanitized = sanitized.replace(/[*_~`#]/g, "");
        // Replace HTML entities (basic set)
        sanitized = sanitized
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&nbsp;/g, " "); // Replace non-breaking space
        return sanitized.trim();
    };

    /**
     * Handle token refresh request from React app
     * @param {Window} iframeWindow - Reference to the iframe window
     */
    Utils.handleTokenRefresh = function(iframeWindow) {
        console.log("Handling token refresh request from React app");
        try {
            const currentToken = Knack.getUserToken();
            if (!currentToken) {
                console.error("Cannot get token from Knack");
                if (iframeWindow) iframeWindow.postMessage({ type: "AUTH_REFRESH_RESULT", success: false, error: "Token not available from Knack" }, "*");
                return;
            }
            // Send the current token back
            if (iframeWindow) iframeWindow.postMessage({ type: "AUTH_REFRESH_RESULT", success: true, token: currentToken }, "*");
            console.log("Successfully sent current token for refresh");
        } catch (error) {
            console.error("Error refreshing token:", error);
            if (iframeWindow) iframeWindow.postMessage({ type: "AUTH_REFRESH_RESULT", success: false, error: error.message || "Unknown error refreshing token" }, "*");
        }
    };

    /**
     * Get contrast color (black or white) based on background color
     * @param {string} hexColor - Hex color code
     * @returns {string} - '#FFFFFF' or '#000000'
     */
    Utils.getContrastColor = function(hexColor) {
        // Default to black if no color provided
        if (!hexColor || typeof hexColor !== 'string') {
            return '#000000';
        }
        
        // Remove # if present
        let hex = hexColor.replace('#', '');
        
        // Convert 3-char hex to 6-char
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        
        // Convert hex to RGB
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Calculate luminance - https://www.w3.org/TR/WCAG20-TECHS/G18.html
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Return white for dark colors, black for light colors
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    };

    // Log module loaded
    console.log("VESPA Flashcards: Utils module loaded");
})();
// --- End of PrintUtils module --- 
// --- Start of Data Processing module ---

// Establish namespace if not already created
window.VESPA = window.VESPA || {};
window.VESPA.Flashcards = window.VESPA.Flashcards || {};

// Data Processing module
(function() {
    'use strict';

    // Reference the data namespace
    var Data = window.VESPA.Flashcards.data = window.VESPA.Flashcards.data || {};
    
    // Reference the utilities namespace
    var Utils = window.VESPA.Flashcards.utils;
    
    // Reference the config namespace
    var Config = window.VESPA.Flashcards.config;

    /**
     * Split mixed array of items into topics and cards
     * @param {Array} items - Array of mixed items
     * @returns {Object} - Object with { topics, cards } arrays
     */
    Data.splitByType = function(items) {
        if (!Array.isArray(items)) {
            console.warn("[Data] splitByType called with non-array:", items);
            return { topics: [], cards: [] };
        }
        
        const topics = items.filter(item => item && (
            item.type === 'topic' || 
            item.isShell === true ||
            // Additional check - items without question/answer but with topic name/subject
            (!item.question && !item.answer && item.name && item.subject)
        ));
        
        const cards = items.filter(item => {
            // Ensure item exists and is not explicitly a topic/shell
            return item && 
                   item.type !== 'topic' && 
                   item.isShell !== true &&
                   // Additional check - items with question or answer are likely cards
                   (item.question || item.answer || item.front || item.back);
        });
        
        return { topics, cards };
    };

    /**
     * Detect if a card is multiple choice type
     * @param {Object} card - Card object
     * @returns {boolean} - Whether the card is multiple choice
     */
    Data.isMultipleChoiceCard = function(card) {
        // Check object exists and is a card
        if (!card || typeof card !== 'object' || card.type === 'topic') return false;

        // Explicit type check first
        if (card.questionType === 'multiple_choice') return true;

        // Presence of valid options array (at least one option)
        if (Array.isArray(card.options) && card.options.length > 0) {
            // Check if options have the expected structure (text, isCorrect)
            if (card.options.some(opt => opt && typeof opt.text === 'string' && typeof opt.isCorrect === 'boolean')) {
                return true;
            }
        }
        
        // Presence of valid savedOptions array (as backup check)
        if (Array.isArray(card.savedOptions) && card.savedOptions.length > 0) {
            if (card.savedOptions.some(opt => opt && typeof opt.text === 'string' && typeof opt.isCorrect === 'boolean')) {
                return true;
            }
        }

        // Legacy type field (should be handled by migration, but check just in case)
        if (card.type === 'multiple_choice') return true;

        return false; // Default to false
    };

    /**
     * Generate a unique ID with prefix
     * @param {string} prefix - ID prefix
     * @returns {string} - Unique ID
     */
    Data.generateId = function(prefix = 'item') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 10);
        return `${prefix}_${timestamp}_${random}`;
    };

    /**
     * Migrate legacy 'type' field used for question format to 'questionType'
     * @param {Object|Array} data - Data to migrate
     * @returns {Object|Array} - Migrated data
     */
    Data.migrateTypeToQuestionType = function(data) {
        if (!data) return data;
        
        // Handle arrays recursively
        if (Array.isArray(data)) {
            return data.map(item => Data.migrateTypeToQuestionType(item));
        }
        
        // Handle objects
        if (typeof data === 'object' && data !== null) {
            const newData = { ...data }; // Clone to avoid modifying original
            
            // Check if legacy type field indicates question format
            if (newData.type === 'multiple_choice' || newData.type === 'short_answer') {
                // Only migrate if 'questionType' isn't already set or is different
                if (!newData.questionType || newData.questionType !== newData.type) {
                    console.log(`[Migration] Migrating legacy type ('${newData.type}') to questionType for item: ${newData.id || 'unknown'}`);
                    newData.questionType = newData.type;
                }
                
                // IMPORTANT: Reset the 'type' field to 'card' as the legacy value is now redundant
                newData.type = 'card';
            }
            
            // Ensure 'type' is set for items that might be missing it
            if (!newData.type) {
                // Basic inference: if it has question/answer it's likely a card, otherwise maybe topic?
                if (newData.question || newData.answer || newData.front || newData.back) {
                    newData.type = 'card';
                    if(!newData.questionType) newData.questionType = 'short_answer'; // Default new cards
                } else if (newData.name && newData.subject) {
                    newData.type = 'topic'; // Likely a topic shell
                    newData.isShell = true; // Mark as shell to be sure
                }
            }
            
            return newData;
        }
        
        // Return primitives or other types as is
        return data;
    };

    /**
     * Standardize card data before saving or processing
     * @param {Array} cards - Array of cards to standardize
     * @returns {Array} - Array of standardized cards
     */
    Data.standardizeCards = function(cards) {
        if (!Array.isArray(cards)) {
            console.warn("[Data] standardizeCards called with non-array:", cards);
            return [];
        }
        
        return cards.map(card => {
            if (!card || typeof card !== 'object') {
                console.warn("[Data] Skipping invalid item in cards array:", card);
                return null; // Handle null/undefined/non-object entries
            }
            
            try {
                // Clone to avoid modifying original
                const cleanCard = JSON.parse(JSON.stringify(card));
                
                // Define default structure
                const standardCard = {
                    id: cleanCard.id || Data.generateId('card'),
                    subject: Utils.sanitizeField(cleanCard.subject || 'General'),
                    topic: Utils.sanitizeField(cleanCard.topic || 'General'),
                    examBoard: Utils.sanitizeField(cleanCard.examBoard || ''),
                    examType: Utils.sanitizeField(cleanCard.examType || ''),
                    topicPriority: parseInt(cleanCard.topicPriority || 0, 10) || 3, // Ensure number with fallback
                    question: Utils.sanitizeField(cleanCard.question || cleanCard.front || ''),
                    answer: Utils.sanitizeField(cleanCard.answer || cleanCard.back || ''),
                    keyPoints: Array.isArray(cleanCard.keyPoints) ? cleanCard.keyPoints.map(kp => Utils.sanitizeField(kp)) : [],
                    detailedAnswer: Utils.sanitizeField(cleanCard.detailedAnswer || ''),
                    additionalInfo: Utils.sanitizeField(cleanCard.additionalInfo || cleanCard.notes || ''),
                    cardColor: cleanCard.cardColor || cleanCard.color || '#cccccc', // Default grey
                    subjectColor: cleanCard.subjectColor || '', // Add subjectColor field
                    textColor: cleanCard.textColor || Utils.getContrastColor(cleanCard.cardColor || cleanCard.color || '#cccccc'),
                    boxNum: cleanCard.boxNum ? parseInt(cleanCard.boxNum, 10) : 1, // Ensure number, default 1
                    lastReviewed: cleanCard.lastReviewed || null, // Keep null if not set
                    nextReviewDate: cleanCard.nextReviewDate || new Date(Date.now() + 86400000).toISOString(), // Default +1 day
                    createdAt: cleanCard.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString(), // Always update timestamp
                    options: Array.isArray(cleanCard.options) ? cleanCard.options : [], // Ensure array
                    savedOptions: Array.isArray(cleanCard.savedOptions) ? cleanCard.savedOptions : [], // Ensure array
                    questionType: cleanCard.questionType || 'short_answer', // Default type
                    type: cleanCard.type || 'card' // Ensure type field exists ('card' or 'topic')
                };

                // Specific handling for 'topic' type (shells)
                if (standardCard.type === 'topic' || cleanCard.isShell === true) { // Check isShell flag too
                    standardCard.type = 'topic';
                    standardCard.name = Utils.sanitizeField(cleanCard.name || standardCard.topic); // Ensure name exists and is clean
                    standardCard.isShell = true;
                    // Determine isEmpty based on whether a 'cards' array exists and is empty
                    standardCard.isEmpty = !Array.isArray(cleanCard.cards) || cleanCard.cards.length === 0;
                    // Clear fields not relevant to topic shells
                    standardCard.question = '';
                    standardCard.answer = '';
                    standardCard.keyPoints = [];
                    standardCard.detailedAnswer = '';
                    standardCard.additionalInfo = '';
                    standardCard.boxNum = undefined; // Or null
                    standardCard.lastReviewed = undefined; // Or null
                    standardCard.nextReviewDate = undefined; // Or null
                    standardCard.questionType = undefined; // Or null
                    standardCard.options = [];
                    standardCard.savedOptions = [];
                } else {
                    // Ensure type is 'card' for actual flashcards
                    standardCard.type = 'card';
                    // Remove shell-specific flags if they accidentally ended up on a card
                    delete standardCard.isShell;
                    delete standardCard.isEmpty;
                    delete standardCard.name; // Cards use question/answer, not name
                }

                // Multiple Choice Handling (after type is determined)
                if (standardCard.type === 'card') { // Only apply MC logic to cards
                    const isMC = Data.isMultipleChoiceCard(cleanCard);
                    
                    if (isMC) {
                        standardCard.questionType = 'multiple_choice';
                        
                        // Restore or create options if missing
                        if (!standardCard.options || standardCard.options.length === 0) {
                            if (standardCard.savedOptions && standardCard.savedOptions.length > 0) {
                                console.log(`[Standardize] Restoring options from savedOptions for card ${standardCard.id}`);
                                standardCard.options = [...standardCard.savedOptions];
                            }
                        }
                        
                        // Backup options if they exist and differ from savedOptions
                        if (standardCard.options && standardCard.options.length > 0) {
                            // Basic check to avoid redundant saving if they are identical
                            try {
                                if (JSON.stringify(standardCard.options) !== JSON.stringify(standardCard.savedOptions)) {
                                    console.log(`[Standardize] Backing up options to savedOptions for card ${standardCard.id}`);
                                    standardCard.savedOptions = [...standardCard.options];
                                }
                            } catch (e) {
                                console.warn(`[Standardize] Error comparing options for backup on card ${standardCard.id}`, e);
                                // Save anyway if comparison fails
                                standardCard.savedOptions = [...standardCard.options];
                            }
                        }
                        
                        // Ensure options have required structure
                        standardCard.options = standardCard.options.map(opt => ({
                            text: Utils.sanitizeField(opt.text || ''), // Sanitize option text
                            isCorrect: Boolean(opt.isCorrect)   // Ensure boolean
                        }));
                    } else { // If not MC, ensure questionType is appropriate
                        standardCard.questionType = standardCard.questionType === 'multiple_choice' ? 'short_answer' : standardCard.questionType; // Reset if wrongly marked MC
                        // Clear options if it's not an MC card
                        standardCard.options = [];
                        standardCard.savedOptions = [];
                    }
                }

                return standardCard;
            } catch (error) {
                console.error("[Data] Error standardizing card:", error, "Card data:", card);
                return null; // Return null for cards that cause errors during standardization
            }
        }).filter(card => card !== null); // Filter out any null results from errors
    };

    /**
     * Ensure data is serializable (no circular references)
     * @param {any} data - Data to check/clean
     * @returns {any} - Serializable data
     */
    Data.ensureSerializable = function(data) {
        try {
            // Test serialization
            JSON.stringify(data);
            return data;
        } catch (e) {
            console.warn('[Data] Data contains circular references or non-serializable values. Stripping them.', e);
            const cache = new Set();
            try {
                return JSON.parse(JSON.stringify(data, (key, value) => {
                    if (typeof value === 'object' && value !== null) {
                        if (cache.has(value)) {
                            // Circular reference found, return undefined to omit key
                            return undefined; // Or return '[Circular]' string if preferred
                        }
                        // Store value in our collection
                        cache.add(value);
                    }
                    return value;
                }));
            } catch (parseError) {
                console.error("[Data] Failed to serialize data even after attempting to strip circular references:", parseError);
                // Last resort: Try to deeply clone primitive properties only
                if (Array.isArray(data)) {
                    return data.map(item => typeof item !== 'object' ? item : {});
                }
                if (typeof data === 'object' && data !== null) {
                    const result = {};
                    for (const key in data) {
                        if (typeof data[key] !== 'object') {
                            result[key] = data[key];
                        }
                    }
                    return result;
                }
                return data; // Return original data as a last resort
            }
        }
    };

    /**
     * Create an empty unified data container
     * @param {string} recordId - Record ID
     * @param {string} userId - User ID
     * @returns {Object} - Empty unified data container
     */
    Data.createEmptyUnifiedData = function(recordId, userId) {
        return {
            version: Config.SCHEMA_VERSION,
            lastUpdated: new Date().toISOString(),
            userId: userId || null,
            recordId: recordId || null,
            subjects: [],
            topics: [],
            cards: []
        };
    };

    /**
     * Generate color variations for topic shells
     * @param {string} baseColorHex - Base color in hex format
     * @param {number} count - Number of variations to generate
     * @returns {Array<string>} - Array of hex color codes
     */
    Data.generateShadeVariations = function(baseColorHex, count) {
        if (!baseColorHex || typeof baseColorHex !== 'string' || !baseColorHex.startsWith('#')) {
            console.warn("[Data] Invalid baseColorHex for generateShadeVariations:", baseColorHex);
            return Array(count).fill('#cccccc'); // Default grey
        }
        
        if (count <= 0) return [];
        if (count === 1) return [baseColorHex]; // Return base if only one needed

        const shades = [];
        try {
            // Convert hex to HSL
            const hexToHSL = (hex) => {
                hex = hex.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;
                const max = Math.max(r, g, b), min = Math.min(r, g, b);
                let h = 0, s = 0, l = (max + min) / 2;
                if (max !== min) {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                    switch (max) {
                        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                        case g: h = (b - r) / d + 2; break;
                        case b: h = (r - g) / d + 4; break;
                    }
                    h /= 6;
                }
                return { h, s, l };
            };

            // Convert HSL back to hex
            const hslToHex = (h, s, l) => {
                let r, g, b;
                if (s === 0) { r = g = b = l; }
                else {
                    const hue2rgb = (p, q, t) => {
                        if (t < 0) t += 1; if (t > 1) t -= 1;
                        if (t < 1 / 6) return p + (q - p) * 6 * t;
                        if (t < 1 / 2) return q;
                        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                        return p;
                    };
                    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                    const p = 2 * l - q;
                    r = hue2rgb(p, q, h + 1 / 3); 
                    g = hue2rgb(p, q, h); 
                    b = hue2rgb(p, q, h - 1 / 3);
                }
                const toHex = x => { const hex = Math.round(x * 255).toString(16); return hex.length === 1 ? '0' + hex : hex; };
                return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
            };

            const { h, s, l } = hexToHSL(baseColorHex);

            // Generate variations by adjusting lightness primarily
            // Aim for a range around the original lightness, e.g., l +/- 15%
            const minLightness = Math.max(0.2, l - 0.15); // Ensure minimum brightness
            const maxLightness = Math.min(0.85, l + 0.15); // Ensure maximum brightness
            const lightnessStep = count > 1 ? (maxLightness - minLightness) / (count - 1) : 0;

            for (let i = 0; i < count; i++) {
                const currentL = count === 1 ? l : minLightness + (i * lightnessStep);
                const currentH = h; // Keep hue constant for simpler shades
                shades.push(hslToHex(currentH, s, currentL));
            }
        } catch (error) {
            console.error("[Data] Error generating shade variations:", error);
            // Fallback to repeating base color or default grey
            return Array(count).fill(baseColorHex || '#cccccc');
        }
        
        return shades;
    };

    /**
     * Merge topic shells while preserving card arrays
     * @param {Array} existingShells - Existing topic shells
     * @param {Array} newShells - New topic shells
     * @returns {Array} - Merged topic shells
     */
    Data.mergeTopicShells = function(existingShells, newShells) {
        console.log(`[Data] Merging ${existingShells.length} existing with ${newShells.length} new shells.`);
        const finalShells = [];
        const existingMap = new Map();
        
        // Ensure existing shells are valid objects with IDs before adding to map
        existingShells.forEach(shell => {
            if (shell && typeof shell === 'object' && shell.id) {
                existingMap.set(shell.id, shell);
            } else {
                console.warn("[Data] Skipping invalid existing shell:", shell);
            }
        });

        const processedIds = new Set();

        // Process new shells: update existing or add if new
        newShells.forEach(newShell => {
            if (!newShell || !newShell.id) {
                console.warn("[Data] Skipping invalid new shell:", newShell);
                return; // Skip invalid shells
            }

            const existing = existingMap.get(newShell.id);
            if (existing) {
                // Merge: Keep existing cards array & created date, update the rest from newShell
                // Use standardizeCards again on the merged result for final cleanup might be overkill but safe
                const mergedShellData = {
                    ...newShell, // Take latest name, colors, metadata from new shell
                    cards: Array.isArray(existing.cards) ? existing.cards : [], // Preserve existing cards array
                    isEmpty: !Array.isArray(existing.cards) || existing.cards.length === 0, // Recalculate isEmpty
                    created: existing.created || newShell.created, // Keep original creation date
                    updatedAt: new Date().toISOString() // Always update timestamp
                };
                
                // Standardize the merged shell
                const stdMergedArray = Data.standardizeCards([mergedShellData]);
                if (stdMergedArray.length > 0) {
                    finalShells.push(stdMergedArray[0]);
                } else {
                    console.warn(`[Data] Failed to standardize merged shell for ID: ${newShell.id}`);
                }
            } else {
                // Add new shell (it should already be standardized)
                finalShells.push(newShell);
            }
            processedIds.add(newShell.id);
        });

        // Add back any existing shells that were *not* processed (i.e., not in the new list)
        existingMap.forEach((existingShell, id) => {
            if (!processedIds.has(id)) {
                // Ensure the existing shell is standardized before adding back
                const stdExistingArray = Data.standardizeCards([existingShell]);
                if (stdExistingArray.length > 0) {
                    finalShells.push(stdExistingArray[0]);
                    console.log(`[Data] Kept existing shell not present in new list: ${id}`);
                } else {
                    console.warn(`[Data] Failed to standardize existing shell being kept: ${id}`);
                }
            }
        });
        
        console.log(`[Data] Final shell count: ${finalShells.length}`);
        return finalShells;
    };

    // Log module loaded
    console.log("VESPA Flashcards: Data module loaded");
})();
// --- End of Data Processing module ---
// --- Start of Save Queue module ---

// Establish namespace if not already created
window.VESPA = window.VESPA || {};
window.VESPA.Flashcards = window.VESPA.Flashcards || {};

// SaveQueue module
(function() {
    'use strict';

    // Reference the config namespace
    var Config = window.VESPA.Flashcards.config;
    
    // Reference the utilities namespace
    var Utils = window.VESPA.Flashcards.utils;
    
    // Reference the data namespace
    var Data = window.VESPA.Flashcards.data;

    /**
     * SaveQueue class for managing sequential save operations
     * @class
     */
    function SaveQueue() {
        this.queue = [];
        this.isSaving = false;
        this.retryAttempts = new Map(); // Tracks retries per operation instance
        this.maxRetries = (window.VESPA_CONFIG && window.VESPA_CONFIG.retryLimit) || 3;
        this.retryDelay = (window.VESPA_CONFIG && window.VESPA_CONFIG.retryDelay) || 1000; // Start with 1 second
    }

    /**
     * Adds an operation to the queue
     * @param {Object} operation - Operation to add
     * @returns {Promise<any>} - Promise that resolves/rejects on completion/failure
     */
    SaveQueue.prototype.addToQueue = function(operation) {
        return new Promise((resolve, reject) => {
            // Basic validation of operation
            if (!operation.type || !operation.recordId) {
                console.error("[SaveQueue] Invalid operation added:", operation);
                return reject(new Error("Invalid save operation: missing type or recordId"));
            }

            const queuedOperation = {
                ...operation,
                resolve,
                reject,
                timestamp: new Date().toISOString()
            };
            this.queue.push(queuedOperation);
            console.log(`[SaveQueue] Added operation to queue: ${operation.type} for record ${operation.recordId}. Queue length: ${this.queue.length}`);
            this.processQueue(); // Attempt to process immediately
        });
    };

    /**
     * Processes the next operation in the queue if not already saving
     */
    SaveQueue.prototype.processQueue = function() {
        if (this.isSaving || this.queue.length === 0) {
            return;
        }

        this.isSaving = true;
        const operation = this.queue[0]; // Get the first operation (FIFO)
        console.log(`[SaveQueue] Processing operation: ${operation.type} for record ${operation.recordId}`);

        try {
            this.prepareSaveData(operation)
                .then(updateData => {
                    Utils.debugLog("[SaveQueue] Prepared update data", updateData);
                    return this.performSave(updateData, operation.recordId);
                })
                .then(response => {
                    Utils.debugLog("[SaveQueue] API Save successful", response);
                    this.handleSaveSuccess(operation);
                })
                .catch(error => {
                    // Error should be the original error object from performSave or prepareSaveData
                    console.error(`[SaveQueue] Error during processing for ${operation.type} (record ${operation.recordId}):`, error);
                    this.handleSaveError(operation, error); // Pass the actual error object
                });
        } catch (error) {
            console.error(`[SaveQueue] Unexpected error in processQueue for ${operation.type} (record ${operation.recordId}):`, error);
            this.handleSaveError(operation, error);
        }
    };

    /**
     * Prepares the final data payload for the Knack API PUT request
     * @param {Object} operation - The operation to prepare data for
     * @returns {Promise<Object>} - The prepared update data
     */
    SaveQueue.prototype.prepareSaveData = async function(operation) {
        const { type, data, recordId, preserveFields } = operation;
        console.log(`[SaveQueue] Preparing save data for type: ${type}, record: ${recordId}, preserveFields: ${preserveFields}`);

        // Start with the mandatory lastSaved field
        const updateData = {
            [Config.FIELD_MAPPING.lastSaved]: new Date().toISOString()
        };

        try {
            // Fetch existing data ONLY if preserving fields
            let existingData = null;
            if (preserveFields) {
                console.log(`[SaveQueue] Preserving fields for ${type}, fetching existing data...`);
                try {
                    existingData = await this.getExistingData(recordId);
                    Utils.debugLog("[SaveQueue] Fetched existing data for preservation", existingData ? `Record ${recordId} found` : `Record ${recordId} NOT found`);
                } catch (fetchError) {
                    console.error(`[SaveQueue] Failed to fetch existing data for field preservation (record ${recordId}):`, fetchError);
                    console.warn("[SaveQueue] Proceeding with save WITHOUT field preservation due to fetch error.");
                    existingData = null; // Ensure existingData is null so preserve logic skips
                }
            }

            // Add data based on operation type
            switch (type) {
                case 'cards': // Only updates cardBankData
                    updateData[Config.FIELD_MAPPING.cardBankData] = JSON.stringify(
                        Data.ensureSerializable(data || [])
                    );
                    console.log("[SaveQueue] Prepared cardBankData for 'cards' save.");
                    break;
                    
                case 'colors': // Only updates colorMapping
                    updateData[Config.FIELD_MAPPING.colorMapping] = JSON.stringify(
                        Data.ensureSerializable(data || {})
                    );
                    console.log("[SaveQueue] Prepared colorMapping for 'colors' save.");
                    break;
                    
                case 'topics': // Only updates topicLists
                    updateData[Config.FIELD_MAPPING.topicLists] = JSON.stringify(
                        Data.ensureSerializable(data || [])
                    );
                    console.log("[SaveQueue] Prepared topicLists for 'topics' save.");
                    break;
                    
                case 'full': // Includes all provided fields from the 'data' object
                    console.log("[SaveQueue] Preparing 'full' save data.");
                    Object.assign(updateData, this.prepareFullSaveData(data || {}));
                    break;
                    
                default:
                    console.error(`[SaveQueue] Unknown save operation type: ${type}`);
                    throw new Error(`Unknown save operation type: ${type}`);
            }

            // If preserving fields and we successfully fetched existing data, merge
            if (preserveFields && existingData) {
                console.log(`[SaveQueue] Merging prepared data with existing data for record ${recordId}`);
                this.preserveExistingFields(updateData, existingData);
                Utils.debugLog("[SaveQueue] Merged data after preservation", updateData);
            } else if (preserveFields && !existingData) {
                console.warn(`[SaveQueue] Cannot preserve fields for record ${recordId} because existing data could not be fetched.`);
            }

            return updateData;

        } catch (error) {
            console.error(`[SaveQueue] Error in prepareSaveData for type ${type}:`, error);
            throw error; // Re-throw the error to be caught by processQueue
        }
    };

    /**
     * Get existing data from Knack API
     * @param {string} recordId - Record ID
     * @returns {Promise<Object>} - The existing data
     */
    SaveQueue.prototype.getExistingData = async function(recordId) {
        console.log(`[SaveQueue] Fetching existing data for record ${recordId}`);
        const apiCall = () => {
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: `${Config.KNACK_API_URL}/objects/${Config.FLASHCARD_OBJECT}/records/${recordId}`,
                    type: 'GET',
                    headers: Utils.getKnackHeaders(),
                    data: { format: 'raw' },
                    success: function(response) {
                        console.log(`[SaveQueue] Successfully fetched existing data for record ${recordId}`);
                        resolve(response);
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        console.error(`[SaveQueue] Error fetching existing data for record ${recordId}: Status ${jqXHR.status} - ${errorThrown}`, jqXHR.responseText);
                        const error = new Error(`Failed to fetch record ${recordId}: ${jqXHR.status} ${errorThrown}`);
                        error.status = jqXHR.status;
                        error.responseText = jqXHR.responseText;
                        reject(error);
                    }
                });
            });
        };
        
        return Utils.retryApiCall(apiCall);
    };

    /**
     * Merges update data with existing data, preserving fields
     * @param {Object} updateData - Data to update
     * @param {Object} existingData - Existing data to merge with
     */
    SaveQueue.prototype.preserveExistingFields = function(updateData, existingData) {
        console.log(`[SaveQueue] Preserving fields for record. Fields in updateData: ${Object.keys(updateData).join(', ')}`);
        
        // Define all fields managed by the app that could be preserved
        const allAppFieldIds = [
            Config.FIELD_MAPPING.cardBankData, 
            Config.FIELD_MAPPING.colorMapping, 
            Config.FIELD_MAPPING.topicLists,
            Config.FIELD_MAPPING.topicMetadata, 
            Config.FIELD_MAPPING.box1Data, 
            Config.FIELD_MAPPING.box2Data,
            Config.FIELD_MAPPING.box3Data, 
            Config.FIELD_MAPPING.box4Data, 
            Config.FIELD_MAPPING.box5Data
        ];

        allAppFieldIds.forEach(fieldId => {
            // If the update payload *does not* already include this field,
            // but the existing record *does* have data for it, preserve it.
            if (updateData[fieldId] === undefined && 
                existingData[fieldId] !== undefined && 
                existingData[fieldId] !== null) {
                console.log(`[SaveQueue] Preserving existing data for field ID: ${fieldId}`);
                updateData[fieldId] = existingData[fieldId]; // Copy existing value
            }
        });
    };

    /**
     * Prepare data for a 'full' save operation
     * @param {Object} data - Data object with various sections
     * @returns {Object} - API-ready payload
     */
    SaveQueue.prototype.prepareFullSaveData = function(data) {
        const updatePayload = {};
        console.log("[SaveQueue] Preparing full save data from data object:", Object.keys(data));

        // Standardize and include card bank data if present in 'data'
        if (data.cards !== undefined) {
            console.log("[SaveQueue] Processing 'cards' for full save");
            let cardsToSave = data.cards || []; // Default to empty array if null/undefined
            cardsToSave = Data.migrateTypeToQuestionType(cardsToSave); // Migrate legacy types
            cardsToSave = Data.standardizeCards(cardsToSave); // Ensure standard structure
            updatePayload[Config.FIELD_MAPPING.cardBankData] = JSON.stringify(
                Data.ensureSerializable(cardsToSave)
            );
            console.log(`[SaveQueue] Included ${cardsToSave.length} cards in full save payload.`);
        } else {
            console.log("[SaveQueue] 'cards' field missing in full save data object.");
        }

        // Handle color mapping
        if (data.colorMapping !== undefined) {
            console.log("[SaveQueue] Processing 'colorMapping' for full save");
            updatePayload[Config.FIELD_MAPPING.colorMapping] = JSON.stringify(
                Data.ensureSerializable(data.colorMapping || {})
            );
        }

        // Handle topic lists
        if (data.topicLists !== undefined) {
            console.log("[SaveQueue] Processing 'topicLists' for full save");
            updatePayload[Config.FIELD_MAPPING.topicLists] = JSON.stringify(
                Data.ensureSerializable(data.topicLists || [])
            );
        }

        // Handle spaced repetition data
        if (data.spacedRepetition !== undefined) {
            console.log("[SaveQueue] Processing 'spacedRepetition' for full save");
            const { box1, box2, box3, box4, box5 } = data.spacedRepetition || {};
            // Ensure boxes are arrays before stringifying
            if (box1 !== undefined) updatePayload[Config.FIELD_MAPPING.box1Data] = JSON.stringify(Data.ensureSerializable(box1 || []));
            if (box2 !== undefined) updatePayload[Config.FIELD_MAPPING.box2Data] = JSON.stringify(Data.ensureSerializable(box2 || []));
            if (box3 !== undefined) updatePayload[Config.FIELD_MAPPING.box3Data] = JSON.stringify(Data.ensureSerializable(box3 || []));
            if (box4 !== undefined) updatePayload[Config.FIELD_MAPPING.box4Data] = JSON.stringify(Data.ensureSerializable(box4 || []));
            if (box5 !== undefined) updatePayload[Config.FIELD_MAPPING.box5Data] = JSON.stringify(Data.ensureSerializable(box5 || []));
        }

        // Handle topic metadata
        if (data.topicMetadata !== undefined) {
            console.log("[SaveQueue] Processing 'topicMetadata' for full save");
            updatePayload[Config.FIELD_MAPPING.topicMetadata] = JSON.stringify(
                Data.ensureSerializable(data.topicMetadata || [])
            );
        }

        return updatePayload; // Return only the fields provided in the 'data' object
    };

    /**
     * Performs the API call to save data
     * @param {Object} updateData - Data to save
     * @param {string} recordId - Record ID
     * @returns {Promise<Object>} - API response
     */
    SaveQueue.prototype.performSave = async function(updateData, recordId) {
        console.log(`[SaveQueue] Performing API save for record ${recordId}`);
        if (!recordId) {
            throw new Error("Cannot perform save: recordId is missing.");
        }
        
        if (Object.keys(updateData).length <= 1 && updateData[Config.FIELD_MAPPING.lastSaved]) {
            console.warn(`[SaveQueue] Save payload for record ${recordId} only contains lastSaved timestamp. Skipping API call.`);
            return { message: "Save skipped, only timestamp update." }; // Return a success-like response
        }

        const apiCall = () => {
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: `${Config.KNACK_API_URL}/objects/${Config.FLASHCARD_OBJECT}/records/${recordId}`,
                    type: 'PUT',
                    headers: Utils.getKnackHeaders(),
                    data: JSON.stringify(updateData),
                    success: function(response) {
                        console.log(`[SaveQueue] API PUT successful for record ${recordId}`);
                        resolve(response);
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        console.error(`[SaveQueue] API PUT failed for record ${recordId}: Status ${jqXHR.status} - ${errorThrown}`, jqXHR.responseText);
                        const error = new Error(`API Save failed for record ${recordId}: ${jqXHR.status} ${errorThrown}`);
                        error.status = jqXHR.status;
                        error.responseText = jqXHR.responseText;
                        reject(error);
                    }
                });
            });
        };
        
        return Utils.retryApiCall(apiCall);
    };

    /**
     * Handle successful save completion
     * @param {Object} operation - The completed operation
     */
    SaveQueue.prototype.handleSaveSuccess = function(operation) {
        const completedOperation = this.queue.shift(); // Remove the completed operation
        if (completedOperation !== operation) {
            console.error("[SaveQueue] Mismatch between completed operation and head of queue!", operation, completedOperation);
            // Attempt recovery - find and remove the operation if possible
            const opIndex = this.queue.findIndex(op => op === operation);
            if(opIndex > -1) this.queue.splice(opIndex, 1);
        }
        
        this.retryAttempts.delete(operation); // Clear retry attempts for this operation
        console.log(`[SaveQueue] Operation ${operation.type} succeeded for record ${operation.recordId}. Queue length: ${this.queue.length}`);
        operation.resolve(true); // Resolve the promise associated with the operation
        this.isSaving = false; // Allow next operation
        this.processQueue(); // Process next item if any
    };

    /**
     * Handle save error with retry logic
     * @param {Object} operation - The failed operation
     * @param {Error} error - The error that occurred
     */
    SaveQueue.prototype.handleSaveError = function(operation, error) {
        // Ensure operation is still at the head of the queue before retrying/failing
        if (this.queue[0] !== operation) {
            console.warn(`[SaveQueue] Stale error encountered for operation ${operation.type} (record ${operation.recordId}). Operation no longer at head of queue. Ignoring error.`);
            // We might not want to reset isSaving here if another operation is now processing
            // Check if another save is now in progress
            if (!this.isSaving && this.queue.length > 0) {
                this.processQueue(); // Try processing the new head
            }
            return;
        }

        const attempts = (this.retryAttempts.get(operation) || 0) + 1; // Increment attempt count
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[SaveQueue] Save error for ${operation.type} (record ${operation.recordId}, Attempt ${attempts}/${this.maxRetries}):`, errorMessage, error);

        if (attempts < this.maxRetries) {
            this.retryAttempts.set(operation, attempts);
            const delay = this.retryDelay * Math.pow(2, attempts - 1); // Exponential backoff
            console.log(`[SaveQueue] Retrying operation ${operation.type} (record ${operation.recordId}) in ${delay}ms...`);
            // IMPORTANT: Reset isSaving BEFORE the timeout to allow processing to restart
            this.isSaving = false;
            setTimeout(() => {
                console.log(`[SaveQueue] Attempting retry for ${operation.type} (record ${operation.recordId}) after delay.`);
                this.processQueue(); // Attempt to process the queue again
            }, delay);
        } else {
            console.error(`[SaveQueue] Max retries reached for operation ${operation.type} (record ${operation.recordId}). Aborting.`);
            const failedOperation = this.queue.shift(); // Remove the failed operation
            if (failedOperation !== operation) {
                console.error("[SaveQueue] Mismatch during failure handling!", operation, failedOperation);
            }
            this.retryAttempts.delete(operation); // Clear retry attempts
            // Reject the promise with the last error
            operation.reject(error || new Error(`Save failed after ${this.maxRetries} retries`));
            this.isSaving = false; // Allow next operation
            this.processQueue(); // Process next item if any
        }
    };

    // Create singleton instance and export
    var saveQueue = new SaveQueue();
    window.VESPA.Flashcards.saveQueue = saveQueue;

    // Log module loaded
    console.log("VESPA Flashcards: SaveQueue module loaded");
})();
// --- End of Save Queue module ---
// --- Start of Translation module ---

// Establish namespace if not already created
window.VESPA = window.VESPA || {};
window.VESPA.Flashcards = window.VESPA.Flashcards || {};

// Translation module
(function() {
    'use strict';

    // Reference the config namespace
    var Config = window.VESPA.Flashcards.config;
    
    // Reference the utilities namespace
    var Utils = window.VESPA.Flashcards.utils;

    /**
     * TranslationCache class to handle the multi-tier translation cache system:
     * 1. Memory cache (fastest, lost on refresh)
     * 2. localStorage cache (persists across refreshes)
     * 3. Knack global cache (shared between users)
     * @class
     */
    function TranslationCache() {
        // Memory cache
        this.memoryCache = new Map();
        
        // Initialize localStorage cache
        this.localStorageKey = 'VESPA_TRANSLATION_CACHE';
        this.maxCacheEntries = (window.VESPA_CONFIG && window.VESPA_CONFIG.cacheSize) || 500;
        
        // Try to load existing cache from localStorage
        this.initLocalStorageCache();
        
        // Statistics
        this.stats = {
            memoryCacheHits: 0,
            localStorageHits: 0,
            knackCacheHits: 0,
            apiCalls: 0,
            cacheWrites: 0
        };
        
        console.log(`[Translation] Cache initialized. Memory entries: ${this.memoryCache.size}, localStorage entries: ${this.getLocalStorageCacheSize()}`);
    }

    /**
     * Initialize localStorage cache
     */
    TranslationCache.prototype.initLocalStorageCache = function() {
        try {
            if (typeof localStorage !== 'undefined') {
                const cachedData = localStorage.getItem(this.localStorageKey);
                if (cachedData) {
                    const parsedData = JSON.parse(cachedData);
                    console.log(`[Translation] Loaded ${Object.keys(parsedData).length} entries from localStorage cache`);
                }
            }
        } catch (error) {
            console.error('[Translation] Error initializing localStorage cache:', error);
            // Continue without localStorage if unavailable
        }
    };

    /**
     * Get current localStorage cache size
     * @returns {number} - Number of entries in localStorage cache
     */
    TranslationCache.prototype.getLocalStorageCacheSize = function() {
        try {
            if (typeof localStorage !== 'undefined') {
                const cachedData = localStorage.getItem(this.localStorageKey);
                if (cachedData) {
                    const parsedData = JSON.parse(cachedData);
                    return Object.keys(parsedData).length;
                }
            }
            return 0;
        } catch (error) {
            console.error('[Translation] Error getting localStorage cache size:', error);
            return 0;
        }
    };

    /**
     * Generate a cache key for a translation
     * @param {string} text - Source text to translate
     * @param {string} targetLang - Target language code
     * @returns {string} - Cache key
     */
    TranslationCache.prototype.generateCacheKey = function(text, targetLang) {
        const normalizedText = text.trim().toLowerCase();
        return `${normalizedText}|${targetLang}`;
    };

    /**
     * Check memory cache for a translation
     * @param {string} cacheKey - Cache key
     * @returns {string|null} - Cached translation or null
     */
    TranslationCache.prototype.checkMemoryCache = function(cacheKey) {
        if (this.memoryCache.has(cacheKey)) {
            this.stats.memoryCacheHits++;
            return this.memoryCache.get(cacheKey);
        }
        return null;
    };

    /**
     * Check localStorage cache for a translation
     * @param {string} cacheKey - Cache key
     * @returns {string|null} - Cached translation or null
     */
    TranslationCache.prototype.checkLocalStorageCache = function(cacheKey) {
        try {
            if (typeof localStorage !== 'undefined') {
                const cachedData = localStorage.getItem(this.localStorageKey);
                if (cachedData) {
                    const parsedData = JSON.parse(cachedData);
                    const entry = parsedData[cacheKey];
                    
                    if (entry) {
                        // Update last accessed timestamp and move to memory cache
                        entry.lastAccessed = new Date().toISOString();
                        this.memoryCache.set(cacheKey, entry.translation);
                        
                        // Update localStorage with new timestamp
                        parsedData[cacheKey] = entry;
                        localStorage.setItem(this.localStorageKey, JSON.stringify(parsedData));
                        
                        this.stats.localStorageHits++;
                        return entry.translation;
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('[Translation] Error checking localStorage cache:', error);
            return null;
        }
    };

    /**
     * Check Knack global cache for a translation
     * @param {string} text - Source text to translate
     * @param {string} targetLang - Target language code
     * @returns {Promise<string|null>} - Cached translation or null
     */
    TranslationCache.prototype.checkKnackCache = async function(text, targetLang) {
        try {
            const apiCall = () => {
                return new Promise((resolve, reject) => {
                    $.ajax({
                        url: `${Config.KNACK_API_URL}/objects/${Config.TRANSLATION_CACHE_OBJECT}/records`,
                        type: 'GET',
                        headers: Utils.getKnackHeaders(),
                        data: {
                            format: 'raw',
                            filters: JSON.stringify({
                                match: 'and',
                                rules: [
                                    {
                                        field: Config.TRANSLATION_FIELDS.sourceText,
                                        operator: 'is',
                                        value: text
                                    },
                                    {
                                        field: Config.TRANSLATION_FIELDS.targetLanguage,
                                        operator: 'is',
                                        value: targetLang
                                    }
                                ]
                            })
                        },
                        success: function(response) {
                            resolve(response);
                        },
                        error: function(jqXHR, textStatus, errorThrown) {
                            const error = new Error(`Failed to check Knack cache: ${jqXHR.status} ${errorThrown}`);
                            error.status = jqXHR.status;
                            error.responseText = jqXHR.responseText;
                            reject(error);
                        }
                    });
                });
            };

            const response = await Utils.retryApiCall(apiCall);
            
            if (response && response.records && response.records.length > 0) {
                const record = response.records[0];
                const translation = record[Config.TRANSLATION_FIELDS.translatedText];
                
                // Update usage count and last used date
                this.updateKnackCacheEntry(record.id);
                
                // Add to local caches
                const cacheKey = this.generateCacheKey(text, targetLang);
                this.memoryCache.set(cacheKey, translation);
                this.addToLocalStorageCache(cacheKey, translation);
                
                this.stats.knackCacheHits++;
                return translation;
            }
            
            return null;
        } catch (error) {
            console.error('[Translation] Error checking Knack cache:', error);
            return null;
        }
    };

    /**
     * Update usage statistics for a Knack cache entry
     * @param {string} recordId - Record ID
     */
    TranslationCache.prototype.updateKnackCacheEntry = async function(recordId) {
        try {
            const now = new Date();
            const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
            
            const apiCall = () => {
                return new Promise((resolve, reject) => {
                    $.ajax({
                        url: `${Config.KNACK_API_URL}/objects/${Config.TRANSLATION_CACHE_OBJECT}/records/${recordId}`,
                        type: 'PUT',
                        headers: Utils.getKnackHeaders(),
                        data: JSON.stringify({
                            [Config.TRANSLATION_FIELDS.useCount]: {
                                raw: `${Config.TRANSLATION_FIELDS.useCount} + 1`
                            },
                            [Config.TRANSLATION_FIELDS.lastUsed]: formattedDate
                        }),
                        success: function(response) {
                            resolve(response);
                        },
                        error: function(jqXHR, textStatus, errorThrown) {
                            const error = new Error(`Failed to update Knack cache entry: ${jqXHR.status} ${errorThrown}`);
                            error.status = jqXHR.status;
                            error.responseText = jqXHR.responseText;
                            reject(error);
                        }
                    });
                });
            };
            
            await Utils.retryApiCall(apiCall);
        } catch (error) {
            console.error('[Translation] Error updating Knack cache entry:', error);
            // Continue - not critical if update fails
        }
    };

    /**
     * Add a translation to Knack global cache
     * @param {string} text - Source text
     * @param {string} targetLang - Target language code
     * @param {string} translation - Translated text
     */
    TranslationCache.prototype.addToKnackCache = async function(text, targetLang, translation) {
        try {
            const apiCall = () => {
                return new Promise((resolve, reject) => {
                    const now = new Date();
                    const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
                    
                    $.ajax({
                        url: `${Config.KNACK_API_URL}/objects/${Config.TRANSLATION_CACHE_OBJECT}/records`,
                        type: 'POST',
                        headers: Utils.getKnackHeaders(),
                        data: JSON.stringify({
                            [Config.TRANSLATION_FIELDS.sourceText]: Utils.sanitizeField(text),
                            [Config.TRANSLATION_FIELDS.targetLanguage]: targetLang,
                            [Config.TRANSLATION_FIELDS.translatedText]: Utils.sanitizeField(translation),
                            [Config.TRANSLATION_FIELDS.useCount]: 1,
                            [Config.TRANSLATION_FIELDS.lastUsed]: formattedDate
                        }),
                        success: function(response) {
                            resolve(response);
                        },
                        error: function(jqXHR, textStatus, errorThrown) {
                            const error = new Error(`Failed to add to Knack cache: ${jqXHR.status} ${errorThrown}`);
                            error.status = jqXHR.status;
                            error.responseText = jqXHR.responseText;
                            reject(error);
                        }
                    });
                });
            };
            
            await Utils.retryApiCall(apiCall);
            console.log(`[Translation] Added translation to Knack cache: ${text} -> ${translation}`);
        } catch (error) {
            console.error('[Translation] Error adding to Knack cache:', error);
            // Continue - not critical if Knack cache add fails
        }
    };

    /**
     * Add a translation to localStorage cache
     * @param {string} cacheKey - Cache key
     * @param {string} translation - Translated text
     */
    TranslationCache.prototype.addToLocalStorageCache = function(cacheKey, translation) {
        try {
            if (typeof localStorage !== 'undefined') {
                let cachedData = localStorage.getItem(this.localStorageKey);
                const parsedData = cachedData ? JSON.parse(cachedData) : {};
                
                // Add or update the entry
                parsedData[cacheKey] = {
                    translation,
                    lastAccessed: new Date().toISOString()
                };
                
                // Trim cache if it exceeds maximum size
                const entries = Object.entries(parsedData);
                if (entries.length > this.maxCacheEntries) {
                    // Sort by last accessed timestamp (oldest first)
                    entries.sort((a, b) => {
                        return new Date(a[1].lastAccessed) - new Date(b[1].lastAccessed);
                    });
                    
                    // Remove oldest entries
                    const entriesToRemove = entries.length - this.maxCacheEntries;
                    const trimmedEntries = entries.slice(entriesToRemove);
                    const trimmedData = {};
                    
                    trimmedEntries.forEach(([key, value]) => {
                        trimmedData[key] = value;
                    });
                    
                    localStorage.setItem(this.localStorageKey, JSON.stringify(trimmedData));
                } else {
                    localStorage.setItem(this.localStorageKey, JSON.stringify(parsedData));
                }
            }
        } catch (error) {
            console.error('[Translation] Error adding to localStorage cache:', error);
            // Continue - not critical if localStorage cache add fails
        }
    };

    /**
     * Translate text using Azure Translator API
     * @param {string} text - Text to translate
     * @param {string} targetLang - Target language code
     * @returns {Promise<string>} - Translated text
     */
    TranslationCache.prototype.translateWithApi = async function(text, targetLang) {
        this.stats.apiCalls++;
        
        // Get the current configuration
        const config = window.VESPA_CONFIG || {};
        const azureKey = config.azureTranslatorKey;
        const azureRegion = config.azureTranslatorRegion || 'ukwest';
        const azureEndpoint = config.azureTranslatorEndpoint || 'https://api.cognitive.microsofttranslator.com';
        
        if (!azureKey) {
            console.error('[Translation] Azure Translator key not configured in VESPA_CONFIG');
            throw new Error('Azure Translator key not configured');
        }
        
        try {
            const response = await fetch(
                `${azureEndpoint}/translate?api-version=3.0&from=en&to=${targetLang}`,
                {
                    method: 'POST',
                    headers: {
                        'Ocp-Apim-Subscription-Key': azureKey,
                        'Ocp-Apim-Subscription-Region': azureRegion,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify([{ text }])
                }
            );
            
            if (!response.ok) {
                throw new Error(`Azure Translator API returned status ${response.status}`);
            }
            
            const data = await response.json();
            return data[0].translations[0].text;
        } catch (error) {
            console.error('[Translation] Error calling Azure Translator API:', error);
            throw error;
        }
    };

    /**
     * Translate text using the multi-tier cache system
     * @param {string} text - Text to translate
     * @param {string} targetLang - Target language code (defaults to 'cy' for Welsh)
     * @returns {Promise<string>} - Translated text
     */
    TranslationCache.prototype.translate = async function(text, targetLang) {
        if (!text || typeof text !== 'string' || text.trim() === '') {
            return text;
        }
        
        // Default to Welsh if no target language specified
        targetLang = targetLang || 'cy';
        
        const cleanText = text.trim();
        const cacheKey = this.generateCacheKey(cleanText, targetLang);
        
        // Step 1: Check memory cache (fastest)
        const memoryResult = this.checkMemoryCache(cacheKey);
        if (memoryResult) {
            return memoryResult;
        }
        
        // Step 2: Check localStorage cache
        const localStorageResult = this.checkLocalStorageCache(cacheKey);
        if (localStorageResult) {
            return localStorageResult;
        }
        
        // Step 3: Check Knack global cache
        try {
            const knackResult = await this.checkKnackCache(cleanText, targetLang);
            if (knackResult) {
                return knackResult;
            }
        } catch (error) {
            console.warn('[Translation] Error checking Knack cache, continuing to API:', error);
            // Continue to API if Knack cache check fails
        }
        
        // Step 4: Call Azure Translator API
        try {
            const translation = await this.translateWithApi(cleanText, targetLang);
            
            // Update all cache levels
            this.memoryCache.set(cacheKey, translation);
            this.addToLocalStorageCache(cacheKey, translation);
            this.addToKnackCache(cleanText, targetLang, translation);
            
            this.stats.cacheWrites++;
            return translation;
        } catch (error) {
            console.error('[Translation] Translation failed:', error);
            // Return original text if translation fails
            return cleanText;
        }
    };

    /**
     * Get translation statistics
     * @returns {Object} - Cache statistics
     */
    TranslationCache.prototype.getStats = function() {
        return {
            ...this.stats,
            memoryCacheSize: this.memoryCache.size,
            localStorageCacheSize: this.getLocalStorageCacheSize(),
            hitRate: this.calculateHitRate()
        };
    };

    /**
     * Calculate cache hit rate
     * @returns {number} - Hit rate percentage
     */
    TranslationCache.prototype.calculateHitRate = function() {
        const totalRequests = this.stats.memoryCacheHits + this.stats.localStorageHits + 
                              this.stats.knackCacheHits + this.stats.apiCalls;
        
        if (totalRequests === 0) {
            return 0;
        }
        
        const hits = this.stats.memoryCacheHits + this.stats.localStorageHits + this.stats.knackCacheHits;
        return (hits / totalRequests) * 100;
    };

    /**
     * Clear all cache levels
     */
    TranslationCache.prototype.clearAllCaches = function() {
        this.memoryCache.clear();
        
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(this.localStorageKey);
            }
        } catch (error) {
            console.error('[Translation] Error clearing localStorage cache:', error);
        }
        
        console.log('[Translation] All caches cleared');
    };

    // Create singleton instance
    var translationCache = new TranslationCache();
    
    // Export translation functions
    window.VESPA.Flashcards.translation = {
        translate: function(text, targetLang) {
            return translationCache.translate(text, targetLang);
        },
        getStats: function() {
            return translationCache.getStats();
        },
        clearAllCaches: function() {
            translationCache.clearAllCaches();
        }
    };

    // Log module loaded
    console.log("VESPA Flashcards: Translation module loaded");
})();
// --- End of Translation module ---
// --- Start of App.js module

// Establish namespace if not already created
window.VESPA = window.VESPA || {};
window.VESPA.Flashcards = window.VESPA.Flashcards || {};

// App module
(function() {
    'use strict';

    // Reference the config namespace
    var Config = window.VESPA.Flashcards.config;
    
    // Reference the utilities namespace
    var Utils = window.VESPA.Flashcards.utils;
    
    // Reference the data namespace
    var Data = window.VESPA.Flashcards.data;
    
    // Reference the save queue
    var saveQueue = window.VESPA.Flashcards.saveQueue;
    
    // Create app namespace
    var App = window.VESPA.Flashcards.app = {};
    
    // Create messaging namespace
    var Messaging = window.VESPA.Flashcards.messaging = {};

    /**
     * FlashcardApp class for managing the application lifecycle
     * @class
     */
    function FlashcardApp() {
        this.iframe = null;
        this.container = null;
        this.loadingIndicator = null;
        this.iframeWindow = null;
        this.currentUser = null;
        this.initialized = false;
        
        // Store configuration
        this.config = null;
    }

    /**
     * Initialize the application
     * @returns {Promise<void>}
     */
    FlashcardApp.prototype.initialize = async function() {
        console.log('[App] Initializing Flashcard application...');
        
        // Enhanced configuration access - check multiple sources
        const directConfig = window.VESPA_CONFIG || {};
        const runtimeConfig = window.VESPA.Flashcards.config.RUNTIME || {};
        
        // Store and validate configuration with priority to direct config
        this.config = { 
            ...Config.DEFAULT_APP_CONFIG,
            ...runtimeConfig,
            ...directConfig
        };
        
        // Debug output of config sources and credentials
        console.log('[App] Using credentials:', { 
            appId: Boolean(this.config.knackAppId), 
            apiKey: Boolean(this.config.knackApiKey),
            appUrl: this.config.appUrl
        });
        
        // Validate configuration
        if (!this.validateConfig()) {
            return; // Validation failed
        }
        
        try {
            // Check if user is authenticated
            if (typeof Knack !== 'undefined' && typeof Knack.getUserToken === 'function' && Knack.getUserToken()) {
                console.log('[App] User is authenticated');
                
                // Get basic user information
                const basicUserInfo = Knack.getUserAttributes();
                window.currentKnackUser = basicUserInfo;
                
                // Get complete user data
                const completeUserData = await this.getCompleteUserData(basicUserInfo.id);
                if (completeUserData) {
                    window.currentKnackUser = Object.assign({}, basicUserInfo, completeUserData);
                }
                
                this.currentUser = window.currentKnackUser;
                await this.setupApp();
                this.initialized = true;
                console.log('[App] Initialization completed successfully');
            } else {
                console.error('[App] User is not authenticated');
                this.showError('User authentication required. Please login and try again.');
            }
        } catch (error) {
            console.error('[App] Initialization error:', error);
            this.showError('Failed to initialize the application: ' + (error.message || 'Unknown error'));
        }
    };

    /**
     * Validate required configuration values
     * @returns {boolean} - Whether configuration is valid
     */
    FlashcardApp.prototype.validateConfig = function() {
        const { knackAppId, knackApiKey, appUrl } = this.config;
        
        let isValid = true;
        
        if (!knackAppId || !knackApiKey) {
            console.error('[App] Missing required Knack credentials in VESPA_CONFIG');
            this.showError('Missing required Knack API credentials for the application.');
            isValid = false;
        }
        
        if (!appUrl) {
            console.error('[App] Missing appUrl in VESPA_CONFIG');
            this.showError('Missing React application URL in configuration.');
            isValid = false;
        }
        
        return isValid;
    };

    /**
     * Create or find container for the application
     * @returns {HTMLElement|null} - Container element or null if not found
     */
    FlashcardApp.prototype.createOrFindContainer = function() {
        // Find container using the configured selector
        let container = document.querySelector(this.config.elementSelector);
        
        // Fallback selectors
        if (!container) container = document.querySelector('.kn-rich-text');
        if (!container) {
            const viewElement = document.getElementById('view_3039') || document.querySelector('.view_3039');
            if (viewElement) {
                container = document.createElement('div');
                container.id = 'flashcard-app-container-generated';
                viewElement.appendChild(container);
            }
        }
        
        // Final fallback to scene
        if (!container) {
            const sceneElement = document.getElementById('kn-scene_1220');
            if (sceneElement) {
                container = document.createElement('div');
                container.id = 'flashcard-app-container-generated';
                sceneElement.appendChild(container);
            } else {
                console.error("[App] Cannot find any suitable container for the app.");
                return null;
            }
        }
        
        return container;
    };

    /**
     * Set up the application UI
     * @returns {Promise<void>}
     */
    FlashcardApp.prototype.setupApp = async function() {
        // Find or create container
        this.container = this.createOrFindContainer();
        
        if (!this.container) {
            console.error('[App] Could not create or find container');
            throw new Error('No suitable container found for the application');
        }
        
        // Clear existing content
        this.container.innerHTML = '';
        
        // Create loading indicator
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.id = 'flashcard-loading-indicator';
        this.loadingIndicator.innerHTML = '<p>Loading Flashcard App...</p>';
        this.loadingIndicator.style.padding = '20px';
        this.loadingIndicator.style.textAlign = 'center';
        this.container.appendChild(this.loadingIndicator);
        
        // Setup iframe
        this.iframe = document.createElement('iframe');
        this.iframe.id = 'flashcard-app-iframe';
        this.iframe.style.width = '100%';
        this.iframe.style.minHeight = this.config.minHeight;
        this.iframe.style.border = 'none';
        this.iframe.style.display = 'none'; // Hide initially
        this.iframe.src = this.config.appUrl;
        this.container.appendChild(this.iframe);
        
        // Setup message listener
        window.addEventListener('message', this.handleMessage.bind(this));
        
        console.log('[App] App setup complete, waiting for APP_READY');
    };

    /**
     * Show an error message
     * @param {string} message - Error message to display
     */
    FlashcardApp.prototype.showError = function(message) {
        if (!this.container) {
            this.container = this.createOrFindContainer();
        }
        
        if (this.container) {
            this.container.innerHTML = `
                <div class="flashcard-error" style="padding: 20px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0;">Error</h3>
                    <p>${message}</p>
                </div>
            `;
        } else {
            console.error('[App] Error:', message);
        }
    };

    /**
     * Message handler for iframe communication
     * @param {MessageEvent} event - Message event
     */
    FlashcardApp.prototype.handleMessage = function(event) {
        // Only accept messages from the iframe
        if (this.iframe && event.source !== this.iframe.contentWindow) {
            return;
        }
        
        if (!event.data || !event.data.type) {
            return;
        }
        
        const { type, data } = event.data;
        this.iframeWindow = this.iframe?.contentWindow; // Store reference
        
        // Log message receipt (except for pings)
        if (type !== 'PING') {
            console.log(`[App] Received message type: ${type}`);
        }
        
        // Route messages to appropriate handlers
        Messaging.routeMessage(type, data, this.iframeWindow);
    };

    /**
     * Get complete user data from Knack
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} - Complete user data or null
     */
    FlashcardApp.prototype.getCompleteUserData = async function(userId) {
        console.log("[App] Getting complete user data for:", userId);
        
        try {
            const apiCall = () => {
                return new Promise((resolve, reject) => {
                    $.ajax({
                        url: `${Config.KNACK_API_URL}/objects/${Config.USER_OBJECT}/records/${userId}`,
                        type: 'GET',
                        headers: Utils.getKnackHeaders(),
                        data: { format: 'raw' },
                        success: resolve,
                        error: reject
                    });
                });
            };
            
            const response = await Utils.retryApiCall(apiCall);
            console.log("[App] Complete user data received.");
            
            // Extract connection field IDs
            const userData = response;
            userData.emailId = Utils.extractValidRecordId(userData.id);
            userData.schoolId = Utils.extractValidRecordId(userData.school || userData.field_122);
            userData.tutorId = Utils.extractValidRecordId(userData.tutor);
            userData.roleId = Utils.extractValidRecordId(userData.role);
            
            Utils.debugLog("[App] Extracted connection IDs", {
                emailId: userData.emailId,
                schoolId: userData.schoolId,
                tutorId: userData.tutorId,
                roleId: userData.roleId
            });
            
            return userData;
        } catch (error) {
            console.error("[App] Error retrieving complete user data:", error);
            return null;
        }
    };

    /**
     * Load user's flashcard data
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} - Flashcard user data or null
     */
    FlashcardApp.prototype.loadFlashcardUserData = async function(userId) {
        console.log(`[App] Loading flashcard user data for user ID: ${userId}`);
        
        try {
            // First find the flashcard record for this user
            const findRecordApiCall = () => {
                return new Promise((resolve, reject) => {
                    $.ajax({
                        url: `${Config.KNACK_API_URL}/objects/${Config.FLASHCARD_OBJECT}/records`,
                        type: 'GET',
                        headers: Utils.getKnackHeaders(),
                        data: {
                            format: 'raw',
                            filters: JSON.stringify({
                                match: 'and',
                                rules: [{ field: Config.FIELD_MAPPING.userId, operator: 'is', value: userId }]
                            })
                        },
                        success: resolve,
                        error: reject
                    });
                });
            };
            
            const response = await Utils.retryApiCall(findRecordApiCall);
            
            if (response && response.records && response.records.length > 0) {
                const record = response.records[0];
                console.log(`[App] Found existing flashcard record: ${record.id}`);
                
                // Assemble userData from record fields safely
                const userData = { recordId: record.id };
                
                try {
                    // Parse card bank data
                    userData.cards = Utils.parseField(record[Config.FIELD_MAPPING.cardBankData], 'cards') || [];
                    userData.cards = Data.migrateTypeToQuestionType(userData.cards);
                    userData.cards = Data.standardizeCards(userData.cards);
                    
                    // Parse spaced repetition data
                    userData.spacedRepetition = {};
                    for (let i = 1; i <= 5; i++) {
                        const fieldKey = Config.FIELD_MAPPING[`box${i}Data`];
                        userData.spacedRepetition[`box${i}`] = Utils.parseField(record[fieldKey], `box${i}Data`) || [];
                    }
                    
                    // Parse color mapping and topic lists
                    userData.topicLists = Utils.parseField(record[Config.FIELD_MAPPING.topicLists], 'topicLists') || [];
                    userData.colorMapping = Utils.parseField(record[Config.FIELD_MAPPING.colorMapping], 'colorMapping') || {};
                    userData.topicMetadata = Utils.parseField(record[Config.FIELD_MAPPING.topicMetadata], 'topicMetadata') || [];
                    userData.lastSaved = record[Config.FIELD_MAPPING.lastSaved];
                    
                    return userData;
                } catch (e) {
                    console.error("[App] Error parsing user data fields:", e);
                    return userData; // Return partially parsed data
                }
            } else {
                // No existing data, create a new record
                console.log(`[App] No existing flashcard record found for user ${userId}`);
                const newRecordId = await this.createFlashcardUserRecord(userId);
                
                if (newRecordId) {
                    console.log(`[App] New record created with ID: ${newRecordId}`);
                    return {
                        recordId: newRecordId,
                        cards: [],
                        spacedRepetition: { box1: [], box2: [], box3: [], box4: [], box5: [] },
                        topicLists: [],
                        topicMetadata: [],
                        colorMapping: {}
                    };
                } else {
                    console.error(`[App] Failed to create new flashcard record for user ${userId}.`);
                    return null;
                }
            }
        } catch (error) {
            console.error("[App] Error loading flashcard user data:", error);
            return null;
        }
    };

    /**
     * Create a new flashcard user record
     * @param {string} userId - User ID
     * @returns {Promise<string|null>} - New record ID or null
     */
    FlashcardApp.prototype.createFlashcardUserRecord = async function(userId) {
        console.log("[App] Creating new flashcard user record for:", userId);
        const user = window.currentKnackUser;
        
        if (!user) {
            console.error("[App] Cannot create record: window.currentKnackUser is not defined.");
            return null;
        }
        
        // Basic data structure for a new record
        const data = {
            [Config.FIELD_MAPPING.userId]: userId,
            [Config.FIELD_MAPPING.userEmail]: Utils.sanitizeField(user.email),
            [Config.FIELD_MAPPING.userName]: Utils.sanitizeField(user.name || ""),
            [Config.FIELD_MAPPING.lastSaved]: new Date().toISOString(),
            // Initialize JSON fields as empty arrays/objects
            [Config.FIELD_MAPPING.cardBankData]: JSON.stringify([]),
            [Config.FIELD_MAPPING.box1Data]: JSON.stringify([]),
            [Config.FIELD_MAPPING.box2Data]: JSON.stringify([]),
            [Config.FIELD_MAPPING.box3Data]: JSON.stringify([]),
            [Config.FIELD_MAPPING.box4Data]: JSON.stringify([]),
            [Config.FIELD_MAPPING.box5Data]: JSON.stringify([]),
            [Config.FIELD_MAPPING.colorMapping]: JSON.stringify({}),
            [Config.FIELD_MAPPING.topicLists]: JSON.stringify([]),
            [Config.FIELD_MAPPING.topicMetadata]: JSON.stringify([]),
            [Config.FIELD_MAPPING.schemaVersion]: Config.SCHEMA_VERSION
        };
        
        // Add connection fields ONLY if valid IDs exist
        if (user.emailId) data[Config.FIELD_MAPPING.accountConnection] = user.emailId;
        if (user.schoolId) data[Config.FIELD_MAPPING.vespaCustomerConnection] = user.schoolId;
        if (user.tutorId) data[Config.FIELD_MAPPING.tutorConnection] = user.tutorId;
        if (user.roleId) data[Config.FIELD_MAPPING.userRole] = user.roleId;
        
        try {
            const apiCall = () => {
                return new Promise((resolve, reject) => {
                    $.ajax({
                        url: `${Config.KNACK_API_URL}/objects/${Config.FLASHCARD_OBJECT}/records`,
                        type: 'POST',
                        headers: Utils.getKnackHeaders(),
                        data: JSON.stringify(data),
                        success: resolve,
                        error: reject
                    });
                });
            };
            
            const response = await Utils.retryApiCall(apiCall);
            return response.id;
        } catch (error) {
            console.error("[App] Error creating user record:", error);
            return null;
        }
    };

    // --- Message Handling Functions ---

    /**
     * Route incoming messages to appropriate handlers
     * @param {string} type - Message type
     * @param {Object} data - Message data
     * @param {Window} iframeWindow - Reference to iframe window
     */
    Messaging.routeMessage = function(type, data, iframeWindow) {
        // Ensure iframeWindow is available
        if (!iframeWindow && type !== 'APP_READY') {
            console.error(`[Messaging] Cannot handle message: iframe window reference missing`);
            return;
        }
        
        switch (type) {
            case 'APP_READY':
                Messaging.handleAppReady(iframeWindow);
                break;
            case 'SAVE_DATA':
                Messaging.handleSaveDataRequest(data, iframeWindow);
                break;
            case 'ADD_TO_BANK':
                Messaging.handleAddToBankRequest(data, iframeWindow);
                break;
            case 'TOPIC_LISTS_UPDATED':
                Messaging.handleTopicListsUpdatedRequest(data, iframeWindow);
                break;
            case 'REQUEST_TOKEN_REFRESH':
                Utils.handleTokenRefresh(iframeWindow);
                break;
            case 'RELOAD_APP_DATA':
                Messaging.handleReloadRequest(data, iframeWindow);
                break;
            case 'REQUEST_UPDATED_DATA':
                Messaging.handleDataUpdateRequest(data, iframeWindow);
                break;
            case 'REQUEST_RECORD_ID':
                Messaging.handleRecordIdRequest(iframeWindow);
                break;
            case 'AUTH_CONFIRMED':
                console.log("[Messaging] React App confirmed auth.");
                const app = window.VESPA.Flashcards.app.instance;
                if (app) {
                    if (app.loadingIndicator) app.loadingIndicator.style.display = 'none';
                    if (app.iframe) app.iframe.style.display = 'block';
                }
                break;
            default:
                console.warn(`[Messaging] Unhandled message type: ${type}`);
        }
    };

    /**
     * Handle APP_READY message from React app
     * @param {Window} iframeWindow - Reference to iframe window
     */
    Messaging.handleAppReady = async function(iframeWindow) {
        console.log("[Messaging] React app reported APP_READY");
        
        const app = window.VESPA.Flashcards.app.instance;
        if (!app || !app.currentUser || !app.currentUser.id) {
            console.error("[Messaging] Cannot send initial info: Current user data not ready");
            return;
        }
        
        if (app.loadingIndicator) {
            app.loadingIndicator.innerHTML = '<p>Loading User Data...</p>';
        }
        
        try {
            const userData = await app.loadFlashcardUserData(app.currentUser.id);
            
            if (iframeWindow) {
                const initialData = {
                    type: 'KNACK_USER_INFO',
                    data: {
                        id: app.currentUser.id,
                        email: app.currentUser.email,
                        name: app.currentUser.name || '',
                        token: Knack.getUserToken(),
                        appId: Knack.application_id,
                        userData: userData || {},
                        emailId: app.currentUser.emailId,
                        schoolId: app.currentUser.schoolId,
                        tutorId: app.currentUser.tutorId,
                        roleId: app.currentUser.roleId
                    }
                };
                
                Utils.debugLog("--> Sending KNACK_USER_INFO to React App", initialData.data);
                iframeWindow.postMessage(initialData, '*');
                
                // Show iframe
                if (app.loadingIndicator) app.loadingIndicator.style.display = 'none';
                if (app.iframe) app.iframe.style.display = 'block';
                console.log("[Messaging] App initialized and visible");
            }
        } catch (error) {
            console.error("[Messaging] Error handling APP_READY:", error);
            app.showError("Failed to load user data: " + (error.message || "Unknown error"));
        }
    };

    /**
     * Handle SAVE_DATA message from React app
     * @param {Object} data - Message data
     * @param {Window} iframeWindow - Reference to iframe window
     */
    Messaging.handleSaveDataRequest = async function(data, iframeWindow) {
        console.log("[Messaging] Handling SAVE_DATA request");
        if (!data || !data.recordId) {
            if (iframeWindow) iframeWindow.postMessage({
                type: 'SAVE_RESULT',
                success: false,
                error: "Missing recordId"
            }, '*');
            return;
        }
        
        try {
            // Add the 'full' save operation to the queue
            await saveQueue.addToQueue({
                type: 'full',
                data: data,
                recordId: data.recordId,
                preserveFields: data.preserveFields || false
            });
            
            console.log(`[Messaging] SAVE_DATA completed successfully.`);
            if (iframeWindow) iframeWindow.postMessage({
                type: 'SAVE_RESULT',
                success: true,
                timestamp: new Date().toISOString()
            }, '*');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[Messaging] SAVE_DATA failed:`, errorMessage);
            if (iframeWindow) iframeWindow.postMessage({
                type: 'SAVE_RESULT',
                success: false,
                error: errorMessage || 'Unknown save error'
            }, '*');
        }
    };

    /**
     * Handle ADD_TO_BANK message from React app
     * @param {Object} data - Message data
     * @param {Window} iframeWindow - Reference to iframe window
     */
    Messaging.handleAddToBankRequest = async function(data, iframeWindow) {
        console.log("[Messaging] Handling ADD_TO_BANK request");
        if (!data || !data.recordId || !data.cards) {
            if (iframeWindow) iframeWindow.postMessage({
                type: 'ADD_TO_BANK_RESULT',
                success: false,
                error: "Missing recordId or cards"
            }, '*');
            return;
        }
        
        try {
            // Fetch existing data to merge with
            const existingData = await saveQueue.getExistingData(data.recordId);
            
            // Standardize the NEW cards first
            const newCardsStandardized = Data.standardizeCards(data.cards || []);
            const newCardCount = newCardsStandardized.length;
            
            if (newCardCount === 0) {
                console.log("[Messaging] No valid new cards to add.");
                if (iframeWindow) iframeWindow.postMessage({
                    type: 'ADD_TO_BANK_RESULT',
                    success: true,
                    shouldReload: false,
                    message: "No new cards to add."
                }, '*');
                return; // Nothing to do
            }
            
            // Parse existing card bank
            let existingItems = [];
            if (existingData && existingData[Config.FIELD_MAPPING.cardBankData]) {
                try {
                    let bankDataStr = existingData[Config.FIELD_MAPPING.cardBankData];
                    if (typeof bankDataStr === 'string' && bankDataStr.includes('%')) {
                        bankDataStr = Utils.safeDecodeURIComponent(bankDataStr);
                    }
                    existingItems = Utils.safeParseJSON(bankDataStr, []);
                } catch (parseError) {
                    console.error("[Messaging] Error parsing existing card bank data for ADD_TO_BANK:", parseError);
                    existingItems = []; // Start fresh if parsing fails critically
                }
            }
            
            // Split existing into shells and cards
            const { topics: existingTopicShells, cards: existingCards } = Data.splitByType(existingItems);
            
            // Deduplicate: Ensure new cards aren't already in existing cards
            const existingCardIds = new Set(existingCards.map(c => c.id));
            const cardsToAdd = newCardsStandardized.filter(nc => !existingCardIds.has(nc.id));
            
            const skippedCount = newCardCount - cardsToAdd.length;
            if (skippedCount > 0) {
                console.log(`[Messaging] Skipped ${skippedCount} cards already present in the bank.`);
            }
            
            if (cardsToAdd.length === 0) {
                console.log("[Messaging] All new cards were duplicates or invalid.");
                if (iframeWindow) iframeWindow.postMessage({
                    type: 'ADD_TO_BANK_RESULT',
                    success: true,
                    shouldReload: false,
                    message: "All submitted cards already exist."
                }, '*');
                return; // Nothing to add
            }
            
            // Combine existing shells/cards with the NEW, deduplicated cards
            const finalBankData = [...existingTopicShells, ...existingCards, ...cardsToAdd];
            console.log(`[Messaging] Merged ${cardsToAdd.length} new cards with ${existingCards.length} existing cards and ${existingTopicShells.length} shells.`);
            
            // Update how box1 data is parsed
            let box1Data = [];
            if (existingData && existingData[Config.FIELD_MAPPING.box1Data]) {
                try {
                    box1Data = Utils.parseField(existingData[Config.FIELD_MAPPING.box1Data], 'box1Data') || [];
                } catch(parseError) {
                    console.error("[Messaging] Error parsing Box 1 data:", parseError);
                    box1Data = [];
                }
            }
            
            const now = new Date().toISOString();
            const existingBox1Map = new Map(box1Data.map(entry => [entry.cardId, true]));
            // Add ONLY the newly added cards to Box 1
            const newBox1Entries = cardsToAdd
                .filter(card => card.id && !existingBox1Map.has(card.id))
                .map(card => ({ cardId: card.id, lastReviewed: now, nextReviewDate: now }));
            
            const updatedBox1 = [...box1Data, ...newBox1Entries];
            console.log(`[Messaging] Added ${newBox1Entries.length} new entries to Box 1.`);
            
            // Queue a 'full' save operation with merged data
            const fullSaveData = {
                cards: finalBankData, // The fully merged card bank
                spacedRepetition: { // Include the updated Box 1
                    box1: updatedBox1
                    // Other boxes will be preserved because preserveFields is true
                }
                // Other fields like colorMapping, topicLists will be preserved from existingData
            };
            
            await saveQueue.addToQueue({
                type: 'full',
                data: fullSaveData, // Pass the prepared data object containing 'cards' and 'spacedRepetition'
                recordId: data.recordId,
                preserveFields: true // CRITICAL: ensure other fields are preserved
            });
            
            console.log(`[Messaging] ADD_TO_BANK completed successfully.`);
            if (iframeWindow) iframeWindow.postMessage({
                type: 'ADD_TO_BANK_RESULT',
                success: true,
                shouldReload: true
            }, '*');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[Messaging] ADD_TO_BANK failed:`, errorMessage);
            if (iframeWindow) iframeWindow.postMessage({
                type: 'ADD_TO_BANK_RESULT',
                success: false,
                error: errorMessage || 'Unknown error adding cards to bank'
            }, '*');
        }
    };

    /**
     * Handle TOPIC_LISTS_UPDATED message from React app
     * @param {Object} data - Message data
     * @param {Window} iframeWindow - Reference to iframe window
     */
    Messaging.handleTopicListsUpdatedRequest = async function(data, iframeWindow) {
        console.log("[Messaging] Handling TOPIC_LISTS_UPDATED request");
        if (!data || !data.recordId || !data.topicLists) {
            if (iframeWindow) iframeWindow.postMessage({
                type: 'TOPIC_LISTS_UPDATE_RESULT',
                success: false,
                error: "Missing recordId or topicLists"
            }, '*');
            return;
        }
        
        try {
            // First save the topic lists themselves
            await saveQueue.addToQueue({
                type: 'topics',
                data: data.topicLists,
                recordId: data.recordId,
                preserveFields: true
            });
            
            // Now generate topic shells based on these lists
            // This is a complex operation that involves fetching existing data,
            // generating shells, and saving back to the database
            await Messaging.createTopicShellsFromLists(data.topicLists, data.recordId, iframeWindow);
            
            if (iframeWindow) iframeWindow.postMessage({
                type: 'TOPIC_LISTS_UPDATE_RESULT',
                success: true,
                timestamp: new Date().toISOString()
            }, '*');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[Messaging] TOPIC_LISTS_UPDATED failed:`, errorMessage);
            if (iframeWindow) iframeWindow.postMessage({
                type: 'TOPIC_LISTS_UPDATE_RESULT',
                success: false,
                error: errorMessage || 'Unknown topic list update error'
            }, '*');
        }
    };

    /**
     * Create topic shells from topic lists
     * @param {Array} topicLists - Topic lists data
     * @param {string} recordId - Record ID
     * @param {Window} iframeWindow - Reference to iframe window
     */
    Messaging.createTopicShellsFromLists = async function(topicLists, recordId, iframeWindow) {
        console.log(`[Messaging] Creating topic shells from lists for record ${recordId}`);
        if (!Array.isArray(topicLists) || topicLists.length === 0 || !recordId) {
            console.warn("[Messaging] Skipping shell creation: No topic lists or recordId provided.");
            if (iframeWindow) iframeWindow.postMessage({
                type: 'TOPIC_SHELLS_PROCESSED', 
                success: true, 
                count: 0, 
                message: "No lists provided."
            }, '*');
            return;
        }
        
        try {
            // 1. Fetch existing user data (includes cardBank, colorMapping, topicMetadata)
            const existingData = await saveQueue.getExistingData(recordId);
            
            // Ensure existingData is valid
            if (!existingData || !existingData.id) {
                throw new Error(`Failed to fetch existing data for record ${recordId} during shell creation.`);
            }
            
            // 2. Parse existing data safely
            let subjectColors = {};
            let existingTopicMetadata = [];
            let existingItems = []; // From cardBankData
            
            try {
                subjectColors = Utils.parseField(existingData[Config.FIELD_MAPPING.colorMapping], 'colorMapping') || {};
            } catch (e) { 
                console.error("Error parsing existing subject colors:", e);
                subjectColors = {}; 
            }
            
            try {
                existingTopicMetadata = Utils.parseField(existingData[Config.FIELD_MAPPING.topicMetadata], 'topicMetadata') || [];
            } catch (e) { 
                console.error("Error parsing existing topic metadata:", e);
                existingTopicMetadata = [];
            }
            
            try {
                existingItems = Utils.parseField(existingData[Config.FIELD_MAPPING.cardBankData], 'cardBankData') || [];
            } catch(e) { 
                console.error("Error parsing existing card bank data:", e);
                existingItems = [];
            }
            
            // Split existing items from card bank
            const { topics: existingTopicShells, cards: existingCards } = Data.splitByType(existingItems);
            console.log(`[Messaging] Existing data parsed: ${existingTopicShells.length} shells, ${existingCards.length} cards, ${existingTopicMetadata.length} metadata items.`);
            
            // 3. Generate new shells and update colors/metadata based on topicLists
            const generatedData = Messaging.generateNewShellsAndMetadata(
                topicLists,
                subjectColors,
                existingTopicMetadata
            );
            
            const { newShells, updatedColors, updatedMetadata } = generatedData;
            console.log(`[Messaging] Generated ${newShells.length} new shells based on topic lists.`);
            
            // 4. Merge new shells with existing shells (preserves card arrays in existing shells)
            const finalTopicShells = Data.mergeTopicShells(existingTopicShells, newShells);
            console.log(`[Messaging] Merged shells. Total shells: ${finalTopicShells.length}`);
            
            // 5. Combine final shells with existing cards for the new cardBankData payload
            const finalBankData = [...finalTopicShells, ...existingCards];
            
            // 6. Prepare the data payload for saving (includes updated bank, colors, metadata)
            const saveDataPayload = {
                cards: finalBankData,
                colorMapping: updatedColors,
                topicMetadata: updatedMetadata
            };
            
            // 7. Queue the save operation using 'full' type
            await saveQueue.addToQueue({
                type: 'full',
                data: saveDataPayload,
                recordId: recordId,
                preserveFields: true
            });
            
            console.log(`[Messaging] Successfully queued save after topic shell processing for record ${recordId}.`);
            
            // Notify React app immediately that shells were processed and save is queued
            if (iframeWindow) iframeWindow.postMessage({ 
                type: 'TOPIC_SHELLS_PROCESSED', 
                success: true, 
                count: newShells.length 
            }, '*');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("[Messaging] Error during createTopicShellsFromLists:", errorMessage, error);
            if (iframeWindow) iframeWindow.postMessage({ 
                type: 'TOPIC_SHELLS_PROCESSED', 
                success: false, 
                error: errorMessage 
            }, '*');
        }
    };

    /**
     * Generate new shells, colors and metadata from topic lists
     * @param {Array} topicLists - Topic lists
     * @param {Object} currentSubjectColors - Current subject color mappings
     * @param {Array} currentTopicMetadata - Current topic metadata
     * @returns {Object} - Object with newShells, updatedColors, updatedMetadata
     */
    Messaging.generateNewShellsAndMetadata = function(topicLists, currentSubjectColors, currentTopicMetadata) {
        const newShells = [];
        // Create copies to avoid modifying originals directly until the end
        const updatedMetadata = JSON.parse(JSON.stringify(currentTopicMetadata || []));
        const updatedColors = JSON.parse(JSON.stringify(currentSubjectColors || {}));

        const idMap = new Map(); // Track processed shell IDs in this run to avoid intra-list duplicates
        const uniqueSubjects = new Set(topicLists.map(list => list.subject || "General"));

        // --- Assign base colors if needed ---
        const baseColors = [
            '#3cb44b','#4363d8','#e6194B','#911eb4','#f58231','#42d4f4','#f032e6','#469990',
            '#9A6324','#800000','#808000','#000075','#e6beff','#aaffc3','#ffd8b1','#808080', 
            '#fabebe','#008080','#e6beff','#aa6e28','#fffac8','#800000','#aaffc3','#808000', 
            '#ffd8b1','#000075'
        ]; // Extended palette
        
        let colorIndexOffset = Object.keys(updatedColors).length; // Start assigning after existing colors
        uniqueSubjects.forEach((subject, index) => {
            if (!updatedColors[subject]) {
                updatedColors[subject] = baseColors[(colorIndexOffset + index) % baseColors.length];
            }
        });
        
        Utils.debugLog("[Shell Gen] Updated subject colors:", updatedColors);

        const now = new Date().toISOString();

        // --- Process Lists ---
        topicLists.forEach(list => {
            if (!list || !Array.isArray(list.topics)) {
                console.warn("[Shell Gen] Skipping invalid topic list:", list);
                return;
            }

            const subject = Utils.sanitizeField(list.subject || "General");
            const examBoard = Utils.sanitizeField(list.examBoard || "General"); // Use General if empty
            const examType = Utils.sanitizeField(list.examType || "Course"); // Use Course if empty
            const subjectColor = updatedColors[subject]; // Get assigned color

            // Generate shades
            const topicColors = Data.generateShadeVariations(subjectColor, list.topics.length);

            list.topics.forEach((topic, index) => {
                // Basic validation for topic object
                if (!topic || (typeof topic !== 'object' && typeof topic !== 'string') || 
                   (!topic.id && !topic.name && !topic.topic && typeof topic !== 'string')) {
                    console.warn("[Shell Gen] Skipping invalid topic item:", topic);
                    return;
                }

                // Handle case where topic might just be a string name
                const isStringTopic = typeof topic === 'string';
                const topicName = Utils.sanitizeField(isStringTopic ? topic : (topic.name || topic.topic || "Unknown Topic"));
                
                // Generate an ID if none provided, try to make it somewhat stable if possible
                const topicId = isStringTopic
                    ? `topic_${subject}_${topicName.replace(/[^a-zA-Z0-9]/g, '_')}` // Generate ID from subject/name
                    : (topic.id || Data.generateId(`topic_${subject.substring(0, 5)}`));

                if (idMap.has(topicId)) {
                    console.log(`[Shell Gen] Skipping duplicate topic ID in this run: ${topicId}`);
                    return; // Skip duplicates within this generation run
                }

                // Create the shell using standardizeCards for consistency
                const shellData = {
                    id: topicId,
                    type: 'topic', // Explicitly set type
                    name: topicName, // Use sanitized name
                    topic: topicName, // Keep topic property too
                    subject: subject,
                    examBoard: examBoard,
                    examType: examType,
                    cardColor: topicColors[index % topicColors.length], // Assign topic color variation
                    subjectColor: subjectColor, // Assign base subject color
                    isShell: true,
                    createdAt: now, // Add creation timestamp
                    updatedAt: now
                };

                const standardizedShellArray = Data.standardizeCards([shellData]); // Standardize the single shell
                const shell = standardizedShellArray.length > 0 ? standardizedShellArray[0] : null;

                if(shell) { // Ensure standardization didn't fail
                    newShells.push(shell);
                    idMap.set(topicId, true); // Mark ID as processed for this run

                    // --- Update Topic Metadata ---
                    const metadataIndex = updatedMetadata.findIndex(m => m.topicId === topicId);
                    const newMetadataEntry = {
                        topicId: topicId,
                        name: topicName, // Use sanitized name
                        subject: subject,
                        examBoard: examBoard,
                        examType: examType,
                        updated: now // Timestamp of this update/creation
                    };
                    
                    if (metadataIndex >= 0) {
                        // Update existing metadata entry
                        updatedMetadata[metadataIndex] = { ...updatedMetadata[metadataIndex], ...newMetadataEntry };
                    } else {
                        // Add new metadata entry
                        updatedMetadata.push(newMetadataEntry);
                    }
                } else {
                    console.warn(`[Shell Gen] Failed to standardize shell for topic:`, topic);
                }
            });
        });
        
        Utils.debugLog("[Shell Gen] Generated Shells:", newShells);
        Utils.debugLog("[Shell Gen] Final Metadata:", updatedMetadata);

        return { newShells, updatedColors, updatedMetadata };
    };

    /**
     * Handle RELOAD_APP_DATA message
     * @param {Object} data - Message data
     * @param {Window} iframeWindow - Reference to iframe window
     */
    Messaging.handleReloadRequest = async function(data, iframeWindow) {
        console.log("[Messaging] Handling RELOAD_APP_DATA request");
        const userId = window.currentKnackUser?.id;
        if (!userId) {
            console.error("[Messaging] Cannot reload data - user ID not found.");
            if (iframeWindow) iframeWindow.postMessage({ 
                type: 'DATA_REFRESH_ERROR', 
                error: 'User ID not found' 
            }, '*');
            return;
        }
        
        try {
            const app = window.VESPA.Flashcards.app.instance;
            if (!app) {
                throw new Error("App instance not available");
            }
            
            const userData = await app.loadFlashcardUserData(userId);
            
            if (userData && iframeWindow) {
                console.log("[Messaging] Sending refreshed data to React app (on reload request)");
                iframeWindow.postMessage({
                    type: 'KNACK_DATA',
                    cards: userData.cards || [],
                    colorMapping: userData.colorMapping || {},
                    topicLists: userData.topicLists || [],
                    topicMetadata: userData.topicMetadata || [],
                    spacedRepetition: userData.spacedRepetition || {},
                    recordId: userData.recordId,
                    auth: { 
                        id: userId, 
                        email: window.currentKnackUser?.email, 
                        name: window.currentKnackUser?.name || '' 
                    },
                    timestamp: new Date().toISOString()
                }, '*');
            } else if (iframeWindow) {
                throw new Error("Failed to load data for reload");
            }
        } catch (error) {
            console.error("[Messaging] Error loading updated data for reload:", error);
            if (iframeWindow) iframeWindow.postMessage({ 
                type: 'DATA_REFRESH_ERROR', 
                error: error.message || 'Failed to load data for reload' 
            }, '*');
        }
    };

    /**
     * Handle REQUEST_UPDATED_DATA message
     * @param {Object} data - Message data
     * @param {Window} iframeWindow - Reference to iframe window
     */
    Messaging.handleDataUpdateRequest = async function(data, iframeWindow) {
        console.log("[Messaging] Handling REQUEST_UPDATED_DATA request");
        const userId = window.currentKnackUser?.id;
        const recordId = data?.recordId;

        if (!userId) {
            console.error("[Messaging] Cannot refresh data - user ID not found.");
            if (iframeWindow) iframeWindow.postMessage({ 
                type: 'DATA_REFRESH_ERROR', 
                error: 'User ID not found' 
            }, '*');
            return;
        }
        
        if (!recordId) {
            console.error("[Messaging] Cannot refresh data - missing record ID in request");
            if (iframeWindow) iframeWindow.postMessage({ 
                type: 'DATA_REFRESH_ERROR', 
                error: 'Missing record ID in request' 
            }, '*');
            return;
        }

        try {
            const app = window.VESPA.Flashcards.app.instance;
            if (!app) {
                throw new Error("App instance not available");
            }
            
            const userData = await app.loadFlashcardUserData(userId);
            
            if (userData && iframeWindow) {
                // Ensure the loaded data corresponds to the requested recordId
                if (userData.recordId === recordId) {
                    console.log("[Messaging] Sending refreshed data to React app (on request)");
                    iframeWindow.postMessage({
                        type: 'KNACK_DATA',
                        cards: userData.cards || [],
                        colorMapping: userData.colorMapping || {},
                        topicLists: userData.topicLists || [],
                        topicMetadata: userData.topicMetadata || [],
                        spacedRepetition: userData.spacedRepetition || {},
                        recordId: userData.recordId,
                        auth: { 
                            id: userId, 
                            email: window.currentKnackUser?.email, 
                            name: window.currentKnackUser?.name || '' 
                        },
                        timestamp: new Date().toISOString()
                    }, '*');
                } else {
                    console.warn(`[Messaging] Loaded data record ID (${userData.recordId}) does not match requested record ID (${recordId}).`);
                    iframeWindow.postMessage({
                        type: 'KNACK_DATA',
                        cards: userData.cards || [],
                        colorMapping: userData.colorMapping || {},
                        topicLists: userData.topicLists || [],
                        topicMetadata: userData.topicMetadata || [],
                        spacedRepetition: userData.spacedRepetition || {},
                        recordId: userData.recordId,
                        auth: { 
                            id: userId, 
                            email: window.currentKnackUser?.email, 
                            name: window.currentKnackUser?.name || '' 
                        },
                        timestamp: new Date().toISOString()
                    }, '*');
                }
            } else if (iframeWindow) {
                throw new Error("Failed to load data");
            }
        } catch (error) {
            console.error("[Messaging] Error loading updated data (on request):", error);
            if (iframeWindow) iframeWindow.postMessage({ 
                type: 'DATA_REFRESH_ERROR', 
                error: error.message || 'Failed to load data' 
            }, '*');
        }
    };

    /**
     * Handle REQUEST_RECORD_ID message
     * @param {Window} iframeWindow - Reference to iframe window
     */
    Messaging.handleRecordIdRequest = async function(iframeWindow) {
        console.log("[Messaging] Handling REQUEST_RECORD_ID request");
        const userId = window.currentKnackUser?.id;
        if (!userId) {
            console.error("[Messaging] Cannot get record ID - user ID not found.");
            if (iframeWindow) iframeWindow.postMessage({ 
                type: 'RECORD_ID_ERROR', 
                error: 'User ID not found' 
            }, '*');
            return;
        }

        try {
            const app = window.VESPA.Flashcards.app.instance;
            if (!app) {
                throw new Error("App instance not available");
            }
            
            const userData = await app.loadFlashcardUserData(userId);
            
            if (userData && userData.recordId && iframeWindow) {
                console.log(`[Messaging] Found record ID: ${userData.recordId}`);
                iframeWindow.postMessage({
                    type: 'RECORD_ID_RESPONSE',
                    recordId: userData.recordId,
                    timestamp: new Date().toISOString()
                }, '*');
            } else if (iframeWindow) {
                throw new Error("Record ID not found");
            }
        } catch (error) {
            console.error(`[Messaging] Could not find record ID for user ${userId}:`, error);
            if (iframeWindow) iframeWindow.postMessage({
                type: 'RECORD_ID_ERROR',
                error: error.message || 'Record ID not found',
                timestamp: new Date().toISOString()
            }, '*');
        }
    };

    // Create singleton app instance and export
    App.instance = new FlashcardApp();

    // Log module loaded
    console.log("VESPA Flashcards: App module loaded");
})();


// Establish namespace if not already created
window.VESPA = window.VESPA || {};
window.VESPA.Flashcards = window.VESPA.Flashcards || {};

// Initialization module
(function() {
    'use strict';
    
    // Reference the app instance
    var App = window.VESPA.Flashcards.app;
    var Init = window.VESPA.Flashcards.init = {};

    /**
     * Provides the main entry point for the application,
     * will be called by Knack's Multi-App loader
     */
    window.initializeFlashcardApp = function() {
        console.log("VESPA Flashcards V2: initializeFlashcardApp called from Knack loader");
        Init.startInitializationSequence();
    };

    /**
     * Start the initialization sequence
     */
    Init.startInitializationSequence = function() {
        console.log("VESPA Flashcards V2: Starting initialization sequence");
        
        // Ensure jQuery and Knack API are available
        if (typeof $ === 'undefined' || typeof Knack === 'undefined') {
            console.error("VESPA Flashcards V2: Required dependencies (jQuery, Knack) not available!");
            
            // Try a short delay to allow dependencies to load
            console.log("VESPA Flashcards V2: Delaying initialization slightly to wait for dependencies...");
            setTimeout(function() {
                if (typeof $ !== 'undefined' && typeof Knack !== 'undefined') {
                    Init.onDependenciesReady();
                } else {
                    console.error("VESPA Flashcards V2: Critical Error - Dependencies still not available after delay!");
                    // Try to show error message to the user
                    Init.showCriticalError(
                        "The Flashcards application could not be loaded because required dependencies are missing. " +
                        "Please refresh the page or contact support if the issue persists."
                    );
                }
            }, 500);
            return;
        }
        
        // Dependencies are ready, proceed
        Init.onDependenciesReady();
    };

    /**
     * Called when all dependencies are ready
     */
    Init.onDependenciesReady = function() {
        console.log("VESPA Flashcards V2: Dependencies ready, merging configuration");
        
        // Get window configuration provided by Knack Multi-App loader
        var loaderConfig = window.VESPA_CONFIG || {}; // Provided by Multi-App loader
        
        // Apply configuration into our namespace for easier access
        window.VESPA.Flashcards.config.RUNTIME = {
            ...window.VESPA.Flashcards.config.DEFAULT_APP_CONFIG,
            ...loaderConfig
        };
        
        // DEBUG: Log the config and credentials
        console.log(`VESPA Flashcards V2: Configuration merged from VESPA_CONFIG:`, loaderConfig);
        console.log(`VESPA Flashcards V2: Credentials present:`, {
            knackAppId: Boolean(loaderConfig.knackAppId),
            knackApiKey: Boolean(loaderConfig.knackApiKey)
        });
        
        // Start the application
        Init.startApp();
    };

    /**
     * Start the application
     */
    Init.startApp = async function() {
        console.log("VESPA Flashcards V2: Starting application");
        
        try {
            // Check that app instance exists
            if (!App || !App.instance || typeof App.instance.initialize !== 'function') {
                throw new Error("App instance not properly initialized");
            }
            
            // Initialize the app
            await App.instance.initialize();
            
            console.log("VESPA Flashcards V2: Application initialization complete");
        } catch (error) {
            console.error("VESPA Flashcards V2: Failed to initialize application:", error);
            Init.showCriticalError(
                "Failed to initialize the Flashcards application. " +
                `Error: ${error.message || 'Unknown error'}`
            );
        }
    };

    /**
     * Show a critical error message when initialization fails
     * @param {string} message - Error message to display
     */
    Init.showCriticalError = function(message) {
        // Try to find a container
        var container = document.querySelector('.kn-rich-text') || 
                        document.getElementById('view_3039') || 
                        document.querySelector('.view_3039') ||
                        document.getElementById('kn-scene_1220');
        
        if (container) {
            // Create error element
            var errorDiv = document.createElement('div');
            errorDiv.className = 'vespa-flashcards-error';
            errorDiv.style.padding = '20px';
            errorDiv.style.margin = '20px 0';
            errorDiv.style.backgroundColor = '#f8d7da';
            errorDiv.style.color = '#721c24';
            errorDiv.style.borderRadius = '4px';
            errorDiv.style.border = '1px solid #f5c6cb';
            
            // Set error content
            errorDiv.innerHTML = `
                <h3 style="margin-top: 0;">Flashcards Application Error</h3>
                <p>${message}</p>
                <p><small>If this error persists, please contact support.</small></p>
            `;
            
            // Add to container
            container.appendChild(errorDiv);
        } else {
            // No container found, log to console only
            console.error("VESPA Flashcards V2: Critical Error (no container found):", message);
        }
    };

    /**
     * Auto-start if script was added directly (not through loader)
     */
    if (!window.VESPA_CONFIG && !window.MULTI_APP_LOADER) {
        console.log("VESPA Flashcards V2: No loader detected, auto-starting...");
        
        // When the DOM is ready
        $(function() {
            // Set default config
            window.VESPA_CONFIG = {
                knackAppId: '', // Must be filled for direct embed
                knackApiKey: '', // Must be filled for direct embed
                appUrl: 'https://vespa-flashcards-v2-a99afb99c276.herokuapp.com/',
                elementSelector: '.kn-rich-text',
                debug: false
            };
            
            // Start initialization
            Init.startInitializationSequence();
        });
    } else {
        console.log("VESPA Flashcards V2: Waiting for loader to call initializeFlashcardApp()");
    }

    // Log module loaded
    console.log("VESPA Flashcards: Initialization module loaded");
})();
