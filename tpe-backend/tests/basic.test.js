/**
 * Basic tests for The Power100 Experience Backend
 * Ensures core functionality and configuration work correctly
 */

describe('Power100 Experience Backend - Basic Tests', () => {
  test('Jest configuration is working', () => {
    expect(true).toBe(true);
  });

  test('Test environment variables are set', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.USE_SQLITE).toBe('true');
    expect(process.env.JWT_SECRET).toBeDefined();
  });

  test('Test utilities are available', () => {
    expect(global.testUtils).toBeDefined();
    expect(typeof global.testUtils.createTestUser).toBe('function');
    expect(typeof global.testUtils.createTestContractor).toBe('function');
    expect(typeof global.testUtils.createTestPartner).toBe('function');
  });

  test('Can create test data objects', () => {
    const testUser = global.testUtils.createTestUser();
    expect(testUser).toHaveProperty('id');
    expect(testUser).toHaveProperty('email');
    expect(testUser.email).toContain('power100.io');

    const testContractor = global.testUtils.createTestContractor();
    expect(testContractor).toHaveProperty('name');
    expect(testContractor).toHaveProperty('company_name');

    const testPartner = global.testUtils.createTestPartner();
    expect(testPartner).toHaveProperty('company_name');
    expect(testPartner).toHaveProperty('power_confidence_score');
    expect(testPartner.power_confidence_score).toBeGreaterThan(0);
  });
});

describe('Power100 Experience Backend - Module Loading', () => {
  test('Express module loads correctly', () => {
    const express = require('express');
    expect(typeof express).toBe('function');
  });

  test('Core dependencies are available', () => {
    expect(() => require('cors')).not.toThrow();
    expect(() => require('helmet')).not.toThrow();
    expect(() => require('bcryptjs')).not.toThrow();
    expect(() => require('jsonwebtoken')).not.toThrow();
  });

  test('SQLite dependency is available', () => {
    expect(() => require('sqlite3')).not.toThrow();
    expect(() => require('sqlite')).not.toThrow();
  });
});