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
        
        // Check if user already has an active session (marked entry today but hasn't logged out)
        const hasActiveSession = await checkActiveSession(userData);
        
        if (hasActiveSession) {
          console.log('User has active session, skipping entry marking');
          showNotification('Welcome back! You are already logged in.', 'info');
        } else {
          console.log('No active session found, marking entry');
          // Call mark entry API
          await callMarkEntryAPI(userData);
          showNotification('Login successful! Welcome back!', 'success');
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
      const userTodayEntries = attendanceData.filter(record => {
        const recordDate = new Date(record.entryTime).toISOString().split('T')[0];
        return record.email === userData.email && recordDate === todayString;
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

  // Function to call mark entry API
  async function callMarkEntryAPI(userData) {
    try {
      console.log('=== MARKING ENTRY FOR USER ===');
      console.log('User data:', userData);
      
      // Get the password from the form
      const password = document.getElementById('password').value.trim();
      
      // Validate required fields before making API call
      if (!userData.email || !password) {
        console.error('Missing required fields for mark entry');
        showNotification('Missing required information for attendance marking', 'error');
        return;
      }
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        console.error('Invalid email format for mark entry');
        showNotification('Invalid email format for attendance marking', 'error');
        return;
      }
      
      // Use the correct format based on Postman testing
      const markEntryData = {
        EmployeeName: userData.name,
        Email: userData.email,
        password: password
      };
      
      console.log('Mark entry API data:', markEntryData);
      console.log('Mark entry API URL:', 'https://trackbase.onrender.com/api/attendance/entry');
      console.log('Mark entry request body:', JSON.stringify(markEntryData, null, 2));
      
      // Make the API call with proper error handling (calling external API directly)
      const response = await fetch('https://trackbase.onrender.com/api/attendance/entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(markEntryData)
      });
      
      console.log('Mark entry response status:', response.status);
      
      let result;
      try {
        result = await response.json();
        console.log('Mark entry response:', result);
        console.log('Mark entry response details:', JSON.stringify(result, null, 2));
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        console.log('Response text:', await response.text());
        result = { error: 'Invalid response format' };
      }
      
      // If the first format fails, try alternative formats
      if (!response.ok) {
        console.log('First format failed, trying alternative formats...');
        
        // Try alternative format with different casing
        const markEntryDataAlternative = {
          EmployeeName: userData.name,
          email: userData.email,
          password: password
        };
        
        const response2 = await fetch('https://trackbase.onrender.com/api/attendance/entry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(markEntryDataAlternative)
        });
        
        console.log('Mark entry response status (format 2):', response2.status);
        let result2;
        try {
          result2 = await response2.json();
          console.log('Mark entry response (format 2):', result2);
          console.log('Mark entry response details (format 2):', JSON.stringify(result2, null, 2));
        } catch (jsonError) {
          console.error('Error parsing JSON response (format 2):', jsonError);
          console.log('Response text (format 2):', await response2.text());
          result2 = { error: 'Invalid response format' };
        }
        
        if (response2.ok) {
          console.log('✅ Mark entry successful with alternative format');
          showNotification('Attendance marked successfully! 📅', 'success');
          return;
        }
        
              // Try userId format as last resort
      const markEntryDataUserId = {
        userId: userData.email,
        employeeName: userData.name
      };
      
      // Try a simpler format with just email and name
      const markEntryDataSimple = {
        EmployeeName: userData.name,
        Email: userData.email
      };
        
        const response3 = await fetch('https://trackbase.onrender.com/api/attendance/entry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(markEntryDataUserId)
        });
        
        console.log('Mark entry response status (format 3):', response3.status);
        let result3;
        try {
          result3 = await response3.json();
          console.log('Mark entry response (format 3):', result3);
          console.log('Mark entry response details (format 3):', JSON.stringify(result3, null, 2));
        } catch (jsonError) {
          console.error('Error parsing JSON response (format 3):', jsonError);
          console.log('Response text (format 3):', jsonError);
          result3 = { error: 'Invalid response format' };
        }
        
        if (response3.ok) {
          console.log('✅ Mark entry successful with userId format');
          showNotification('Attendance marked successfully! 📅', 'success');
          return;
        }
        
        // Try the simple format
        console.log('Third format failed, trying simple format...');
        const response4 = await fetch('https://trackbase.onrender.com/api/attendance/entry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(markEntryDataSimple)
        });
        
        console.log('Mark entry response status (format 4):', response4.status);
        let result4;
        try {
          result4 = await response4.json();
          console.log('Mark entry response (format 4):', result4);
          console.log('Mark entry response details (format 4):', JSON.stringify(result4, null, 2));
        } catch (jsonError) {
          console.error('Error parsing JSON response (format 4):', jsonError);
          console.log('Response text (format 4):', jsonError);
          result4 = { error: 'Invalid response format' };
        }
        
        if (response4.ok) {
          console.log('✅ Mark entry successful with simple format');
          showNotification('Attendance marked successfully! 📅', 'success');
          return;
        }
        
        // All formats failed - try alternative endpoint
        console.log('All standard formats failed, trying alternative endpoint...');
        const response5 = await fetch('https://trackbase.onrender.com/api/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(markEntryData)
        });
        
        console.log('Mark entry response status (alternative endpoint):', response5.status);
        let result5;
        try {
          result5 = await response5.json();
          console.log('Mark entry response (alternative endpoint):', result5);
          console.log('Mark entry response details (alternative endpoint):', JSON.stringify(result5, null, 2));
        } catch (jsonError) {
          console.error('Error parsing JSON response (alternative endpoint):', jsonError);
          console.log('Response text (alternative endpoint):', jsonError);
          result5 = { error: 'Invalid response format' };
        }
        
        if (response5.ok) {
          console.log('✅ Mark entry successful with alternative endpoint');
          showNotification('Attendance marked successfully! 📅', 'success');
          return;
        }
        
        // All attempts failed
        console.error('❌ Mark entry failed with all formats and endpoints:', result5);
        showNotification('Attendance marking failed, but login successful', 'error');
        return;
      }
      
      // If we reach here, the first format was successful
      console.log('✅ Mark entry successful with capitalized format');
      showNotification('Attendance marked successfully! 📅', 'success');
      
      // Test: Fetch attendance data to verify entry was saved
      setTimeout(async () => {
        try {
          console.log('=== VERIFYING ENTRY WAS SAVED ===');
          const verifyResponse = await fetch('https://trackbase.onrender.com/api/attendance');
          const verifyData = await verifyResponse.json();
          const userEntries = verifyData.filter(record => record.email === userData.email);
          console.log('User entries found after marking:', userEntries);
          console.log('Latest entry:', userEntries[userEntries.length - 1]);
        } catch (verifyError) {
          console.error('Error verifying entry:', verifyError);
        }
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error calling mark entry API:', error);
      showNotification('Attendance marking failed, but login successful', 'error');
    }
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
        // Manager goes to the main dashboard with search functionality
        window.location.href = `dashboard.html?name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}&role=manager`;
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