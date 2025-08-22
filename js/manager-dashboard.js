document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const mainContent = document.querySelector('.main-content');

  // Sidebar default open
  sidebar.classList.add('open');

  // Toggle sidebar
  if (menuToggle) {
    menuToggle.addEventListener('click', function() {
      sidebar.classList.toggle('open');
      mainContent.classList.toggle('sidebar-closed');
    });
  }

  // Elements
  const seeEmployeeStatsBtn = document.getElementById('seeEmployeeStatsBtn');
  const employeeSearchPanel = document.getElementById('employeeSearchPanel');
  const fetchEmployeeStatsBtn = document.getElementById('fetchEmployeeStatsBtn');
  const searchEmployeeName = document.getElementById('searchEmployeeName');
  const searchEmployeeEmail = document.getElementById('searchEmployeeEmail');
  const managerGreeting = document.getElementById('managerGreeting');

  // Chart instances
  let dailyHoursChart = null;
  let attendancePieChart = null;

  // Helpers
  function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 4000);
  }

  function getQueryParam(key) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(key);
  }

  function setGreeting() {
    const name = getQueryParam('name');
    if (name && managerGreeting) managerGreeting.textContent = `Hello ${name}`;
  }

  // Chart functions
  function destroyCharts() {
    if (dailyHoursChart) {
      dailyHoursChart.destroy();
      dailyHoursChart = null;
    }
    if (attendancePieChart) {
      attendancePieChart.destroy();
      attendancePieChart = null;
    }
  }

  function createDailyHoursChart(records) {
    const ctx = document.getElementById('dailyHoursChart');
    if (!ctx) return;

    // Group records by date and calculate daily hours
    const dailyHours = {};
    records.forEach(record => {
      if (record.entryTime && record.exitTime) {
        const entry = new Date(record.entryTime);
        const exit = new Date(record.exitTime);
        const date = entry.toDateString();
        const hours = (exit - entry) / (1000 * 60 * 60);
        
        if (dailyHours[date]) {
          dailyHours[date] += hours;
        } else {
          dailyHours[date] = hours;
        }
      }
    });

    // Sort dates and get last 7 days
    const sortedDates = Object.keys(dailyHours).sort().slice(-7);
    const labels = sortedDates.map(date => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const data = sortedDates.map(date => Math.round(dailyHours[date] * 10) / 10);

    dailyHoursChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Hours Worked',
          data: data,
          borderColor: '#00A8D6',
          backgroundColor: 'rgba(0, 168, 214, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#00A8D6',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Hours'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          }
        }
      }
    });
  }

  function createAttendancePieChart(records) {
    const ctx = document.getElementById('attendancePieChart');
    if (!ctx) return;

    // Calculate attendance statistics
    const totalDays = 22; // Working days in a month
    const presentDays = new Set();
    
    records.forEach(record => {
      if (record.entryTime) {
        const date = new Date(record.entryTime).toDateString();
        presentDays.add(date);
      }
    });

    const present = presentDays.size;
    const absent = totalDays - present;

    attendancePieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Present', 'Absent'],
        datasets: [{
          data: [present, absent],
          backgroundColor: [
            '#28a745',
            '#dc3545'
          ],
          borderColor: [
            '#28a745',
            '#dc3545'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true
            }
          }
        }
      }
    });
  }

  function showCharts(employeeName) {
    const chartsSection = document.getElementById('chartsSection');
    const chartsTitle = document.getElementById('chartsTitle');
    
    if (chartsSection) {
      chartsSection.style.display = 'block';
      chartsTitle.textContent = `Analytics: ${employeeName}`;
    }
  }

  function hideCharts() {
    const chartsSection = document.getElementById('chartsSection');
    if (chartsSection) {
      chartsSection.style.display = 'none';
    }
    destroyCharts();
  }

  // Data load
  async function fetchAllAttendance() {
    const res = await fetch('https://trackbase.onrender.com/api/attendance');
    if (!res.ok) throw new Error('Failed to fetch attendance');
    return res.json();
  }

  // New function to fetch employee attendance by email
  async function fetchEmployeeAttendanceByEmail(email) {
    try {
      const response = await fetch(`https://trackbase.onrender.com/api/attendance/${email}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch employee data: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching employee attendance:', error);
      throw error;
    }
  }

  function inSelectedPeriod(dateStr) {
    const d = new Date(dateStr);
    const month = parseInt(document.getElementById('monthSelect').value, 10);
    const year = parseInt(document.getElementById('yearSelect').value, 10);
    return d.getMonth() === month && d.getFullYear() === year;
  }

  function calcStats(records) {
    const uniqueDays = new Set();
    let totalHours = 0;
    const dailyHours = {};

    records.forEach(r => {
      const entry = new Date(r.entryTime);
      const exit = r.exitTime ? new Date(r.exitTime) : null;
      uniqueDays.add(entry.toDateString());
      if (exit) {
        const h = (exit - entry) / (1000 * 60 * 60);
        totalHours += h;
        const key = entry.toDateString();
        dailyHours[key] = (dailyHours[key] || 0) + h;
      }
    });

    return {
      daysPresent: uniqueDays.size,
      totalHours: Math.round(totalHours * 10) / 10,
      attendanceRate: Math.round((uniqueDays.size / 22) * 100)
    };
  }

  function renderStats(stats) {
    document.getElementById('totalHours').textContent = stats.totalHours || 0;
    document.getElementById('daysPresent').textContent = stats.daysPresent || 0;
    document.getElementById('attendanceRate').textContent = `${stats.attendanceRate || 0}%`;
  }

  function renderActivity(records) {
    const list = document.getElementById('activityList');
    if (!records || records.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:#666;padding:20px;">No recent activity</p>';
      return;
    }
    // Build activity with both entry and exit when available
    const activity = [];
    records.forEach(r => {
      if (r.entryTime) {
        activity.push({
          type: 'in',
          at: new Date(r.entryTime)
        });
      }
      if (r.exitTime) {
        activity.push({
          type: 'out',
          at: new Date(r.exitTime)
        });
      }
    });
    const items = activity
      .sort((a,b) => b.at - a.at)
      .slice(0, 10)
      .map(ev => {
        const date = ev.at.toLocaleDateString();
        const time = ev.at.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
        const icon = ev.type === 'in' ? 'fa-sign-in-alt' : 'fa-sign-out-alt';
        const label = ev.type === 'in' ? 'Clock In' : 'Clock Out';
        return `
          <div class="activity-item">
            <div class="activity-icon"><i class="fas ${icon}"></i></div>
            <div class="activity-content">
              <h4>${label}</h4>
              <p>${date} at ${time}</p>
            </div>
          </div>`;
      })
      .join('');
    list.innerHTML = items;
  }

  // New function to render employee details side by side
  function renderEmployeeDetails(employeeData, attendanceStats) {
    // Create or update employee details section
    let employeeDetailsSection = document.getElementById('employeeDetailsSection');
    if (!employeeDetailsSection) {
      employeeDetailsSection = document.createElement('div');
      employeeDetailsSection.id = 'employeeDetailsSection';
      employeeDetailsSection.className = 'employee-details-section';
      
      // Insert after the employee search panel
      const searchPanel = document.getElementById('employeeSearchPanel');
      searchPanel.parentNode.insertBefore(employeeDetailsSection, searchPanel.nextSibling);
    }
    
    // Show the section
    employeeDetailsSection.style.display = 'block';

    // Extract employee info from the first record or use provided data
    const firstRecord = employeeData.length > 0 ? employeeData[0] : {};
    const employeeName = firstRecord.name || firstRecord.Name || searchEmployeeName.value || 'Unknown';
    const employeeEmail = firstRecord.email || firstRecord.Email || searchEmployeeEmail.value || 'Unknown';

    // Determine employee status based on latest attendance record
    let employeeStatus = 'Unknown';
    let statusClass = 'status-unknown';
    
    if (employeeData.length > 0) {
      // Sort records by entry time to get the latest one
      const sortedRecords = employeeData.sort((a, b) => {
        const dateA = new Date(a.entryTime || a.EntryTime || 0);
        const dateB = new Date(b.entryTime || b.EntryTime || 0);
        return dateB - dateA;
      });
      
      const latestRecord = sortedRecords[0];
      
      if (latestRecord.entryTime || latestRecord.EntryTime) {
        if (latestRecord.exitTime || latestRecord.ExitTime) {
          // Employee has both entry and exit - they are inactive
          employeeStatus = 'Inactive';
          statusClass = 'status-inactive';
        } else {
          // Employee has entry but no exit - they are active
          employeeStatus = 'Active';
          statusClass = 'status-active';
        }
      } else {
        // No entry time found
        employeeStatus = 'No Records';
        statusClass = 'status-unknown';
      }
    }

    employeeDetailsSection.innerHTML = `
      <div class="employee-details-container">
        <div class="employee-info-card">
          <h3><i class="fas fa-user"></i> Employee Information</h3>
          <div class="employee-info-grid">
            <div class="info-item">
              <label>Name:</label>
              <span>${employeeName}</span>
            </div>
            <div class="info-item">
              <label>Email:</label>
              <span>${employeeEmail}</span>
            </div>
            <div class="info-item">
              <label>Employee ID:</label>
              <span>#${employeeEmail.split('@')[0].toUpperCase()}</span>
            </div>
            <div class="info-item">
              <label>Status:</label>
              <span class="${statusClass}">${employeeStatus}</span>
            </div>
          </div>
        </div>
        
        <div class="employee-stats-card">
          <h3><i class="fas fa-chart-bar"></i> Attendance Statistics</h3>
          <div class="employee-stats-grid">
            <div class="stat-item">
              <div class="stat-icon">
                <i class="fas fa-clock"></i>
              </div>
              <div class="stat-content">
                <h4>Total Hours</h4>
                <p class="stat-value">${attendanceStats.totalHours || 0}</p>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon">
                <i class="fas fa-calendar-check"></i>
              </div>
              <div class="stat-content">
                <h4>Days Present</h4>
                <p class="stat-value">${attendanceStats.daysPresent || 0}</p>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon">
                <i class="fas fa-percentage"></i>
              </div>
              <div class="stat-content">
                <h4>Attendance Rate</h4>
                <p class="stat-value">${attendanceStats.attendanceRate || 0}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }



  async function loadManagerOwnStats() {
    try {
      const email = (getQueryParam('email') || '').toLowerCase();
      const name = getQueryParam('name');
      document.getElementById('statsTitle').textContent = 'My Statistics';
      document.getElementById('activityTitle').textContent = 'Recent Activity';
      
      // Hide employee details section if it exists
      const employeeDetailsSection = document.getElementById('employeeDetailsSection');
      if (employeeDetailsSection) {
        employeeDetailsSection.style.display = 'none';
      }
      
      // Hide charts section
      hideCharts();
      
      const all = await fetchAllAttendance();
      const mine = all.filter(r => {
        const recEmail = (r.email || r.Email || '').toLowerCase();
        const dateRef = r.entryTime || r.exitTime;
        return recEmail === email && dateRef && inSelectedPeriod(dateRef);
      });
      const stats = calcStats(mine);
      renderStats(stats);
      renderActivity(mine);
      showNotification(`Loaded stats for ${name}`, 'success');
    } catch (e) {
      showNotification(e.message, 'error');
    }
  }

  async function loadEmployeeStatsByQuery() {
    try {
      const nameQ = (searchEmployeeName.value || '').trim();
      const emailQ = (searchEmployeeEmail.value || '').trim().toLowerCase();
      
      if (!nameQ && !emailQ) {
        showNotification('Enter name or email to search', 'error');
        return;
      }

      showNotification('Fetching employee data...', 'info');

      // Use the new API endpoint to fetch employee attendance by email
      let employeeData = [];
      if (emailQ) {
        try {
          employeeData = await fetchEmployeeAttendanceByEmail(emailQ);
        } catch (error) {
          console.log('API call failed, falling back to local search:', error);
          // Fallback to local search if API fails
          const all = await fetchAllAttendance();
          employeeData = all.filter(r => {
            const e = (r.email || r.Email || '').toLowerCase();
            const n = (r.name || r.Name || '').toLowerCase();
            const emailMatch = emailQ ? e === emailQ : true;
            const nameMatch = nameQ ? n.includes(nameQ.toLowerCase()) : true;
            return emailMatch && nameMatch && inSelectedPeriod(r.entryTime);
          });
        }
      } else {
        // If only name provided, use local search
        const all = await fetchAllAttendance();
        employeeData = all.filter(r => {
          const n = (r.name || r.Name || '').toLowerCase();
          return n.includes(nameQ.toLowerCase()) && inSelectedPeriod(r.entryTime);
        });
      }

      if (employeeData.length === 0) {
        showNotification('No records found for the given input', 'error');
        return;
      }

      const stats = calcStats(employeeData);
      
             // Update the main stats display
       const who = employeeData[0];
       const employeeName = who.name || who.Name || nameQ;
       document.getElementById('statsTitle').textContent = `Statistics: ${employeeName}`;
       document.getElementById('activityTitle').textContent = `Recent Activity: ${employeeName}`;
       renderStats(stats);
       renderActivity(employeeData);
       
       // Render employee details side by side
       renderEmployeeDetails(employeeData, stats);
       
       // Create and show charts
       showCharts(employeeName);
       createDailyHoursChart(employeeData);
       createAttendancePieChart(employeeData);
       
       showNotification('Employee stats loaded successfully', 'success');
    } catch (e) {
      showNotification(e.message, 'error');
    }
  }

  // Events
  setGreeting();
  // Initialize period to current
  (function initPeriod() {
    const now = new Date();
    document.getElementById('monthSelect').value = String(now.getMonth());
    document.getElementById('yearSelect').value = String(now.getFullYear());
  })();

  loadManagerOwnStats();

  if (seeEmployeeStatsBtn) {
    seeEmployeeStatsBtn.addEventListener('click', () => {
      const visible = employeeSearchPanel.style.display === 'block';
      employeeSearchPanel.style.display = visible ? 'none' : 'block';
      
      // Hide employee details and charts when hiding search panel
      const employeeDetailsSection = document.getElementById('employeeDetailsSection');
      if (employeeDetailsSection && visible) {
        employeeDetailsSection.style.display = 'none';
      }
      if (visible) {
        hideCharts();
      }
    });
  }

  if (fetchEmployeeStatsBtn) {
    fetchEmployeeStatsBtn.addEventListener('click', loadEmployeeStatsByQuery);
  }

  // Period search button
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', function() {
      // If employee panel visible and fields filled, fetch employee stats; else own stats
      const isPanelVisible = employeeSearchPanel.style.display === 'block';
      const hasQuery = (searchEmployeeName.value || searchEmployeeEmail.value || '').trim().length > 0;
      if (isPanelVisible && hasQuery) {
        loadEmployeeStatsByQuery();
      } else {
        loadManagerOwnStats();
      }
    });
  }

  // Go back home
  const goBackHome = document.getElementById('goBackHome');
  if (goBackHome) {
    goBackHome.addEventListener('click', function(e) {
      e.preventDefault();
      const urlParams = new URLSearchParams(window.location.search);
      const userName = urlParams.get('name');
      const userEmail = urlParams.get('email');
      window.location.href = `index.html?name=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}&role=manager`;
    });
  }

  // Custom Logout Popup Functions
  function showLogoutPopup() {
    const popup = document.getElementById('logoutPopup');
    if (popup) {
      popup.style.display = 'flex';
      setTimeout(() => popup.classList.add('show'), 10);
      
      // Clear password field and focus on it
      const passwordInput = document.getElementById('logoutPassword');
      if (passwordInput) {
        passwordInput.value = '';
        setTimeout(() => passwordInput.focus(), 350);
      }
    }
  }

  function hideLogoutPopup() {
    const popup = document.getElementById('logoutPopup');
    if (popup) {
      popup.classList.remove('show');
      setTimeout(() => popup.style.display = 'none', 300);
    }
  }

  async function performLogout() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const userName = urlParams.get('name');
      const userEmail = urlParams.get('email');
      
      // Get password from the input field in the popup
      const passwordInput = document.getElementById('logoutPassword');
      const password = passwordInput.value.trim();
      
      if (!password) {
        showNotification('Please enter your password', 'error');
        passwordInput.focus();
        return;
      }
      
      const exitData = { EmployeeName: userName, Email: userEmail, password };
      const response = await fetch('https://trackbase.onrender.com/api/attendance/exit', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(exitData)
      });
      
      let resultJson; 
      try { 
        resultJson = await response.json(); 
      } catch(_) { 
        resultJson = {}; 
      }
      
      if (response.ok) {
        showNotification('Exit marked successfully! 👋', 'success');
        hideLogoutPopup();
        setTimeout(() => { window.location.href = 'index.html'; }, 1500);
      } else {
        showNotification(resultJson.message || 'Exit marking failed. Please try again.', 'error');
        // Clear password field on error
        passwordInput.value = '';
        passwordInput.focus();
      }
    } catch (err) {
      showNotification('Exit marking failed. Please try again.', 'error');
      hideLogoutPopup();
    }
  }

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      showLogoutPopup();
    });
  }

  // Logout popup event listeners
  const logoutConfirm = document.getElementById('logoutConfirm');
  const logoutCancel = document.getElementById('logoutCancel');

  if (logoutConfirm) {
    logoutConfirm.addEventListener('click', performLogout);
  }

  if (logoutCancel) {
    logoutCancel.addEventListener('click', hideLogoutPopup);
  }

  // Close popup when clicking outside
  const logoutPopup = document.getElementById('logoutPopup');
  if (logoutPopup) {
    logoutPopup.addEventListener('click', function(e) {
      if (e.target === logoutPopup) {
        hideLogoutPopup();
      }
    });
  }

  // Add Enter key support for password field
  const passwordInput = document.getElementById('logoutPassword');
  if (passwordInput) {
    passwordInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        performLogout();
      }
    });
  }
});

