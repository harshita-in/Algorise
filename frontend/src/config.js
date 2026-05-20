// Get the API URL from environment variables
let apiBaseUrl = process.env.REACT_APP_API_URL || '';

if (apiBaseUrl) {
  // Trim any leading/trailing whitespace
  apiBaseUrl = apiBaseUrl.trim();
  
  // Remove trailing slash if present
  if (apiBaseUrl.endsWith('/')) {
    apiBaseUrl = apiBaseUrl.slice(0, -1);
  }
  
  // Prepend https:// if no protocol (http:// or https://) is specified
  if (!/^https?:\/\//i.test(apiBaseUrl)) {
    apiBaseUrl = `https://${apiBaseUrl}`;
  }
}

export const API_BASE_URL = apiBaseUrl;
