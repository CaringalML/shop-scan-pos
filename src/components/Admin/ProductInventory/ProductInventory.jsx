import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import 'boxicons/css/boxicons.min.css'; // Import Boxicons CSS

import { 
  fetchProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from '../../../redux/slices/productSlice';
import './ProductInventory.css';

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

const ProductInventory = () => {
  const dispatch = useDispatch();
  const { products, loading, error } = useSelector(state => state.product);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    price: '',
    description: '',
    category: '',
    stockQuantity: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleOpenModal = (mode, product = null) => {
    setModalMode(mode);
    setSelectedProduct(product);
    
    if (mode === 'edit' && product) {
      setFormData({
        name: product.name || '',
        barcode: product.barcode || '',
        price: product.price || '',
        description: product.description || '',
        category: product.category || '',
        stockQuantity: product.stockQuantity || '',
      });
    } else {
      setFormData({
        name: '',
        barcode: '',
        price: '',
        description: '',
        category: '',
        stockQuantity: '',
      });
    }
    
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    let updatedValue = value;
    
    // Format numeric fields
    if (type === 'number') {
      updatedValue = value === '' ? '' : parseFloat(value);
    }
    
    setFormData(prevState => ({
      ...prevState,
      [name]: updatedValue,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate price as number
    const productData = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      stockQuantity: parseInt(formData.stockQuantity, 10) || 0,
    };
    
    if (modalMode === 'create') {
      dispatch(createProduct(productData))
        .unwrap()
        .then(() => {
          toast.success('Product created successfully');
          handleCloseModal();
        })
        .catch((err) => {
          toast.error(err);
        });
    } else if (modalMode === 'edit' && selectedProduct) {
      dispatch(updateProduct({ id: selectedProduct.id, productData }))
        .unwrap()
        .then(() => {
          toast.success('Product updated successfully');
          handleCloseModal();
        })
        .catch((err) => {
          toast.error(err);
        });
    }
  };

  const handleConfirmDelete = (productId) => {
    setConfirmDelete(productId);
  };

  const handleDeleteProduct = (productId) => {
    dispatch(deleteProduct(productId))
      .unwrap()
      .then(() => {
        toast.success('Product deleted successfully');
        setConfirmDelete(null);
      })
      .catch((err) => {
        toast.error(err);
      });
  };

  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };

  const filteredProducts = products.filter(product => 
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (price) => {
    return typeof price === 'number' 
      ? `$${price.toFixed(2)}` 
      : price 
        ? `$${parseFloat(price).toFixed(2)}` 
        : '-';
  };

  return (
    <div className="product-inventory">
      <div className="inventory-header">
        <h1>Product Inventory</h1>
        <button 
          className="btn btn-primary add-product-btn"
          onClick={() => handleOpenModal('create')}
        >
          <i className='bx bx-plus'></i>
          Add New Product
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search products by name, barcode, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading"></div>
          <p>Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="no-products-message">
          <p>No products found. Create a new product to get started.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table products-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Barcode</th>
                <th>Price</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>
                    <div className="barcode-cell">
                      <i className='bx bx-barcode'></i>
                      {product.barcode || '-'}
                    </div>
                  </td>
                  <td>{formatPrice(product.price)}</td>
                  <td>{product.category || '-'}</td>
                  <td>{product.stockQuantity || 0}</td>
                  <td>
                    {confirmDelete === product.id ? (
                      <div className="confirm-delete">
                        <button 
                          className="btn-confirm" 
                          onClick={() => handleDeleteProduct(product.id)}
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
                          onClick={() => handleOpenModal('edit', product)}
                          aria-label="Edit product"
                        >
                          <i className='bx bx-edit-alt'></i>
                        </button>
                        <button 
                          className="btn-delete" 
                          onClick={() => handleConfirmDelete(product.id)}
                          aria-label="Delete product"
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
              <h2>{modalMode === 'create' ? 'Add New Product' : 'Edit Product'}</h2>
              <button 
                className="modal-close" 
                onClick={handleCloseModal}
              >
                <i className='bx bx-x'></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="product-form">
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Product Name*
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="form-control"
                  placeholder="Enter product name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="barcode" className="form-label">
                  Barcode
                </label>
                <input
                  type="text"
                  id="barcode"
                  name="barcode"
                  className="form-control"
                  placeholder="Enter barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="price" className="form-label">
                    Price*
                  </label>
                  <div className="price-input">
                    <span className="price-symbol">$</span>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      className="form-control"
                      placeholder="0.00"
                      value={formData.price}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="stockQuantity" className="form-label">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    id="stockQuantity"
                    name="stockQuantity"
                    className="form-control"
                    placeholder="0"
                    value={formData.stockQuantity}
                    onChange={handleChange}
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="category" className="form-label">
                  Category
                </label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  className="form-control"
                  placeholder="Enter category"
                  value={formData.category}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="description" className="form-label">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  className="form-control"
                  placeholder="Enter product description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                />
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
                    <>{modalMode === 'create' ? 'Create Product' : 'Update Product'}</>
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

export default ProductInventory;