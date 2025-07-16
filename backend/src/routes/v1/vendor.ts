import express from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { pool } from '../../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

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
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
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

    let query = 'SELECT * FROM vendor_invoices WHERE vendor_id = $1';
    let params = [vendorId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    if (search) {
      const searchParam = params.length + 1;
      query += ` AND (invoice_number ILIKE $${searchParam} OR description ILIKE $${searchParam})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

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

    const {
      invoice_number,
      amount,
      description,
      invoice_date,
      due_date,
      manual_type,
      quantity
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Invoice PDF is required' });
    }

    const result = await pool.query(
      `INSERT INTO vendor_invoices (
        vendor_id, invoice_number, amount, description, invoice_date, due_date,
        manual_type, quantity, pdf_filename, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        vendorResult.rows[0].id,
        invoice_number,
        parseFloat(amount),
        description,
        invoice_date,
        due_date,
        manual_type,
        quantity ? parseInt(quantity) : null,
        req.file.filename,
        'submitted'
      ]
    );

    res.status(201).json({
      message: 'Invoice submitted successfully',
      invoice_id: result.rows[0].id
    });
  } catch (error) {
    console.error('Error submitting invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
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

    const vendorResult = await pool.query(
      'SELECT id FROM vendors WHERE contact_email = $1',
      [userEmail]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const result = await pool.query(
      'SELECT * FROM vendor_invoices WHERE id = $1 AND vendor_id = $2',
      [req.params.id, vendorResult.rows[0].id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching invoice:', error);
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

    const vendorResult = await pool.query(
      'SELECT id FROM vendors WHERE contact_email = $1',
      [userEmail]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const result = await pool.query(
      'SELECT * FROM vendor_invoices WHERE id = $1 AND vendor_id = $2',
      [req.params.id, vendorResult.rows[0].id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = result.rows[0];

    if (!invoice.pdf_filename) {
      return res.status(404).json({ error: 'PDF file not found' });
    }

    const filePath = path.join(process.cwd(), 'uploads/vendor-invoices', invoice.pdf_filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'PDF file not found on server' });
    }

    res.download(filePath, `invoice-${invoice.invoice_number}.pdf`);
  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 