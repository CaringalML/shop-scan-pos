import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import 'boxicons/css/boxicons.min.css';
import _ from 'lodash';

import { getProductByBarcode } from '../../../redux/slices/productSlice';
import { addItemToCart } from '../../../redux/slices/cartSlice';
import './Scanner.css';

// Load the barcode detection polyfill if the native API is not available
const loadBarcodeDetectionPolyfill = async () => {
  if (!('BarcodeDetector' in window)) {
    console.log('Barcode Detection API not available, loading polyfill...');
    // You can add a polyfill like '@undecaf/barcode-detector-polyfill' or 'barcode-detector'
    try {
      // Example with dynamic import of a polyfill
      const { BarcodeDetectorPolyfill } = await import('barcode-detector');
      window.BarcodeDetector = BarcodeDetectorPolyfill;
    } catch (error) {
      console.error('Failed to load barcode detection polyfill:', error);
      return false;
    }
  }
  return true;
};

const Scanner = ({ cartId }) => {
  const dispatch = useDispatch();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const animationFrameRef = useRef(null);

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

  // Configure supported barcode formats
  const supportedFormats = [
    'ean_13',
    'ean_8',
    'upc_a',
    'upc_e',
    'code_39',
    'code_128',
    'itf',
    'qr_code',
    'data_matrix',
    'aztec',
    'pdf417'
  ];

  // Track detected barcodes for confidence thresholding
  const [barcodeOccurrences, setBarcodeOccurrences] = useState({});
  const confidenceThreshold = 3; // Number of consecutive identical detections needed

  // Create a debounced version of the product lookup
  const debouncedGetProduct = useCallback(
    _.debounce((code) => {
      // Clear previous errors first
      dispatch({ type: 'product/clearErrors' });
      dispatch(getProductByBarcode(code));
      setIsProcessing(false);
    }, 800),
    [dispatch]
  );

  // Initialize the barcode detector
  useEffect(() => {
    let isMounted = true; // To prevent state updates on unmounted component

    const setupBarcodeDetector = async () => {
      const isPolyfillLoaded = await loadBarcodeDetectionPolyfill();

      if (!isPolyfillLoaded && isMounted) {
        setIsSupportedDevice(false);
        return;
      }

      if (window.BarcodeDetector && isMounted) {
        try {
          // Check for supported formats first
          const supportedFormatsArr = await window.BarcodeDetector.getSupportedFormats();
          console.log('Supported formats:', supportedFormatsArr);

          // Create detector with available formats
          detectorRef.current = new window.BarcodeDetector({
            // Filter to only use formats that are supported
            formats: supportedFormats.filter(format =>
              supportedFormatsArr.includes(format)
            )
          });
        } catch (error) {
          console.error('Error initializing BarcodeDetector:', error);
          setIsSupportedDevice(false);
        }
      }
    };

    setupBarcodeDetector();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        stopMediaTracks();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [supportedFormats]); // Added supportedFormats as dependency

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (isScanning) {
        stopScanner();
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
      setBarcodeOccurrences({});
    }
  }, [isScanning]);

  // Handle successful product fetch
  useEffect(() => {
    if (currentProduct && !productLoading && barcode) {
      toast.success('Product found!');
    }
  }, [currentProduct, productLoading, barcode]);

  const stopMediaTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
  };

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

  const processBarcodes = useCallback(async () => {
    if (!isScanning || !videoRef.current || !detectorRef.current) return;

    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);

      if (barcodes.length > 0) {
        // Update detection state
        setDetectionState('detecting');

        // Process the first detected barcode
        const detectedBarcode = barcodes[0];
        const rawValue = detectedBarcode.rawValue;

        setScannerMessage(`Barcode detected: ${rawValue}`);

        // Track occurrences for confidence
        setBarcodeOccurrences(prev => {
          const newOccurrences = { ...prev };
          newOccurrences[rawValue] = (newOccurrences[rawValue] || 0) + 1;

          // If we reach the confidence threshold, process the barcode
          if (newOccurrences[rawValue] >= confidenceThreshold && !isProcessing) {
            setDetectionState('success');
            setScannerMessage(`Barcode read successfully: ${rawValue}`);

            // Stop scanning after a delay for UX feedback
            setTimeout(() => {
              stopScanner();
              handleProductLookup(rawValue);
            }, 1000);
          }

          return newOccurrences;
        });

        // Draw bounding box if canvas exists
        if (canvasRef.current && videoRef.current) {
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');

          // Clear previous drawings
          context.clearRect(0, 0, canvas.width, canvas.height);

          // Set canvas dimensions to match video
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;

          // Draw bounding box
          const boundingBox = detectedBarcode.boundingBox;

          context.lineWidth = 4;

          if (barcodeOccurrences[rawValue] >= confidenceThreshold) {
            context.strokeStyle = '#00FF00'; // Green for confirmed barcode
          } else {
            context.strokeStyle = '#FFCC00'; // Yellow for detected but not confirmed
          }

          context.strokeRect(
            boundingBox.x,
            boundingBox.y,
            boundingBox.width,
            boundingBox.height
          );

          // Mark corner points if available
          if (detectedBarcode.cornerPoints) {
            context.fillStyle = '#FF0000';
            detectedBarcode.cornerPoints.forEach(point => {
              context.beginPath();
              context.arc(point.x, point.y, 8, 0, Math.PI * 2);
              context.fill();
            });
          }
        }
      } else {
        // No barcode detected
        if (detectionState !== 'success') {
          setDetectionState('idle');
          setScannerMessage('Position barcode in the center of the camera');

          // Clear canvas
          if (canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
      }

      // Continue scanning if still active
      if (isScanning) {
        animationFrameRef.current = requestAnimationFrame(processBarcodes);
      }
    } catch (error) {
      console.error('Barcode detection error:', error);
      setScannerMessage('Error detecting barcode');

      // Continue scanning despite error
      if (isScanning) {
        animationFrameRef.current = requestAnimationFrame(processBarcodes);
      }
    }
  }, [isScanning, detectorRef, videoRef, canvasRef, barcodeOccurrences, confidenceThreshold, isProcessing, handleProductLookup]); // Added dependencies

  const startScanner = useCallback(async () => {
    if (isScanning || !isSupportedDevice) return;

    try {
      setIsScanning(true);
      setScannerMessage('Initializing camera...');

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
            .then(() => {
              setScannerMessage('Position barcode in the center of the camera');
              // Start detection loop
              animationFrameRef.current = requestAnimationFrame(processBarcodes);
            })
            .catch(error => {
              console.error('Error playing video:', error);
              stopScanner();
              toast.error('Failed to start camera preview');
            });
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setIsScanning(false);
      toast.error('Camera access denied or not available');
    }
  }, [isScanning, isSupportedDevice, processBarcodes]); // Added processBarcodes as dependency

  const stopScanner = useCallback(() => {
    if (isScanning) {
      // Stop animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Stop media tracks
      stopMediaTracks();

      setIsScanning(false);

      // Clear canvas
      if (canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, [isScanning]); // Added isScanning as dependency

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
            className={`scanner-view ${isScanning ? 'active' : ''} ${detectionState} ${isProcessing ? 'processing' : ''}`}
          >
            {!isScanning && (
              <div className="scanner-placeholder">
                <i className='bx bx-barcode placeholder-icon'></i>
                <p>Camera feed will appear here</p>
              </div>
            )}
            <video
              ref={videoRef}
              className="scanner-video"
              playsInline
              muted
            ></video>
            <canvas
              ref={canvasRef}
              className="scanner-canvas"
            ></canvas>
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