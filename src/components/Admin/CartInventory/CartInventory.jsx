import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import 'boxicons/css/boxicons.min.css'; // Import Boxicons CSS

import { 
  fetchCarts, 
  createCart, 
  updateCart, 
  deleteCart 
} from '../../../redux/slices/cartSlice';
import './CartInventory.css';

// Confirmation Dialog Component
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

const CartInventory = () => {
  const dispatch = useDispatch();
  const { carts, loading, error } = useSelector(state => state.cart);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCart, setSelectedCart] = useState(null);
  const [formData, setFormData] = useState({
    cartId: '',
    name: '',
    location: '',
    active: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    dispatch(fetchCarts());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleOpenModal = (mode, cart = null) => {
    setModalMode(mode);
    setSelectedCart(cart);
    
    if (mode === 'edit' && cart) {
      setFormData({
        cartId: cart.cartId,
        name: cart.name || '',
        location: cart.location || '',
        active: cart.active || true,
      });
    } else {
      setFormData({
        cartId: '',
        name: '',
        location: '',
        active: true,
      });
    }
    
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCart(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (modalMode === 'create') {
      dispatch(createCart(formData))
        .unwrap()
        .then(() => {
          toast.success('Cart created successfully');
          handleCloseModal();
        })
        .catch((err) => {
          toast.error(err);
        });
    } else if (modalMode === 'edit' && selectedCart) {
      dispatch(updateCart({ id: selectedCart.id, cartData: formData }))
        .unwrap()
        .then(() => {
          toast.success('Cart updated successfully');
          handleCloseModal();
        })
        .catch((err) => {
          toast.error(err);
        });
    }
  };

  const handleConfirmDelete = (cartId) => {
    setConfirmDelete(cartId);
  };

  const handleDeleteCart = (cartId) => {
    dispatch(deleteCart(cartId))
      .unwrap()
      .then(() => {
        toast.success('Cart deleted successfully');
        setConfirmDelete(null);
      })
      .catch((err) => {
        toast.error(err);
      });
  };

  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };

  const filteredCarts = carts.filter(cart => 
    cart.cartId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cart.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cart.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="cart-inventory">
      <div className="inventory-header">
        <h1>Cart Inventory</h1>
        <button 
          className="btn btn-primary add-cart-btn"
          onClick={() => handleOpenModal('create')}
        >
          <i className='bx bx-plus'></i>
          Add New Cart
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search carts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading"></div>
          <p>Loading carts...</p>
        </div>
      ) : filteredCarts.length === 0 ? (
        <div className="no-carts-message">
          <p>No carts found. Create a new cart to get started.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table carts-table">
            <thead>
              <tr>
                <th>Cart ID</th>
                <th>Name</th>
                <th>Location</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCarts.map(cart => (
                <tr key={cart.id} className={!cart.active ? 'inactive-row' : ''}>
                  <td>{cart.cartId}</td>
                  <td>{cart.name || '-'}</td>
                  <td>{cart.location || '-'}</td>
                  <td>
                    <span className={`status-badge ${cart.active ? 'active' : 'inactive'}`}>
                      {cart.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {cart.createdAt ? new Date(cart.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td>
                    {confirmDelete === cart.id ? (
                      <div className="confirm-delete">
                        <button 
                          className="btn-confirm" 
                          onClick={() => handleDeleteCart(cart.id)}
                          aria-label="Confirm delete"
                        >
                          <i className='bx bx-check'></i>
                        </button>
                        <button 
                          className="btn-cancel" 
                          onClick={handleCancelDelete}
                          aria-label="Cancel delete"
                        >
                          <i className='bx bx-x'></i>
                        </button>
                      </div>
                    ) : (
                      <div className="action-buttons">
                        <button 
                          className="btn-edit" 
                          onClick={() => handleOpenModal('edit', cart)}
                          aria-label="Edit cart"
                        >
                          <i className='bx bx-edit-alt'></i>
                        </button>
                        <button 
                          className="btn-delete" 
                          onClick={() => handleConfirmDelete(cart.id)}
                          aria-label="Delete cart"
                        >
                          <i className='bx bx-trash'></i>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Add New Cart' : 'Edit Cart'}</h2>
              <button 
                className="modal-close" 
                onClick={handleCloseModal}
              >
                <i className='bx bx-x'></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="cart-form">
              <div className="form-group">
                <label htmlFor="cartId" className="form-label">
                  Cart ID*
                </label>
                <input
                  type="text"
                  id="cartId"
                  name="cartId"
                  className="form-control"
                  placeholder="Enter cart ID"
                  value={formData.cartId}
                  onChange={handleChange}
                  required
                  disabled={modalMode === 'edit'}
                />
                {modalMode === 'edit' && (
                  <small className="form-text text-muted">
                    Cart ID cannot be changed after creation
                  </small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-control"
                  placeholder="Enter cart name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="location" className="form-label">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  className="form-control"
                  placeholder="Enter cart location"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>

              <div className="form-check">
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  className="form-check-input"
                  checked={formData.active}
                  onChange={handleChange}
                />
                <label htmlFor="active" className="form-check-label">
                  Active
                </label>
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn btn-primary save-btn" 
                  disabled={loading}
                >
                  {loading ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    <>{modalMode === 'create' ? 'Create Cart' : 'Update Cart'}</>
                  )}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary cancel-btn" 
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartInventory;