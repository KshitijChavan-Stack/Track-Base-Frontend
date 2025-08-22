document.addEventListener('DOMContentLoaded', function() {
  // Splash screen functionality
  const splashScreen = document.getElementById('splashScreen');
  
  // Hide splash screen after 4 seconds
  setTimeout(() => {
    splashScreen.classList.add('fade-out');
    setTimeout(() => {
      splashScreen.style.display = 'none';
    }, 1000);
  }, 4000);
  const inputs = document.querySelectorAll('.input-group input');
  const loginButton = document.querySelector('.login-button');
  
  // Check if user is returning with an active session
  checkReturningUser();
  
  // Function to check if user is returning with an active session
  async function checkReturningUser() {
    try {
      // Check URL parameters for returning user
      const urlParams = new URLSearchParams(window.location.search);
      const userName = urlParams.get('name');
      const userEmail = urlParams.get('email');
      const userRole = urlParams.get('role');
      
      if (userName && userEmail) {
        console.log('=== CHECKING RETURNING USER ===');
        console.log('User data from URL:', { name: userName, email: userEmail, role: userRole });
        
        // Create user data object
        const userData = {
          name: userName,
          email: userEmail,
          isManager: userRole === 'manager'
        };
        
        // Check if user has an active session
        const hasActiveSession = await checkActiveSession(userData);
        
        if (hasActiveSession) {
          console.log('Returning user has active session, showing options directly');
          
          // Pre-fill the form with user data
          document.getElementById('name').value = userName;
          document.getElementById('email').value = userEmail;
          
          // Show options card directly
          document.getElementById('loginForm').style.display = 'none';
          const optionsCard = document.getElementById('optionsCard');
          optionsCard.style.display = 'block';
          setTimeout(() => {
            optionsCard.classList.add('show');
          }, 50);
          
          showNotification('Welcome back! You are already logged in.', 'info');
          
          // Store user data globally
          window.userData = userData;
        } else {
          console.log('Returning user has no active session, showing login form');
          // Clear URL parameters to avoid confusion
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (error) {
      console.error('Error checking returning user:', error);
    }
  }
  
  // Notification function
  function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    // Hide notification after 4 seconds
    setTimeout(() => {
      notification.classList.remove('show');
    }, 4000);
  }
  
  // Typing animation functionality
  inputs.forEach(input => {
    let typingTimer;
    
    input.addEventListener('input', function() {
      // Add typing class immediately
      this.classList.add('typing');
      
      // Clear existing timer
      clearTimeout(typingTimer);
      
      // Set timer to remove typing class after user stops typing
      typingTimer = setTimeout(() => {
        this.classList.remove('typing');
      }, 1000); // Remove animation 1 second after user stops typing
    });
    
    // Remove typing class when input loses focus
    input.addEventListener('blur', function() {
      this.classList.remove('typing');
      clearTimeout(typingTimer);
    });
  });

  // Store user data globally
  let userData = null;

  // Login button click handler
  loginButton.addEventListener('click', async function() {
    // Get form data
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    // Basic validation
    if (!name || !email || !password) {
      showNotification('Please fill in all fields', 'error');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }

    // Prepare data for API (matching Postman format)
    const loginData = {
      Name: name,
      Email: email,
      Password: password
    };

    try {
      // Show loading state
      loginButton.textContent = 'Logging in...';
      loginButton.disabled = true;

      // Log the data being sent
      console.log('Sending data to API:', loginData);
      console.log('API URL:', 'https://trackbase.onrender.com/api/user/login');

      // Make API call directly to ASP.NET API
      const response = await fetch('https://trackbase.onrender.com/api/user/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      console.log('Response URL:', response.url);

      const result = await response.json();

      if (response.ok) {
        // Success - handle the response
        console.log('Login successful:', result);
        
        // Store user data for later use
        userData = {
          name: name,
          email: email,
          isManager: result.isManager || false // Get the isManager boolean from API response
        };
        
        // Also store globally for returning users
        window.userData = userData;
        
        console.log('Stored user data:', userData);
        
        // Check if user already has an active session (entry today without exit)
        const hasActiveSession = await checkActiveSession(userData);
        if (hasActiveSession) {
          console.log('User has active session, skipping entry marking');
          showNotification('Welcome back! You are already logged in.', 'info');
        } else {
          try {
            console.log('No active session found, attempting to mark entry');
          await callMarkEntryAPI(userData);
          showNotification('Login successful! Welcome back!', 'success');
          } catch (e) {
            console.log('Entry marking failed:', e);
            showNotification('Login successful, but could not mark entry.', 'error');
          }
        }
        
        // Show options card instead of redirecting
        setTimeout(() => {
          document.getElementById('loginForm').style.display = 'none';
          const optionsCard = document.getElementById('optionsCard');
          optionsCard.style.display = 'block';
          // Trigger animation after a small delay to ensure display is set
          setTimeout(() => {
            optionsCard.classList.add('show');
          }, 50);
        }, 1000);
      } else {
        // Error from API
        console.error('Login failed:', result);
        showNotification(result.message || 'Login failed. Please try again.', 'error');
      }

    } catch (error) {
      // Network or other errors
      console.error('Error during login:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      showNotification(`Connection error: ${error.message}`, 'error');
    } finally {
      // Reset button state
      loginButton.textContent = 'Login';
      loginButton.disabled = false;
    }
  });

  // Function to check if user has an active session
  async function checkActiveSession(userData) {
    try {
      console.log('=== CHECKING ACTIVE SESSION ===');
      console.log('Checking for user:', userData.email);
      
      // Get today's date in the same format as the API
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      console.log('Checking for entries on:', todayString);
      
      // Fetch attendance data to check for today's entry
      const response = await fetch('https://trackbase.onrender.com/api/attendance');
      
      if (!response.ok) {
        console.error('Failed to fetch attendance data for session check');
        return false;
      }
      
      const attendanceData = await response.json();
      console.log('Attendance data received for session check:', attendanceData);
      
      // Filter for user's entries from today
      const userEmailLower = (userData.email || '').toLowerCase();
      const userTodayEntries = attendanceData.filter(record => {
        const recordDate = new Date(record.entryTime).toISOString().split('T')[0];
        const recEmailLower = (record.email || record.Email || '').toLowerCase();
        return recEmailLower === userEmailLower && recordDate === todayString;
      });
      
      console.log('User entries from today:', userTodayEntries);
      
      // Check if user has an entry today but no exit time (active session)
      const activeSession = userTodayEntries.some(record => {
        const hasEntry = record.entryTime;
        const hasExit = record.exitTime;
        return hasEntry && !hasExit; // Has entry but no exit = active session
      });
      
      console.log('Active session found:', activeSession);
      return activeSession;
      
    } catch (error) {
      console.error('Error checking active session:', error);
      return false; // If there's an error, assume no active session
    }
  }

  // Resolve exact email/name casing for managers from manager API (entry API may be case-sensitive)
  async function resolveEntryIdentity(userData) {
    try {
      if (userData?.isManager) {
        const res = await fetch('https://trackbase.onrender.com/api/manager');
        if (res.ok) {
          const list = await res.json();
          const found = list.find(m => (m.email || '').toLowerCase() === (userData.email || '').toLowerCase());
          if (found) {
            return { name: found.name || userData.name, email: found.email || userData.email };
          }
        }
      }
    } catch (_) {}
    return { name: userData.name, email: userData.email };
  }

  // Function to call mark entry API (robust single-call with safe parsing)
  async function callMarkEntryAPI(userData) {
      console.log('=== MARKING ENTRY FOR USER ===');
      console.log('User data:', userData);
      
      const password = document.getElementById('password').value.trim();
    if (!userData?.email || !password) {
        showNotification('Missing required information for attendance marking', 'error');
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        showNotification('Invalid email format for attendance marking', 'error');
        return;
      }
      
    // Normalize identity for entry call (keep exact casing if available from manager table)
    const identity = await resolveEntryIdentity(userData);
    const normalizedEmailLower = (identity.email || '').toLowerCase();
    // Send a compatibility payload that includes multiple casings some backends expect
    const payload = {
      EmployeeName: identity.name,
      Email: identity.email,
        password: password
      };
    console.log('Mark entry request body:', payload);

    async function postEntry(body) {
      const resp = await fetch('https://trackbase.onrender.com/api/attendance/entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Accept': 'application/json, text/plain, */*'
        },
        body: JSON.stringify(body)
      });
      const txt = await resp.text();
      let jsn; try { jsn = txt ? JSON.parse(txt) : null; } catch (_) { jsn = null; }
      return { ok: resp.ok, status: resp.status, text: txt, json: jsn };
    }

    // Attempt 1: Primary payload
    let result = await postEntry(payload);
    console.log('Mark entry response status:', result.status);
    if (!result.ok) {
      console.warn('Primary entry failed:', result.text || result.json);
      // Attempt 2: Password with capital P
      const payloadP = { EmployeeName: identity.name, Email: identity.email, Password: password };
      result = await postEntry(payloadP);
      if (!result.ok) {
        console.warn('Second entry attempt failed:', result.text || result.json);
        // Attempt 3: Name instead of EmployeeName
        const payloadName = { Name: identity.name, Email: identity.email, password: password };
        result = await postEntry(payloadName);
        if (!result.ok) {
          console.warn('Third entry attempt failed:', result.text || result.json);
          // Attempt 4: lowercase keys
          const payloadLower = { name: identity.name, email: (identity.email || '').toLowerCase(), password: password };
          result = await postEntry(payloadLower);
        }
      }
    }

    if (!result.ok) {
      const message = (result.json && (result.json.message || result.json.error)) || result.text || `HTTP ${result.status}`;
      console.error('Mark entry failed after retries:', message);
      showNotification(message, 'error');
          return;
        }
        
    console.log('✅ Mark entry successful', result.json || result.text);
      showNotification('Attendance marked successfully! 📅', 'success');
  }

  // Handle option button clicks
  document.getElementById('continueBtn').addEventListener('click', function() {
    showNotification('Have a productive day ahead! Keep up the great work! 🌟', 'success');
    
    // Hide the options card and show a simple message
    const optionsCard = document.getElementById('optionsCard');
    const loginForm = document.getElementById('loginForm');
    
    // Hide the options card
    optionsCard.style.display = 'none';
    
    // Show a simple welcome message in the right section while keeping the character image
    const rightSection = document.querySelector('.right-section');
    
    // Keep the existing character image
    const characterImage = rightSection.querySelector('.right-character');
    
    // Clear the section but preserve the character image
    rightSection.innerHTML = '';
    
    // Add back the character image
    if (characterImage) {
      rightSection.appendChild(characterImage);
    } else {
      // If character image doesn't exist, create it
      const newCharacterImage = document.createElement('img');
      newCharacterImage.src = 'img/rightSide.png';
      newCharacterImage.width = 300;
      newCharacterImage.alt = 'right character';
      newCharacterImage.className = 'right-character';
      rightSection.appendChild(newCharacterImage);
    }
    
    // Add the welcome message container
    const welcomeContainer = document.createElement('div');
    welcomeContainer.innerHTML = `
      <div class="welcome-message-container" style="
        text-align: center; 
        padding: 40px;
        animation: fadeInUp 0.8s ease-out;
        font-family: 'Inter', sans-serif;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 15px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(10px);
      ">
        <h2 style="
          color: #333; 
          margin-bottom: 20px; 
          font-weight: 700;
          font-size: 2.5rem;
          animation: slideInDown 1s ease-out 0.2s both;
        ">
          Welcome Back! 
          <span class="wave" style="
            display: inline-block;
            animation: wave 2s ease-in-out infinite;
          ">👋</span>
        </h2>
        <p style="
          color: #666; 
          font-size: 1.2rem; 
          line-height: 1.6;
          font-weight: 600;
          animation: slideInUp 1s ease-out 0.4s both;
        ">
          Have a productive day ahead! Keep up the great work! 
          <span style="
            display: inline-block;
            animation: sparkle 1.5s ease-in-out infinite;
          ">🌟</span>
        </p>
      </div>
      
      <style>
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
        
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes wave {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(20deg);
          }
          75% {
            transform: rotate(-15deg);
          }
        }
        
        @keyframes sparkle {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: scale(1.2) rotate(180deg);
            opacity: 0.8;
          }
        }
      </style>
    `;
    
    rightSection.appendChild(welcomeContainer);
  });

  document.getElementById('statsBtn').addEventListener('click', function() {
    showNotification('Your stats are loading... 📊', 'info');
    setTimeout(() => {
      // Pass the user's name and email via URL parameters
      const currentUserData = userData || window.userData;
      const userName = currentUserData ? currentUserData.name : 'User';
      const userEmail = currentUserData ? currentUserData.email : '';
      const isManager = currentUserData ? currentUserData.isManager : false;
      
      // Route based on user role
      if (isManager) {
        // Manager goes to dedicated manager dashboard
        window.location.href = `manager-dashboard.html?name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}&role=manager`;
      } else {
        // Employee goes to the employee dashboard
        window.location.href = `employee-dashboard.html?name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}&role=employee`;
      }
    }, 2000);
  });

  // Logout button click handler
  document.getElementById('logoutBtn').addEventListener('click', async function() {
    try {
      // Show loading state
      const logoutBtn = document.getElementById('logoutBtn');
      const originalText = logoutBtn.innerHTML;
      logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Marking Exit...</span>';
      logoutBtn.disabled = true;

      console.log('=== MARKING EXIT FOR USER ===');
      console.log('User data:', userData);
      
      // Get the password from the form
      const password = document.getElementById('password').value.trim();
      
      // Prepare exit data with correct format
      const exitData = {
        EmployeeName: userData.name,
        Email: userData.email,
        password: password
      };
      
      console.log('Exit API data:', exitData);
      console.log('Exit API URL:', 'https://trackbase.onrender.com/api/attendance/exit');
      
      // Call the exit API
      const response = await fetch('https://trackbase.onrender.com/api/attendance/exit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exitData)
      });
      
      console.log('Exit response status:', response.status);
      
      let result;
      try {
        result = await response.json();
        console.log('Exit response:', result);
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        result = { error: 'Invalid response format' };
      }
      
      if (response.ok) {
        console.log('✅ Exit marked successfully');
        showNotification('Exit marked successfully! Have a great day! 👋', 'success');
        
        // Wait a moment for the notification to be seen
        setTimeout(() => {
          // Reset the form
          document.getElementById('name').value = '';
          document.getElementById('email').value = '';
          document.getElementById('password').value = '';
          
          // Hide options card with animation
          const optionsCard = document.getElementById('optionsCard');
          optionsCard.style.transform = 'translate(-50%, -50%) scale(0.3)';
          optionsCard.style.opacity = '0';
          
          setTimeout(() => {
            optionsCard.style.display = 'none';
            // Show login form with animation
            const loginForm = document.getElementById('loginForm');
            loginForm.style.display = 'block';
            loginForm.style.opacity = '0';
            loginForm.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
              loginForm.style.transition = 'all 0.5s ease';
              loginForm.style.opacity = '1';
              loginForm.style.transform = 'translateY(0)';
            }, 50);
            
            // Reset user data
            userData = null;
            
            // Show final notification
            setTimeout(() => {
              showNotification('Logged out successfully! Please login again to continue.', 'info');
            }, 1000);
          }, 300);
        }, 1500);
        
      } else {
        console.error('❌ Exit marking failed:', result);
        showNotification('Exit marking failed. Please try again.', 'error');
        
        // Reset button state
        logoutBtn.innerHTML = originalText;
        logoutBtn.disabled = false;
      }
      
    } catch (error) {
      console.error('❌ Error calling exit API:', error);
      showNotification('Exit marking failed. Please try again.', 'error');
      
      // Reset button state
      const logoutBtn = document.getElementById('logoutBtn');
      logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i><span>Logout & Exit</span>';
      logoutBtn.disabled = false;
    }
  });
}); 