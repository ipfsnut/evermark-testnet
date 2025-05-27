import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary';
import App from './App';
import './index.css';

console.log('🚀 Evermark Mini App Starting...');
console.log('Environment:', {
  isDev: import.meta.env.DEV,
  mode: import.meta.env.MODE,
  baseUrl: import.meta.env.BASE_URL,
  url: window.location.href,
  userAgent: navigator.userAgent,
  inIframe: window.parent !== window,
  screenSize: `${window.screen.width}x${window.screen.height}`,
  viewportSize: `${window.innerWidth}x${window.innerHeight}`
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        console.log(`Query retry ${failureCount}:`, error);
        return failureCount < 2; // Reduce retries for faster debugging
      },
      staleTime: 30000, // 30 seconds
    }
  }
});

window.addEventListener('error', (event) => {
  console.error('🚨 Global JavaScript Error:', {
    message: event.message,
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise Rejection:', event.reason);
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM Content Loaded');
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found!');
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
      <h2>Error: Root element not found</h2>
      <p>The app container is missing from the HTML.</p>
    </div>
  `;
} else {
  console.log('✅ Root element found, mounting React app...');
  
  try {
    const root = ReactDOM.createRoot(rootElement);
    
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <BrowserRouter>
            <QueryClientProvider client={queryClient}>
              <App />
            </QueryClientProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </React.StrictMode>
    );
    
    console.log('✅ React app mounted successfully');
  } catch (error) {
    console.error('❌ Failed to mount React app:', error);
    
    rootElement.innerHTML = `
      <div style="min-height: 100vh; background: #7c3aed; color: white; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20px;">
        <div>
          <h1 style="margin-bottom: 16px;">Evermark</h1>
          <p style="margin-bottom: 16px;">Loading error - check console for details</p>
          <button onclick="window.location.reload()" style="background: white; color: #7c3aed; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
            Reload
          </button>
        </div>
      </div>
    `;
  }
}