# AI-Powered Features Documentation

This document explains the AI-powered features in SupaShop and how to set them up.

## Overview

SupaShop uses **Google Gemini AI** to provide intelligent business insights:

1. **Sales Predictions** - Forecasts and trend analysis based on historical data
2. **Business Summaries** - Daily and monthly AI-generated summaries
3. **Inventory Management** - Smart restocking suggestions based on sales patterns

## Setup Instructions

### 1. Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Configure Environment Variable

Add your Gemini API key to your `.env` file:

```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

### 3. Install Dependencies

The required package is already included in `package.json`:

```bash
npm install
```

## Features

### 📈 Sales Predictions

**Endpoint:** `GET /api/ai/predictions`

**What it does:**
- Analyzes last 30 days of sales data
- Predicts sales trends for the next week
- Provides actionable business recommendations

**Caching:** Results cached for 2 hours to reduce API costs

**Example Response:**
```json
{
  "predictions": "Based on current trends, expect moderate sales next week...",
  "trends": "Sales show strong weekend performance with 40% increase...",
  "recommendations": [
    "Stock up on fast-moving items before weekend",
    "Consider promotional offers on slow-moving products",
    "Monitor inventory levels for top 5 products"
  ]
}
```

### 📊 Business Summary

**Endpoint:** `GET /api/ai/summary?period=daily|monthly`

**What it does:**
- Generates executive summary of business performance
- Highlights key achievements and metrics
- Provides strategic insights

**Caching:**
- Daily summaries: 6 hours
- Monthly summaries: 24 hours

**Example Response:**
```json
{
  "summary": "Today showed strong performance with 15 sales totaling ₦45,000...",
  "highlights": [
    "Revenue increased 20% compared to yesterday",
    "Average transaction value: ₦3,000",
    "Peak sales period: 2PM - 4PM"
  ],
  "insights": "Customer activity is concentrated in afternoon hours. Consider staff scheduling optimization..."
}
```

### 📦 Inventory Restocking

**Endpoint:** `GET /api/ai/restocking`

**What it does:**
- Calculates sales velocity for each product
- Identifies products running low on stock
- Suggests restocking priorities based on demand patterns

**Caching:** Results cached for 4 hours

**Example Response:**
```json
{
  "urgentRestocks": [
    {
      "productName": "Product A",
      "currentStock": 5,
      "reason": "Stock will run out in 3 days at current sales rate"
    }
  ],
  "recommendations": [
    "Restock high-velocity items within 48 hours",
    "Monitor seasonal demand patterns",
    "Consider bulk ordering for frequently sold items"
  ],
  "insights": "Fast-moving products show consistent demand. Slow-moving items may need promotional pricing..."
}
```

## Cost Optimization

To minimize API costs, we implement several strategies:

### 1. Intelligent Caching

```typescript
// Cache durations
Sales Predictions: 2 hours
Daily Summary: 6 hours
Monthly Summary: 24 hours
Inventory Suggestions: 4 hours
```

### 2. Efficient Data Sampling

- Sales predictions use 30-day rolling window
- Summaries only fetch relevant period data
- Inventory analysis focuses on actionable insights

### 3. Model Selection

Using **Gemini 1.5 Flash** for optimal balance:
- ✅ Fast response times
- ✅ Cost-effective
- ✅ Excellent for structured data analysis
- ✅ JSON output support

## API Usage Examples

### Frontend (React)

```typescript
import { api } from '@/lib/api';

// Get sales predictions
const predictions = await api.ai.getSalesPredictions();

// Get daily summary
const summary = await api.ai.getBusinessSummary('daily');

// Get restocking suggestions
const restocking = await api.ai.getRestockingSuggestions();
```

### Backend (Express)

```typescript
import {
  generateSalesPredictions,
  generateBusinessSummary,
  generateRestockingSuggestions
} from './services/ai.service';

const predictions = await generateSalesPredictions(shopId);
const summary = await generateBusinessSummary(shopId, 'daily');
const restocking = await generateRestockingSuggestions(shopId);
```

## Components

The following React components are available:

1. **AISalesPredictions** - Displays predictions and trends
2. **AIBusinessSummary** - Shows daily/monthly summaries
3. **AIRestockingAlert** - Alerts for low stock items

All components include:
- Loading states
- Error handling
- Automatic caching
- Refresh functionality

## Pricing Considerations

### Gemini 1.5 Flash Pricing (as of 2024)

- **Free tier:** 15 requests per minute
- **Input:** $0.075 per 1M tokens
- **Output:** $0.30 per 1M tokens

### Estimated Monthly Costs

With our caching strategy:

| Scenario | Shops | Daily Requests | Est. Monthly Cost |
|----------|-------|----------------|-------------------|
| Small    | 1-10  | ~50           | **FREE**          |
| Medium   | 10-50 | ~250          | ~$5-10            |
| Large    | 50+   | 1000+         | ~$20-50           |

**Note:** Actual costs may vary based on data volume and usage patterns.

## Troubleshooting

### "Failed to generate predictions"

**Possible causes:**
1. Missing or invalid `GEMINI_API_KEY`
2. API quota exceeded
3. Network connectivity issues

**Solution:**
- Verify API key in `.env` file
- Check Gemini API quota in Google AI Studio
- Review backend logs for detailed error messages

### Empty or "Not enough data" responses

**Cause:** Insufficient historical data

**Solution:**
- Ensure sales are being recorded
- Wait for at least 7 days of sales data
- AI predictions improve with more historical data

### Cache not updating

**Cause:** In-memory cache persists until server restart

**Solution:**
- Restart the backend server to clear cache
- For production, consider Redis for distributed caching

## Future Enhancements

Potential improvements:

- [ ] Customer behavior analysis
- [ ] Demand forecasting by category
- [ ] Automated order suggestions
- [ ] Anomaly detection for fraud prevention
- [ ] Personalized product recommendations
- [ ] Seasonal trend predictions

## Support

For issues or questions:
- Check backend logs for detailed error messages
- Review the [Gemini API documentation](https://ai.google.dev/docs)
- Ensure proper authentication and shop context

---

**Last Updated:** November 2025
