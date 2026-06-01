// =============================================================================
// Rollinhead Dashboard — API Fetch Client
// =============================================================================

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

class ApiClient {
  private async request(path: string, options: RequestInit = {}) {
    const url = `${API_URL}${path}`;
    
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
