import React from 'react';
import { useParams } from 'react-router-dom';

export default function TestPage() {
  const { id } = useParams<{ id: string }>();
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Test Page</h1>
        <p>ID from URL: {id}</p>
        <p>This is a simple test page to verify routing works.</p>
      </div>
    </div>
  );
}
