// =============================================================================
// Rollinhead Dashboard — API Fetch Client
// =============================================================================

// Resolve API URL dynamically based on environment or manual user preference
export const getApiUrl = () => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  }

  // Allow manual toggle via localStorage preference
  const pref = localStorage.getItem('rollinhead_api_pref');
  if (pref === 'cloud') {
    return 'https://rollinhead-backend.onrender.com/api';
  }
  if (pref === 'local') {
    return 'http://localhost:4000/api';
  }

  // Default automatic detection based on current domain
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return process.env.NEXT_PUBLIC_API_URL || 
    (isLocal ? 'http://localhost:4000/api' : 'https://rollinhead-backend.onrender.com/api');
};

export const API_URL = getApiUrl();

class ApiClient {
  private async request(path: string, options: RequestInit = {}) {
    const url = `${getApiUrl()}${path}`;
    
    // Default headers
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    // Attach JWT Bearer Token if stored
    const token = typeof window !== 'undefined' ? localStorage.getItem('rollinhead_token') : null;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Enable cookie credentials
    const credentials = 'include';

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials,
      });

      const contentType = response.headers.get('content-type');
      let data: any = null;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else if (contentType && contentType.includes('text/csv')) {
        return response.blob();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMsg = data?.message || `HTTP error ${response.status}`;
        throw new Error(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
      }

      return data;
    } catch (error: any) {
      console.error(`API Error on ${path}:`, error);
      throw error;
    }
  }

  async get(path: string, options: RequestInit = {}) {
    return this.request(path, { ...options, method: 'GET' });
  }

  async post(path: string, body?: any, options: RequestInit = {}) {
    return this.request(path, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  async patch(path: string, body?: any, options: RequestInit = {}) {
    return this.request(path, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  async delete(path: string, options: RequestInit = {}) {
    return this.request(path, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
