import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import 'boxicons/css/boxicons.min.css';
import _ from 'lodash';
import Quagga from 'quagga'; // Import QuaggaJS

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupportedDevice, setIsSupportedDevice] = useState(true);

  const { currentProduct, loading: productLoading, error: productError } = useSelector(state => state.product);
  const { loading: cartLoading, error: cartError } = useSelector(state => state.cart);

  // Track detected barcodes for confidence thresholding
  // eslint-disable-next-line no-unused-vars
  const [barcodeDetections, setBarcodeDetections] = useState({});
  const confidenceThreshold = 3; // Number of consecutive identical detections needed

  // Validate barcode
  const validateBarcode = useCallback((code) => {
    // Basic validation: most barcodes are at least 8 digits
    return code && code.length >= 8 && /^\d+$/.test(code);
  }, []);

  // Create a debounced version of the product lookup
  const debouncedGetProduct = useCallback(
    // Use an inline function as recommended by ESLint
    (code) => {
      // Clear existing toasts to prevent stacking
      toast.dismiss();
      
      const debouncedFn = _.debounce((codeToLookup) => {
        // Clear previous errors first
        dispatch({ type: 'product/clearErrors' });
        dispatch(getProductByBarcode(codeToLookup));
        setIsProcessing(false);
      }, 800);
      
      debouncedFn(code);
      
      // Return a cancel function for cleanup
      return () => {
        debouncedFn.cancel();
      };
    },
    [dispatch]
  );

  // Product lookup function
  const handleProductLookup = useCallback((code) => {
    if (!validateBarcode(code)) {
      // Dismiss any existing toasts before showing error
      toast.dismiss();
      toast.error('Invalid barcode format', {
        toastId: 'invalid-barcode',
        autoClose: 3000
      });
      return;
    }

    if (isProcessing) return; // Prevent duplicate processing

    setIsProcessing(true);
    setBarcode(code);
    debouncedGetProduct(code);
  }, [validateBarcode, isProcessing, debouncedGetProduct]);

  // Stop scanner function
  const stopScanner = useCallback(() => {
    if (isScanning) {
      Quagga.stop();
      setIsScanning(false);
    }
  }, [isScanning]);

  // Handle barcode detection
  const handleBarcodeDetected = useCallback((result) => {
    if (!result || !result.codeResult) return;

    const code = result.codeResult.code;
    const format = result.codeResult.format;
    const confidence = result.codeResult.confidence;

    if (!code) return;

    // Only process high confidence barcodes
    if (confidence < 0.8) {
      setDetectionState('detecting');
      setScannerMessage(`Low confidence detection (${Math.round(confidence * 100)}%)`);
      return;
    }

    setDetectionState('detecting');
    setScannerMessage(`Barcode detected: ${code} (${format})`);

    // Track occurrences for confidence
    setBarcodeDetections(prev => {
      const newOccurrences = { ...prev };
      newOccurrences[code] = (newOccurrences[code] || 0) + 1;

      // If we reach the confidence threshold, process the barcode
      if (newOccurrences[code] >= confidenceThreshold && !isProcessing) {
        setDetectionState('success');
        setScannerMessage(`Barcode read successfully: ${code}`);

        // Stop scanning after a delay for UX feedback
        setTimeout(() => {
          stopScanner();
          handleProductLookup(code);
        }, 1000);
      }

      return newOccurrences;
    });
  }, [confidenceThreshold, isProcessing, stopScanner, handleProductLookup]);

  // Handle barcode processing (highlighting detection boxes)
  const handleBarcodeProcessed = useCallback((result) => {
    // Draw the bounding box for visual feedback
    const drawingCtx = Quagga.canvas.ctx.overlay;
    const drawingCanvas = Quagga.canvas.dom.overlay;

    if (!drawingCtx || !result) {
      return;
    }

    // Clear the canvas
    drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

    // Only draw if a barcode is detected
    if (result.boxes) {
      drawingCtx.strokeStyle = detectionState === 'success' ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 204, 0, 0.8)';
      drawingCtx.lineWidth = 4;

      // Draw all detection boxes
      result.boxes.forEach((box) => {
        if (box !== result.box) {
          drawingCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          drawingCtx.lineWidth = 2;
          drawingCtx.beginPath();
          drawingCtx.moveTo(box[0][0], box[0][1]);
          box.forEach((corner, index) => {
            if (index > 0) {
              drawingCtx.lineTo(corner[0], corner[1]);
            }
          });
          drawingCtx.lineTo(box[0][0], box[0][1]);
          drawingCtx.stroke();
        }
      });
    }

    // Draw the main detection box more prominently
    if (result.box) {
      drawingCtx.strokeStyle = detectionState === 'success' ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 204, 0, 0.8)';
      drawingCtx.lineWidth = 4;
      drawingCtx.beginPath();
      drawingCtx.moveTo(result.box[0][0], result.box[0][1]);
      result.box.forEach((corner, index) => {
        if (index > 0) {
          drawingCtx.lineTo(corner[0], corner[1]);
        }
      });
      drawingCtx.lineTo(result.box[0][0], result.box[0][1]);
      drawingCtx.stroke();
    }
  }, [detectionState]);

  // Initialize QuaggaJS
  const initQuagga = useCallback(() => {
    if (!scannerRef.current) {
      return;
    }

    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: scannerRef.current,
        constraints: {
          facingMode: "environment", // Use the rear camera on mobile devices
          width: { min: 640 },
          height: { min: 480 },
          aspectRatio: { min: 1, max: 2 }
        },
      },
      locator: {
        patchSize: "medium",
        halfSample: true
      },
      numOfWorkers: navigator.hardwareConcurrency || 4,
      decoder: {
        readers: [
          "ean_reader",
          "ean_8_reader",
          "upc_reader",
          "upc_e_reader",
          "code_39_reader",
          "code_128_reader",
          "i2of5_reader",
          "2of5_reader",
          "code_93_reader"
        ]
      },
      locate: true
    }, function(err) {
      if (err) {
        console.error("Error initializing Quagga:", err);
        setIsSupportedDevice(false);
        toast.error("Failed to initialize barcode scanner");
        return;
      }

      // Start Quagga after successful initialization
      Quagga.start();
      setIsScanning(true);
      setScannerMessage('Position barcode in the center of the camera');
    });

    // Add detection handlers
    Quagga.onDetected(handleBarcodeDetected);
    Quagga.onProcessed(handleBarcodeProcessed);

    return () => {
      Quagga.offDetected(handleBarcodeDetected);
      Quagga.offProcessed(handleBarcodeProcessed);
    };
  }, [handleBarcodeDetected, handleBarcodeProcessed]);

  // Start scanner
  const startScanner = useCallback(() => {
    if (isScanning) return;
    
    setIsScanning(true);
    setScannerMessage('Initializing camera...');
    
    try {
      initQuagga();
    } catch (error) {
      console.error('Error starting scanner:', error);
      setIsScanning(false);
      setIsSupportedDevice(false);
      toast.error('Failed to start the barcode scanner');
    }
  }, [isScanning, initQuagga]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (isScanning) {
        stopScanner();
      }
    };
  }, [isScanning, stopScanner]);

  // Handle errors
  useEffect(() => {
    if (productError) {
      // Dismiss any existing toasts before showing error
      toast.dismiss();
      toast.error(productError, {
        toastId: 'product-error', // Add a unique ID to prevent duplicates
        autoClose: 3000
      });
    }
  }, [productError]);

  useEffect(() => {
    if (cartError) {
      // Dismiss any existing toasts before showing error
      toast.dismiss();
      toast.error(cartError, {
        toastId: 'cart-error', // Add a unique ID to prevent duplicates
        autoClose: 3000
      });
    }
  }, [cartError]);

  // Reset detection state when scanning stops
  useEffect(() => {
    if (!isScanning) {
      setDetectionState('idle');
      setScannerMessage('');
      // Use setBarcodeDetections to clear the tracked barcodes
      setBarcodeDetections({});
    }
  }, [isScanning]);

  // Handle successful product fetch
  useEffect(() => {
    if (currentProduct && !productLoading && barcode) {
      // Dismiss any existing toasts before showing success
      toast.dismiss();
      toast.success('Product found!', {
        toastId: 'product-found', // Add a unique ID to prevent duplicates
        autoClose: 2000 // Auto close after 2 seconds
      });
    }
  }, [currentProduct, productLoading, barcode]);

  const handleManualSubmit = (e) => {
    e.preventDefault();

    if (!barcode.trim()) {
      // Dismiss any existing toasts before showing error
      toast.dismiss();
      toast.error('Please enter a barcode', {
        toastId: 'empty-barcode',
        autoClose: 3000
      });
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
        // Dismiss any existing toasts before showing success
        toast.dismiss();
        toast.success(`Added ${currentProduct.name} to cart`, {
          toastId: 'add-to-cart-success',
          autoClose: 2000
        });
        // Reset form for next scan
        setBarcode('');
        setQuantity(1);
        // Clear current product
        dispatch({ type: 'product/clearCurrentProduct' });
      })
      .catch((err) => {
        // Dismiss any existing toasts before showing error
        toast.dismiss();
        toast.error(err, {
          toastId: 'add-to-cart-error',
          autoClose: 3000
        });
      });
  };

  // Function to clear current errors and retry
  const handleRetry = () => {
    if (barcode) {
      dispatch({ type: 'product/clearErrors' });
      dispatch(getProductByBarcode(barcode));
    }
  };

  // Fallback message if device doesn't support barcode detection
  if (!isSupportedDevice) {
    return (
      <div className="scanner-container">
        <div className="device-not-supported">
          <i className='bx bx-error-circle'></i>
          <h3>Barcode Scanning Not Supported</h3>
          <p>Your device or browser doesn't support barcode scanning.</p>
          <p>Please try using a different browser or device, or use manual entry.</p>
          <button
            className="btn btn-primary manual-mode-btn"
            onClick={() => setManualEntry(true)}
          >
            <i className='bx bx-keyboard'></i> Use Manual Entry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="scanner-container">
      <div className="scanner-modes">
        <button
          className={`mode-toggle ${!manualEntry ? 'active' : ''}`}
          onClick={() => {
            setManualEntry(false);
            if (isScanning) {
              stopScanner();
            }
          }}
        >
          <i className='bx bx-camera'></i>
          Scan Barcode
        </button>
        <button
          className={`mode-toggle ${manualEntry ? 'active' : ''}`}
          onClick={() => {
            setManualEntry(true);
            if (isScanning) {
              stopScanner();
            }
          }}
        >
          <i className='bx bx-keyboard'></i>
          Manual Entry
        </button>
      </div>

      {!manualEntry ? (
        <div className="scanner-section">
          <div
            className={`scanner-view ${isScanning ? 'active' : ''} ${detectionState} ${isProcessing ? 'processing' : ''}`}
          >
            {!isScanning && (
              <div className="scanner-placeholder">
                <i className='bx bx-barcode placeholder-icon'></i>
                <p>Camera feed will appear here</p>
              </div>
            )}
            <div 
              ref={scannerRef} 
              className="scanner-quagga-container"
              style={{ 
                width: '100%', 
                height: '100%',
                display: isScanning ? 'block' : 'none',
                position: 'relative' 
              }}
            ></div>
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