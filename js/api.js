/* ============================================================
   GRAND AZURE HOTEL & RESORT — Centralized API Connector (api.js)
   Connects all frontend forms and admin dashboard to the
   Node.js/Express & MySQL API backend.
   
   Architecture rules:
     • Configurable API base URL (dev localhost vs production).
     • No fake backend success responses.
     • No storage of sensitive ID docs or credentials in localStorage.
     • Proper fetch() HTTP methods, loading states, and error handling.
   ============================================================ */

/* ── Centralized API Configuration ── */
const API_CONFIG = {
  // Configurable base URL:
  // 1. Explicit window override (window.AZURE_API_BASE) if configured by hosting
  // 2. Localhost development (Node.js backend on port 3001)
  // 3. Production deployment default (relative /api for Netlify reverse-proxy or configured backend)
  getBaseUrl() {
    if (typeof window !== 'undefined' && window.AZURE_API_BASE) {
      return window.AZURE_API_BASE.replace(/\/+$/, '');
    }
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1' ||
                      window.location.protocol === 'file:';
      if (isLocal) {
        return 'http://localhost:3001/api';
      }
    }
    return '/api';
  },
  TIMEOUT_MS: 15000
};

/* ── Safe Auth Header Provider ── */
function getAdminAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (typeof sessionStorage !== 'undefined') {
    const token = sessionStorage.getItem('azure_admin_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

/* ── Centralized Fetch Wrapper with Timeout & Meaningful Errors ── */
async function apiRequest(endpoint, options = {}) {
  const baseUrl = API_CONFIG.getBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try { data = JSON.parse(text); } catch { data = { message: text }; }
    }

    if (!response.ok) {
      const errorMsg = (data && data.message) ? data.message : `Server responded with status ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check if the backend server is responding.');
    }
    if (error.message && error.message.includes('Failed to fetch')) {
      throw new Error(`Unable to reach backend server at ${baseUrl}. Please ensure the Node.js API server is running (port 3001).`);
    }
    throw error;
  }
}

/* ── Centralized Azure API SDK ── */
const AzureAPI = {
  // Public Form & Catalog Endpoints
  async health() {
    return apiRequest('/health');
  },

  async getRooms() {
    return apiRequest('/rooms');
  },

  async checkAvailability(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/rooms/availability${qs ? '?' + qs : ''}`);
  },

  async register(formData) {
    return apiRequest('/register', {
      method: 'POST',
      body: formData // multipart/form-data
    });
  },

  async createReservation(formData) {
    return apiRequest('/reservations', {
      method: 'POST',
      body: formData // multipart/form-data with ID file attachment
    });
  },

  async getMenu() {
    return apiRequest('/menu');
  },

  async createFoodOrder(orderPayload) {
    return apiRequest('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
  },

  async trackOrder(orderNumber) {
    return apiRequest(`/orders/${encodeURIComponent(orderNumber)}`);
  },

  async sendContact(formData) {
    return apiRequest('/contact', {
      method: 'POST',
      body: formData // multipart/form-data
    });
  },

  // Admin Portal Endpoints (Require Bearer Token)
  admin: {
    async getDashboard() {
      return apiRequest('/admin/dashboard', {
        headers: getAdminAuthHeaders()
      });
    },
    async login(username, password) {
      return apiRequest('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
    },

    async getReservations() {
      return apiRequest('/admin/reservations', {
        headers: getAdminAuthHeaders()
      });
    },

    async updateReservation(id, status) {
      return apiRequest(`/admin/reservations/${id}`, {
        method: 'PATCH',
        headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status })
      });
    },

    async deleteReservation(id) {
      return apiRequest(`/admin/reservations/${id}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders()
      });
    },

    async getMembers() {
      return apiRequest('/admin/members', {
        headers: getAdminAuthHeaders()
      });
    },

    async deleteMember(id) {
      return apiRequest(`/admin/members/${id}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders()
      });
    },

    async getContacts() {
      return apiRequest('/admin/contacts', {
        headers: getAdminAuthHeaders()
      });
    },

    async getFoodOrders() {
      return apiRequest('/admin/food-orders', {
        headers: getAdminAuthHeaders()
      });
    },

    async updateFoodOrder(id, status) {
      return apiRequest(`/admin/food-orders/${id}`, {
        method: 'PATCH',
        headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status })
      });
    },

    async deleteFoodOrder(id) {
      return apiRequest(`/admin/food-orders/${id}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders()
      });
    },

    async getUsers() {
      return apiRequest('/admin/users', {
        headers: getAdminAuthHeaders()
      });
    },

    async createUser(userData) {
      return apiRequest('/admin/create-user', {
        method: 'POST',
        headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(userData)
      });
    },

    async changePassword(passwordData) {
      return apiRequest('/admin/change-password', {
        method: 'PATCH',
        headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(passwordData)
      });
    },

    async deleteUser(id) {
      return apiRequest(`/admin/users/${id}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders()
      });
    }
  }
};

/* Expose globally for pages */
window.AzureAPI = AzureAPI;
window.API_CONFIG = API_CONFIG;

/* ── UI Utilities ── */

// Set button loading state
function setButtonLoading(btn, loading, customText) {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.origText = btn.innerHTML;
    btn.innerHTML = `<span style="display:inline-block;animation:spin 1s linear infinite;margin-right:0.5rem;">⏳</span> ${customText || 'Processing...'}`;
    btn.style.opacity = '0.75';
    btn.style.cursor = 'not-allowed';
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.origText || 'Submit';
    btn.style.opacity = '1';
    btn.style.cursor = '';
  }
}

// Display inline form feedback banner
function showFormStatus(form, message, type = 'error') {
  if (!form) return;
  let el = form.querySelector('.form-api-status');
  if (!el) {
    el = document.createElement('div');
    el.className = 'form-api-status';
    el.setAttribute('role', 'alert');
    el.style.cssText = [
      'margin-top: 1.25rem',
      'padding: 1rem 1.25rem',
      'border-radius: 12px',
      'font-size: 0.92rem',
      'font-weight: 500',
      'display: flex',
      'align-items: center',
      'gap: 0.75rem',
      'line-height: 1.5',
      'animation: fadeIn 0.3s ease'
    ].join(';');
    form.appendChild(el);
  }

  const isSuccess = type === 'success';
  const isInfo = type === 'info';

  if (isSuccess) {
    el.style.background = '#f0fdf4';
    el.style.color = '#15803d';
    el.style.border = '1.5px solid #86efac';
    el.innerHTML = `<span>✅</span><div>${message}</div>`;
  } else if (isInfo) {
    el.style.background = '#eff6ff';
    el.style.color = '#1d4ed8';
    el.style.border = '1.5px solid #93c5fd';
    el.innerHTML = `<span>ℹ️</span><div>${message}</div>`;
  } else {
    el.style.background = '#fef2f2';
    el.style.color = '#b91c1c';
    el.style.border = '1.5px solid #fca5a5';
    el.innerHTML = `<span>⚠️</span><div>${message}</div>`;
  }

  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (isSuccess) {
    setTimeout(() => { if (el && el.parentNode) el.remove(); }, 12000);
  }
}

// Escape user text to prevent XSS
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
