// Environment variables needed by all tests
process.env.JWT_SECRET_KEY = 'test-jwt-secret-do-not-use-in-production';
process.env.APP_URL = 'http://localhost:3000';

// Global in-memory cookie store shared across all route handler calls within a test
// The next/headers mock in each test file reads/writes to this store.
(global as any).__cookieStore = new Map<string, string>();
