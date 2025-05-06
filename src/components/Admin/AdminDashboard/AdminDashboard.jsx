import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaShoppingCart, FaBox } from 'react-icons/fa';

import { fetchCarts } from '../../../redux/slices/cartSlice';
import { fetchProducts } from '../../../redux/slices/productSlice';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const { carts, loading: cartsLoading } = useSelector(state => state.cart);
  const { products, loading: productsLoading } = useSelector(state => state.product);
  const { adminUser } = useSelector(state => state.auth);

  useEffect(() => {
    dispatch(fetchCarts());
    dispatch(fetchProducts());
  }, [dispatch]);

  const activeCarts = carts.filter(cart => cart.active).length;
  const totalProducts = products.length;

  const getCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p className="dashboard-welcome">
          Welcome back, {adminUser?.username || 'Admin'}! Today is {getCurrentDate()}
        </p>
      </div>

      <div className="dashboard-summary">
        <div className="dashboard-card">
          <div className="card-icon cart-icon">
            <FaShoppingCart />
          </div>
          <div className="card-content">
            <h3>Carts</h3>
            <p className="card-value">{cartsLoading ? '...' : carts.length}</p>
            <p className="card-subtitle">
              {cartsLoading ? '...' : `${activeCarts} active`}
            </p>
          </div>
          <Link to="/admin/carts" className="card-link">
            Manage Carts
          </Link>
        </div>

        <div className="dashboard-card">
          <div className="card-icon product-icon">
            <FaBox />
          </div>
          <div className="card-content">
            <h3>Products</h3>
            <p className="card-value">{productsLoading ? '...' : totalProducts}</p>
            <p className="card-subtitle">
              {productsLoading ? '...' : 'In inventory'}
            </p>
          </div>
          <Link to="/admin/products" className="card-link">
            Manage Products
          </Link>
        </div>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <Link to="/admin/carts" className="action-button">
            <FaShoppingCart className="action-icon" />
            <span>Add New Cart</span>
          </Link>
          <Link to="/admin/products" className="action-button">
            <FaBox className="action-icon" />
            <span>Add New Product</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;