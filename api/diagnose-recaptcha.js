export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ status: 'error', message: 'reCAPTCHA token is required.' });
    }

    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY || '6LdyIQ8tAAAAAP1Cz8k4OW0-LD1o6fmKTggDG7-E';
    const siteverifyUrl = 'https://www.google.com/recaptcha/api/siteverify';

    const recaptchaResponse = await fetch(siteverifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: recaptchaSecret,
        response: token
      }).toString()
    });

    const recaptchaData = await recaptchaResponse.json();
    
    return res.status(200).json({
      status: 'success',
      recaptchaData,
      environmentVariables: {
        hasSecretKeyEnv: !!process.env.RECAPTCHA_SECRET_KEY,
        secretKeyEndsWith: recaptchaSecret ? `${recaptchaSecret.slice(0, 4)}...${recaptchaSecret.slice(-4)}` : 'none'
      }
    });

  } catch (error) {
    console.error('reCAPTCHA diagnosis error:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: error.message || 'Internal Server Error' 
    });
  }
}
