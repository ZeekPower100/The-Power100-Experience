'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Home, RefreshCw, AlertCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { getFromStorage, setToStorage } from '@/utils/jsonHelpers';

export default function StateDiagramPage() {
  const diagramRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [diagramCode, setDiagramCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check authentication
  const checkAuth = useCallback(async () => {
    const token = getFromStorage('authToken');

    if (token) {
      try {
        const response = await authApi.getMe();

        if (response && response.success && response.user && response.user.email) {
          setIsAuthenticated(true);
          setIsLoading(false);
        } else if (response && response.user && response.user.email) {
          setIsAuthenticated(true);
          setIsLoading(false);
        } else {
          const timestamp = getFromStorage('authTokenTimestamp');
          if (!timestamp || response?.error || response?.message?.includes('not found')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('authTokenTimestamp');
          }
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authTokenTimestamp');
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    } else {
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, []);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setAuthError(null);

    try {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('authToken');
      localStorage.removeItem('authTokenTimestamp');

      const response = await authApi.login(loginForm.email, loginForm.password);
      setToStorage('authToken', response.token);
      setToStorage('authTokenTimestamp', Date.now().toString());
      setIsAuthenticated(true);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  // Fetch diagram from backend
  const fetchDiagram = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use environment-appropriate base URL
      const baseUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
        ? '' // Use relative URL in production (same domain)
        : 'http://localhost:5000'; // Use explicit localhost in development

      const response = await fetch(`${baseUrl}/api/state-machine/diagram`);
      const data = await response.json();

      if (data.success && data.diagram) {
        setDiagramCode(data.diagram);
        setLastUpdated(new Date().toLocaleString());
        setIsLoading(false); // Turn off loading once diagram data is set
      } else {
        throw new Error('Failed to fetch diagram');
      }
    } catch (err) {
      console.error('Error fetching diagram:', err);
      setError('Failed to load diagram from backend. Using fallback.');

      // Fallback diagram
      setDiagramCode(`stateDiagram-v2
    [*] --> idle

    idle --> routing : MESSAGE_RECEIVED
    idle --> idle : UPDATE_EVENT_CONTEXT

    routing --> standard_agent : No Active Event (hasActiveEvent = false)
    routing --> event_agent : Has Active Event (hasActiveEvent = true)
    routing --> routing : UPDATE_EVENT_CONTEXT

    standard_agent --> routing : MESSAGE_RECEIVED
    standard_agent --> routing : EVENT_REGISTERED
    standard_agent --> idle : SESSION_END
    standard_agent --> standard_agent : UPDATE_EVENT_CONTEXT

    event_agent --> routing : MESSAGE_RECEIVED
    event_agent --> routing : EVENT_ENDED
    event_agent --> idle : SESSION_END
    event_agent --> event_agent : UPDATE_EVENT_CONTEXT

    idle --> [*]

    note right of idle
        Waiting State
        - Machine starts here
        - No agent active
        - Awaits first message
    end note

    note right of routing
        Decision State
        - Evaluates guards
        - Checks event context
        - Routes to appropriate agent
        - Always transitions immediately
    end note

    note right of standard_agent
        Standard Agent Mode
        - Business growth focus
        - Partner matching
        - Resource recommendations
        - General business advice

        Context: No active event today
    end note

    note right of event_agent
        Event Agent Mode
        - Event-specific support
        - Real-time session info
        - Event context awareness
        - Still answers any question

        Context: Active event today
    end note
`);
      setIsLoading(false); // Turn off loading for fallback diagram too
    }
  };

  // Initialize and check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Initialize mermaid and fetch diagram when authenticated (only once)
  useEffect(() => {
    if (!isAuthenticated) return;

    // Initialize mermaid only once
    mermaid.initialize({
      startOnLoad: false, // Changed to false to prevent auto-render
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'Inter, system-ui, sans-serif'
    });

    fetchDiagram();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // Only re-run if auth status changes

  // Render diagram when diagramCode changes (with debounce to prevent re-renders)
  useEffect(() => {
    if (!diagramCode || !diagramRef.current) return;

    // Clear any existing content
    diagramRef.current.innerHTML = '';

    // Use requestAnimationFrame to batch DOM updates
    const renderDiagram = () => {
      const uniqueId = `stateDiagram-${Date.now()}`;
      mermaid.render(uniqueId, diagramCode)
        .then((result) => {
          if (diagramRef.current) {
            diagramRef.current.innerHTML = result.svg;
            setIsLoading(false);
          }
        })
        .catch((err) => {
          console.error('Mermaid render error:', err);
          setError('Failed to render diagram');
          setIsLoading(false);
        });
    };

    // Use requestAnimationFrame for smoother rendering
    const rafId = requestAnimationFrame(renderDiagram);

    return () => cancelAnimationFrame(rafId);
  }, [diagramCode]);

  const handleRefresh = () => {
    fetchDiagram();
  };

  const handleDownload = () => {
    const svgElement = diagramRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ai-concierge-state-diagram.svg';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey p-8">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red"></div>
        </div>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-power100-black">Admin Login Required</CardTitle>
            <p className="text-power100-grey">Access the AI Concierge State Diagram</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-power100-red"
                  placeholder="admin@power100.io"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  id="password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-power100-red"
                  placeholder="Enter your password"
                  required
                />
              </div>
              {authError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-power100-red hover:bg-red-700 text-white"
              >
                {loginLoading ? 'Logging in...' : 'Login'}
              </Button>
              <div className="text-center text-sm text-gray-500 mt-4">
                <p>Development credentials:</p>
                <p className="font-mono text-xs">admin@power100.io / admin123</p>
              </div>
              <div className="text-center mt-4">
                <Link href="/admindashboard">
                  <Button variant="outline" className="w-full">
                    <Home className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-power100-black mb-2">
                AI Concierge State Machine
              </h1>
              <p className="text-power100-grey">
                Visual representation of agent routing between Standard Agent and Event Agent
              </p>
            </div>
            <Link href="/admindashboard">
              <Button variant="outline" className="gap-2">
                <Home className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="gap-2"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh from Backend
            </Button>
            <Button
              onClick={handleDownload}
              className="gap-2 bg-power100-green hover:bg-green-600 text-white"
            >
              <Download className="h-4 w-4" />
              Download SVG
            </Button>
            {lastUpdated && (
              <span className="text-sm text-power100-grey">
                Last updated: {lastUpdated}
              </span>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900">Warning</p>
              <p className="text-sm text-yellow-700">{error}</p>
            </div>
          </div>
        )}

        {/* Diagram Card */}
        <Card className="p-8 bg-white">
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-power100-red mx-auto mb-4" />
                <p className="text-power100-grey">Rendering state diagram...</p>
              </div>
            </div>
          )}
          <div
            ref={diagramRef}
            className="mermaid-container overflow-auto"
            style={{ minHeight: isLoading ? '0' : '600px' }}
          />
        </Card>

        {/* Information Panel */}
        <Card className="mt-6 p-6 bg-white">
          <h2 className="text-xl font-bold text-power100-black mb-4">State Machine Overview</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-power100-black mb-2">States</h3>
              <ul className="space-y-2 text-sm text-power100-grey">
                <li><strong>idle:</strong> Waiting for first message</li>
                <li><strong>routing:</strong> Evaluating guards and determining agent</li>
                <li><strong>standard_agent:</strong> Business growth mode (no active event)</li>
                <li><strong>event_agent:</strong> Event support mode (active event today)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-power100-black mb-2">Key Events</h3>
              <ul className="space-y-2 text-sm text-power100-grey">
                <li><strong>MESSAGE_RECEIVED:</strong> Contractor sends message</li>
                <li><strong>EVENT_REGISTERED:</strong> Contractor registers for event</li>
                <li><strong>EVENT_ENDED:</strong> Event concludes</li>
                <li><strong>SESSION_END:</strong> Conversation ends</li>
                <li><strong>UPDATE_EVENT_CONTEXT:</strong> Event data changes</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Guard Logic:</strong> The <code className="bg-blue-100 px-1 py-0.5 rounded">hasActiveEvent</code> guard
              checks if the contractor has an event with status 'registered', 'checked_in', or 'attending'
              and the event date is today. This determines routing to Event Agent vs Standard Agent.
            </p>
          </div>
        </Card>

        {/* Documentation Link */}
        <Card className="mt-6 p-6 bg-white">
          <h2 className="text-xl font-bold text-power100-black mb-4">Technical Documentation</h2>
          <p className="text-power100-grey mb-4">
            For complete implementation details, testing procedures, and troubleshooting guides, see:
          </p>
          <div className="space-y-2">
            <a
              href="/docs/features/ai-concierge/phase-4/STATE-MACHINE-GUIDE.md"
              className="text-power100-red hover:underline font-medium block"
              target="_blank"
              rel="noopener noreferrer"
            >
              → STATE-MACHINE-GUIDE.md
            </a>
            <a
              href="/docs/features/ai-concierge/phase-4/PHASE-4-IMPLEMENTATION-PLAN.md"
              className="text-power100-red hover:underline font-medium block"
              target="_blank"
              rel="noopener noreferrer"
            >
              → PHASE-4-IMPLEMENTATION-PLAN.md
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
