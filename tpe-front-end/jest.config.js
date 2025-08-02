module.exports = {
  "testEnvironment": "jsdom",
  "setupFilesAfterEnv": [
    "<rootDir>/tests/setup.js"
  ],
  "testMatch": [
    "<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}",
    "<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}"
  ],
  "moduleNameMapping": {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  "collectCoverageFrom": [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts"
  ]
}