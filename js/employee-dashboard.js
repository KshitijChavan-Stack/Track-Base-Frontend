document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const mainContent = document.querySelector('.main-content');

  // Sidebar is open by default
  sidebar.classList.add('open');

  menuToggle.addEventListener('click', function() {
    sidebar.classList.toggle('open');
    mainContent.classList.toggle('sidebar-closed');
  });

  // Get user name from URL parameters and update greeting
  function updateGreeting() {
    const urlParams = new URLSearchParams(window.location.search);
    const userName = urlParams.get('name');
    const userRole = urlParams.get('role');
    
    if (userName) {
      const greetingElement = document.getElementById('employeeGreeting');
      if (greetingElement) {
        greetingElement.textContent = `Hello ${userName}`;
      }
    }
    
    // Update breadcrumb based on role
    if (userRole === 'employee') {
      const breadcrumbElement = document.querySelector('.breadcrumbs span:last-child');
      if (breadcrumbElement) {
        breadcrumbElement.textContent = 'Employee Dashboard';
      }
    }
  }

  // Show notification function
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

  // Load employee stats for current month/year
  async function loadEmployeeStats() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    await loadEmployeeStatsForPeriod(currentMonth, currentYear);
  }

  // Load employee stats for specific period
  async function loadEmployeeStatsForPeriod(month, year) {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const userEmail = urlParams.get('email');
      
      console.log('=== DEBUGGING EMPLOYEE DASHBOARD ===');
      console.log('User email from URL:', userEmail);
      console.log('Loading stats for month:', month, 'year:', year);
      console.log('Full URL params:', window.location.search);
      
      if (!userEmail) {
        showNotification('User information not found', 'error');
        return;
      }

      // Show loading state
      showNotification(`Loading statistics for ${getMonthName(month)} ${year}...`, 'info');

      // Fetch all users to find the logged-in user
      console.log('Fetching users from API...');
      const usersResponse = await fetch('https://trackbase.onrender.com/api/attendance', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Users response status:', usersResponse.status);
      console.log('Users response ok:', usersResponse.ok);

      if (!usersResponse.ok) {
        throw new Error(`Failed to fetch users data: ${usersResponse.status}`);
      }

      const attendanceData = await usersResponse.json();
      console.log('Attendance data received:', attendanceData);
      
      // Since we're fetching from attendance API, we need to find user records
      const userAttendanceRecords = attendanceData.filter(record => record.email === userEmail);
      console.log('User attendance records found:', userAttendanceRecords);
      
      if (userAttendanceRecords.length === 0) {
        throw new Error('No attendance records found for user');
      }
      
      // Create a user object from the first attendance record
      const currentUser = {
        email: userEmail,
        name: userAttendanceRecords[0].name || 'User'
      };
      console.log('Current user created:', currentUser);

      // Use the attendance data we already fetched
      const attendanceRecords = attendanceData;
      console.log('Using attendance data for calculations');
      
      // Calculate statistics from the data for specific period
      const stats = calculateStatsFromDataForPeriod(currentUser, attendanceRecords, month, year);
      console.log('Calculated stats:', stats);
      displayStats(stats);
      showNotification(`Statistics loaded for ${getMonthName(month)} ${year}! 📊`, 'success');

    } catch (error) {
      console.error('=== ERROR IN EMPLOYEE DASHBOARD ===');
      console.error('Error loading stats:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      // Show error notification only
      showNotification(`Failed to load statistics: ${error.message}`, 'error');
    }
  }

  // Helper function to get month name
  function getMonthName(month) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month];
  }

  // Calculate statistics from API data for specific period
  function calculateStatsFromDataForPeriod(user, attendanceRecords, month, year) {
    console.log('Calculating stats for user:', user);
    console.log('Total attendance records:', attendanceRecords.length);
    console.log('Filtering for month:', month, 'year:', year);
    
    // Filter attendance records for current user and specified month/year
    const userAttendance = attendanceRecords.filter(record => 
      record.email === user.email && 
      new Date(record.entryTime).getMonth() === month &&
      new Date(record.entryTime).getFullYear() === year
    );
    
    console.log('Filtered user attendance records:', userAttendance);
    console.log('User attendance count:', userAttendance.length);

    // Calculate days present (unique days with entry records)
    const uniqueDays = new Set();
    userAttendance.forEach(record => {
      const entryDate = new Date(record.entryTime).toDateString();
      uniqueDays.add(entryDate);
    });
    const daysPresent = uniqueDays.size;

    // Calculate total hours
    let totalHours = 0;
    const dailyHours = {};

    userAttendance.forEach(record => {
      const entryDate = new Date(record.entryTime).toDateString();
      const entryTime = new Date(record.entryTime);
      const exitTime = record.exitTime ? new Date(record.exitTime) : null;

      if (exitTime) {
        const hoursWorked = (exitTime - entryTime) / (1000 * 60 * 60); // Convert to hours
        totalHours += hoursWorked;
        
        // Track hours per day for best day calculation
        if (!dailyHours[entryDate]) {
          dailyHours[entryDate] = 0;
        }
        dailyHours[entryDate] += hoursWorked;
      }
    });

    // Calculate attendance rate (assuming 22 working days per month)
    const workingDaysInMonth = 22;
    const attendanceRate = Math.round((daysPresent / workingDaysInMonth) * 100);

    // Prepare recent activity
    const recentActivity = userAttendance
      .sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime))
      .slice(0, 10)
      .map(record => ({
        date: new Date(record.entryTime).toLocaleDateString(),
        action: 'Clock In',
        time: new Date(record.entryTime).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }));

    // Add exit times if available
    userAttendance.forEach(record => {
      if (record.exitTime) {
        recentActivity.push({
          date: new Date(record.exitTime).toLocaleDateString(),
          action: 'Clock Out',
          time: new Date(record.exitTime).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        });
      }
    });

    // Sort recent activity by date and time
    recentActivity.sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`);
      const dateB = new Date(`${b.date} ${b.time}`);
      return dateB - dateA;
    });

    return {
      totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal place
      daysPresent: daysPresent,
      attendanceRate: attendanceRate,
      recentActivity: recentActivity.slice(0, 10) // Show only last 10 activities
    };
  }

  // Display stats in the UI
  function displayStats(stats) {
    document.getElementById('totalHours').textContent = stats.totalHours || '0';
    document.getElementById('daysPresent').textContent = stats.daysPresent || '0';
    document.getElementById('attendanceRate').textContent = `${stats.attendanceRate || 0}%`;
    
    // Load recent activity
    loadRecentActivity(stats.recentActivity || []);
  }



  // Load recent activity
  function loadRecentActivity(activities) {
    const activityList = document.getElementById('activityList');
    
    if (activities.length === 0) {
      activityList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No recent activity</p>';
      return;
    }

    const activityHTML = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">
          <i class="fas ${activity.action === 'Clock In' ? 'fa-sign-in-alt' : 'fa-sign-out-alt'}"></i>
        </div>
        <div class="activity-content">
          <h4>${activity.action}</h4>
          <p>${activity.date} at ${activity.time}</p>
        </div>
      </div>
    `).join('');

    activityList.innerHTML = activityHTML;
  }

  // Initialize dashboard
  console.log('Initializing employee dashboard...');
  updateGreeting();
  initializeSearchFilter();
  loadEmployeeStats();
  initializeGoBackHome();
  initializeLogout();

  // Initialize search filter with current month and year
  function initializeSearchFilter() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Set current month and year as default
    document.getElementById('monthSelect').value = currentMonth;
    document.getElementById('yearSelect').value = currentYear;
    
    // Add event listener for search button
    document.getElementById('searchBtn').addEventListener('click', function() {
      const selectedMonth = parseInt(document.getElementById('monthSelect').value);
      const selectedYear = parseInt(document.getElementById('yearSelect').value);
      
      console.log('Searching for:', selectedMonth, selectedYear);
      loadEmployeeStatsForPeriod(selectedMonth, selectedYear);
    });
  }

  // Initialize go back to home functionality - redirect to index.html
  function initializeGoBackHome() {
    document.getElementById('goBackHome').addEventListener('click', function(e) {
      e.preventDefault();
      
      // Get user data from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const userName = urlParams.get('name');
      const userEmail = urlParams.get('email');
      const userRole = urlParams.get('role');
      
      // Redirect to index.html with user data as URL parameters
      window.location.href = `index.html?name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}&role=${encodeURIComponent(userRole)}`;
    });
  }

  // Initialize logout functionality
  function initializeLogout() {
    document.getElementById('logoutBtn').addEventListener('click', async function() {
      try {
        // Show loading state
        const logoutBtn = document.getElementById('logoutBtn');
        const originalText = logoutBtn.innerHTML;
        logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Marking Exit...</span>';
        logoutBtn.disabled = true;

        console.log('=== MARKING EXIT FOR EMPLOYEE ===');
        
        // Get user data from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const userName = urlParams.get('name');
        const userEmail = urlParams.get('email');
        
        console.log('User data:', { name: userName, email: userEmail });
        
        // For employee dashboard, we need to prompt for password
        const password = prompt('Please enter your password to mark exit:');
        
        if (!password) {
          showNotification('Password is required to mark exit', 'error');
          logoutBtn.innerHTML = originalText;
          logoutBtn.disabled = false;
          return;
        }
        
        // Prepare exit data with correct format
        const exitData = {
          EmployeeName: userName,
          Email: userEmail,
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
            // Redirect to login page
            window.location.href = 'index.html';
          }, 2000);
          
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
  }
}); 