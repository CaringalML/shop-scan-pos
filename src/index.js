import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'barcode-detector';

import App from './App';
import { store } from './redux/store';
import './styles/global.css';
import setupAdmin from './utils/setupAdmin';

// Initialize admin during application startup
setupAdmin()
  .then((adminId) => {
    if (adminId) {
      console.log("Admin setup complete with ID:", adminId);
    }
  })
  .catch((error) => {
    console.error("Admin setup failed:", error);
  });

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <ToastContainer 
          position="top-center"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss={false}
          draggable
          pauseOnHover={false}
          limit={1} // Only display one toast at a time
          theme="colored"
        />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);