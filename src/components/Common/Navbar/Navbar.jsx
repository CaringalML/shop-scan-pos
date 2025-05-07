import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FaSignOutAlt, FaExchangeAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import 'boxicons/css/boxicons.min.css';

import { logoutAdmin } from '../../../redux/slices/authSlice';
import { clearCurrentCart } from '../../../redux/slices/cartSlice';
import './Navbar.css';

// Confirmation Dialog Component
const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-dialog-overlay">
      <div className="confirm-dialog">
        <h3 className="confirm-dialog-title">{title}</h3>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const Navbar = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector(state => state.auth);
  const { currentCart, currentCartItems } = useSelector(state => state.cart);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Check if current path is the homepage
  const isHomePage = location.pathname === '/';
  
  // Check if current path is an admin path
  const isAdminPath = location.pathname.includes('/admin');

  const handleLogout = () => {
    dispatch(logoutAdmin());
    navigate('/');
  };

  const handleChangeCartClick = () => {
    if (currentCartItems && currentCartItems.length > 0) {
      setShowConfirmation(true);
    } else {
      navigateToCartEntry();
    }
  };

  const navigateToCartEntry = () => {
    dispatch(clearCurrentCart());
    navigate('/');
  };

  // For the homepage, show only the logo without navigation buttons
  if (isHomePage) {
    return (
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-logo">ShopScan POS</div>
        </div>
      </nav>
    );
  }
  
  // For admin pages, show admin navigation
  if (isAdminPath) {
    return isAuthenticated ? (
      <nav className="navbar admin-navbar">
        <div className="navbar-container">
          <Link to="/admin/dashboard" className="navbar-logo">
            ShopScan POS
          </Link>
          
          <ul className="navbar-menu">
            <li className="navbar-item">
              <Link to="/admin/dashboard" className="navbar-link">
                Dashboard
              </Link>
            </li>
            <li className="navbar-item">
              <Link to="/admin/carts" className="navbar-link">
                Cart Inventory
              </Link>
            </li>
            <li className="navbar-item">
              <Link to="/admin/products" className="navbar-link">
                Product Inventory
              </Link>
            </li>
            <li className="navbar-item">
              <button 
                className="navbar-button" 
                onClick={handleLogout}
              >
                <FaSignOutAlt className="navbar-icon" />
                Logout
              </button>
            </li>
          </ul>
        </div>
      </nav>
    ) : (
      // Show minimal navbar on admin login page
      <nav className="navbar">
        <div className="navbar-container">
          <span className="navbar-logo">ShopScan POS</span>
        </div>
      </nav>
    );
  }
  
  // For cart pages, show only a Change Cart button
  return (
    <nav className="navbar user-navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          ShopScan POS
        </Link>
        
        {currentCart && (
          <ul className="navbar-menu">
            <li className="navbar-item">
              <button
                className="navbar-button change-cart-btn"
                onClick={handleChangeCartClick}
              >
                <FaExchangeAlt className="navbar-icon" />
                Change Cart
              </button>
            </li>
          </ul>
        )}
      </div>

      {/* Confirmation Dialog for changing cart with items */}
      <ConfirmDialog
        isOpen={showConfirmation}
        title="Change Cart"
        message="Please clear your cart first before changing to a new cart. All items must be removed from the current cart."
        onConfirm={() => {
          setShowConfirmation(false);
          toast.warning('Please use the "Clear All" button to empty your cart first');
        }}
        onCancel={() => setShowConfirmation(false)}
      />
    </nav>
  );
};

export default Navbar;