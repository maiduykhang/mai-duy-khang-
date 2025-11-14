import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import RootLayout from './app/layout.jsx';
import HomePage from './app/page.jsx';
import JobsPage from './app/jobs/page.jsx';
import AdminDashboard from './app/admin/page.jsx';
import LoginPage from './app/login/page.jsx';
import EmployerDashboard from './app/employer/page.jsx';
import './app/globals.css';

const App = () => {
  const [route, setRoute] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  // Hijack anchor tags to use client-side routing
  useEffect(() => {
      const handleClick = (event) => {
          let target = event.target;
          while(target && target.tagName !== 'A') {
              target = target.parentElement;
          }
          if (target && target.tagName === 'A') {
              const href = target.getAttribute('href');
              // Only handle internal links, ignore external links and mailto etc.
              if (href && href.startsWith('/')) {
                  event.preventDefault();
                  window.history.pushState({}, '', href);
                  setRoute(href);
              }
          }
      };
      
      document.body.addEventListener('click', handleClick);
      return () => document.body.removeEventListener('click', handleClick);
  }, []);

  let Component;
  switch (route) {
    case '/':
      Component = HomePage;
      break;
    case '/jobs':
      Component = JobsPage;
      break;
    case '/admin':
      Component = AdminDashboard;
      break;
    case '/login':
      Component = LoginPage;
      break;
    case '/employer':
      Component = EmployerDashboard;
      break;
    default:
      // A simple 404 component for unmatched routes
      Component = () => (
          <div className="text-center p-12">
              <h1 className="text-2xl font-bold">404 - Not Found</h1>
              <p>The page you are looking for does not exist.</p>
              <a href="/" className="text-blue-600 hover:underline mt-4 inline-block">Go Home</a>
          </div>
      );
  }

  return (
    <RootLayout>
      <Component />
    </RootLayout>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
