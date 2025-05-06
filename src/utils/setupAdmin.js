import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * Sets up the admin user in Firestore if it doesn't already exist
 * This function should be called once during application initialization
 * 
 * @returns {Promise<string|null>} The admin document ID or null if admin already exists
 */
const setupAdmin = async () => {
  try {
    // Get admin credentials from environment variables
    const adminUsername = process.env.REACT_APP_ADMIN_USERNAME;
    const adminPasswordHash = process.env.REACT_APP_ADMIN_PASSWORD_HASH;
    
    if (!adminUsername || !adminPasswordHash) {
      console.error("Admin credentials not found in environment variables");
      return null;
    }
    
    console.log("Checking if admin already exists...");
    
    // Check if admin already exists
    const adminsRef = collection(db, "admins");
    const q = query(adminsRef, where("username", "==", adminUsername));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      console.log("Admin already exists, skipping setup");
      return null;
    }
    
    // Add admin if it doesn't exist
    const adminRef = await addDoc(collection(db, "admins"), {
      username: adminUsername,
      passwordHash: adminPasswordHash,
      role: "admin",
      createdAt: new Date()
    });
    
    console.log("Admin added successfully with ID:", adminRef.id);
    return adminRef.id;
  } catch (error) {
    console.error("Error setting up admin:", error);
    throw error;
  }
};

/**
 * Export the setup function for use in the application
 */
export default setupAdmin;