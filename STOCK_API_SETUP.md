# Stock API Setup Guide

## 🚀 Quick Setup (5 minutes)

### 1. Alpha Vantage (Primary - Most Reliable)

1. Go to: https://www.alphavantage.co/support/#api-key
2. Enter your email address
3. Click "Get Free API Key"
4. Check your email for the API key
5. Copy the API key

### 2. IEX Cloud (Backup)

1. Go to: https://iexcloud.io/pricing/
2. Click "Start Free"
3. Sign up with email
4. Get your API key from dashboard

### 3. Financial Modeling Prep (Additional Data)

1. Go to: https://financialmodelingprep.com/developer/docs
2. Click "Get Free API Key"
3. Sign up with email
4. Copy your API key

## 🔧 Add to Environment Variables

Add these lines to your `.env.local` file:

```bash
# Stock Data API Keys
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
IEX_CLOUD_API_KEY=your_iex_cloud_key_here
FINANCIAL_MODELING_PREP_API_KEY=your_fmp_key_here
```

## 📊 Free Tier Limits

| Service                 | Free Tier            | Best For            |
| ----------------------- | -------------------- | ------------------- |
| Alpha Vantage           | 5 calls/min, 500/day | Primary data source |
| IEX Cloud               | 100 requests/day     | Backup data         |
| Financial Modeling Prep | 250 requests/day     | Additional metrics  |

## ✅ Test Your Setup

1. Add at least the Alpha Vantage key to `.env.local`
2. Restart your development server: `npm run dev`
3. Go to the Day Trader module
4. Enter a stock symbol (e.g., "AAPL")
5. Click "Generate Educational Pattern Analysis"
6. You should see real stock data!

## 🎯 Why This Setup?

- **Multiple fallbacks**: If one API fails, others will work
- **Real-time data**: Get actual current prices and market data
- **Free to start**: All services have generous free tiers
- **Easy to upgrade**: Can add paid plans if you need more calls

## 🚨 Important Notes

- Keep your API keys secure (never commit them to git)
- Free tiers are perfect for development and testing
- You can always upgrade to paid plans for production use
- The system will work even with just one API key

## 🔄 After Adding Keys

1. Save your `.env.local` file
2. Restart the development server
3. Test with a real stock symbol
4. Enjoy real-time stock analysis!
