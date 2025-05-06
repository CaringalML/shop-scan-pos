import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import 'boxicons/css/boxicons.min.css'; // Import Boxicons CSS

import Scanner from '../Scanner/Scanner';
import { 
  findCartByCartId, 
  fetchCartItems, 
  updateCartItem, 
  removeCartItem,
  clearCartError
} from '../../../redux/slices/cartSlice';
import './CartView.css';

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
          <button className="btn btn-danger" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// CartItem component for better organization
const CartItem = ({ item, onUpdateQuantity, onRemove }) => {
  return (
    <div className="cart-item">
      <div className="item-details">
        <h3 className="item-name">{item.name}</h3>
        <div className="item-price">${Number(item.price).toFixed(2)}</div>
      </div>
      <div className="item-actions">
        <div className="quantity-control">
          <button 
            className="quantity-btn"
            onClick={() => onUpdateQuantity(item, item.quantity - 1)}
            aria-label="Decrease quantity"
          >
            <i className='bx bx-minus'></i>
          </button>
          <span className="quantity-value">{item.quantity}</span>
          <button 
            className="quantity-btn"
            onClick={() => onUpdateQuantity(item, item.quantity + 1)}
            aria-label="Increase quantity"
          >
            <i className='bx bx-plus'></i>
          </button>
        </div>
        <div className="item-total">
          ${(item.price * item.quantity).toFixed(2)}
        </div>
        <button 
          className="remove-btn"
          onClick={() => onRemove(item)}
          aria-label="Remove item"
        >
          <i className='bx bx-trash'></i>
        </button>
      </div>
    </div>
  );
};

const CartView = () => {
  const { cartId } = useParams();
  const dispatch = useDispatch();
  const { currentCart, currentCartItems, loading, error } = useSelector(state => state.cart);

  const [expandScanner, setExpandScanner] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    if (cartId) {
      dispatch(findCartByCartId(cartId));
    }
  }, [cartId, dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearCartError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (currentCart) {
      dispatch(fetchCartItems(currentCart.cartId));
    }
  }, [currentCart, dispatch]);

  const toggleScanner = () => {
    setExpandScanner(!expandScanner);
  };

  const handleQuantityChange = (item, newQuantity) => {
    if (newQuantity < 1) {
      // If quantity is less than 1, remove the item
      handleRemoveItem(item);
    } else {
      // Update quantity
      dispatch(updateCartItem({
        cartId: currentCart.cartId,
        itemId: item.id,
        itemData: { ...item, quantity: newQuantity }
      }))
        .unwrap()
        .catch((err) => {
          toast.error(err);
        });
    }
  };

  const handleRemoveItem = (item) => {
    dispatch(removeCartItem({ cartId: currentCart.cartId, itemId: item.id }))
      .unwrap()
      .then(() => {
        toast.success(`${item.name} removed from cart`);
      })
      .catch((err) => {
        toast.error(err);
      });
  };

  const handleClearCartConfirm = () => {
    // Close the dialog
    setConfirmDialogOpen(false);
    
    // Remove all items one by one
    const removePromises = currentCartItems.map(item => 
      dispatch(removeCartItem({ cartId: currentCart.cartId, itemId: item.id })).unwrap()
    );
    
    Promise.all(removePromises)
      .then(() => {
        toast.success('All items have been removed from your cart');
      })
      .catch((err) => {
        toast.error('Error clearing cart: ' + err);
      });
  };

  const calculateSubtotal = (items) => {
    return items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  if (!currentCart && loading) {
    return (
      <div className="loading-container">
        <div className="loading"></div>
        <p>Loading cart...</p>
      </div>
    );
  }

  if (!currentCart) {
    return (
      <div className="cart-not-found">
        <i className='bx bx-cart bx-lg'></i>
        <h2>Cart Not Found</h2>
        <p>The cart you're looking for does not exist or has been deactivated.</p>
        <Link to="/" className="btn btn-primary">
          Enter Different Cart ID
        </Link>
      </div>
    );
  }

  const subtotal = calculateSubtotal(currentCartItems);

  return (
    <div className="cart-view">
      <div className="cart-header">
        <h1>
          <i className='bx bx-cart'></i>
          Cart: {currentCart.cartId}
        </h1>
        {currentCart.name && <p className="cart-name">{currentCart.name}</p>}
      </div>

      <div className="cart-sections">
        <div className="scanner-wrapper">
          <div className="section-header" onClick={toggleScanner}>
            <h2>Scan Products</h2>
            <button className="toggle-btn" type="button">
              {expandScanner ? 'Hide Scanner' : 'Show Scanner'}
            </button>
          </div>
          {expandScanner && (
            <div className="section-content">
              <Scanner cartId={currentCart.cartId} />
            </div>
          )}
        </div>

        <div className="cart-items-wrapper">
          <div className="section-header">
            <h2>Cart Items ({currentCartItems.length})</h2>
            {currentCartItems.length > 0 && (
              <button 
                className="clear-cart-btn" 
                onClick={() => setConfirmDialogOpen(true)}
                aria-label="Clear cart"
              >
                <i className='bx bx-trash'></i> Clear All
              </button>
            )}
          </div>
          <div className="section-content">
            {loading ? (
              <div className="loading-container">
                <div className="loading"></div>
                <p>Loading items...</p>
              </div>
            ) : currentCartItems.length === 0 ? (
              <div className="empty-cart">
                <p>Your cart is empty. Scan products to add them to your cart.</p>
              </div>
            ) : (
              <div className="cart-items">
                {currentCartItems.map(item => (
                  <CartItem 
                    key={item.id} 
                    item={item}
                    onUpdateQuantity={handleQuantityChange}
                    onRemove={handleRemoveItem}
                  />
                ))}

                <div className="cart-summary">
                  <div className="summary-row">
                    <span className="summary-label">Subtotal:</span>
                    <span className="summary-value">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="summary-row total-row">
                    <span className="summary-label">Total:</span>
                    <span className="summary-value">${subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        title="Clear Cart"
        message="Are you sure you want to clear your cart? This will remove all items."
        onConfirm={handleClearCartConfirm}
        onCancel={() => setConfirmDialogOpen(false)}
      />
    </div>
  );
};

export default CartView;