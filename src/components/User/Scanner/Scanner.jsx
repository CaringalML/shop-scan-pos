import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Quagga from 'quagga';
import { toast } from 'react-toastify';
import 'boxicons/css/boxicons.min.css';
import _ from 'lodash'; // Make sure lodash is installed

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
  const [isProcessing, setIsProcessing] = useState(false); // New state to track processing

  const { currentProduct, loading: productLoading, error: productError } = useSelector(state => state.product);
  const { loading: cartLoading, error: cartError } = useSelector(state => state.cart);

  // Create a debounced version of the product lookup
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedGetProduct = useCallback(
    _.debounce((code) => {
      // Clear previous errors first
      dispatch({ type: 'product/clearErrors' });
      dispatch(getProductByBarcode(code));
      setIsProcessing(false); // End processing state
    }, 800),
    [dispatch]
  );

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (isScanning) {
        Quagga.stop();
      }
    };
  }, [isScanning]);

  // Handle errors with a delay to prevent UI flashing
  useEffect(() => {
    let errorTimer;
    if (productError) {
      errorTimer = setTimeout(() => {
        toast.error(productError);
      }, 300);
    }
    return () => {
      if (errorTimer) clearTimeout(errorTimer);
    };
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

  // Handle successful product fetch
  useEffect(() => {
    if (currentProduct && !productLoading && barcode) {
      toast.success('Product found!');
    }
  }, [currentProduct, productLoading, barcode]);

  const validateBarcode = (code) => {
    // Basic validation: most barcodes are at least 8 digits
    return code && code.length >= 8 && /^\d+$/.test(code);
  };

  const handleProductLookup = (code) => {
    if (!validateBarcode(code)) {
      toast.error('Invalid barcode format');
      return;
    }
    
    if (isProcessing) return; // Prevent duplicate processing
    
    setIsProcessing(true);
    setBarcode(code);
    debouncedGetProduct(code);
  };

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
        patchSize: "large", // Changed from medium to large for better detection
        halfSample: true
      },
      numOfWorkers: navigator.hardwareConcurrency || 2,
      frequency: 10, // Lower frequency for more accurate scans
      decoder: {
        readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "upc_reader"],
        debug: {
          drawBoundingBox: true,
          showFrequency: false,
          drawScanline: true,
          showPattern: true
        },
        multiple: false // Ensure we only get one result
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
      
      // Track detection attempts and only accept high-confidence readings
      let consecutiveDetections = {};
      let detectionThreshold = 3; // Require 3 identical detections before accepting
      
      Quagga.onDetected((result) => {
        if (result && result.codeResult && !isProcessing) {
          const code = result.codeResult.code;
          
          // Count identical detections to ensure accuracy
          consecutiveDetections[code] = (consecutiveDetections[code] || 0) + 1;
          
          if (consecutiveDetections[code] >= detectionThreshold) {
            // Only process if not already processing and barcode is valid
            if (validateBarcode(code)) {
              // Show success state
              setDetectionState('success');
              setScannerMessage(`Barcode read successfully: ${code}`);
              
              // Process after a delay to give user feedback
              setTimeout(() => {
                stopScanner();
                handleProductLookup(code);
              }, 1200); // Increased delay for visual feedback
            } else {
              setDetectionState('idle');
              setScannerMessage('Invalid barcode, please try again');
              consecutiveDetections = {}; // Reset detection count
            }
          }
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
    
    handleProductLookup(barcode.trim());
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

  // Function to clear current errors and retry
  const handleRetry = () => {
    if (barcode) {
      dispatch({ type: 'product/clearErrors' });
      dispatch(getProductByBarcode(barcode));
    }
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
                <i className='bx bx-barcode placeholder-icon'></i>
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
                disabled={isProcessing}
              >
                <i className='bx bx-stop'></i> Stop Scanner
              </button>
            ) : (
              <button 
                className="btn btn-primary scanner-btn" 
                onClick={startScanner}
                disabled={isProcessing}
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
              disabled={productLoading || isProcessing}
            >
              {productLoading ? 'Searching...' : 'Find Product'}
            </button>
          </form>
        </div>
      )}

      {/* Error handling with retry option */}
      {productError && barcode && (
        <div className="product-error">
          <div className="error-message">
            <p><i className='bx bx-error-circle'></i> {productError}</p>
            <div className="error-actions">
              <button 
                className="btn btn-outline-warning retry-btn" 
                onClick={handleRetry}
              >
                <i className='bx bx-refresh'></i> Retry Lookup
              </button>
              <button 
                className="btn btn-outline-secondary" 
                onClick={() => {
                  dispatch({ type: 'product/clearErrors' });
                  setBarcode('');
                }}
              >
                <i className='bx bx-x'></i> Cancel
              </button>
            </div>
          </div>
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