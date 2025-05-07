import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Quagga from 'quagga';
import { FaCamera, FaKeyboard, FaBarcode } from 'react-icons/fa';
import { toast } from 'react-toastify';

import { getProductByBarcode } from '../../../redux/slices/productSlice';
import { addItemToCart } from '../../../redux/slices/cartSlice';
import './Scanner.css';

const Scanner = ({ cartId }) => {
  const dispatch = useDispatch();
  const scannerRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState(1);

  const { currentProduct, loading: productLoading, error: productError } = useSelector(state => state.product);
  const { loading: cartLoading, error: cartError } = useSelector(state => state.cart);

  useEffect(() => {
    return () => {
      if (isScanning) {
        Quagga.stop();
      }
    };
  }, [isScanning]);

  useEffect(() => {
    if (productError) {
      toast.error(productError);
    }
  }, [productError]);

  useEffect(() => {
    if (cartError) {
      toast.error(cartError);
    }
  }, [cartError]);

  const startScanner = () => {
    if (isScanning) return;
    
    setIsScanning(true);
    
    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: scannerRef.current,
        constraints: {
          facingMode: "environment",
        },
      },
      decoder: {
        readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "upc_reader"],
      },
    }, (err) => {
      if (err) {
        console.error(err);
        toast.error('Failed to initialize scanner');
        setIsScanning(false);
        return;
      }
      
      Quagga.start();
      
      Quagga.onDetected((result) => {
        if (result && result.codeResult) {
          const code = result.codeResult.code;
          
          // Stop scanning after successful detection
          stopScanner();
          
          // Set barcode and find product
          setBarcode(code);
          dispatch(getProductByBarcode(code));
        }
      });
    });
  };

  const stopScanner = () => {
    if (isScanning) {
      Quagga.stop();
      setIsScanning(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    
    if (!barcode.trim()) {
      toast.error('Please enter a barcode');
      return;
    }
    
    dispatch(getProductByBarcode(barcode.trim()));
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value) || value < 1) {
      setQuantity(1);
    } else {
      setQuantity(value);
    }
  };

  const handleAddToCart = () => {
    if (!currentProduct) return;
    
    const itemData = {
      productId: currentProduct.id,
      name: currentProduct.name,
      price: currentProduct.price,
      quantity: quantity,
      barcode: currentProduct.barcode,
    };
    
    dispatch(addItemToCart({ cartId, itemData }))
      .unwrap()
      .then(() => {
        toast.success(`Added ${currentProduct.name} to cart`);
        // Reset form for next scan
        setBarcode('');
        setQuantity(1);
        // Clear current product
        dispatch({ type: 'product/clearCurrentProduct' });
      })
      .catch((err) => {
        toast.error(err);
      });
  };

  return (
    <div className="scanner-container">
      <div className="scanner-modes">
        <button 
          className={`mode-toggle ${!manualEntry ? 'active' : ''}`} 
          onClick={() => setManualEntry(false)}
        >
          <FaCamera className="mode-icon" />
          Scan Barcode
        </button>
        <button 
          className={`mode-toggle ${manualEntry ? 'active' : ''}`} 
          onClick={() => setManualEntry(true)}
        >
          <FaKeyboard className="mode-icon" />
          Manual Entry
        </button>
      </div>

      {!manualEntry ? (
        <div className="scanner-section">
          <div 
            ref={scannerRef} 
            className={`scanner-view ${isScanning ? 'active' : ''}`}
          >
            {!isScanning && (
              <div className="scanner-placeholder">
                <FaBarcode className="placeholder-icon" />
                <p>Camera feed will appear here</p>
              </div>
            )}
          </div>

          <div className="scanner-controls">
            {isScanning ? (
              <button 
                className="btn btn-secondary scanner-btn" 
                onClick={stopScanner}
              >
                Stop Scanner
              </button>
            ) : (
              <button 
                className="btn btn-primary scanner-btn" 
                onClick={startScanner}
              >
                Start Scanner
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="manual-entry-section">
          <form onSubmit={handleManualSubmit} className="manual-form">
            <div className="form-group">
              <label htmlFor="barcode" className="form-label">
                Enter Barcode:
              </label>
              <input
                type="text"
                id="barcode"
                name="barcode"
                className="form-control"
                placeholder="Enter product barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary manual-submit-btn" 
              disabled={productLoading}
            >
              {productLoading ? 'Searching...' : 'Find Product'}
            </button>
          </form>
        </div>
      )}

      {currentProduct && (
        <div className="product-result">
          <div className="product-info">
            <h3 className="product-name">{currentProduct.name}</h3>
            <p className="product-price">${Number(currentProduct.price).toFixed(2)}</p>
            {currentProduct.description && (
              <p className="product-description">{currentProduct.description}</p>
            )}
          </div>

          <div className="product-actions">
            <div className="quantity-control">
              <label htmlFor="quantity" className="quantity-label">
                Quantity:
              </label>
              <div className="quantity-buttons">
                <button 
                  type="button" 
                  className="quantity-btn"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </button>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  className="quantity-input"
                  value={quantity}
                  onChange={handleQuantityChange}
                  min="1"
                />
                <button 
                  type="button" 
                  className="quantity-btn"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </button>
              </div>
            </div>

            <button 
              className="btn btn-success add-to-cart-btn" 
              onClick={handleAddToCart}
              disabled={cartLoading}
            >
              {cartLoading ? 'Adding...' : 'Add to Cart'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;