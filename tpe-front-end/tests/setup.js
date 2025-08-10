
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/test-path',
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    form: 'form',
  },
  AnimatePresence: ({ children }) => children,
}));

// Mock Power100 Experience entities - only if they exist
jest.mock('@/lib/api', () => ({
  contractorApi: {
    create: jest.fn(),
    update: jest.fn(),
    list: jest.fn(() => Promise.resolve([])),
    search: jest.fn(() => Promise.resolve({ data: [], total: 0 })),
  },
  partnerApi: {
    create: jest.fn(),
    update: jest.fn(),
    list: jest.fn(() => Promise.resolve([])),
    search: jest.fn(() => Promise.resolve({ data: [], total: 0 })),
  },
}));
