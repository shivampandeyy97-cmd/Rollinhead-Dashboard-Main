// =============================================================================
// Rollinhead Dashboard — API Fetch Client
// =============================================================================

// Resolve API URL dynamically based on environment, current domain, or manual preference
export const getApiUrl = () => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  }

  // Allow manual toggle via localStorage preference
  const pref = localStorage.getItem('rollinhead_api_pref');
  if (pref === 'local') {
    return 'http://localhost:4000/api';
  }
  if (pref === 'staging') {
    return process.env.NEXT_PUBLIC_STAGING_API_URL || 'http://localhost:4001/api';
  }
  if (pref === 'cloud' || pref === 'prod') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  }

  // Default automatic detection based on current domain
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  const isStaging = hostname.includes('staging');

  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (isLocal) {
    return 'http://localhost:4000/api';
  }

  if (isStaging) {
    return process.env.NEXT_PUBLIC_STAGING_API_URL || 'http://localhost:4001/api';
  }

  // Fallback to local running backend port 4000 if no remote cloud API URL is set
  return 'http://localhost:4000/api';
};

export const API_URL = getApiUrl();

class ApiClient {
  private async request(path: string, options: RequestInit = {}) {
    const primaryUrl = `${getApiUrl()}${path}`;
    
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

    let response: Response;
    try {
      try {
        response = await fetch(primaryUrl, {
          ...options,
          headers,
          credentials,
        });
      } catch (primaryError) {
        // If primary fetch fails due to DNS or network unresolvable URL, try local backend fallback
        const fallbackUrl = `http://localhost:4000/api${path}`;
        if (primaryUrl !== fallbackUrl) {
          console.warn(`Primary API ${primaryUrl} failed. Retrying with fallback: ${fallbackUrl}`);
          response = await fetch(fallbackUrl, {
            ...options,
            headers,
            credentials,
          });
        } else {
          throw primaryError;
        }
      }

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
