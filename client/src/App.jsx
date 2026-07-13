import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import DayList from './pages/DayList';
import DayDetail from './pages/DayDetail';
import Trends from './pages/Trends';

export default function App() {
  return (
    <div className="min-h-screen bg-brand-6 text-gray-100">
      <header className="border-b border-brand-8 bg-brand-5 px-6 py-4 flex items-center gap-8">
        <NavLink to="/" className="text-xl font-bold tracking-tight text-white hover:text-brand-1 transition-colors">
          Daftro
        </NavLink>
        <nav className="flex gap-5 text-sm">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? 'text-brand-1' : 'text-brand-3 hover:text-gray-200 transition-colors'
            }
          >
            Reports
          </NavLink>
          <NavLink
            to="/trends"
            className={({ isActive }) =>
              isActive ? 'text-brand-1' : 'text-brand-3 hover:text-gray-200 transition-colors'
            }
          >
            Trends
          </NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Routes>
          <Route path="/" element={<DayList />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/:date" element={<DayDetail />} />
        </Routes>
      </main>
    </div>
  );
}
