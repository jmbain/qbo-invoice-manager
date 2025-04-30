import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import session from 'express-session';
import axios from 'axios';
import crypto from 'crypto';
import path from 'path';
import { fetchCustomersFromQBO, fetchItemsFromQBO, fetchTaxCodes, fetchTaxRates } from './utils/qboApi.js';
import request from 'request';

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
app.get('/callback', (req, res) => {
    const { code, state, realmId } = req.query;
  
    console.log('🔎 Received state:', state);
    console.log('🧠 Session state:', req.session.oauthState);
    console.log('🏢 Realm ID:', realmId);
  
    if (state !== req.session.oauthState) {
      console.warn("❌ OAuth state mismatch or missing session.");
      return res.status(401).send("State mismatch — possible CSRF or session loss.");
    }
  
    const auth = Buffer.from(`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`).toString('base64');
    const postBody = {
      url: process.env.TOKEN_ENDPOINT,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      form: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.REDIRECT_URI
      }
    };
  
    request.post(postBody, (err, response) => {
      if (err) {
        console.error('OAuth Callback Error:', err);
        return res.status(500).send('Authentication failed');
      }
  
      const token_json = JSON.parse(response.body);
      console.log('✅ OAuth Tokens:', token_json);
  
      // Fire-and-forget QBO data fetches
      fetchCustomersFromQBO(token_json, realmId);
      fetchItemsFromQBO(token_json, realmId);
      fetchTaxCodes(token_json, realmId);
      fetchTaxRates(token_json, realmId);
  
      // Redirect to frontend right away
      res.redirect('http://localhost:5173');
    });
  });

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
