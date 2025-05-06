import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import md5 from 'md5';
import { 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../../config/firebase';

// Initial state
const initialState = {
  isAuthenticated: false,
  adminUser: null,
  loading: true,
  error: null,
};

// Check if admin is already authenticated (from localStorage)
export const checkAdminAuth = createAsyncThunk(
  'auth/checkAdminAuth',
  async (_, { rejectWithValue }) => {
    try {
      const adminAuth = localStorage.getItem('adminAuth');
      
      if (adminAuth) {
        const authData = JSON.parse(adminAuth);
        
        // Verify that the stored admin still exists in Firestore
        const adminsRef = collection(db, "admins");
        const q = query(adminsRef, where("username", "==", authData.username));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          // Admin no longer exists in Firestore
          localStorage.removeItem('adminAuth');
          return null;
        }
        
        return { 
          username: authData.username, 
          isAdmin: true,
          id: authData.id
        };
      }
      
      return null;
    } catch (error) {
      console.error("Auth check error:", error);
      return rejectWithValue('Failed to check authentication');
    }
  }
);

// Login admin
export const loginAdmin = createAsyncThunk(
  'auth/loginAdmin',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      // Simple validation
      if (!username || !password) {
        return rejectWithValue('Username and password are required');
      }
      
      // Check credentials against Firestore
      const adminsRef = collection(db, "admins");
      const q = query(adminsRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return rejectWithValue('Invalid credentials');
      }
      
      const adminDoc = querySnapshot.docs[0];
      const adminData = adminDoc.data();
      
      // Compare password hash
      if (md5(password) === adminData.passwordHash) {
        // Store in localStorage
        localStorage.setItem('adminAuth', JSON.stringify({ 
          username,
          isAdmin: true,
          id: adminDoc.id,
          timestamp: new Date().toISOString() 
        }));
        
        return { 
          username, 
          isAdmin: true,
          id: adminDoc.id
        };
      }
      
      return rejectWithValue('Invalid credentials');
    } catch (error) {
      console.error("Login error:", error);
      return rejectWithValue('Login failed');
    }
  }
);

// Logout admin
export const logoutAdmin = createAsyncThunk(
  'auth/logoutAdmin',
  async (_, { rejectWithValue }) => {
    try {
      localStorage.removeItem('adminAuth');
      return null;
    } catch (error) {
      console.error("Logout error:", error);
      return rejectWithValue('Logout failed');
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Check auth
      .addCase(checkAdminAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAdminAuth.fulfilled, (state, action) => {
        state.isAuthenticated = !!action.payload;
        state.adminUser = action.payload;
        state.loading = false;
      })
      .addCase(checkAdminAuth.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.adminUser = null;
        state.loading = false;
        state.error = action.payload;
      })
      
      // Login
      .addCase(loginAdmin.pending, (state) => {
        state.loading = true;
      })
      .addCase(loginAdmin.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.adminUser = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.isAuthenticated = false;
        state.adminUser = null;
        state.loading = false;
        state.error = action.payload;
      })
      
      // Logout
      .addCase(logoutAdmin.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.adminUser = null;
        state.error = null;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;