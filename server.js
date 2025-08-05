const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());

// Serve static files
app.use(express.static('.'));

// Proxy API requests to avoid CORS
app.post('/api/user/login', express.json(), async (req, res) => {
  try {
    // Convert field names to match API expectations
    const apiData = {
      Name: req.body.Name,
      Email: req.body.Email,
      Password: req.body.Password
    };
    
    const response = await fetch('https://trackbase.onrender.com/api/user/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiData)
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy for mark entry API
app.post('/api/attendance/entry', express.json(), async (req, res) => {
  try {
    console.log('Mark entry request received:', req.body);
    
    // Validate required fields
    if (!req.body.Email || !req.body.Password) {
      return res.status(400).json({
        errors: {
          Email: req.body.Email ? [] : ['Email is required'],
          Password: req.body.Password ? [] : ['Password is required']
        },
        status: 400,
        title: 'One or more validation errors occurred.',
        type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1'
      });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.body.Email)) {
      return res.status(400).json({
        errors: {
          Email: ['Invalid email format'],
          Password: []
        },
        status: 400,
        title: 'One or more validation errors occurred.',
        type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1'
      });
    }
    
    const response = await fetch('https://trackbase.onrender.com/api/attendance/entry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Mark entry proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
}); 