import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'api', 'library_db.json');
const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

// Check if Vercel KV is configured
const isKvConfigured = () => !!(KV_URL && KV_TOKEN);

// Read user data from KV or local JSON file
async function readUserData(email) {
  const key = `aura_user:${email}`;
  
  if (isKvConfigured()) {
    try {
      const response = await fetch(KV_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KV_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['GET', key])
      });
      
      if (response.ok) {
        const resJson = await response.json();
        if (resJson.result) {
          return JSON.parse(resJson.result);
        }
      }
    } catch (err) {
      console.error('Error reading from Vercel KV cloud:', err);
    }
  }

  // Fallback to local file database
  try {
    const content = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(content);
    return db[email] || null;
  } catch (error) {
    return null;
  }
}

// Write user data to KV or local JSON file
async function writeUserData(email, data) {
  const key = `aura_user:${email}`;

  if (isKvConfigured()) {
    try {
      const response = await fetch(KV_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KV_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['SET', key, JSON.stringify(data)])
      });
      
      if (response.ok) {
        return;
      }
    } catch (err) {
      console.error('Error writing to Vercel KV cloud:', err);
    }
  }

  // Fallback to local file database
  try {
    let db = {};
    try {
      const content = await fs.readFile(DB_PATH, 'utf-8');
      db = JSON.parse(content);
    } catch (e) {
      // Ignore read error, start with empty database
    }
    
    db[email] = data;
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to local database file:', err);
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
        data: userData
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
