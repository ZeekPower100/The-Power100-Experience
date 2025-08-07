/**
 * Jest setup for The Power100 Experience Backend
 * Configures test environment and mocks
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.USE_SQLITE = 'true';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
process.env.PORT = '5001';

// Mock external services
jest.mock('twilio', () => ({
  Twilio: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        sid: 'test-message-sid',
        status: 'sent'
      })
    }
  }))
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id'
    })
  })
}));

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{
    statusCode: 202
  }])
}));

// Global test utilities
global.testUtils = {
  createTestUser: () => ({
    id: 1,
    email: 'test@power100.io',
    password: 'hashedpassword',
    created_at: new Date().toISOString()
  }),
  
  createTestContractor: () => ({
    id: 1,
    name: 'Test Contractor',
    email: 'contractor@test.com',
    phone: '555-0123',
    company_name: 'Test Company',
    created_at: new Date().toISOString()
  }),
  
  createTestPartner: () => ({
    id: 1,
    company_name: 'Test Partner LLC',
    email: 'partner@test.com',
    website: 'https://testpartner.com',
    power_confidence_score: 85,
    is_active: true,
    created_at: new Date().toISOString()
  })
};

// Setup and teardown hooks
beforeAll(async () => {
  // Any global setup
});

afterAll(async () => {
  // Any global cleanup
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});