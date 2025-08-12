import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Test backend connection from server-side
    const response = await fetch('http://127.0.0.1:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@power100.io',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    return NextResponse.json({ 
      success: true, 
      backendResponse: data,
      apiUrl: process.env.NEXT_PUBLIC_API_URL 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      apiUrl: process.env.NEXT_PUBLIC_API_URL 
    }, { status: 500 });
  }
}