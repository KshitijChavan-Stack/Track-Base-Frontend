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
      const greetingElement = document.querySelector('.greeting span');
      if (greetingElement) {
        greetingElement.textContent = `Hello ${userName}`;
      }
    }
    
    // Update breadcrumb based on role
    if (userRole === 'manager') {
      const breadcrumbElement = document.querySelector('.breadcrumbs span:last-child');
      if (breadcrumbElement) {
        breadcrumbElement.textContent = 'Manager Dashboard';
      }
    }
  }

  // Update greeting when page loads
  updateGreeting();
}); 