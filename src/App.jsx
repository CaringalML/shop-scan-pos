import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

// Pages
import AdminLoginPage from './pages/AdminPages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminPages/AdminDashboardPage';
import CartInventoryPage from './pages/AdminPages/CartInventoryPage';
import ProductInventoryPage from './pages/AdminPages/ProductInventoryPage';
import CartEntryPage from './pages/UserPages/CartEntryPage';
import CartViewPage from './pages/UserPages/CartViewPage';

// Components
import ProtectedRoute from './components/Common/ProtectedRoute/ProtectedRoute';
import Navbar from './components/Common/Navbar/Navbar';
import Footer from './components/Common/Footer/Footer';

// Redux
import { checkAdminAuth } from './redux/slices/authSlice';

const App = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, loading } = useSelector(state => state.auth);

  useEffect(() => {
    // Check if admin is authenticated on app load
    dispatch(checkAdminAuth());
  }, [dispatch]);

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          {/* Admin Routes */}
          <Route path="/admin/login" element={!isAuthenticated ? <AdminLoginPage /> : <Navigate to="/admin/dashboard" />} />
          
          <Route path="/admin/dashboard" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <AdminDashboardPage />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/carts" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <CartInventoryPage />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/products" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <ProductInventoryPage />
            </ProtectedRoute>
          } />
          
          {/* User Routes */}
          <Route path="/" element={<CartEntryPage />} />
          <Route path="/cart/:cartId" element={<CartViewPage />} />
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;