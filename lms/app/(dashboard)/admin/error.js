'use client';

export default function AdminError({ error, reset }) {
  return (
    <div className="p-10 m-10 bg-red-900 border-4 border-red-500 rounded-lg text-white">
      <h2 className="text-2xl font-bold mb-4">Something went wrong in the Admin Dashboard!</h2>
      <pre className="bg-black/50 p-4 rounded text-sm overflow-auto mb-4">
        {error?.message || "Unknown error"}
        {'\n'}
        {error?.stack}
      </pre>
      <button 
        className="px-4 py-2 bg-white text-red-900 font-bold rounded"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
