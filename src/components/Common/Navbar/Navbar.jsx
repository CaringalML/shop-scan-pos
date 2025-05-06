import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';

import { logoutAdmin } from '../../../redux/slices/authSlice';
import { clearCurrentCart } from '../../../redux/slices/cartSlice';
import './Navbar.css';

const Navbar = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector(state => state.auth);
  const { currentCart, currentCartItems } = useSelector(state => state.cart);
  
  // Check if current path is the homepage
  const isHomePage = location.pathname === '/';
  
  // Check if current path is an admin path
  const isAdminPath = location.pathname.includes('/admin');
  
  const handleLogout = () => {
    dispatch(logoutAdmin());
    navigate('/');
  };
  
  const handleChangeCart = () => {
    if (currentCartItems.length > 0) {
      toast.warning('Please empty your current cart before switching to a new one.');
    } else {
      dispatch(clearCurrentCart());
      navigate('/');
    }
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
  
  // For cart pages, show simple cart navigation
  return (
    <nav className="navbar user-navbar">
      <div className="navbar-container">
        <Link to={currentCart ? `/cart/${currentCart.cartId}` : '/'} className="navbar-logo">
          ShopScan POS
        </Link>
        
        {currentCart && (
          <ul className="navbar-menu">
            <li className="navbar-item">
              <button
                className="navbar-button"
                onClick={handleChangeCart}
              >
                Change Cart
              </button>
            </li>
          </ul>
        )}
      </div>
    </nav>
  );
};

export default Navbar;