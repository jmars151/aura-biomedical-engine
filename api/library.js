import { list, put } from '@vercel/blob';
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'api', 'library_db.json');
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

// Check if Vercel Blob is configured (either via static token or native Vercel OIDC)
const isBlobConfigured = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

// Read user data from Vercel Blob or local JSON file
async function readUserData(email) {
  // Safe filename replacing special characters
  const filename = `aura_user_${email.replace(/[^a-zA-Z0-9_.-]/g, '_')}.json`;
  
  if (isBlobConfigured()) {
    try {
      const options = {};
      if (BLOB_TOKEN) {
        options.token = BLOB_TOKEN;
      }
      
      const { blobs } = await list({
        prefix: filename,
        ...options
      });
      
      if (blobs && blobs.length > 0) {
        // Match exact pathname
        const exactBlob = blobs.find(b => b.pathname === filename);
        if (exactBlob) {
          const response = await fetch(exactBlob.url);
          if (response.ok) {
            return await response.json();
          }
        }
      }
      return null;
    } catch (err) {
      console.error('Error reading from Vercel Blob cloud:', err);
      throw err;
    }
  }

  // Fallback to local file database
  try {
    const content = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(content);
    return db[email] || null;
  } catch {
    return null;
  }
}

// Write user data to Vercel Blob or local JSON file
async function writeUserData(email, data) {
  const filename = `aura_user_${email.replace(/[^a-zA-Z0-9_.-]/g, '_')}.json`;

  if (isBlobConfigured()) {
    try {
      const options = {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true
      };
      if (BLOB_TOKEN) {
        options.token = BLOB_TOKEN;
      }
      
      await put(filename, JSON.stringify(data), options);
      return;
    } catch (err) {
      console.error('Error writing to Vercel Blob cloud:', err);
      throw err;
    }
  }

  // Fallback to local file database
  try {
    let db = {};
    try {
      const content = await fs.readFile(DB_PATH, 'utf-8');
      db = JSON.parse(content);
    } catch {
      // Ignore read error, start with empty database
    }
    
    db[email] = data;
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to local database file:', err);
    throw err;
  }
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ status: 'error', message: 'Email query parameter is required' });
      }

      const userData = await readUserData(email);

      return res.status(200).json({
        status: 'success',
        data: userData,
        diagnostics: {
          isBlobConfigured: isBlobConfigured(),
          tokenPresent: !!process.env.BLOB_READ_WRITE_TOKEN,
          storeIdPresent: !!process.env.BLOB_STORE_ID,
          nodeVersion: process.version
        }
      });
    }

    if (req.method === 'POST') {
      const { email, libraryItems, glassmorphismIntensity, darkMode, pendingAnalyses, notifications } = req.body;
      if (!email) {
        return res.status(400).json({ status: 'error', message: 'Email body parameter is required' });
      }

      const userData = {
        libraryItems: libraryItems || [],
        glassmorphismIntensity: glassmorphismIntensity ?? 80,
        darkMode: darkMode ?? true,
        pendingAnalyses: pendingAnalyses || [],
        notifications: notifications || [],
        updatedAt: new Date().toISOString()
      };

      await writeUserData(email, userData);

      return res.status(200).json({
        status: 'success',
        message: 'User settings saved successfully'
      });
    }

    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  } catch (error) {
    console.error('Error in library API handler:', error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
  }
}
