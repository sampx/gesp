import { Hono } from "hono";
import { Context } from "hono";

const app = new Hono();

// Debug HTML page with inline JavaScript for verification
const debugHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GESP Debug - Phase Verification</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 1rem; }
    h1 { color: #333; }
    h2 { border-bottom: 2px solid #4a90d9; padding-bottom: 0.5rem; margin-top: 2rem; }
    .phase { background: #f5f5f5; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    .step { display: flex; align-items: center; margin: 0.5rem 0; }
    .step-label { font-weight: bold; min-width: 120px; }
    .step-input { margin-right: 0.5rem; }
    .step input[type="text"], .step input[type="password"] { padding: 0.3rem; }
    .btn { padding: 0.3rem 0.8rem; cursor: pointer; background: #4a90d9; color: white; border: none; border-radius: 4px; }
    .btn:hover { background: #3a7bc8; }
    .btn:disabled { background: #ccc; cursor: not-allowed; }
    .result { margin-left: 1rem; font-size: 0.9rem; }
    .success { color: green; }
    .error { color: red; }
    pre { background: #eee; padding: 0.5rem; border-radius: 4px; overflow-x: auto; font-size: 0.85rem; }
    #log { min-height: 200px; }
  </style>
</head>
<body>
  <h1>GESP Debug Interface</h1>
  <p>Manual verification for each phase. <strong>Production default: disabled.</strong></p>

  <div class="phase">
    <h2>Phase 1: Authentication</h2>
    <p>Verify: Register → Login → Get User → Logout</p>

    <div class="step">
      <span class="step-label">Username:</span>
      <input type="text" id="reg-username" class="step-input" value="testuser" size="15">
    </div>
    <div class="step">
      <span class="step-label">Password:</span>
      <input type="password" id="reg-password" class="step-input" value="testpass123" size="15">
    </div>
    <div class="step">
      <span class="step-label">Display Name:</span>
      <input type="text" id="reg-display" class="step-input" value="Test User" size="15">
    </div>
    <div class="step">
      <button class="btn" onclick="register()">Register</button>
      <span id="reg-result" class="result"></span>
    </div>

    <hr>

    <div class="step">
      <span class="step-label">Login Username:</span>
      <input type="text" id="login-username" class="step-input" value="testuser" size="15">
    </div>
    <div class="step">
      <span class="step-label">Login Password:</span>
      <input type="password" id="login-password" class="step-input" value="testpass123" size="15">
    </div>
    <div class="step">
      <button class="btn" onclick="login()">Login</button>
      <span id="login-result" class="result"></span>
    </div>

    <hr>

    <div class="step">
      <button class="btn" onclick="getCurrentUser()">Get Current User (/api/auth/me)</button>
      <span id="me-result" class="result"></span>
    </div>

    <div class="step">
      <button class="btn" onclick="logout()">Logout</button>
      <span id="logout-result" class="result"></span>
    </div>
  </div>

  <h2>Verification Log</h2>
  <pre id="log"></pre>

  <script>
    const logEl = document.getElementById('log');
    function log(msg, type = 'info') {
      const color = type === 'success' ? 'green' : type === 'error' ? 'red' : 'black';
      const span = document.createElement('span');
      span.style.color = color;
      span.textContent = new Date().toLocaleTimeString() + ' ' + msg;
      logEl.appendChild(span);
      logEl.appendChild(document.createTextNode('\\n'));
    }

    async function register() {
      const username = document.getElementById('reg-username').value;
      const password = document.getElementById('reg-password').value;
      const display_name = document.getElementById('reg-display').value;
      const resultEl = document.getElementById('reg-result');

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, display_name }),
        });
        const data = await res.json();
        if (data.success) {
          resultEl.innerHTML = '<span class="success">OK</span>';
          log('Register success: ' + JSON.stringify(data.data.user), 'success');
        } else {
          resultEl.innerHTML = '<span class="error">' + data.message + '</span>';
          log('Register failed: ' + data.message, 'error');
        }
      } catch (e) {
        resultEl.innerHTML = '<span class="error">Network error</span>';
        log('Register network error: ' + e.message, 'error');
      }
    }

    async function login() {
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;
      const resultEl = document.getElementById('login-result');

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (data.success) {
          resultEl.innerHTML = '<span class="success">OK</span>';
          log('Login success: ' + JSON.stringify(data.data.user), 'success');
        } else {
          resultEl.innerHTML = '<span class="error">' + data.message + '</span>';
          log('Login failed: ' + data.message, 'error');
        }
      } catch (e) {
        resultEl.innerHTML = '<span class="error">Network error</span>';
        log('Login network error: ' + e.message, 'error');
      }
    }

    async function getCurrentUser() {
      const resultEl = document.getElementById('me-result');
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          resultEl.innerHTML = '<span class="success">OK</span>';
          log('Get user success: ' + JSON.stringify(data.data.user), 'success');
        } else {
          resultEl.innerHTML = '<span class="error">' + data.message + '</span>';
          log('Get user failed: ' + data.message, 'error');
        }
      } catch (e) {
        resultEl.innerHTML = '<span class="error">Network error</span>';
        log('Get user network error: ' + e.message, 'error');
      }
    }

    async function logout() {
      const resultEl = document.getElementById('logout-result');
      try {
        const res = await fetch('/api/auth/logout', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          resultEl.innerHTML = '<span class="success">OK</span>';
          log('Logout success', 'success');
        } else {
          resultEl.innerHTML = '<span class="error">' + data.message + '</span>';
          log('Logout failed: ' + data.message, 'error');
        }
      } catch (e) {
        resultEl.innerHTML = '<span class="error">Network error</span>';
        log('Logout network error: ' + e.message, 'error');
      }
    }

    log('Debug interface loaded. Start verification by clicking buttons.');
  </script>
</body>
</html>
`;

// Main debug route - serve HTML
app.get("/", (c: Context) => c.html(debugHtml));

// Health check endpoint for automated verification
app.get("/health", (c: Context) => c.json({ status: "ok", phase: 1 }));

export default app;