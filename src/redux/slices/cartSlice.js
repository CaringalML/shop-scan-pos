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
  carts: [],
  currentCart: null,
  currentCartItems: [],
  loading: false,
  error: null,
};

// Fetch all carts (admin)
export const fetchCarts = createAsyncThunk(
  'cart/fetchCarts',
  async (_, { rejectWithValue }) => {
    try {
      const cartsCollection = collection(db, 'carts');
      const cartsSnapshot = await getDocs(cartsCollection);
      
      const cartsData = cartsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      return cartsData;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Create a new cart (admin)
export const createCart = createAsyncThunk(
  'cart/createCart',
  async (cartData, { rejectWithValue }) => {
    try {
      const cartsCollection = collection(db, 'carts');
      
      // Check if cartId already exists
      const q = query(cartsCollection, where('cartId', '==', cartData.cartId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return rejectWithValue('Cart ID already exists');
      }
      
      const newCartRef = await addDoc(cartsCollection, {
        ...cartData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        active: true,
      });
      
      const newCartSnapshot = await getDoc(newCartRef);
      
      return {
        id: newCartSnapshot.id,
        ...newCartSnapshot.data(),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Update a cart (admin)
export const updateCart = createAsyncThunk(
  'cart/updateCart',
  async ({ id, cartData }, { rejectWithValue }) => {
    try {
      const cartRef = doc(db, 'carts', id);
      
      await updateDoc(cartRef, {
        ...cartData,
        updatedAt: new Date().toISOString(),
      });
      
      const updatedCartSnapshot = await getDoc(cartRef);
      
      return {
        id: updatedCartSnapshot.id,
        ...updatedCartSnapshot.data(),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Delete a cart (admin)
export const deleteCart = createAsyncThunk(
  'cart/deleteCart',
  async (id, { rejectWithValue }) => {
    try {
      const cartRef = doc(db, 'carts', id);
      await deleteDoc(cartRef);
      
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Find cart by cartId (user)
export const findCartByCartId = createAsyncThunk(
  'cart/findCartByCartId',
  async (cartId, { rejectWithValue }) => {
    try {
      const cartsCollection = collection(db, 'carts');
      const q = query(cartsCollection, where('cartId', '==', cartId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return rejectWithValue('Cart not found');
      }
      
      const cartDoc = querySnapshot.docs[0];
      return {
        id: cartDoc.id,
        ...cartDoc.data(),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch cart items
export const fetchCartItems = createAsyncThunk(
  'cart/fetchCartItems',
  async (cartId, { rejectWithValue }) => {
    try {
      const cartsCollection = collection(db, 'carts');
      const q = query(cartsCollection, where('cartId', '==', cartId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return rejectWithValue('Cart not found');
      }
      
      const cartDoc = querySnapshot.docs[0];
      const cartItemsCollection = collection(db, 'carts', cartDoc.id, 'items');
      const cartItemsSnapshot = await getDocs(cartItemsCollection);
      
      const cartItems = cartItemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      return cartItems;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Add item to cart
export const addItemToCart = createAsyncThunk(
  'cart/addItemToCart',
  async ({ cartId, itemData }, { rejectWithValue, getState }) => {
    try {
      const cartsCollection = collection(db, 'carts');
      const q = query(cartsCollection, where('cartId', '==', cartId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return rejectWithValue('Cart not found');
      }
      
      const cartDoc = querySnapshot.docs[0];
      const cartItemsCollection = collection(db, 'carts', cartDoc.id, 'items');
      
      // Check if product already exists in cart
      const itemsQuery = query(cartItemsCollection, where('productId', '==', itemData.productId));
      const itemsSnapshot = await getDocs(itemsQuery);
      
      if (!itemsSnapshot.empty) {
        // Update quantity if product already exists
        const existingItem = itemsSnapshot.docs[0];
        const existingData = existingItem.data();
        
        const updatedItemRef = doc(db, 'carts', cartDoc.id, 'items', existingItem.id);
        await updateDoc(updatedItemRef, {
          quantity: existingData.quantity + itemData.quantity,
          updatedAt: new Date().toISOString(),
        });
        
        const updatedItemSnapshot = await getDoc(updatedItemRef);
        
        return {
          id: updatedItemSnapshot.id,
          ...updatedItemSnapshot.data(),
        };
      } else {
        // Add new item
        const newItemRef = await addDoc(cartItemsCollection, {
          ...itemData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        
        const newItemSnapshot = await getDoc(newItemRef);
        
        return {
          id: newItemSnapshot.id,
          ...newItemSnapshot.data(),
        };
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Update cart item
export const updateCartItem = createAsyncThunk(
  'cart/updateCartItem',
  async ({ cartId, itemId, itemData }, { rejectWithValue }) => {
    try {
      const cartsCollection = collection(db, 'carts');
      const q = query(cartsCollection, where('cartId', '==', cartId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return rejectWithValue('Cart not found');
      }
      
      const cartDoc = querySnapshot.docs[0];
      const itemRef = doc(db, 'carts', cartDoc.id, 'items', itemId);
      
      await updateDoc(itemRef, {
        ...itemData,
        updatedAt: new Date().toISOString(),
      });
      
      const updatedItemSnapshot = await getDoc(itemRef);
      
      return {
        id: updatedItemSnapshot.id,
        ...updatedItemSnapshot.data(),
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Remove item from cart
export const removeCartItem = createAsyncThunk(
  'cart/removeCartItem',
  async ({ cartId, itemId }, { rejectWithValue }) => {
    try {
      const cartsCollection = collection(db, 'carts');
      const q = query(cartsCollection, where('cartId', '==', cartId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return rejectWithValue('Cart not found');
      }
      
      const cartDoc = querySnapshot.docs[0];
      const itemRef = doc(db, 'carts', cartDoc.id, 'items', itemId);
      
      await deleteDoc(itemRef);
      
      return itemId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Cart slice
const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearCartError: (state) => {
      state.error = null;
    },
    clearCurrentCart: (state) => {
      state.currentCart = null;
      state.currentCartItems = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all carts
      .addCase(fetchCarts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCarts.fulfilled, (state, action) => {
        state.carts = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchCarts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create a cart
      .addCase(createCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(createCart.fulfilled, (state, action) => {
        state.carts.push(action.payload);
        state.loading = false;
        state.error = null;
      })
      .addCase(createCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update a cart
      .addCase(updateCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCart.fulfilled, (state, action) => {
        const index = state.carts.findIndex(cart => cart.id === action.payload.id);
        if (index !== -1) {
          state.carts[index] = action.payload;
        }
        state.loading = false;
        state.error = null;
      })
      .addCase(updateCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete a cart
      .addCase(deleteCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteCart.fulfilled, (state, action) => {
        state.carts = state.carts.filter(cart => cart.id !== action.payload);
        state.loading = false;
        state.error = null;
      })
      .addCase(deleteCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Find cart by cartId
      .addCase(findCartByCartId.pending, (state) => {
        state.loading = true;
      })
      .addCase(findCartByCartId.fulfilled, (state, action) => {
        state.currentCart = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(findCartByCartId.rejected, (state, action) => {
        state.currentCart = null;
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch cart items
      .addCase(fetchCartItems.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCartItems.fulfilled, (state, action) => {
        state.currentCartItems = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchCartItems.rejected, (state, action) => {
        state.currentCartItems = [];
        state.loading = false;
        state.error = action.payload;
      })
      
      // Add item to cart
      .addCase(addItemToCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(addItemToCart.fulfilled, (state, action) => {
        const existingIndex = state.currentCartItems.findIndex(
          item => item.id === action.payload.id
        );
        
        if (existingIndex !== -1) {
          state.currentCartItems[existingIndex] = action.payload;
        } else {
          state.currentCartItems.push(action.payload);
        }
        
        state.loading = false;
        state.error = null;
      })
      .addCase(addItemToCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update cart item
      .addCase(updateCartItem.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        const index = state.currentCartItems.findIndex(
          item => item.id === action.payload.id
        );
        
        if (index !== -1) {
          state.currentCartItems[index] = action.payload;
        }
        
        state.loading = false;
        state.error = null;
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Remove item from cart
      .addCase(removeCartItem.pending, (state) => {
        state.loading = true;
      })
      .addCase(removeCartItem.fulfilled, (state, action) => {
        state.currentCartItems = state.currentCartItems.filter(
          item => item.id !== action.payload
        );
        state.loading = false;
        state.error = null;
      })
      .addCase(removeCartItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

// Export actions
export const { clearCartError, clearCurrentCart } = cartSlice.actions;

// Export reducer
export default cartSlice.reducer;