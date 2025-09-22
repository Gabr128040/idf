import React from 'react';
     import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
     import Navbar from './components/Navbar';
     import Dashboard from './pages/Dashboard';
     import Login from './pages/Login';
     import Register from './pages/Register';
     import PrivateRoute from './components/PrivateRoute';
     import './App.css';
     import Relatorios from './pages/Relatorios';
     import AdminDashboard from './pages/AdminDashboard';
     import AdminPanel from './pages/AdminPanel';

     const App = () => {
       return (
         <Router>
           <Navbar />
           <Routes>
             <Route path="/login" element={<Login />} />
             <Route path="/register" element={<Register />} />
             <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
             <Route path="/relatorios" element={<Relatorios />} />
             <Route path="/admin" element={<PrivateRoute adminOnly={true}><AdminDashboard /></PrivateRoute>} />
             <Route path="/admin-panel" element={<PrivateRoute adminOnly={true}><AdminPanel /></PrivateRoute>} />
           </Routes>
         </Router>
       );
     };

     export default App;