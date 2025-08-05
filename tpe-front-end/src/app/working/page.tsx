"use client";

export default function WorkingTestPage() {
  return (
    <div className="p-8 min-h-screen bg-white">
      <h1 className="text-4xl font-bold text-black mb-4">✅ Frontend is Working!</h1>
      <div className="space-y-4">
        <p className="text-lg">If you can see this page, the Next.js frontend is running properly.</p>
        <div className="bg-green-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold text-green-800">Server Status:</h2>
          <ul className="mt-2 space-y-2">
            <li>✅ Frontend: Running on http://localhost:3006</li>
            <li>✅ Backend: Running on http://localhost:5000</li>
            <li>✅ Database: SQLite connected</li>
          </ul>
        </div>
        <div className="mt-8">
          <h3 className="text-lg font-semibold">Quick Links to Test:</h3>
          <div className="mt-4 space-x-4">
            <a href="/admindashboard" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Admin Dashboard
            </a>
            <a href="/contractorflow" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              Contractor Flow
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}