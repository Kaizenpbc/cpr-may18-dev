# Google Cloud Vision API Setup Guide

## Overview
This guide will help you set up Google Cloud Vision API for the OCR (Optical Character Recognition) system in the CPR Training Management System.

## Prerequisites
- Google Cloud account
- Basic knowledge of Google Cloud Console
- Node.js project with the OCR service already implemented

## Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create New Project**
   - Click on the project dropdown at the top
   - Click "New Project"
   - Name: `cpr-training-ocr` (or your preferred name)
   - Click "Create"

3. **Select the Project**
   - Make sure your new project is selected in the dropdown

## Step 2: Enable Required APIs

1. **Enable Vision API**
   - Go to "APIs & Services" > "Library"
   - Search for "Cloud Vision API"
   - Click on it and click "Enable"

2. **Enable Cloud Storage API** (optional, for file storage)
   - Search for "Cloud Storage API"
   - Click on it and click "Enable"

## Step 3: Create Service Account

1. **Go to IAM & Admin**
   - Navigate to "IAM & Admin" > "Service Accounts"

2. **Create Service Account**
   - Click "Create Service Account"
   - Name: `ocr-service-account`
   - Description: `Service account for OCR functionality`
   - Click "Create and Continue"

3. **Grant Permissions**
   - Role: "Cloud Vision API User"
   - Click "Continue"
   - Click "Done"

## Step 4: Generate API Key

1. **Create Key**
   - Click on your service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON"
   - Click "Create"

2. **Download Key File**
   - The JSON file will download automatically
   - Rename it to `google-cloud-key.json`
   - Place it in the `backend/` directory

## Step 5: Configure Environment Variables

1. **Add to .env file**
   ```bash
   # Google Cloud Configuration
   GOOGLE_CLOUD_KEY_FILE=./google-cloud-key.json
   GOOGLE_CLOUD_BUCKET=cpr-invoice-ocr
   GOOGLE_APPLICATION_CREDENTIALS=./google-cloud-key.json
   ```

2. **Add to .gitignore**
   ```bash
   # Google Cloud
   google-cloud-key.json
   ```

## Step 6: Test the Setup

1. **Start the backend server**
   ```bash
   npm run dev:backend
   ```

2. **Test OCR endpoint**
   - Upload an invoice PDF through the vendor portal
   - Click "Scan Invoice" button
   - Verify that text is extracted correctly

## Step 7: Monitor Usage (Optional)

1. **Set up Billing Alerts**
   - Go to "Billing" in Google Cloud Console
   - Set up budget alerts to monitor costs

2. **View API Usage**
   - Go to "APIs & Services" > "Dashboard"
   - Monitor Vision API usage

## Cost Estimation

### Google Cloud Vision API Pricing (as of 2024):
- **First 1,000 requests/month**: FREE
- **Additional requests**: $1.50 per 1,000 requests

### For CPR Training System:
- **Estimated usage**: 100-500 invoices/month
- **Monthly cost**: $0-$0.75 (likely FREE for most months)
- **Annual cost**: $0-$9

## Troubleshooting

### Common Issues:

1. **"No credentials found"**
   - Ensure `google-cloud-key.json` is in the correct location
   - Check environment variables are set correctly

2. **"API not enabled"**
   - Verify Vision API is enabled in your project
   - Check service account has correct permissions

3. **"Quota exceeded"**
   - Check your billing is set up
   - Monitor usage in Google Cloud Console

4. **"Invalid key file"**
   - Regenerate the service account key
   - Ensure the JSON file is not corrupted

### Debug Commands:

```bash
# Test Google Cloud credentials
node -e "
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient({
  keyFilename: './google-cloud-key.json'
});
console.log('✅ Google Cloud Vision client initialized successfully');
"

# Check environment variables
node -e "
console.log('GOOGLE_CLOUD_KEY_FILE:', process.env.GOOGLE_CLOUD_KEY_FILE);
console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
"
```

## Security Best Practices

1. **Never commit API keys to version control**
   - Keep `google-cloud-key.json` in `.gitignore`
   - Use environment variables in production

2. **Limit service account permissions**
   - Only grant necessary roles
   - Use principle of least privilege

3. **Monitor usage regularly**
   - Set up billing alerts
   - Review API usage monthly

4. **Rotate keys periodically**
   - Regenerate service account keys every 6-12 months
   - Update environment variables accordingly

## Production Deployment

### For Production Environment:

1. **Use environment variables instead of key file**
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
   ```

2. **Set up proper logging**
   - Monitor OCR success/failure rates
   - Log API usage for cost tracking

3. **Implement rate limiting**
   - Limit OCR requests per user
   - Add request queuing for high volume

4. **Add error handling**
   - Graceful fallback to manual entry
   - User-friendly error messages

## Support

If you encounter issues:
1. Check Google Cloud Console for error details
2. Review the troubleshooting section above
3. Check Google Cloud Vision API documentation
4. Contact the development team for assistance

---

**Note**: This setup provides a robust OCR solution that can handle various invoice formats while maintaining cost-effectiveness for the CPR Training Management System. 