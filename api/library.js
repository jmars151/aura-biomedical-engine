import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'api', 'library_db.json');

// Helper to read database
async function readDb() {
  try {
    const content = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // If file does not exist, return empty database object
    return {};
  }
}

// Helper to write database
async function writeDb(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
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

      const db = await readDb();
      const userData = db[email] || null;

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

      const db = await readDb();
      db[email] = {
        libraryItems: libraryItems || [],
        glassmorphismIntensity: glassmorphismIntensity ?? 80,
        darkMode: darkMode ?? true,
        pendingAnalyses: pendingAnalyses || [],
        notifications: notifications || [],
        updatedAt: new Date().toISOString()
      };

      await writeDb(db);

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
