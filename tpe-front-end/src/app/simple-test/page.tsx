'use client';

import { useState } from 'react';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../utils/jsonHelpers';

export default function SimpleTestPage() {
  const [email, setEmail] = useState('finaltest@partner.com');
  const [password, setPassword] = useState('PoG3&jf&Jx0U');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
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
        setMessage(`✅ Login successful! Welcome, ${data.partner.company_name}!`);
        console.log('Full response:', data);
      } else {
        setMessage(`❌ Login failed: ${data.error}`);
      }
    } catch (error) {
      setMessage(`🔴 Network error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testBackendConnection = async () => {
    setMessage('Testing backend connection...');
    try {
      const response = await fetch('http://localhost:5000/health');
      const data = await handleApiResponse(response);
      setMessage(`✅ Backend connected! Status: ${data.status}`);
    } catch (error) {
      setMessage(`🔴 Backend not accessible: ${error}`);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '500px'
      }}>
        <h1 style={{ 
          color: '#FB0401', 
          textAlign: 'center', 
          marginBottom: '2rem',
          fontSize: '2.5rem',
          fontWeight: 'bold'
        }}>
          🏢 Power100 Partner Portal
        </h1>
        
        <div style={{ marginBottom: '2rem' }}>
          <button 
            onClick={testBackendConnection}
            style={{
              backgroundColor: '#6b7280',
              color: 'white',
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              width: '100%',
              marginBottom: '1rem'
            }}
          >
            Test Backend Connection
          </button>
        </div>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '600',
              color: '#374151'
            }}>
              Email Address:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="partner@company.com"
              required
              style={{
                width: '100%',
                padding: '0.875rem',
                border: '2px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#FB0401'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: '600',
              color: '#374151'
            }}>
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
                padding: '0.875rem',
                border: '2px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#FB0401'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            style={{
              backgroundColor: isLoading ? '#9ca3af' : '#FB0401',
              color: 'white',
              padding: '1rem',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: '0.5rem',
              transition: 'background-color 0.2s'
            }}
          >
            {isLoading ? '🔄 Signing In...' : '🚀 Sign In to Portal'}
          </button>
        </form>
        
        {message && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: message.includes('✅') ? '#d1fae5' : 
                            message.includes('❌') || message.includes('🔴') ? '#fee2e2' : '#e0e7ff',
            border: `2px solid ${message.includes('✅') ? '#10b981' : 
                                message.includes('❌') || message.includes('🔴') ? '#ef4444' : '#3b82f6'}`,
            borderRadius: '6px',
            fontSize: '0.95rem',
            fontWeight: '500'
          }}>
            {message}
          </div>
        )}
        
        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          fontSize: '0.875rem', 
          color: '#4b5563'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>Test Credentials:</h3>
          <p style={{ margin: '0.25rem 0' }}><strong>Email:</strong> finaltest@partner.com</p>
          <p style={{ margin: '0.25rem 0' }}><strong>Password:</strong> PoG3&jf&Jx0U</p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', fontStyle: 'italic' }}>
            💡 These credentials were auto-generated when the partner was created
          </p>
        </div>
        
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: '#9ca3af' }}>
          <p>© 2025 Power100 Experience | Partner Portal Test</p>
        </div>
      </div>
    </div>
  );
}