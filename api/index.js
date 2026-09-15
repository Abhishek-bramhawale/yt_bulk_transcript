/**
 * @fileoverview Vercel serverless function entry point
 * @description This file serves as the entry point for Vercel serverless functions
 */

// Import the built Express app from the dist directory
const app = require("../backend/dist/src/index.js").default;

// Export the Express app as a Vercel serverless function
module.exports = (req, res) => {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-user-id, x-user-role, x-employee-id');
  res.setHeader('Access-Control-Allow-Credentials', 'false');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Handle the request with the Express app
  if (typeof app === 'function') {
    app(req, res);
  } else {
    console.error('Backend app failed to load or is not a function');
    res.status(500).json({
      success: false,
      message: 'Backend application failed to load correctly',
      error: 'App is not a function'
    });
  }
};
