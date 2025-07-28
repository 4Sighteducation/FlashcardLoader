// VESPA Activities Data Integration Module
// Handles Knack data parsing, recommendations, and advanced features

(function(window) {
    'use strict';
    
    // Module namespace
    window.VESPAActivitiesData = window.VESPAActivitiesData || {};
    
    const MODULE_VERSION = '1.0';
    const DEBUG = true;
    
    // Helper function for logging
    function log(message, data) {
        if (DEBUG) console.log(`[VESPA Data Module v${MODULE_VERSION}] ${message}`, data || '');
    }
    
    // Parse VESPA scores from Knack view_1089
    VESPAActivitiesData.parseVESPAScores = function() {
        log('Parsing VESPA scores...');
        
        try {
            // Try to get data from Knack's data model
            if (window.Knack && window.Knack.models && window.Knack.models['view_1089']) {
                const model = window.Knack.models['view_1089'];
                const record = model.data.models[0];
                
                if (record && record.attributes) {
                    const scores = {
                        vision: parseFloat(record.attributes.field_149_raw) || 0,
                        effort: parseFloat(record.attributes.field_147_raw) || 0,
                        systems: parseFloat(record.attributes.field_148_raw) || 0,
                        practice: parseFloat(record.attributes.field_150_raw) || 0,
                        attitude: parseFloat(record.attributes.field_151_raw) || 0
                    };
                    
                    log('Parsed scores:', scores);
                    return scores;
                }
            }
            
            // Fallback: try to parse from DOM
            const view = document.querySelector('#view_1089');
            if (view) {
                const scores = {};
                const fields = view.querySelectorAll('.field');
                
                fields.forEach(field => {
                    const label = field.querySelector('.kn-detail-label')?.textContent.toLowerCase();
                    const value = field.querySelector('.kn-detail-body')?.textContent;
                    
                    if (label && value) {
                        if (label.includes('vision')) scores.vision = parseFloat(value) || 0;
                        else if (label.includes('effort')) scores.effort = parseFloat(value) || 0;
                        else if (label.includes('systems')) scores.systems = parseFloat(value) || 0;
                        else if (label.includes('practice')) scores.practice = parseFloat(value) || 0;
                        else if (label.includes('attitude')) scores.attitude = parseFloat(value) || 0;
                    }
                });
                
                return scores;
            }
            
        } catch (error) {
            log('Error parsing scores:', error);
        }
        
        // Return default scores if parsing fails
        return {
            vision: 5,
            effort: 5,
            systems: 5,
            practice: 5,
            attitude: 5
        };
    };
    
    // Parse all activities from view_1090
    VESPAActivitiesData.parseAllActivities = function() {
        log('Parsing all activities...');
        
        const activities = [];
        
        try {
            // Try to get data from Knack's data model
            if (window.Knack && window.Knack.models && window.Knack.models['view_1090']) {
                const model = window.Knack.models['view_1090'];
                const records = model.data.models;
                
                records.forEach(record => {
                    if (record && record.attributes) {
                        const activity = {
                            id: record.id,
                            name: record.attributes.field_1684_raw || '',
                            category: record.attributes.field_1686_raw || '',
                            level: record.attributes.field_1694_raw || 'Level 2',
                            scoreMin: parseFloat(record.attributes.field_1689_raw) || 0,
                            scoreMax: parseFloat(record.attributes.field_1690_raw) || 10,
                            content: {
                                video: record.attributes.field_1688_raw || '',
                                slideshow: record.attributes.field_1691_raw || '',
                                text: record.attributes.field_1685_raw || '',
                                instructions: record.attributes.field_1692_raw || '',
                                reflection: record.attributes.field_1696_raw || ''
                            },
                            duration: estimateActivityDuration(record.attributes),
                            isActive: record.attributes.field_1695_raw === true,
                            order: parseFloat(record.attributes.field_1693_raw) || 999
                        };
                        
                        activities.push(activity);
                    }
                });
            }
            
            // Sort by order
            activities.sort((a, b) => a.order - b.order);
            
        } catch (error) {
            log('Error parsing activities:', error);
        }
        
        return activities;
    };
    
    // Parse student's prescribed activities from field_1683
    VESPAActivitiesData.parsePrescribedActivities = function() {
        log('Parsing prescribed activities...');
        
        try {
            // Try to get from student record
            if (window.Knack && window.Knack.models && window.Knack.models['view_1505']) {
                const model = window.Knack.models['view_1505'];
                const record = model.data.models[0];
                
                if (record && record.attributes && record.attributes.field_1683_raw) {
                    // field_1683 contains array of activity names
                    const prescribedNames = record.attributes.field_1683_raw;
                    const allActivities = VESPAActivitiesData.parseAllActivities();
                    
                    // Match prescribed names to full activity objects
                    return allActivities.filter(activity => 
                        prescribedNames.includes(activity.name)
                    );
                }
            }
        } catch (error) {
            log('Error parsing prescribed activities:', error);
        }
        
        return [];
    };
    
    // Estimate activity duration based on content
    function estimateActivityDuration(attributes) {
        let duration = 15; // Base duration
        
        // Add time based on content types
        if (attributes.field_1688_raw) duration += 10; // Video
        if (attributes.field_1691_raw) duration += 10; // Slideshow
        if (attributes.field_1685_raw && attributes.field_1685_raw.length > 500) duration += 10; // Long text
        
        return duration;
    }
    
    // Smart recommendation algorithm
    VESPAActivitiesData.getRecommendations = function(scores, completedActivities = [], preferences = {}) {
        log('Generating recommendations...');
        
        const allActivities = VESPAActivitiesData.parseAllActivities();
        const recommendations = [];
        
        // Score each activity based on multiple factors
        allActivities.forEach(activity => {
            if (!activity.isActive) return;
            if (completedActivities.includes(activity.id)) return;
            
            let score = 0;
            
            // 1. Match score range
            const categoryScore = scores[activity.category.toLowerCase()] || 5;
            if (categoryScore >= activity.scoreMin && categoryScore <= activity.scoreMax) {
                score += 50; // High weight for matching score range
            }
            
            // 2. Priority for lowest scoring VESPA elements
            const lowestElement = Object.entries(scores).reduce((a, b) => a[1] < b[1] ? a : b)[0];
            if (activity.category.toLowerCase() === lowestElement) {
                score += 30;
            }
            
            // 3. Level appropriateness
            const studentLevel = preferences.level || 'Level 2';
            if (activity.level === studentLevel) {
                score += 20;
            }
            
            // 4. Variety bonus (different from recent activities)
            const recentCategories = preferences.recentCategories || [];
            if (!recentCategories.includes(activity.category)) {
                score += 15;
            }
            
            // 5. Duration preference
            if (preferences.preferredDuration) {
                const durationDiff = Math.abs(activity.duration - preferences.preferredDuration);
                score -= durationDiff; // Penalty for duration mismatch
            }
            
            // 6. Add some randomness for variety
            score += Math.random() * 10;
            
            recommendations.push({
                ...activity,
                recommendationScore: score
            });
        });
        
        // Sort by recommendation score
        recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);
        
        // Return top recommendations
        return recommendations.slice(0, 10);
    };
    
    // Search activities by query
    VESPAActivitiesData.searchActivities = function(query, filters = {}) {
        log(`Searching activities for: "${query}"`);
        
        const allActivities = VESPAActivitiesData.parseAllActivities();
        const searchTerms = query.toLowerCase().split(' ');
        
        const results = allActivities.filter(activity => {
            // Check if activity matches filters
            if (filters.categories && filters.categories.length > 0) {
                if (!filters.categories.includes(activity.category)) return false;
            }
            
            if (filters.levels && filters.levels.length > 0) {
                if (!filters.levels.includes(activity.level)) return false;
            }
            
            if (filters.duration) {
                if (filters.duration === 'short' && activity.duration > 20) return false;
                if (filters.duration === 'medium' && (activity.duration < 20 || activity.duration > 40)) return false;
                if (filters.duration === 'long' && activity.duration < 40) return false;
            }
            
            // Search in activity name and content
            const searchableText = [
                activity.name,
                activity.category,
                activity.content.text,
                activity.content.instructions
            ].join(' ').toLowerCase();
            
            // Check if all search terms are found
            return searchTerms.every(term => searchableText.includes(term));
        });
        
        return results;
    };
    
    // Get activities by problem/topic mapping
    VESPAActivitiesData.getActivitiesByProblem = function(problem) {
        const problemMappings = {
            'procrastination': ['Time Management', 'Weekly Planning', 'Pomodoro Technique'],
            'exam anxiety': ['Stopping Negative Thoughts', 'The First Aid Kit', 'Stand Tall'],
            'memory': ['Memory Palace Technique', 'Test Yourself', 'Flashcard Mastery'],
            'motivation': ['Vision Board Creation', 'Growth Mindset', 'Benefit Finding'],
            'concentration': ['High Flow Spaces', 'Mindfulness Practice', 'Digital Detox'],
            'revision': ['Time to Teach', 'Active Recall', 'Past Paper Practice'],
            'feedback': ['Managing Reactions', 'SADRAA Process', 'Feedback Journal'],
            'time management': ['Weekly Planner', 'Priority Matrix', 'Time Blocking'],
            'note taking': ['Cornell Notes', 'Mind Mapping', 'Visual Notes'],
            'reading': ['SQ3R Method', 'Speed Reading', 'Active Reading']
        };
        
        const relatedActivityNames = problemMappings[problem.toLowerCase()] || [];
        const allActivities = VESPAActivitiesData.parseAllActivities();
        
        return allActivities.filter(activity => 
            relatedActivityNames.some(name => 
                activity.name.toLowerCase().includes(name.toLowerCase())
            )
        );
    };
    
    // Track activity interactions
    VESPAActivitiesData.trackActivity = function(activityId, action, data = {}) {
        log(`Tracking activity: ${activityId}, action: ${action}`);
        
        // Get or create tracking data
        const tracking = JSON.parse(localStorage.getItem('vespa_activity_tracking') || '{}');
        
        if (!tracking[activityId]) {
            tracking[activityId] = {
                views: 0,
                starts: 0,
                completions: 0,
                saves: 0,
                lastAccessed: null,
                totalTime: 0
            };
        }
        
        // Update tracking based on action
        switch(action) {
            case 'view':
                tracking[activityId].views++;
                break;
            case 'start':
                tracking[activityId].starts++;
                tracking[activityId].lastAccessed = new Date().toISOString();
                break;
            case 'complete':
                tracking[activityId].completions++;
                if (data.duration) {
                    tracking[activityId].totalTime += data.duration;
                }
                break;
            case 'save':
                tracking[activityId].saves++;
                break;
        }
        
        // Save tracking data
        localStorage.setItem('vespa_activity_tracking', JSON.stringify(tracking));
        
        // Update user preferences based on activity
        updateUserPreferences(activityId, action);
        
        return tracking[activityId];
    };
    
    // Update user preferences based on activity interactions
    function updateUserPreferences(activityId, action) {
        const preferences = JSON.parse(localStorage.getItem('vespa_user_preferences') || '{}');
        const activity = VESPAActivitiesData.parseAllActivities().find(a => a.id === activityId);
        
        if (!activity) return;
        
        // Track recent categories
        if (!preferences.recentCategories) preferences.recentCategories = [];
        if (action === 'complete') {
            preferences.recentCategories.unshift(activity.category);
            preferences.recentCategories = preferences.recentCategories.slice(0, 5);
        }
        
        // Track preferred duration
        if (action === 'complete' && activity.duration) {
            if (!preferences.durationHistory) preferences.durationHistory = [];
            preferences.durationHistory.push(activity.duration);
            
            // Calculate average preferred duration
            const avg = preferences.durationHistory.reduce((a, b) => a + b, 0) / preferences.durationHistory.length;
            preferences.preferredDuration = Math.round(avg);
        }
        
        // Track completion patterns
        if (!preferences.completionsByCategory) preferences.completionsByCategory = {};
        if (action === 'complete') {
            preferences.completionsByCategory[activity.category] = 
                (preferences.completionsByCategory[activity.category] || 0) + 1;
        }
        
        localStorage.setItem('vespa_user_preferences', JSON.stringify(preferences));
    }
    
    // Get activity completion statistics
    VESPAActivitiesData.getCompletionStats = function() {
        const tracking = JSON.parse(localStorage.getItem('vespa_activity_tracking') || '{}');
        const stats = {
            totalCompleted: 0,
            totalTime: 0,
            byCategory: {},
            streak: 0,
            lastActivity: null
        };
        
        Object.entries(tracking).forEach(([activityId, data]) => {
            if (data.completions > 0) {
                stats.totalCompleted += data.completions;
                stats.totalTime += data.totalTime || 0;
                
                // Get activity details
                const activity = VESPAActivitiesData.parseAllActivities().find(a => a.id === activityId);
                if (activity) {
                    if (!stats.byCategory[activity.category]) {
                        stats.byCategory[activity.category] = 0;
                    }
                    stats.byCategory[activity.category] += data.completions;
                }
                
                // Track last activity
                if (data.lastAccessed && (!stats.lastActivity || data.lastAccessed > stats.lastActivity)) {
                    stats.lastActivity = data.lastAccessed;
                }
            }
        });
        
        // Calculate streak
        stats.streak = calculateStreak();
        
        return stats;
    };
    
    // Calculate activity streak
    function calculateStreak() {
        const tracking = JSON.parse(localStorage.getItem('vespa_activity_tracking') || '{}');
        const completionDates = [];
        
        Object.values(tracking).forEach(data => {
            if (data.lastAccessed && data.completions > 0) {
                const date = new Date(data.lastAccessed).toDateString();
                if (!completionDates.includes(date)) {
                    completionDates.push(date);
                }
            }
        });
        
        // Sort dates
        completionDates.sort((a, b) => new Date(b) - new Date(a));
        
        // Calculate consecutive days
        let streak = 0;
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (completionDates[0] === today || completionDates[0] === yesterday) {
            streak = 1;
            let currentDate = new Date(completionDates[0]);
            
            for (let i = 1; i < completionDates.length; i++) {
                const prevDate = new Date(currentDate.getTime() - 86400000);
                if (completionDates[i] === prevDate.toDateString()) {
                    streak++;
                    currentDate = prevDate;
                } else {
                    break;
                }
            }
        }
        
        return streak;
    }
    
    // Export activities data for analysis
    VESPAActivitiesData.exportData = function() {
        const data = {
            scores: VESPAActivitiesData.parseVESPAScores(),
            prescribed: VESPAActivitiesData.parsePrescribedActivities(),
            tracking: JSON.parse(localStorage.getItem('vespa_activity_tracking') || '{}'),
            preferences: JSON.parse(localStorage.getItem('vespa_user_preferences') || '{}'),
            stats: VESPAActivitiesData.getCompletionStats(),
            exportDate: new Date().toISOString()
        };
        
        return data;
    };
    
    // Initialize module
    VESPAActivitiesData.init = function() {
        log('Initializing VESPA Activities Data Module...');
        
        // Load saved data
        const savedActivities = localStorage.getItem('vespa_saved_activities');
        if (savedActivities) {
            try {
                window.VESPAActivitiesData.savedActivities = JSON.parse(savedActivities);
            } catch (e) {
                window.VESPAActivitiesData.savedActivities = [];
            }
        }
        
        // Set up event listeners for Knack data updates
        if (window.$ && window.$(document)) {
            $(document).on('knack-record-create.any', function(event, view, record) {
                log('Record created, refreshing data...');
                // Refresh data when records are created
            });
            
            $(document).on('knack-record-update.any', function(event, view, record) {
                log('Record updated, refreshing data...');
                // Refresh data when records are updated
            });
        }
        
        log('Data module initialized');
    };
    
    // Auto-initialize when loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', VESPAActivitiesData.init);
    } else {
        VESPAActivitiesData.init();
    }
    
})(window); 
