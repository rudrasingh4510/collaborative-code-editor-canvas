// Configuration for the application
const config = {
  // Get the current port from window.location or default to 3001
  CLIENT_PORT: window.location.port || '3001',
  SERVER_PORT: '5001',
  
  // Construct URLs - use environment variables in production
  get CLIENT_URL() {
    if (process.env.NODE_ENV === 'production') {
      return window.location.origin;
    }
    return `http://localhost:${this.CLIENT_PORT}`;
  },
  
  get SERVER_URL() {
    if (process.env.NODE_ENV === 'production') {
      return window.location.origin;
    }
    return `http://localhost:${this.SERVER_PORT}`;
  }
};

export default config;
