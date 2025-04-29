import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import session from 'express-session';
import axios from 'axios';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 5002;

// Express Middlewares
app.use(cors({
  origin: 'http://localhost:5173', // ✅ Allow Vite dev server origin
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

// In-memory variable to temporarily store token for this session (MVP)
let token_json = null;

// 🔹 Step 1: Generate QuickBooks Auth URL
app.get('/api/authUri', (req, res) => {
  req.session.oauthState = crypto.randomBytes(16).toString('hex');

  const authUrl = `${process.env.AUTHORIZATION_ENDPOINT}?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&scope=${process.env.SCOPES}&response_type=code&state=${req.session.oauthState}`;

  console.log('✅ Generated QuickBooks Auth URL:', authUrl);

  res.json({ authUrl });
});

// 🔹 Step 2: Handle QuickBooks OAuth Callback
app.get('/callback', async (req, res) => {
  const { code, state, realmId } = req.query;

  console.log('🔎 Received callback state:', state);
  console.log('🔎 Stored session state:', req.session.oauthState);

  if (state !== req.session.oauthState) {
    console.warn('❌ State mismatch - possible CSRF attack.');
    return res.status(401).send('State mismatch.');
  }

  try {
    const authHeader = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64');

    const response = await axios.post(
      process.env.TOKEN_ENDPOINT,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.REDIRECT_URI,
      }),
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${authHeader}`,
        },
      }
    );

    token_json = response.data;
    console.log('✅ OAuth Token JSON:', token_json);

    res.send('Authentication successful! You can close this window.');
  } catch (error) {
    console.error('❌ OAuth Token Exchange Error:', error.response?.data || error.message);
    res.status(500).send('OAuth token exchange failed.');
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
