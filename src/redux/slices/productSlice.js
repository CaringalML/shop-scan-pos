import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { db } from '../../config/firebase';

// Initial state
const initialState = {
  products: [],
  currentProduct: null,
  loading: false,
  error: null,
};

// Fetch all products
export const fetchProducts = createAsyncThunk(
  'product/fetchProducts',
  async (_, { rejectWithValue }) => {
    try {
      const productsCollection = collection(db, 'products');
      const productsSnapshot = await getDocs(productsCollection);
      
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      return productsData;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Create a product
export const createProduct = createAsyncThunk(
  'product/createProduct',
  async (productData, { rejectWithValue }) => {
    try {
      const productsCollection = collection(db, 'products');
      
      // Check if barcode already exists
      if (productData.barcode) {
        const q = query(productsCollection, where('barcode', '==', productData.barcode));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          return rejectWithValue('Product with this barcode already exists');
        }
      }
      
      const newProductRef = await addDoc(productsCollection, {
        ...productData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      const newProductSnapshot = await getDoc(newProductRef);
      
      return {
        id: newProductSnapshot.id,
        ...newProductSnapshot.data(),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Update a product
export const updateProduct = createAsyncThunk(
  'product/updateProduct',
  async ({ id, productData }, { rejectWithValue }) => {
    try {
      const productRef = doc(db, 'products', id);
      
      // Check if barcode is being changed and if it already exists
      if (productData.barcode) {
        const q = query(
          collection(db, 'products'), 
          where('barcode', '==', productData.barcode)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty && querySnapshot.docs[0].id !== id) {
          return rejectWithValue('Another product with this barcode already exists');
        }
      }
      
      await updateDoc(productRef, {
        ...productData,
        updatedAt: new Date().toISOString(),
      });
      
      const updatedProductSnapshot = await getDoc(productRef);
      
      return {
        id: updatedProductSnapshot.id,
        ...updatedProductSnapshot.data(),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Delete a product
export const deleteProduct = createAsyncThunk(
  'product/deleteProduct',
  async (id, { rejectWithValue }) => {
    try {
      const productRef = doc(db, 'products', id);
      await deleteDoc(productRef);
      
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Get product by barcode
export const getProductByBarcode = createAsyncThunk(
  'product/getProductByBarcode',
  async (barcode, { rejectWithValue }) => {
    try {
      const productsCollection = collection(db, 'products');
      const q = query(productsCollection, where('barcode', '==', barcode));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return rejectWithValue('Product not found');
      }
      
      const productDoc = querySnapshot.docs[0];
      
      return {
        id: productDoc.id,
        ...productDoc.data(),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Product slice
const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    clearProductError: (state) => {
      state.error = null;
    },
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all products
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.products = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create a product
      .addCase(createProduct.pending, (state) => {
        state.loading = true;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.products.push(action.payload);
        state.loading = false;
        state.error = null;
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update a product
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        const index = state.products.findIndex(product => product.id === action.payload.id);
        if (index !== -1) {
          state.products[index] = action.payload;
        }
        state.loading = false;
        state.error = null;
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete a product
      .addCase(deleteProduct.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.products = state.products.filter(product => product.id !== action.payload);
        state.loading = false;
        state.error = null;
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Get product by barcode
      .addCase(getProductByBarcode.pending, (state) => {
        state.loading = true;
      })
      .addCase(getProductByBarcode.fulfilled, (state, action) => {
        state.currentProduct = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(getProductByBarcode.rejected, (state, action) => {
        state.currentProduct = null;
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearProductError, clearCurrentProduct } = productSlice.actions;
export default productSlice.reducer;