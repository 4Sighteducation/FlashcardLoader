// Student Emulator Module
// This module allows staff to view the student portal experience in a read-only mode
// Version 1.0

(function() {
    'use strict';
    
      // Configuration
  const CONFIG = {
    backendUrl: window.location.hostname === 'localhost' 
      ? 'http://localhost:3001' 
      : 'https://vespa-student-emulator-d7e95341ee8b.herokuapp.com', // Live backend URL
    students: {
      ks4: {
        name: 'Key Stage 4 Student',
        email: 'gbolton@vespa.academy',
        password: 'Password123',
        description: 'Year 10-11 exemplar student'
      },
      ks5: {
        name: 'Key Stage 5 Student', 
        email: 'aramsey@vespa.academy',
        password: 'Password123',
        description: 'Year 12-13 exemplar student'
      }
    },
    updateInterval: 1000 // How often to update the screenshot
  };
    
    // Track current session
    let currentSession = {
      active: false,
      student: null,
      startTime: null,
      timeoutId: null,
      intervalId: null,
      iframe: null
    };
    
    // Create the Student Emulator object
    window.StudentEmulator = {
      // Show the emulator modal
      show: function() {
        if (currentSession.active) {
          alert('A student emulation session is already active. Please close it before starting a new one.');
          return;
        }
        
        // Create and show the selection modal
        this.createSelectionModal();
      },
      
      // Create the selection modal
      createSelectionModal: function() {
        // Remove any existing modal
        const existingModal = document.getElementById('student-emulator-modal');
        if (existingModal) existingModal.remove();
        
        // Create modal HTML
        const modalHTML = `
          <div id="student-emulator-modal" class="se-modal">
            <div class="se-modal-content se-selection">
              <div class="se-modal-header">
                <h2>Student View Emulator</h2>
                <span class="se-close" onclick="StudentEmulator.closeSelection()">&times;</span>
              </div>
              <div class="se-modal-body">
                <p class="se-warning">
                  <i class="fas fa-exclamation-triangle"></i>
                  <strong>Important:</strong> This is a VIEW-ONLY mode. Do not attempt to modify any student data.
                </p>
                <p class="se-description">Select a student profile to view their portal experience:</p>
                <div class="se-student-options">
                  <button class="se-student-btn" onclick="StudentEmulator.startEmulation('ks4')">
                    <i class="fas fa-user-graduate"></i>
                    <h3>${CONFIG.students.ks4.name}</h3>
                    <p>${CONFIG.students.ks4.description}</p>
                  </button>
                  <button class="se-student-btn" onclick="StudentEmulator.startEmulation('ks5')">
                    <i class="fas fa-user-graduate"></i>
                    <h3>${CONFIG.students.ks5.name}</h3>
                    <p>${CONFIG.students.ks5.description}</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add styles if not already present
        if (!document.getElementById('student-emulator-styles')) {
          this.addStyles();
        }
      },
      
      // Close selection modal
      closeSelection: function() {
        const modal = document.getElementById('student-emulator-modal');
        if (modal) modal.remove();
      },
      
      // Start emulation session
      startEmulation: function(studentKey) {
        const student = CONFIG.students[studentKey];
        if (!student) {
          console.error('Invalid student key:', studentKey);
          return;
        }
        
        // Close selection modal
        this.closeSelection();
        
        // Create emulation modal
        this.createEmulationModal(student);
        
        // Set up session
        currentSession = {
          active: true,
          student: student,
          startTime: Date.now(),
          sessionId: null,
          updateInterval: null
        };
        
        // Log session start
        console.log(`[Student Emulator] Started emulation session for ${student.name}`);
      },
      
      // Create emulation modal with backend integration
      createEmulationModal: async function(student) {
        const modalHTML = `
          <div id="student-emulator-view" class="se-modal">
            <div class="se-modal-content se-emulation">
              <div class="se-emulation-header">
                <div class="se-header-info">
                  <span class="se-view-label">VIEW ONLY MODE</span>
                  <span class="se-student-info">Viewing as: ${student.name}</span>
                </div>
                <div class="se-header-actions">
                  <button class="se-refresh-btn" onclick="StudentEmulator.refreshView()" title="Refresh view">
                    <i class="fas fa-sync-alt"></i>
                  </button>
                  <button class="se-end-btn" onclick="StudentEmulator.endSession()">
                    <i class="fas fa-times"></i> End Session
                  </button>
                </div>
              </div>
              <div class="se-view-container">
                <div class="se-loading">
                  <i class="fas fa-spinner fa-spin"></i>
                  <p>Starting emulation session...</p>
                  <p class="se-loading-status">Connecting to backend...</p>
                </div>
                <div class="se-screenshot-container" style="display: none;">
                  <img id="student-view-screenshot" class="se-screenshot" alt="Student Portal View">
                  <div class="se-url-bar">
                    <i class="fas fa-globe"></i>
                    <span id="current-url"></span>
                  </div>
                </div>
              </div>
              <div class="se-watermark">VIEW ONLY - NO CHANGES WILL BE SAVED</div>
            </div>
          </div>
        `;
        
        // Add to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        try {
          // Start backend session
          const loadingStatus = document.querySelector('.se-loading-status');
          loadingStatus.textContent = 'Creating session...';
          
          const startResponse = await fetch(`${CONFIG.backendUrl}/api/student-emulator/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              studentKey: student === CONFIG.students.ks4 ? 'ks4' : 'ks5' 
            })
          });
          
          if (!startResponse.ok) {
            throw new Error('Failed to start session');
          }
          
          const { sessionId } = await startResponse.json();
          currentSession.sessionId = sessionId;
          
          // Perform login
          loadingStatus.textContent = 'Logging in as student...';
          
          const loginResponse = await fetch(`${CONFIG.backendUrl}/api/student-emulator/login/${sessionId}`, {
            method: 'POST'
          });
          
          if (!loginResponse.ok) {
            throw new Error('Failed to login');
          }
          
          const loginData = await loginResponse.json();
          
          // Hide loading, show screenshot
          document.querySelector('.se-loading').style.display = 'none';
          document.querySelector('.se-screenshot-container').style.display = 'block';
          
          // Display initial screenshot
          this.updateView(loginData);
          
          // Start update loop
          this.startUpdateLoop();
          
          // Set up click handler on screenshot
          this.setupClickHandler();
          
        } catch (error) {
          console.error('[Student Emulator] Error:', error);
          document.querySelector('.se-loading-status').innerHTML = `
            <span style="color: #ff6b6b;">Error: ${error.message}</span><br>
            <button onclick="StudentEmulator.endSession()" style="margin-top: 10px;">Close</button>
          `;
        }
      },
      
      // Update the view with new screenshot
      updateView: function(data) {
        if (!data || !data.screenshot) return;
        
        const screenshot = document.getElementById('student-view-screenshot');
        const urlDisplay = document.getElementById('current-url');
        
        if (screenshot) {
          screenshot.src = data.screenshot;
        }
        
        if (urlDisplay && data.url) {
          urlDisplay.textContent = data.url;
        }
      },
      
      // Start the update loop to refresh screenshots
      startUpdateLoop: function() {
        if (currentSession.updateInterval) {
          clearInterval(currentSession.updateInterval);
        }
        
        currentSession.updateInterval = setInterval(async () => {
          if (!currentSession.sessionId) return;
          
          try {
            const response = await fetch(`${CONFIG.backendUrl}/api/student-emulator/view/${currentSession.sessionId}`);
            if (response.ok) {
              const data = await response.json();
              this.updateView(data);
            }
          } catch (error) {
            console.error('[Student Emulator] Update error:', error);
          }
        }, CONFIG.updateInterval);
      },
      
      // Set up click handling on the screenshot
      setupClickHandler: function() {
        const screenshot = document.getElementById('student-view-screenshot');
        if (!screenshot) return;
        
        screenshot.style.cursor = 'pointer';
        
        screenshot.addEventListener('click', async (e) => {
          if (!currentSession.sessionId) return;
          
          // Get click coordinates relative to the image
          const rect = screenshot.getBoundingClientRect();
          const x = Math.round((e.clientX - rect.left) * (screenshot.naturalWidth / rect.width));
          const y = Math.round((e.clientY - rect.top) * (screenshot.naturalHeight / rect.height));
          
          console.log(`[Student Emulator] Clicked at ${x}, ${y}`);
          
          try {
            const response = await fetch(`${CONFIG.backendUrl}/api/student-emulator/click/${currentSession.sessionId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ x, y })
            });
            
            if (response.ok) {
              const data = await response.json();
              this.updateView(data);
            }
          } catch (error) {
            console.error('[Student Emulator] Click error:', error);
          }
        });
      },

      
      // Refresh the view
      refreshView: async function() {
        if (!currentSession.sessionId) return;
        
        try {
          const response = await fetch(`${CONFIG.backendUrl}/api/student-emulator/view/${currentSession.sessionId}`);
          if (response.ok) {
            const data = await response.json();
            this.updateView(data);
          }
        } catch (error) {
          console.error('[Student Emulator] Error refreshing view:', error);
        }
      },

      
      // End emulation session
      endSession: async function(message) {
        // Clear intervals
        if (currentSession.updateInterval) {
          clearInterval(currentSession.updateInterval);
        }
        
        // End backend session
        if (currentSession.sessionId) {
          try {
            await fetch(`${CONFIG.backendUrl}/api/student-emulator/session/${currentSession.sessionId}`, {
              method: 'DELETE'
            });
          } catch (error) {
            console.error('[Student Emulator] Error ending backend session:', error);
          }
        }
        
        // Remove modal
        const modal = document.getElementById('student-emulator-view');
        if (modal) modal.remove();
        
        // Show message if provided
        if (message) {
          alert(message);
        }
        
        // Log session end
        if (currentSession.student) {
          const duration = Date.now() - currentSession.startTime;
          console.log(`[Student Emulator] Ended session for ${currentSession.student.name} after ${Math.round(duration / 1000)} seconds`);
        }
        
        // Reset session
        currentSession = {
          active: false,
          student: null,
          startTime: null,
          sessionId: null,
          updateInterval: null
        };
      },
      
      // Add CSS styles
      addStyles: function() {
        const styles = `
          /* Student Emulator Modal Base */
          .se-modal {
            display: block;
            position: fixed;
            z-index: 100000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            animation: seFadeIn 0.3s;
          }
          
          @keyframes seFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          .se-modal-content {
            background-color: #fefefe;
            margin: 2% auto;
            border: 1px solid #888;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            animation: seSlideIn 0.3s;
          }
          
          @keyframes seSlideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          
          /* Selection Modal */
          .se-selection {
            width: 600px;
            max-width: 90%;
          }
          
          .se-modal-header {
            background: linear-gradient(135deg, #0a2b8c 0%, #061a54 100%);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .se-modal-header h2 {
            margin: 0;
            font-size: 24px;
          }
          
          .se-close {
            color: white;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s;
          }
          
          .se-close:hover {
            transform: scale(1.2);
          }
          
          .se-modal-body {
            padding: 20px;
          }
          
          .se-warning {
            background-color: #fff3cd;
            border: 1px solid #ffeeba;
            color: #856404;
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 20px;
          }
          
          .se-warning i {
            margin-right: 8px;
          }
          
          .se-description {
            margin-bottom: 20px;
            color: #333;
          }
          
          .se-student-options {
            display: flex;
            gap: 20px;
            justify-content: center;
          }
          
          .se-student-btn {
            flex: 1;
            padding: 20px;
            border: 2px solid #ddd;
            background: white;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            text-align: center;
          }
          
          .se-student-btn:hover {
            border-color: #00e5db;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          
          .se-student-btn i {
            font-size: 48px;
            color: #0a2b8c;
            margin-bottom: 10px;
          }
          
          .se-student-btn h3 {
            margin: 10px 0;
            color: #333;
          }
          
          .se-student-btn p {
            margin: 0;
            color: #666;
            font-size: 14px;
          }
          
          /* Emulation Modal */
          .se-emulation {
            width: 95%;
            height: 90vh;
            display: flex;
            flex-direction: column;
          }
          
          .se-emulation-header {
            background: #333;
            color: white;
            padding: 10px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 8px 8px 0 0;
          }
          
          .se-header-info {
            display: flex;
            align-items: center;
            gap: 20px;
          }
          
          .se-view-label {
            background: #ff4444;
            padding: 4px 12px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 14px;
          }
          
          .se-student-info {
            font-size: 14px;
          }
          
          .se-header-actions {
            display: flex;
            gap: 10px;
          }
          
          .se-refresh-btn, .se-end-btn {
            background: #555;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
          }
          
          .se-refresh-btn:hover {
            background: #666;
          }
          
          .se-end-btn {
            background: #ff4444;
          }
          
          .se-end-btn:hover {
            background: #ff5555;
          }
          
                   .se-view-container {
           flex: 1;
           position: relative;
           background: white;
           overflow: auto;
           display: flex;
           flex-direction: column;
         }
          
          .se-loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: #666;
          }
          
                   .se-loading i {
             font-size: 48px;
             margin-bottom: 10px;
           }
           
           .se-loading-status {
             font-size: 14px;
             color: #999;
             margin-top: 5px;
           }
                     
           .se-screenshot-container {
             flex: 1;
             display: flex;
             flex-direction: column;
             position: relative;
           }
           
           .se-screenshot {
             width: 100%;
             height: auto;
             border: none;
             display: block;
           }
           
           .se-url-bar {
             background: #f5f5f5;
             padding: 8px 12px;
             border-top: 1px solid #ddd;
             display: flex;
             align-items: center;
             gap: 8px;
             font-size: 14px;
             color: #666;
           }
           
           .se-url-bar i {
             color: #999;
           }
          
          .se-watermark {
            position: absolute;
            bottom: 20px;
            right: 20px;
            background: rgba(255, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            font-weight: bold;
            border-radius: 4px;
            pointer-events: none;
            z-index: 1000;
          }
          
          /* Responsive */
          @media (max-width: 768px) {
            .se-student-options {
              flex-direction: column;
            }
            
            .se-emulation {
              width: 100%;
              height: 100vh;
              margin: 0;
            }
          }
        `;
        
        const styleElement = document.createElement('style');
        styleElement.id = 'student-emulator-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
      }
    };
    
    // Initialize on load
    console.log('[Student Emulator] Module loaded and ready');
  })();
