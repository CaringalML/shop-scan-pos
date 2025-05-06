import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FaShoppingCart, FaArrowRight } from 'react-icons/fa';
import { toast } from 'react-toastify';

import { findCartByCartId, clearCartError } from '../../../redux/slices/cartSlice';
import './CartEntry.css';

const CartEntry = () => {
  const [cartId, setCartId] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, currentCart } = useSelector(state => state.cart);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearCartError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (currentCart) {
      navigate(`/cart/${currentCart.cartId}`);
    }
  }, [currentCart, navigate]);

  const handleChange = (e) => {
    setCartId(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!cartId.trim()) {
      toast.error('Please enter a Cart ID');
      return;
    }
    
    dispatch(findCartByCartId(cartId.trim()));
  };

  return (
    <div className="cart-entry">
      <div className="cart-entry-container">
        <div className="cart-entry-header">
          <FaShoppingCart className="cart-icon" />
          <h1>Welcome to ShopScan</h1>
          <p>Enter your Cart ID to start shopping</p>
        </div>
        
        <form onSubmit={handleSubmit} className="cart-entry-form">
          <div className="form-group">
            <label htmlFor="cartId" className="form-label">
              What's your Cart ID?
            </label>
            <input
              type="text"
              id="cartId"
              name="cartId"
              className="form-control"
              placeholder="Enter Cart ID"
              value={cartId}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary cart-entry-btn" 
            disabled={loading}
          >
            {loading ? (
              <span className="loading-spinner"></span>
            ) : (
              <>
                Continue <FaArrowRight className="btn-icon-right" />
              </>
            )}
          </button>
        </form>
        
        <div className="cart-entry-footer">
          <p>If you don't have a Cart ID, please ask for assistance.</p>
        </div>
      </div>
    </div>
  );
};

export default CartEntry;