import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  try {
    const { name, email, category, subject, message, gRecaptchaResponse } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ status: 'error', message: 'Please fill in all required fields.' });
    }

    if (!gRecaptchaResponse) {
      return res.status(400).json({ status: 'error', message: 'reCAPTCHA verification is required.' });
    }

    // 1. Verify reCAPTCHA token using siteverify API
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY || '6LdyIQ8tAAAAAP1Cz8k4OW0-LD1o6fmKTggDG7-E';
    const siteverifyUrl = 'https://www.google.com/recaptcha/api/siteverify';

    const recaptchaResponse = await fetch(siteverifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: recaptchaSecret,
        response: gRecaptchaResponse
      }).toString()
    });

    const recaptchaData = await recaptchaResponse.json();
    const success = !!recaptchaData.success;

    // Handle verification checks
    if (!success) {
      console.warn('reCAPTCHA failed:', recaptchaData);
      return res.status(400).json({ 
        status: 'error', 
        message: 'Google reCAPTCHA verification failed. Please try again.' 
      });
    }

    // Only validate score and action if they are returned by Google (v3 specific)
    if (recaptchaData.score !== undefined && parseFloat(recaptchaData.score) < 0.5) {
      console.warn('reCAPTCHA low score:', recaptchaData);
      return res.status(400).json({ 
        status: 'error', 
        message: 'reCAPTCHA flagged request as potential spam. Please try again.' 
      });
    }

    if (recaptchaData.action !== undefined && recaptchaData.action !== 'submit') {
      console.warn('reCAPTCHA action mismatch:', recaptchaData);
      return res.status(400).json({ 
        status: 'error', 
        message: 'reCAPTCHA verification failed due to action mismatch.' 
      });
    }

    // 2. Setup NodeMailer transporter for Gmail
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;
    const toEmail = process.env.TO_EMAIL || 'lab@redplanetapps.com';

    if (!gmailUser || !gmailPass) {
      // Fallback for local testing if env variables are not yet configured in local development
      console.warn('GMAIL_USER and GMAIL_PASS environment variables are not configured.');
      return res.status(200).json({
        status: 'success',
        message: 'Form verified successfully! (Note: Email was not sent because Gmail environment variables are not configured yet).'
      });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });

    const mailOptions = {
      from: `"AURA Support Engine" <${gmailUser}>`,
      to: toEmail,
      replyTo: `"${name}" <${email}>`,
      subject: `[AURA Support] ${subject || `${category.toUpperCase()} Inquiry`}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; padding: 20px; border: 1px solid #dddddd; border-radius: 8px; max-width: 600px;">
          <div style="background: #8b5cf6; color: #ffffff; padding: 12px 20px; border-radius: 6px 6px 0 0; font-size: 18px; font-weight: bold;">AURA Biomedical Intelligence Support</div>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eeeeee; font-weight: bold; width: 120px; color: #666666;">Sender Name:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eeeeee;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eeeeee; font-weight: bold; width: 120px; color: #666666;">Sender Email:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eeeeee;"><a href="mailto:${email}">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eeeeee; font-weight: bold; width: 120px; color: #666666;">Category:</td>
              <td style="padding: 8px; border-bottom: 1px solid #eeeeee;">${category.charAt(0).toUpperCase() + category.slice(1)}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eeeeee; font-weight: bold; width: 120px; color: #666666;">Time (UTC):</td>
              <td style="padding: 8px; border-bottom: 1px solid #eeeeee;">${new Date().toUTCString()}</td>
            </tr>
          </table>
          
          <h3>Message details:</h3>
          <div style="padding: 15px; background: #f9f9f9; border-left: 4px solid #8b5cf6; border-radius: 4px; font-style: italic; white-space: pre-wrap;">${message}</div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ 
      status: 'success', 
      message: 'Your message has been sent successfully.' 
    });

  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: error.message || 'Internal Server Error' 
    });
  }
}
