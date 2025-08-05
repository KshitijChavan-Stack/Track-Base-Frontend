document.addEventListener('DOMContentLoaded', function() {
  const registerForm = document.getElementById('registerForm');
  const registerButton = document.getElementById('registerButton');
  const passwordToggle = document.getElementById('passwordToggle');
  const passwordInput = document.getElementById('password');
  const roleOptions = document.querySelectorAll('.role-option input[type="radio"]');

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

  // Password toggle functionality
  passwordToggle.addEventListener('click', function() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    const icon = this.querySelector('i');
    icon.className = type === 'password' ? 'fas fa-eye-slash' : 'fas fa-eye';
  });

  // Role selection functionality
  roleOptions.forEach(option => {
    option.addEventListener('change', function() {
      // Remove selected class from all role options
      document.querySelectorAll('.role-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      
      // Add selected class to the chosen option
      if (this.checked) {
        this.closest('.role-option').classList.add('selected');
      }
    });
  });

  // Typing animation for inputs
  const inputs = document.querySelectorAll('.form-group input');
  inputs.forEach(input => {
    let typingTimer;
    
    input.addEventListener('input', function() {
      this.classList.add('typing');
      clearTimeout(typingTimer);
      
      typingTimer = setTimeout(() => {
        this.classList.remove('typing');
      }, 1000);
    });
    
    input.addEventListener('blur', function() {
      this.classList.remove('typing');
      clearTimeout(typingTimer);
    });
  });

  // Form validation
  function validateForm() {
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = passwordInput.value.trim();
    const selectedRole = document.querySelector('input[name="role"]:checked');
    const termsAccepted = document.getElementById('terms').checked;

    // Clear previous error states
    document.querySelectorAll('.form-group').forEach(group => {
      group.classList.remove('error');
    });

    let isValid = true;

    // Validate full name
    if (!fullName) {
      showFieldError('fullName', 'Full name is required');
      isValid = false;
    } else if (fullName.length < 2) {
      showFieldError('fullName', 'Full name must be at least 2 characters');
      isValid = false;
    }

    // Validate email
    if (!email) {
      showFieldError('email', 'Email is required');
      isValid = false;
    } else if (!isValidEmail(email)) {
      showFieldError('email', 'Please enter a valid email address');
      isValid = false;
    }

    // Validate password
    if (!password) {
      showFieldError('password', 'Password is required');
      isValid = false;
    } else if (password.length < 6) {
      showFieldError('password', 'Password must be at least 6 characters');
      isValid = false;
    }

    // Validate role selection
    if (!selectedRole) {
      showNotification('Please select a role (Employee or Manager)', 'error');
      isValid = false;
    }

    // Validate terms acceptance
    if (!termsAccepted) {
      showNotification('Please accept the Terms of Service and Privacy Policy', 'error');
      isValid = false;
    }

    return isValid;
  }

  function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const formGroup = field.closest('.form-group');
    formGroup.classList.add('error');
    
    // Remove existing error message
    const existingError = formGroup.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    
    // Add error message
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = message;
    errorMessage.style.color = '#dc3545';
    errorMessage.style.fontSize = '0.8rem';
    errorMessage.style.marginTop = '0.25rem';
    formGroup.appendChild(errorMessage);
  }

  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Form submission
  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Show loading state
    registerButton.classList.add('loading');
    registerButton.disabled = true;
    const originalText = registerButton.querySelector('span').textContent;
    registerButton.querySelector('span').textContent = 'Creating Account...';

    try {
      const formData = {
        Name: document.getElementById('fullName').value.trim(),
        Email: document.getElementById('email').value.trim(),
        Password: passwordInput.value.trim(),
        Role: document.querySelector('input[name="role"]:checked').value
      };

      console.log('Registration data:', formData);

      // Call registration API
      const response = await fetch('https://trackbase.onrender.com/api/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      console.log('Registration response status:', response.status);

      const result = await response.json();
      console.log('Registration response:', result);

      if (response.ok) {
        console.log('✅ Registration successful');
        showNotification('Account created successfully! Welcome to TrackBase! 🎉', 'success');
        
        // Clear form
        registerForm.reset();
        document.querySelectorAll('.role-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        
        // Redirect to login page after a delay
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 2000);
        
      } else {
        console.error('❌ Registration failed:', result);
        showNotification(result.message || 'Registration failed. Please try again.', 'error');
      }

    } catch (error) {
      console.error('❌ Error during registration:', error);
      showNotification('Connection error. Please check your internet connection and try again.', 'error');
    } finally {
      // Reset button state
      registerButton.classList.remove('loading');
      registerButton.disabled = false;
      registerButton.querySelector('span').textContent = originalText;
    }
  });



  // Add CSS for error states
  const style = document.createElement('style');
  style.textContent = `
    .form-group.error input {
      border-color: #dc3545;
      box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
    }
    
    .form-group.error label {
      color: #dc3545;
    }
    
    .error-message {
      animation: slideIn 0.3s ease;
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);

  // Auto-generate user ID (if needed)
  function generateUserId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `TB${timestamp}${random}`;
  }

  // Add some interactive animations
  document.querySelectorAll('.form-group input').forEach(input => {
    input.addEventListener('focus', function() {
      this.parentElement.style.transform = 'scale(1.02)';
    });
    
    input.addEventListener('blur', function() {
      this.parentElement.style.transform = 'scale(1)';
    });
  });

  // Add floating animation to the illustration section
  const illustrationSection = document.querySelector('.register-illustration-section');
  if (illustrationSection) {
    illustrationSection.style.animation = 'float 6s ease-in-out infinite';
  }

  console.log('Registration page initialized successfully!');
}); 