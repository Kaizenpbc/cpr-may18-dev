import express from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { pool } from '../../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ocrService } from '../../services/ocrService.js';
import { vendorDetectionService } from '../../services/vendorDetectionService.js';
import pdfGenerationService from '../../services/pdfGenerationService.js';

const router = express.Router();

// Get all vendors for dropdown selection
router.get('/vendors', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name as vendor_name, vendor_type FROM vendors WHERE is_active = true ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/vendor-invoices';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'invoice-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'text/html') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and HTML files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get vendor profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // Get user email from database using user ID
    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userEmail = userResult.rows[0].email;
    
    const result = await pool.query(
      'SELECT * FROM vendors WHERE contact_email = $1',
      [userEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching vendor profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update vendor profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const {
      vendor_name,
      contact_first_name,
      contact_last_name,
      phone,
      address_street,
      address_city,
      address_province,
      address_postal_code,
      vendor_type
    } = req.body;

    // Get user email from database using user ID
    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userEmail = userResult.rows[0].email;

    const result = await pool.query(
      'SELECT id FROM vendors WHERE contact_email = $1',
      [userEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    await pool.query(
      `UPDATE vendors 
       SET vendor_name = $1, 
           contact_first_name = $2, 
           contact_last_name = $3,
           phone = $4,
           address_street = $5,
           address_city = $6,
           address_province = $7,
           address_postal_code = $8,
           vendor_type = $9,
           updated_at = NOW()
       WHERE contact_email = $10`,
      [
        vendor_name,
        contact_first_name,
        contact_last_name,
        phone,
        address_street,
        address_city,
        address_province,
        address_postal_code,
        vendor_type,
        userEmail
      ]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating vendor profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get vendor dashboard stats
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    console.log('[VENDOR DEBUG] User object:', req.user);
    
    // Get user email from database using user ID
    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      console.log('[VENDOR DEBUG] User not found in database');
      return res.status(404).json({ error: 'User not found' });
    }

    const userEmail = userResult.rows[0].email;
    console.log('[VENDOR DEBUG] User email from database:', userEmail);
    
    const vendorResult = await pool.query(
      'SELECT id FROM vendors WHERE contact_email = $1',
      [userEmail]
    );

    console.log('[VENDOR DEBUG] Vendor query result:', vendorResult.rows);

    if (vendorResult.rows.length === 0) {
      console.log('[VENDOR DEBUG] No vendor found for email:', userEmail);
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const vendorId = vendorResult.rows[0].id;

    const [pendingResult, totalResult, paidResult, avgResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as count FROM vendor_invoices 
         WHERE vendor_id = $1 AND status IN ('submitted', 'pending_review')`,
        [vendorId]
      ),
      pool.query(
        'SELECT COUNT(*) as count FROM vendor_invoices WHERE vendor_id = $1',
        [vendorId]
      ),
      pool.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM vendor_invoices WHERE vendor_id = $1 AND status = $2',
        [vendorId, 'paid']
      ),
      pool.query(
        `SELECT COALESCE(AVG(EXTRACT(DAY FROM (payment_date - created_at))), 0) as avg_days 
         FROM vendor_invoices 
         WHERE vendor_id = $1 AND status = $2 AND payment_date IS NOT NULL`,
        [vendorId, 'paid']
      )
    ]);

    res.json({
      pendingInvoices: parseInt(pendingResult.rows[0].count) || 0,
      totalInvoices: parseInt(totalResult.rows[0].count) || 0,
      totalPaid: parseFloat(paidResult.rows[0].total) || 0,
      averagePaymentTime: Math.round(parseFloat(avgResult.rows[0].avg_days) || 0)
    });
  } catch (error) {
    console.error('Error fetching vendor dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get vendor invoices
router.get('/invoices', authenticateToken, async (req, res) => {
  try {
    // Get user email from database using user ID
    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userEmail = userResult.rows[0].email;

    const vendorResult = await pool.query(
      'SELECT id FROM vendors WHERE contact_email = $1',
      [userEmail]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const vendorId = vendorResult.rows[0].id;
    const { status, search } = req.query;

    // 🔍 PHASE 3: Show all invoices (not just those belonging to the authenticated user's vendor ID)
    // This allows GTACPR staff to see all invoices they uploaded on behalf of any vendor
    let query = `
      SELECT 
        vi.*,
        v.name as company,
        v.name as billing_company,
        COALESCE(vi.rate, 0) as rate,
        COALESCE(vi.amount, 0) as amount,
        COALESCE(vi.subtotal, vi.amount) as subtotal,
        COALESCE(vi.hst, 0) as hst,
        COALESCE(vi.total, vi.amount) as total
      FROM vendor_invoices vi
      LEFT JOIN vendors v ON vi.vendor_id = v.id
    `;
    let params = [];

    if (status) {
      query += ' AND vi.status = $2';
      params.push(status);
    }

    if (search) {
      const searchParam = params.length + 1;
      query += ` AND (vi.invoice_number ILIKE $${searchParam} OR vi.description ILIKE $${searchParam})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY vi.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching vendor invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit new invoice
router.post('/invoices', authenticateToken, upload.single('invoice_pdf'), async (req, res) => {
  try {
    const {
      invoice_number,
      amount,
      description,
      date, // Frontend sends 'date', not 'invoice_date'
      due_date,
      manual_type,
      quantity,
      detected_vendor_id // New field for vendor detection
    } = req.body;
    
    // Map 'date' to 'invoice_date' for database
    const invoice_date = date;

    if (!req.file) {
      return res.status(400).json({ error: 'Invoice PDF is required' });
    }

    // Get user email from database using user ID
    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userEmail = userResult.rows[0].email;

    // 🔍 PHASE 2: Vendor Detection Integration
    let vendor_id;
    
    if (detected_vendor_id && detected_vendor_id !== '') {
      // Use detected vendor ID if provided and valid
      console.log('🔍 [VENDOR DETECTION] Using detected vendor ID:', detected_vendor_id);
      
      const detectedVendorResult = await pool.query(
        'SELECT id FROM vendors WHERE id = $1 AND is_active = true',
        [detected_vendor_id]
      );

      if (detectedVendorResult.rows.length > 0) {
        vendor_id = detectedVendorResult.rows[0].id;
        console.log('✅ [VENDOR DETECTION] Using detected vendor ID:', vendor_id);
      } else {
        console.log('⚠️ [VENDOR DETECTION] Detected vendor ID not found, falling back to authenticated user');
        // Fall back to authenticated user's vendor ID
        const vendorResult = await pool.query(
          'SELECT id FROM vendors WHERE contact_email = $1 AND is_active = true',
          [userEmail]
        );

        if (vendorResult.rows.length === 0) {
          return res.status(400).json({ error: 'Vendor not found or inactive' });
        }
        vendor_id = vendorResult.rows[0].id;
      }
    } else {
      // Use authenticated user's vendor ID (fallback)
      console.log('🔍 [VENDOR DETECTION] No detected vendor ID, using authenticated user');
      const vendorResult = await pool.query(
        'SELECT id FROM vendors WHERE contact_email = $1 AND is_active = true',
        [userEmail]
      );

      if (vendorResult.rows.length === 0) {
        return res.status(400).json({ error: 'Vendor not found or inactive' });
      }
      vendor_id = vendorResult.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO vendor_invoices (
        vendor_id, invoice_number, amount, description, invoice_date, due_date,
        manual_type, quantity, pdf_filename, status, rate, subtotal, hst, total,
        submitted_by, submitted_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      RETURNING id`,
      [
        vendor_id, // Use authenticated user's vendor ID
        invoice_number,
        parseFloat(amount),
        description,
        invoice_date,
        due_date,
        manual_type,
        quantity ? parseInt(quantity) : null,
        req.file.filename,
        'ready_to_process', // New workflow status
        parseFloat(req.body.rate) || 0,
        parseFloat(req.body.subtotal) || parseFloat(amount),
        parseFloat(req.body.hst) || 0,
        parseFloat(req.body.total) || parseFloat(amount)
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Invoice submitted successfully',
      invoice_id: result.rows[0].id
    });
  } catch (error) {
    console.error('Error submitting invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// OCR endpoint for scanning invoices
router.post('/invoices/scan', authenticateToken, upload.single('invoice_pdf'), async (req, res) => {
  try {
    console.log('🔍 [VENDOR OCR] Starting invoice scan request');

    if (!req.file) {
      return res.status(400).json({ error: 'Invoice PDF is required' });
    }

    // Extract text from PDF or HTML
    const extractedText = await ocrService.extractTextFromFile(req.file.path);
    
    // Extract structured data from text
    const extractedData = await ocrService.extractInvoiceData(extractedText);

    // 🔍 PHASE 1: Enhanced OCR with Vendor Detection
    console.log('🔍 [VENDOR DETECTION] Starting vendor auto-detection...');
    
    // Detect vendor from extracted vendor name
    const vendorDetection = await vendorDetectionService.detectVendor(extractedData.vendorName);
    
    // Add vendor detection results to the response
    const enhancedData = {
      ...extractedData,
      vendorDetection: {
        detectedVendorId: vendorDetection.vendorId,
        detectedVendorName: vendorDetection.vendorName,
        confidence: vendorDetection.confidence,
        detectedName: vendorDetection.detectedName,
        allMatches: vendorDetection.allMatches
      }
    };

    console.log('✅ [VENDOR OCR] Invoice scan completed with vendor detection');
    console.log('📊 [VENDOR DETECTION] Results:', {
      extractedVendorName: extractedData.vendorName,
      detectedVendor: vendorDetection.vendorName,
      confidence: `${(vendorDetection.confidence * 100).toFixed(1)}%`
    });

    res.json({
      success: true,
      data: enhancedData,
      message: 'Invoice scanned successfully with vendor detection'
    });

  } catch (error) {
    console.error('❌ [VENDOR OCR] Error scanning invoice:', error);
    res.status(500).json({ 
      error: 'Failed to scan invoice',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get specific invoice
router.get('/invoices/:id', authenticateToken, async (req, res) => {
  try {
    // Get user email from database using user ID
    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userEmail = userResult.rows[0].email;

    // 🔍 PHASE 3: Allow GTACPR staff to view any invoice (not just their own vendor's invoices)
    // This allows GTACPR staff to see all invoices they uploaded on behalf of any vendor
    const result = await pool.query(`
      SELECT 
        vi.*,
        v.name as company,
        v.name as billing_company,
        COALESCE(vi.rate, 0) as rate,
        COALESCE(vi.amount, 0) as amount,
        COALESCE(vi.subtotal, vi.amount) as subtotal,
        COALESCE(vi.hst, 0) as hst,
        COALESCE(vi.total, vi.amount) as total
      FROM vendor_invoices vi
      LEFT JOIN vendors v ON vi.vendor_id = v.id
      WHERE vi.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit invoice to admin
router.post('/invoices/:id/submit-to-admin', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE vendor_invoices 
       SET status = 'sent_to_admin', 
           updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ message: 'Invoice submitted to admin successfully' });
  } catch (error) {
    console.error('Error submitting invoice to admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend rejected invoice to admin
router.post('/invoices/:id/resend-to-admin', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    if (!notes || notes.trim() === '') {
      return res.status(400).json({ error: 'Notes are required when resending rejected invoice' });
    }

    const result = await pool.query(
      `UPDATE vendor_invoices 
       SET status = 'sent_to_admin', 
           admin_notes = $2,
           updated_at = NOW()
       WHERE id = $1 AND status = 'rejected'
       RETURNING id`,
      [id, notes]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found or not in rejected status' });
    }

    res.json({ message: 'Invoice resent to admin successfully' });
  } catch (error) {
    console.error('Error resending invoice to admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download invoice PDF
router.get('/invoices/:id/download', authenticateToken, async (req, res) => {
  try {
    // Get user email from database using user ID
    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userEmail = userResult.rows[0].email;

    // 🔍 PHASE 3: Allow GTACPR staff to download any invoice (not just their own vendor's invoices)
    // This allows GTACPR staff to download all invoices they uploaded on behalf of any vendor
    const result = await pool.query(`
      SELECT 
        vi.*,
        v.name as company,
        v.name as billing_company,
        COALESCE(vi.rate, 0) as rate,
        COALESCE(vi.amount, 0) as amount,
        COALESCE(vi.subtotal, vi.amount) as subtotal,
        COALESCE(vi.hst, 0) as hst,
        COALESCE(vi.total, vi.amount) as total
      FROM vendor_invoices vi
      LEFT JOIN vendors v ON vi.vendor_id = v.id
      WHERE vi.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = result.rows[0];

    // Generate PDF from database data
    const pdfBuffer = await pdfGenerationService.generateInvoicePDF(invoice);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send the PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 