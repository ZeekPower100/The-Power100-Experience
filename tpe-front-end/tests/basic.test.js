/**
 * Basic tests to ensure Jest configuration is working
 * The Power100 Experience - Frontend Testing Suite
 */

describe('Power100 Experience - Basic Tests', () => {
  test('Jest configuration is working', () => {
    expect(true).toBe(true);
  });

  test('Environment variables are accessible', () => {
    // Test that we can access environment variables
    expect(process.env.NODE_ENV).toBeDefined();
  });

  test('Math operations work correctly', () => {
    expect(2 + 2).toBe(4);
    expect(10 * 5).toBe(50);
  });

  test('String operations work correctly', () => {
    const projectName = 'The Power100 Experience';
    expect(projectName).toContain('Power100');
    expect(projectName.toLowerCase()).toContain('experience');
  });
});

describe('Power100 Experience - Component Basics', () => {
  test('DOM utilities are available', () => {
    // This test verifies that DOM testing utilities work
    const div = document.createElement('div');
    div.textContent = 'Power100';
    expect(div.textContent).toContain('Power100');
  });

  test('Jest DOM matchers are available', () => {
    // This test verifies that @testing-library/jest-dom is properly setup
    const div = document.createElement('div');
    div.textContent = 'Power100';
    expect(div).toHaveTextContent('Power100');
  });
});