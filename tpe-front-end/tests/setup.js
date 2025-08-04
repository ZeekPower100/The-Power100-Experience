
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

// Mock Power100 Experience entities
jest.mock('@/entities/Contractor', () => ({
  Contractor: {
    create: jest.fn(),
    update: jest.fn(),
    list: jest.fn(() => []),
  },
}));
