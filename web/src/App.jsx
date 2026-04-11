import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Distributor from './pages/Distributor';
import Inspector from './pages/Inspector';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/distributor" element={<Distributor />} />
        <Route path="/inspector" element={<Inspector />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
