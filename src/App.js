import React from 'react';
     import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
     import Navbar from './components/Navbar';
     import Dashboard from './pages/Dashboard';
     import Login from './pages/Login';
     import Register from './pages/Register';
     import PrivateRoute from './components/PrivateRoute';
     import './App.css';

     const App = () => {
       return (
         <Router>
           <Navbar />
           <Routes>
             <Route path="/login" element={<Login />} />
             <Route path="/register" element={<Register />} />
             <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
           </Routes>
         </Router>
       );
     };

     export default App;