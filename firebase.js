/**
 * SecureCV — Firebase Admin SDK Initialization Module
 * Supports Cloud Firestore, Firebase Authentication, and Firebase Cloud Storage.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let isInitialized = false;
let authInstance = null;
let firestoreInstance = null;
let storageInstance = null;
let isMockMode = false;

function getCert(credentials) {
  if (typeof admin.cert === 'function') {
    return admin.cert(credentials);
  }
  if (admin.credential && typeof admin.credential.cert === 'function') {
    return admin.credential.cert(credentials);
  }
  return credentials;
}

function resolveServiceInstances() {
  try {
    const { getAuth } = require('firebase-admin/auth');
    const { getFirestore } = require('firebase-admin/firestore');
    const { getStorage } = require('firebase-admin/storage');
    authInstance = getAuth();
    firestoreInstance = getFirestore();
    storageInstance = getStorage();
  } catch {
    authInstance = typeof admin.auth === 'function' ? admin.auth() : null;
    firestoreInstance = typeof admin.firestore === 'function' ? admin.firestore() : null;
    storageInstance = typeof admin.storage === 'function' ? admin.storage() : null;
  }
}

function initFirebase() {
  if (isInitialized) {
    return { admin, auth: authInstance, db: firestoreInstance, storage: storageInstance, isMockMode };
  }

  // 1. Check if Firebase Service Account JSON string is provided in .env
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      let serviceAccount;
      if (process.env.FIREBASE_SERVICE_ACCOUNT.trim().startsWith('{')) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } else {
        const filePath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT);
        if (fs.existsSync(filePath)) {
          serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
      }

      if (serviceAccount) {
        admin.initializeApp({
          credential: getCert(serviceAccount),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`
        });
        isInitialized = true;
        resolveServiceInstances();
        console.log('🔥 Firebase Admin initialized via Service Account.');
        return { admin, auth: authInstance, db: firestoreInstance, storage: storageInstance, isMockMode: false };
      }
    } catch (err) {
      console.warn('⚠️ Warning: Failed parsing FIREBASE_SERVICE_ACCOUNT:', err.message);
    }
  }

  // 2. Check for standard serviceAccountKey.json file in root
  const keyFile = path.resolve(__dirname, '..', 'serviceAccountKey.json');
  if (fs.existsSync(keyFile)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
      admin.initializeApp({
        credential: getCert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`
      });
      isInitialized = true;
      resolveServiceInstances();
      console.log('🔥 Firebase Admin initialized via local serviceAccountKey.json.');
      return { admin, auth: authInstance, db: firestoreInstance, storage: storageInstance, isMockMode: false };
    } catch (err) {
      console.warn('⚠️ Warning: Failed reading local serviceAccountKey.json:', err.message);
    }
  }

  // 3. Check if individual Firebase credentials are provided in .env
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: getCert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
      });
      isInitialized = true;
      resolveServiceInstances();
      console.log('🔥 Firebase Admin initialized via individual environment variables.');
      return { admin, auth: authInstance, db: firestoreInstance, storage: storageInstance, isMockMode: false };
    } catch (err) {
      console.warn('⚠️ Warning: Failed initializing Firebase with individual credentials:', err.message);
    }
  }

  // 4. Fallback to Local In-Memory Development / Viva Mock Mode
  console.log('⚡ Running in Offline Firestore Development Mode.');
  isMockMode = true;
  isInitialized = true;

  return { admin, auth: authInstance, db: firestoreInstance, storage: storageInstance, isMockMode };
}

const firebaseApp = initFirebase();

module.exports = {
  admin,
  auth: firebaseApp.auth,
  db: firebaseApp.db,
  storage: firebaseApp.storage,
  isMockMode: firebaseApp.isMockMode,
  initFirebase
};
