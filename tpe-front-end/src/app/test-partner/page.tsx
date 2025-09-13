'use client';

import { useState } from 'react';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../utils/jsonHelpers';

export default function TestPartnerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Attempting login...');
    
    try {
      const response = await fetch('http://localhost:5000/api/partner-auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: safeJsonStringify({ email, password }),
      });

      const data = await handleApiResponse(response);
      
      if (data.success) {
        setMessage(`Login successful! Token: ${data.token.substring(0, 20)}...`);
      } else {
        setMessage(`Login failed: ${data.error}`);
      }
    } catch (error) {
      setMessage(`Network error: ${error}`);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f8f9fa',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ 
          color: '#FB0401', 
          textAlign: 'center', 
          marginBottom: '2rem',
          fontSize: '2rem',
          fontWeight: 'bold'
        }}>
          Power100 Partner Portal
        </h1>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Email:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="partner@company.com"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>
          
          <button
            type="submit"
            style={{
              backgroundColor: '#FB0401',
              color: 'white',
              padding: '0.75rem',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            Sign In
          </button>
        </form>
        
        {message && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: message.includes('successful') ? '#d1fae5' : '#fee2e2',
            border: `1px solid ${message.includes('successful') ? '#10b981' : '#ef4444'}`,
            borderRadius: '4px',
            fontSize: '0.875rem'
          }}>
            {message}
          </div>
        )}
        
        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
          <p>Test Credentials:</p>
          <p>Email: finaltest@partner.com</p>
          <p>Password: PoG3&jf&Jx0U</p>
        </div>
      </div>
    </div>
  );
}