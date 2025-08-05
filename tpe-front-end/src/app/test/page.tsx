export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Test Page</h1>
      <p>If you can see this, the frontend is working!</p>
      <div className="mt-4">
        <p>Frontend server: Running ✅</p>
        <p>Time: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}