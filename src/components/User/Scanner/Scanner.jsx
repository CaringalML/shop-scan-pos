import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Quagga from 'quagga';
import { toast } from 'react-toastify';
import 'boxicons/css/boxicons.min.css';

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
  const [scannerMessage, setScannerMessage] = useState('');
  const [detectionState, setDetectionState] = useState('idle'); // 'idle', 'detecting', 'success'

  const { currentProduct, loading: productLoading, error: productError } = useSelector(state => state.product);
  const { loading: cartLoading, error: cartError } = useSelector(state => state.cart);

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (isScanning) {
        Quagga.stop();
      }
    };
  }, [isScanning]);

  // Handle errors
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

  // Reset detection state when scanning stops
  useEffect(() => {
    if (!isScanning) {
      setDetectionState('idle');
      setScannerMessage('');
    }
  }, [isScanning]);

  const startScanner = () => {
    if (isScanning) return;
    
    setIsScanning(true);
    setScannerMessage('Position barcode in the center of the camera');
    
    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: scannerRef.current,
        constraints: {
          facingMode: "environment",
        },
      },
      locator: {
        patchSize: "medium",
        halfSample: true
      },
      numOfWorkers: navigator.hardwareConcurrency || 4,
      decoder: {
        readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "upc_reader"],
        debug: {
          drawBoundingBox: true,
          showFrequency: false,
          drawScanline: true,
          showPattern: true
        }
      },
      locate: true
    }, (err) => {
      if (err) {
        console.error(err);
        toast.error('Failed to initialize scanner');
        setIsScanning(false);
        return;
      }
      
      Quagga.start();
      
      // Add event listeners for real-time feedback
      Quagga.onProcessed((result) => {
        if (result) {
          // Update UI based on detection result
          if (result.boxes) {
            setDetectionState('detecting');
            setScannerMessage('Barcode detected! Hold steady...');
          } else {
            if (detectionState !== 'success') {
              setDetectionState('idle');
              setScannerMessage('Position barcode in the center of the camera');
            }
          }
        }
      });
      
      Quagga.onDetected((result) => {
        if (result && result.codeResult) {
          const code = result.codeResult.code;
          
          // Show success state
          setDetectionState('success');
          setScannerMessage(`Barcode read successfully: ${code}`);
          
          // Stop scanning after successful detection
          setTimeout(() => {
            stopScanner();
            
            // Set barcode and find product
            setBarcode(code);
            dispatch(getProductByBarcode(code));
          }, 500); // Short delay to see success state
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
          <i className='bx bx-camera'></i>
          Scan Barcode
        </button>
        <button 
          className={`mode-toggle ${manualEntry ? 'active' : ''}`} 
          onClick={() => setManualEntry(true)}
        >
          <i className='bx bx-keyboard'></i>
          Manual Entry
        </button>
      </div>

      {!manualEntry ? (
        <div className="scanner-section">
          <div 
            ref={scannerRef} 
            className={`scanner-view ${isScanning ? 'active' : ''} ${detectionState}`}
          >
            {!isScanning && (
              <div className="scanner-placeholder">
                <i className='bx bx-barcode'></i>
                <p>Camera feed will appear here</p>
              </div>
            )}
            {isScanning && (
              <div className="scanner-guide">
                <div className="scanner-corner top-left"></div>
                <div className="scanner-corner top-right"></div>
                <div className="scanner-corner bottom-left"></div>
                <div className="scanner-corner bottom-right"></div>
                {scannerMessage && (
                  <div className={`scanner-message ${detectionState}`}>
                    {scannerMessage}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="scanner-controls">
            {isScanning ? (
              <button 
                className="btn btn-secondary scanner-btn" 
                onClick={stopScanner}
              >
                <i className='bx bx-stop'></i> Stop Scanner
              </button>
            ) : (
              <button 
                className="btn btn-primary scanner-btn" 
                onClick={startScanner}
              >
                <i className='bx bx-scan'></i> Start Scanner
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
                  aria-label="Decrease quantity"
                >
                  <i className='bx bx-minus'></i>
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
                  aria-label="Increase quantity"
                >
                  <i className='bx bx-plus'></i>
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