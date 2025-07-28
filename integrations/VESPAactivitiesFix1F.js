// VESPA Activities Enhancement Script - Radical UI Redesign v1.4
// Beautiful, modern interface that works WITH existing external code

(function() {
    'use strict';
    
    const VERSION = '1.4';
    const DEBUG = true;
    
    // VESPA theme colors with enhanced palette
    const VESPA_COLORS = {
        vision: {
            primary: '#ff8f00',
            light: '#ffb347',
            dark: '#cc7000',
            gradient: 'linear-gradient(135deg, #ff8f00 0%, #ffb347 100%)'
        },
        effort: {
            primary: '#86b4f0',
            light: '#a8c8f5',
            dark: '#5a8fdb',
            gradient: 'linear-gradient(135deg, #5a8fdb 0%, #a8c8f5 100%)'
        },
        systems: {
            primary: '#72cb44',
            light: '#8ed666',
            dark: '#5cb32e',
            gradient: 'linear-gradient(135deg, #5cb32e 0%, #8ed666 100%)'
        },
        practice: {
            primary: '#7f31a4',
            light: '#a155c7',
            dark: '#5f2481',
            gradient: 'linear-gradient(135deg, #5f2481 0%, #a155c7 100%)'
        },
        attitude: {
            primary: '#f032e6',
            light: '#ff5eef',
            dark: '#d11dc9',
            gradient: 'linear-gradient(135deg, #d11dc9 0%, #ff5eef 100%)'
        },
        neutral: {
            white: '#ffffff',
            lightGray: '#f8f9fa',
            gray: '#e9ecef',
            darkGray: '#6c757d',
            dark: '#2a3c7a'
        }
    };
    
    function log(message, data) {
        if (DEBUG) console.log(`[VESPA Activities v${VERSION}] ${message}`, data || '');
    }
    
    function isMobileDevice() {
        return window.innerWidth <= 768 || 
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    // Parse activity data from the DOM
    function parseActivityData() {
        const activities = {
            incomplete: [],
            completed: []
        };
        
        const container = document.querySelector('#view_2959');
        if (!container) {
            log('No container found for parsing');
            return activities;
        }
        
        // Log the container content for debugging
        log('Container HTML length:', container.innerHTML.length);
        log('Container text preview:', container.textContent.substring(0, 200));
        
        // First, try to identify the structure the external code creates
        // Look for any divs, tables, or lists that might contain activities
        const allElements = container.querySelectorAll('div, table, ul, ol, .kn-list-item, [class*="activity"], a, button');
        log('Found elements:', allElements.length);
        
        // Common patterns for activities:
        // 1. Links or buttons with activity names
        // 2. List items
        // 3. Divs with specific classes
        // 4. Table rows
        
        // Try multiple strategies to find activities
        
        // Strategy 1: Look for clickable elements (links, buttons)
        const clickables = container.querySelectorAll('a:not([href="#"]), button:not([type="submit"])');
        clickables.forEach(element => {
            const text = element.textContent.trim();
            if (text && text.length > 5 && !text.includes('Click here')) {
                const category = detectCategory(text, element);
                const isCompleted = element.classList.contains('completed') || 
                                  element.closest('.completed') || 
                                  element.style.textDecoration === 'line-through';
                
                const activity = { name: text, category, element };
                if (isCompleted) {
                    activities.completed.push(activity);
                } else {
                    activities.incomplete.push(activity);
                }
            }
        });
        
        // Strategy 2: Look for divs with substantial text content
        if (activities.incomplete.length === 0 && activities.completed.length === 0) {
            const contentDivs = container.querySelectorAll('div');
            contentDivs.forEach(div => {
                // Skip if it has child divs (likely a container)
                if (div.querySelector('div')) return;
                
                const text = div.textContent.trim();
                // Activity names are usually between 10-100 characters
                if (text && text.length > 10 && text.length < 100) {
                    const hasClickHandler = div.onclick || div.querySelector('a, button');
                    if (hasClickHandler) {
                        const category = detectCategory(text, div);
                        const activity = { name: text, category, element: div };
                        activities.incomplete.push(activity);
                    }
                }
            });
        }
        
        // Strategy 3: Look for list items
        if (activities.incomplete.length === 0 && activities.completed.length === 0) {
            const listItems = container.querySelectorAll('li, .kn-list-item');
            listItems.forEach(item => {
                const text = item.textContent.trim();
                if (text && text.length > 5) {
                    const category = detectCategory(text, item);
                    const activity = { name: text, category, element: item };
                    activities.incomplete.push(activity);
                }
            });
        }
        
        // If still no activities found, look for any text that looks like an activity
        if (activities.incomplete.length === 0 && activities.completed.length === 0) {
            // Get all text nodes and look for activity patterns
            const walker = document.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            let node;
            const activityPatterns = [];
            while (node = walker.nextNode()) {
                const text = node.textContent.trim();
                if (text.length > 10 && text.length < 100) {
                    // Check if this looks like an activity name
                    if (!text.includes('click') && !text.includes('select') && !text.includes('below')) {
                        const parentEl = node.parentElement;
                        if (parentEl && parentEl.tagName !== 'SCRIPT' && parentEl.tagName !== 'STYLE') {
                            activityPatterns.push({ text, element: parentEl });
                        }
                    }
                }
            }
            
            // Add unique activity patterns
            const seen = new Set();
            activityPatterns.forEach(({ text, element }) => {
                if (!seen.has(text)) {
                    seen.add(text);
                    const category = detectCategory(text, element);
                    activities.incomplete.push({ name: text, category, element });
                }
            });
        }
        
        // Strategy 4: Look for activities after the header content
        if (activities.incomplete.length === 0 && activities.completed.length === 0) {
            // Check if there's a header followed by activities
            const headerElement = container.querySelector('[style*="background-color:#112f62"]');
            if (headerElement) {
                log('Found existing header, looking for activities after it');
                
                // Get all elements after the header
                let nextElement = headerElement.nextElementSibling;
                while (nextElement) {
                    // Look for activity-like elements
                    const links = nextElement.querySelectorAll('a');
                    const buttons = nextElement.querySelectorAll('button');
                    const divs = nextElement.querySelectorAll('div[onclick], div[style*="cursor:pointer"]');
                    
                    [...links, ...buttons, ...divs].forEach(element => {
                        const text = element.textContent.trim();
                        if (text && text.length > 5 && text.length < 100) {
                            const category = detectCategory(text, element);
                            const activity = { name: text, category, element };
                            activities.incomplete.push(activity);
                        }
                    });
                    
                    // Also check if the element itself is an activity
                    const text = nextElement.textContent.trim();
                    if (text && text.length > 10 && text.length < 100 && 
                        (nextElement.onclick || nextElement.querySelector('a, button'))) {
                        const category = detectCategory(text, nextElement);
                        activities.incomplete.push({ name: text, category, element: nextElement });
                    }
                    
                    nextElement = nextElement.nextElementSibling;
                }
            }
            
            // Remove duplicates
            const uniqueActivities = [];
            const seenNames = new Set();
            activities.incomplete.forEach(activity => {
                if (!seenNames.has(activity.name)) {
                    seenNames.add(activity.name);
                    uniqueActivities.push(activity);
                }
            });
            activities.incomplete = uniqueActivities;
        }
        
        log('Parsed activities - Incomplete:', activities.incomplete.length, 'Completed:', activities.completed.length);
        
        return activities;
    }
    
    // Detect VESPA category from activity name or element
    function detectCategory(name, element) {
        const text = (name + ' ' + (element?.className || '')).toLowerCase();
        
        if (text.includes('vision') || text.includes('goal') || text.includes('dream')) return 'vision';
        if (text.includes('effort') || text.includes('work') || text.includes('try')) return 'effort';
        if (text.includes('system') || text.includes('plan') || text.includes('organis')) return 'systems';
        if (text.includes('practice') || text.includes('test') || text.includes('revision')) return 'practice';
        if (text.includes('attitude') || text.includes('mind') || text.includes('think')) return 'attitude';
        
        // Check background color as fallback
        const bgColor = window.getComputedStyle(element).backgroundColor;
        if (bgColor.includes('255, 143')) return 'vision'; // Orange
        if (bgColor.includes('134, 180')) return 'effort'; // Blue
        if (bgColor.includes('114, 203')) return 'systems'; // Green
        if (bgColor.includes('127, 49')) return 'practice'; // Purple
        if (bgColor.includes('240, 50')) return 'attitude'; // Pink
        
        return 'effort'; // Default
    }
    
    // Wait for the external code to populate view_2959
    function waitForActivities() {
        log('Waiting for activities to load...');
        
        let attemptCount = 0;
        const maxAttempts = 20;
        
        function checkForContent() {
            const container = document.querySelector('#view_2959');
            
            if (!container) {
                log('Container not found yet, waiting...');
                attemptCount++;
                if (attemptCount < maxAttempts) {
                    setTimeout(checkForContent, 500);
                }
                return;
            }
            
            // Check for signs that content has loaded
            const hasSubstantialContent = container.innerHTML.length > 500;
            const hasLinks = container.querySelectorAll('a').length > 0;
            const hasButtons = container.querySelectorAll('button').length > 0;
            const hasDivs = container.querySelectorAll('div').length > 3;
            const hasText = container.textContent.trim().length > 100;
            
            // Look for common activity keywords
            const containerText = container.textContent.toLowerCase();
            const hasActivityKeywords = 
                containerText.includes('activity') ||
                containerText.includes('complete') ||
                containerText.includes('vision') ||
                containerText.includes('effort') ||
                containerText.includes('system') ||
                containerText.includes('practice') ||
                containerText.includes('attitude') ||
                containerText.includes('mind') ||
                containerText.includes('goal') ||
                containerText.includes('study');
            
            const isLoaded = (hasSubstantialContent && (hasLinks || hasButtons || hasDivs)) || 
                           (hasText && hasActivityKeywords);
            
            log(`Content check - HTML length: ${container.innerHTML.length}, Links: ${container.querySelectorAll('a').length}, Buttons: ${container.querySelectorAll('button').length}, Has keywords: ${hasActivityKeywords}`);
            
            if (isLoaded) {
                log('Content appears to be loaded, enhancing...');
                // Give it a bit more time to ensure everything is rendered
                setTimeout(() => enhanceActivities(), 1000);
            } else {
                attemptCount++;
                if (attemptCount < maxAttempts) {
                    log(`Content not ready yet, attempt ${attemptCount}/${maxAttempts}`);
                    setTimeout(checkForContent, 500);
                } else {
                    log('Max attempts reached, trying to enhance anyway...');
                    enhanceActivities();
                }
            }
        }
        
        // Also use MutationObserver as backup
        const observer = new MutationObserver(function(mutations, obs) {
            const container = document.querySelector('#view_2959');
            
            if (container && container.innerHTML.length > 500) {
                const hasActivityContent = 
                    container.querySelectorAll('a, button').length > 0 ||
                    container.textContent.toLowerCase().includes('activity');
                
                if (hasActivityContent) {
                    log('MutationObserver: Activities detected');
                    obs.disconnect();
                    clearTimeout(checkTimer);
                    setTimeout(() => enhanceActivities(), 1000);
                }
            }
        });
        
        // Start observing
        const targetNode = document.querySelector('#view_2959') || document.body;
        observer.observe(targetNode, {
            childList: true,
            subtree: true,
            characterData: true
        });
        
        // Start checking
        const checkTimer = setTimeout(checkForContent, 500);
    }
    
    // Main enhancement function
    function enhanceActivities() {
        log('Starting radical UI enhancement...');
        
        try {
            // Hide the data views
            hideDataViews();
            
            // Get the container
            const container = document.querySelector('#view_2959');
            if (!container) {
                log('Activities container not found');
                return;
            }
            
            // Parse existing activities
            const activities = parseActivityData();
            log('Parsed activities:', activities);
            
            // Create the new stunning UI
            createStunningUI(container, activities);
            
            // Apply all styles
            applyRadicalStyles();
            
            // Initialize interactions
            initializeInteractions();
            
            log('Radical enhancement complete!');
            
        } catch (error) {
            log('Error during enhancement:', error);
        }
    }
    
    // Hide the data views
    function hideDataViews() {
        const viewsToHide = ['#view_1089', '#view_1090', '#view_1505'];
        viewsToHide.forEach(selector => {
            const view = document.querySelector(selector);
            if (view) {
                view.style.display = 'none';
                log(`Hidden data view: ${selector}`);
            }
        });
    }
    
    // Create the stunning new UI
    function createStunningUI(container, activities) {
        // Calculate progress
        const total = activities.incomplete.length + activities.completed.length;
        const completed = activities.completed.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        // Build the new UI
        const newUI = `
            <div class="vespa-activities-container">
                <!-- New Lighthearted Header -->
                <div class="vespa-new-header">
                    <div class="header-content">
                        <div class="header-icon-row">
                            <span class="header-emoji">🚀</span>
                            <h1 class="header-title">Your VESPA Journey</h1>
                            <span class="header-emoji">✨</span>
                        </div>
                        <p class="header-subtitle">
                            Ready to level up? We've picked some awesome activities just for you! 
                            <span class="emoji-accent">🎯</span>
                        </p>
                        <div class="header-chips">
                            <span class="chip vision">👁️ Vision</span>
                            <span class="chip effort">💪 Effort</span>
                            <span class="chip systems">⚙️ Systems</span>
                            <span class="chip practice">🎯 Practice</span>
                            <span class="chip attitude">🧠 Attitude</span>
                        </div>
                    </div>
                </div>
                
                <!-- Progress Overview -->
                <div class="vespa-progress-overview">
                    <div class="progress-stats">
                        <div class="stat-item">
                            <span class="stat-number">${completed}</span>
                            <span class="stat-label">Completed</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${activities.incomplete.length}</span>
                            <span class="stat-label">To Do</span>
                        </div>
                        <div class="stat-item highlight">
                            <span class="stat-number">${progress}%</span>
                            <span class="stat-label">Progress</span>
                        </div>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${progress}%">
                            <span class="progress-text">${progress}%</span>
                        </div>
                    </div>
                </div>
                
                <!-- Filter Tabs -->
                <div class="vespa-filter-tabs">
                    <button class="filter-tab active" data-filter="all">
                        <span class="tab-icon">📚</span>
                        All Activities
                    </button>
                    <button class="filter-tab" data-filter="incomplete">
                        <span class="tab-icon">🎯</span>
                        To Do
                    </button>
                    <button class="filter-tab" data-filter="completed">
                        <span class="tab-icon">✅</span>
                        Completed
                    </button>
                </div>
                
                <!-- Activities Grid -->
                <div class="vespa-activities-grid">
                    ${total === 0 ? `
                        <div class="no-activities-message">
                            <span class="message-icon">🔍</span>
                            <h3>Loading your activities...</h3>
                            <p>If activities don't appear, try refreshing the page.</p>
                        </div>
                    ` : `
                        <!-- Incomplete Activities -->
                        <div class="activities-section" data-section="incomplete">
                            ${activities.incomplete.length > 0 ? `
                                <h2 class="section-title">
                                    <span class="title-icon">🚀</span>
                                    Ready to Start
                                </h2>
                                <div class="activities-list">
                                    ${activities.incomplete.map((activity, index) => createActivityCard(activity, false, index)).join('')}
                                </div>
                            ` : ''}
                        </div>
                        
                        <!-- Completed Activities -->
                        <div class="activities-section" data-section="completed">
                            ${activities.completed.length > 0 ? `
                                <h2 class="section-title">
                                    <span class="title-icon">🏆</span>
                                    Achievements
                                </h2>
                                <div class="activities-list completed-list">
                                    ${activities.completed.map((activity, index) => createActivityCard(activity, true, index)).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `}
                </div>
                
                <!-- Motivational Footer -->
                <div class="vespa-motivational-footer">
                    <p class="motivational-quote">
                        ${getMotivationalQuote(progress)}
                    </p>
                </div>
            </div>
        `;
        
        // Replace container content
        container.innerHTML = newUI;
        
        // Preserve original functionality by reattaching event listeners
        if (total > 0) {
            preserveOriginalFunctionality(container, activities);
        }
    }
    
    // Create an activity card
    function createActivityCard(activity, isCompleted, index) {
        const colors = VESPA_COLORS[activity.category] || VESPA_COLORS.effort;
        const delay = index * 0.1;
        
        return `
            <div class="vespa-activity-card ${isCompleted ? 'completed' : ''}" 
                 data-category="${activity.category}"
                 data-original-index="${index}"
                 style="animation-delay: ${delay}s">
                <div class="card-gradient" style="background: ${colors.gradient}"></div>
                <div class="card-content">
                    <div class="card-header">
                        <span class="category-badge" style="background: ${colors.primary}">
                            ${getCategoryIcon(activity.category)} ${activity.category.toUpperCase()}
                        </span>
                        ${isCompleted ? '<span class="completed-badge">✓ Done</span>' : ''}
                    </div>
                    <h3 class="activity-title">${activity.name}</h3>
                    <div class="card-footer">
                        <button class="activity-action-btn" data-action="${isCompleted ? 'review' : 'start'}">
                            ${isCompleted ? 'Review' : 'Start Activity'} →
                        </button>
                    </div>
                </div>
                <div class="card-hover-effect"></div>
            </div>
        `;
    }
    
    // Get category icon
    function getCategoryIcon(category) {
        const icons = {
            vision: '👁️',
            effort: '💪',
            systems: '⚙️',
            practice: '🎯',
            attitude: '🧠'
        };
        return icons[category] || '📚';
    }
    
    // Get motivational quote based on progress
    function getMotivationalQuote(progress) {
        if (progress === 0) return "🌟 Every journey begins with a single step. Start your first activity today!";
        if (progress < 25) return "🚀 Great start! Keep the momentum going!";
        if (progress < 50) return "💪 You're making excellent progress! Halfway there!";
        if (progress < 75) return "🔥 Amazing work! You're in the home stretch!";
        if (progress < 100) return "⭐ So close! Just a few more activities to complete!";
        return "🏆 Congratulations! You've completed all activities! Time to celebrate your achievement!";
    }
    
    // Preserve original functionality
    function preserveOriginalFunctionality(container, activities) {
        // Reattach click handlers to activity cards
        container.addEventListener('click', function(e) {
            const actionBtn = e.target.closest('.activity-action-btn');
            if (actionBtn) {
                const card = actionBtn.closest('.vespa-activity-card');
                const index = parseInt(card.dataset.originalIndex);
                const isCompleted = card.classList.contains('completed');
                
                // Find the original element and trigger its click
                const originalActivity = isCompleted ? 
                    activities.completed[index] : 
                    activities.incomplete[index];
                
                if (originalActivity && originalActivity.element) {
                    // Trigger click on the original element or its button
                    const originalBtn = originalActivity.element.querySelector('button, a, [onclick]');
                    if (originalBtn) {
                        originalBtn.click();
                    } else {
                        originalActivity.element.click();
                    }
                }
            }
        });
    }
    
    // Initialize all interactions
    function initializeInteractions() {
        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                // Update active tab
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // Filter activities
                const filter = this.dataset.filter;
                const sections = document.querySelectorAll('.activities-section');
                
                if (filter === 'all') {
                    sections.forEach(s => s.style.display = 'block');
                } else {
                    sections.forEach(s => {
                        s.style.display = s.dataset.section === filter ? 'block' : 'none';
                    });
                }
            });
        });
        
        // Add hover effects
        document.querySelectorAll('.vespa-activity-card').forEach(card => {
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-5px) scale(1.02)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
            });
        });
        
        // Mobile touch effects
        if (isMobileDevice()) {
            document.querySelectorAll('.vespa-activity-card').forEach(card => {
                card.addEventListener('touchstart', function() {
                    this.classList.add('touch-active');
                });
                
                card.addEventListener('touchend', function() {
                    setTimeout(() => this.classList.remove('touch-active'), 300);
                });
            });
        }
    }
    
    // Apply radical styles
    function applyRadicalStyles() {
        const existingStyles = document.getElementById('vespa-activities-radical-styles');
        if (existingStyles) existingStyles.remove();
        
        const styles = `
            /* Hide data views */
            #view_1089, #view_1090, #view_1505 {
                display: none !important;
            }
            
            /* Reset and base styles */
            .vespa-activities-container {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: #2a3c7a;
                padding: 20px;
                max-width: 1200px;
                margin: 0 auto;
                animation: fadeIn 0.5s ease;
            }
            
            /* New Lighthearted Header */
            .vespa-new-header {
                background: linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 100%);
                border-radius: 20px;
                padding: 30px;
                margin-bottom: 30px;
                box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
                animation: slideDown 0.6s ease;
            }
            
            .header-content {
                text-align: center;
            }
            
            .header-icon-row {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 15px;
                margin-bottom: 15px;
            }
            
            .header-emoji {
                font-size: 32px;
                animation: bounce 2s infinite;
            }
            
            .header-emoji:nth-child(3) {
                animation-delay: 0.5s;
            }
            
            .header-title {
                font-size: 32px;
                font-weight: 800;
                margin: 0;
                background: linear-gradient(135deg, #079baa 0%, #00e5db 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .header-subtitle {
                font-size: 18px;
                color: #5899a8;
                margin: 0 0 20px 0;
                font-weight: 500;
            }
            
            .emoji-accent {
                display: inline-block;
                animation: pulse 2s infinite;
            }
            
            .header-chips {
                display: flex;
                gap: 10px;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .chip {
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                color: white;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                transition: transform 0.3s ease;
            }
            
            .chip:hover {
                transform: translateY(-2px) scale(1.05);
            }
            
            .chip.vision { background: #ff8f00; }
            .chip.effort { background: #86b4f0; }
            .chip.systems { background: #72cb44; }
            .chip.practice { background: #7f31a4; }
            .chip.attitude { background: #f032e6; }
            
            /* No activities message */
            .no-activities-message {
                text-align: center;
                padding: 60px 20px;
                color: #6c757d;
            }
            
            .message-icon {
                font-size: 48px;
                display: block;
                margin-bottom: 20px;
                opacity: 0.5;
            }
            
            .no-activities-message h3 {
                font-size: 24px;
                margin: 0 0 10px 0;
                color: #2a3c7a;
            }
            
            .no-activities-message p {
                font-size: 16px;
                margin: 0;
            }
            
            /* Bounce animation */
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            
            /* Pulse animation */
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            
            /* Mobile adjustments for header */
            @media (max-width: 768px) {
                .vespa-new-header {
                    padding: 20px;
                }
                
                .header-emoji {
                    font-size: 24px;
                }
                
                .header-title {
                    font-size: 24px;
                }
                
                .header-subtitle {
                    font-size: 16px;
                }
                
                .chip {
                    font-size: 12px;
                    padding: 6px 12px;
                }
            }
            
            /* Header Section */
            .vespa-header-section {
                text-align: center;
                margin-bottom: 40px;
                animation: slideDown 0.6s ease;
            }
            
            .vespa-main-title {
                font-size: 36px;
                font-weight: 800;
                margin: 0 0 10px 0;
                background: linear-gradient(135deg, #079baa 0%, #00e5db 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .vespa-subtitle {
                font-size: 18px;
                color: #6c757d;
                margin: 0;
            }
            
            /* Progress Overview */
            .vespa-progress-overview {
                background: white;
                border-radius: 20px;
                padding: 30px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                margin-bottom: 30px;
                animation: slideUp 0.7s ease;
            }
            
            .progress-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
                gap: 20px;
                margin-bottom: 25px;
            }
            
            .stat-item {
                text-align: center;
            }
            
            .stat-number {
                display: block;
                font-size: 32px;
                font-weight: 700;
                color: #2a3c7a;
                line-height: 1;
            }
            
            .stat-item.highlight .stat-number {
                background: linear-gradient(135deg, #00e5db 0%, #079baa 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .stat-label {
                display: block;
                font-size: 14px;
                color: #6c757d;
                margin-top: 5px;
            }
            
            .progress-bar-container {
                height: 30px;
                background: #f0f4f8;
                border-radius: 15px;
                overflow: hidden;
                position: relative;
            }
            
            .progress-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, #079baa 0%, #00e5db 100%);
                border-radius: 15px;
                transition: width 1s ease;
                display: flex;
                align-items: center;
                justify-content: flex-end;
                padding-right: 15px;
                position: relative;
                overflow: hidden;
            }
            
            .progress-bar-fill::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -100%;
                width: 200%;
                height: 200%;
                background: linear-gradient(45deg, 
                    transparent 30%, 
                    rgba(255, 255, 255, 0.3) 50%, 
                    transparent 70%);
                animation: shimmer 2s infinite;
            }
            
            .progress-text {
                font-size: 14px;
                font-weight: 600;
                color: white;
                position: relative;
                z-index: 1;
            }
            
            /* Filter Tabs */
            .vespa-filter-tabs {
                display: flex;
                gap: 15px;
                margin-bottom: 30px;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .filter-tab {
                padding: 12px 24px;
                border: 2px solid #e0e0e0;
                background: white;
                border-radius: 25px;
                font-size: 16px;
                font-weight: 600;
                color: #6c757d;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .filter-tab:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            }
            
            .filter-tab.active {
                background: linear-gradient(135deg, #079baa 0%, #00e5db 100%);
                color: white;
                border-color: transparent;
            }
            
            .tab-icon {
                font-size: 20px;
            }
            
            /* Activities Grid */
            .vespa-activities-grid {
                margin-bottom: 40px;
            }
            
            .activities-section {
                margin-bottom: 40px;
                animation: fadeInUp 0.8s ease;
            }
            
            .section-title {
                font-size: 24px;
                font-weight: 700;
                color: #2a3c7a;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .title-icon {
                font-size: 28px;
            }
            
            .activities-list {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
            }
            
            /* Activity Cards */
            .vespa-activity-card {
                background: white;
                border-radius: 16px;
                overflow: hidden;
                position: relative;
                box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
                transition: all 0.3s ease;
                cursor: pointer;
                animation: cardEntry 0.6s ease forwards;
                opacity: 0;
            }
            
            .vespa-activity-card:hover {
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
            }
            
            .card-gradient {
                height: 5px;
                width: 100%;
            }
            
            .card-content {
                padding: 20px;
            }
            
            .card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            
            .category-badge {
                padding: 6px 12px;
                border-radius: 20px;
                color: white;
                font-size: 12px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .completed-badge {
                color: #28a745;
                font-size: 14px;
                font-weight: 600;
            }
            
            .activity-title {
                font-size: 18px;
                font-weight: 600;
                color: #2a3c7a;
                margin: 0 0 15px 0;
                line-height: 1.4;
            }
            
            .card-footer {
                display: flex;
                justify-content: flex-end;
            }
            
            .activity-action-btn {
                background: none;
                border: none;
                color: #079baa;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                padding: 8px 16px;
                border-radius: 8px;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .activity-action-btn:hover {
                background: #f0f4f8;
                transform: translateX(5px);
            }
            
            .vespa-activity-card.completed {
                opacity: 0.8;
            }
            
            .vespa-activity-card.completed .activity-title {
                text-decoration: line-through;
                opacity: 0.7;
            }
            
            .card-hover-effect {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, transparent 0%, rgba(0, 229, 219, 0.1) 100%);
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: none;
            }
            
            .vespa-activity-card:hover .card-hover-effect {
                opacity: 1;
            }
            
            /* Motivational Footer */
            .vespa-motivational-footer {
                text-align: center;
                padding: 40px 20px;
                animation: fadeIn 1s ease;
            }
            
            .motivational-quote {
                font-size: 20px;
                color: #6c757d;
                font-style: italic;
                max-width: 600px;
                margin: 0 auto;
                line-height: 1.6;
            }
            
            /* Mobile Responsive */
            @media (max-width: 768px) {
                .vespa-main-title {
                    font-size: 28px;
                }
                
                .vespa-subtitle {
                    font-size: 16px;
                }
                
                .progress-stats {
                    grid-template-columns: repeat(3, 1fr);
                }
                
                .stat-number {
                    font-size: 24px;
                }
                
                .activities-list {
                    grid-template-columns: 1fr;
                }
                
                .filter-tab {
                    padding: 10px 20px;
                    font-size: 14px;
                }
                
                .vespa-activities-container {
                    padding: 15px;
                }
            }
            
            /* Animations */
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes cardEntry {
                from {
                    opacity: 0;
                    transform: translateY(20px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
            
            /* Touch feedback for mobile */
            .touch-active {
                transform: scale(0.98) !important;
            }
            
            /* Celebration animation for 100% progress */
            .progress-bar-fill[style*="width: 100%"] {
                animation: celebrate 2s ease infinite;
            }
            
            @keyframes celebrate {
                0%, 100% { 
                    background: linear-gradient(90deg, #079baa 0%, #00e5db 100%); 
                }
                50% { 
                    background: linear-gradient(90deg, #00e5db 0%, #ff8f00 100%); 
                }
            }
        `;
        
        const styleEl = document.createElement('style');
        styleEl.id = 'vespa-activities-radical-styles';
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
    }
    
    // Initialize when DOM is ready
    function init() {
        log('Initializing VESPA Activities Radical Redesign...');
        
        if (window.location.href.includes('scene_437') || document.querySelector('#view_2959')) {
            setTimeout(() => {
                waitForActivities();
            }, 1000);
        }
        
        if (window.$ && window.$(document)) {
            $(document).on('knack-view-render.view_2959', function() {
                log('View 2959 rendered, waiting for content...');
                setTimeout(() => {
                    waitForActivities();
                }, 500);
            });
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
