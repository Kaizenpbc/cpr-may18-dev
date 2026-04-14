import { query } from '../config/database.js';
import { PDFService } from './pdfService.js';
import { emailService } from './emailService.js';

export interface CertData {
  id: number;
  courseStudentId: number;
  courseRequestId: number;
  organizationId: number | null;
  firstName: string;
  lastName: string;
  email: string | null;
  courseName: string;
  certificationNumber: string;
  issueDate: string;
  expirationDate: string;
  instructorName: string;
  status: string;
  pdfGeneratedAt: string | null;
  createdAt: string;
}

function getCertPrefix(courseTypeName: string): string {
  const name = courseTypeName.toLowerCase();
  if (name.includes('basic')) return 'BFA';
  if (name.includes('advanced') || name.includes('intermediate')) return 'IFA';
  if (name.includes('first aid')) return 'FA';
  return 'CERT';
}

async function generateCertNumber(prefix: string, issueDate: string): Promise<string> {
  const datePart = issueDate.replace(/-/g, '').slice(0, 8); // YYYYMMDD
  const likePattern = `${prefix}-${datePart}-%`;
  const result = await query(
    `SELECT COUNT(*) as cnt FROM certifications WHERE certification_number LIKE $1`,
    [likePattern]
  );
  const seq = parseInt(result.rows[0].cnt ?? '0') + 1;
  return `${prefix}-${datePart}-${String(seq).padStart(5, '0')}`;
}

function rowToCertData(r: Record<string, unknown>): CertData {
  return {
    id: r.id as number,
    courseStudentId: r.course_student_id as number,
    courseRequestId: r.course_request_id as number,
    organizationId: (r.organization_id as number) ?? null,
    firstName: r.first_name as string,
    lastName: r.last_name as string,
    email: (r.email as string) ?? null,
    courseName: r.course_name as string,
    certificationNumber: r.certification_number as string,
    issueDate: r.issue_date ? new Date(r.issue_date as string).toISOString().slice(0, 10) : '',
    expirationDate: r.expiration_date ? new Date(r.expiration_date as string).toISOString().slice(0, 10) : '',
    instructorName: r.instructor_name as string,
    status: r.status as string,
    pdfGeneratedAt: r.pdf_generated_at ? new Date(r.pdf_generated_at as string).toISOString() : null,
    createdAt: r.created_at ? new Date(r.created_at as string).toISOString() : '',
  };
}

/**
 * Issue certificates for all attended students on a completed course.
 * Idempotent — skips students who already have a cert for this course.
 * Runs asynchronously after course completion; errors are logged, not thrown.
 */
export async function issueCertificates(courseRequestId: number): Promise<void> {
  const courseResult = await query(
    `SELECT cr.id, cr.confirmed_date, cr.organization_id,
            ct.name as course_type_name,
            u.full_name as instructor_name
     FROM course_requests cr
     JOIN class_types ct ON cr.course_type_id = ct.id
     LEFT JOIN users u ON cr.instructor_id = u.id
     WHERE cr.id = $1`,
    [courseRequestId]
  );
  if (courseResult.rows.length === 0) return;
  const course = courseResult.rows[0];

  const studentsResult = await query(
    `SELECT * FROM course_students WHERE course_request_id = $1 AND attended = 1`,
    [courseRequestId]
  );
  if (studentsResult.rows.length === 0) {
    console.log(`[CertService] No attended students for course ${courseRequestId} — no certs issued`);
    return;
  }

  const prefix = getCertPrefix(course.course_type_name || '');
  const issueDate = course.confirmed_date
    ? new Date(course.confirmed_date).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const expiryDt = new Date(issueDate);
  expiryDt.setFullYear(expiryDt.getFullYear() + 2);
  const expirationDate = expiryDt.toISOString().slice(0, 10);

  const instructorName = (course.instructor_name as string) || 'GTA CPR Training Services';
  const courseName = (course.course_type_name as string) || 'CPR Training';
  const organizationId = (course.organization_id as number) ?? null;

  for (const student of studentsResult.rows) {
    // Idempotency check
    const existing = await query(
      `SELECT id FROM certifications WHERE course_student_id = $1 AND course_request_id = $2`,
      [student.id, courseRequestId]
    );
    if (existing.rows.length > 0) continue;

    const certNumber = await generateCertNumber(prefix, issueDate);

    await query(
      `INSERT INTO certifications
         (course_student_id, course_request_id, organization_id,
          first_name, last_name, email,
          course_name, certification_number,
          issue_date, expiration_date, instructor_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')`,
      [student.id, courseRequestId, organizationId,
       student.first_name, student.last_name, student.email || null,
       courseName, certNumber, issueDate, expirationDate, instructorName]
    );

    // Generate PDF and email — non-fatal
    if (student.email) {
      try {
        const certData: CertData = {
          id: 0,
          courseStudentId: student.id as number,
          courseRequestId,
          organizationId,
          firstName: student.first_name as string,
          lastName: student.last_name as string,
          email: student.email as string,
          courseName,
          certificationNumber: certNumber,
          issueDate,
          expirationDate,
          instructorName,
          status: 'active',
          pdfGeneratedAt: null,
          createdAt: new Date().toISOString(),
        };
        const pdfBuffer = await PDFService.generateCertificatePDF(certData);
        await emailService.sendCertificateEmail(
          student.email as string,
          student.first_name as string,
          certData,
          pdfBuffer
        );
        await query(
          `UPDATE certifications SET pdf_generated_at = NOW() WHERE certification_number = $1`,
          [certNumber]
        );
      } catch (err) {
        console.error(`[CertService] PDF/email failed for ${student.email}:`, err);
      }
    }

    console.log(`[CertService] Issued ${certNumber} → ${student.first_name} ${student.last_name}`);
  }
}

export async function verifyCertificate(certNumber: string): Promise<CertData | null> {
  const result = await query(
    `SELECT * FROM certifications WHERE certification_number = $1`,
    [certNumber]
  );
  if (result.rows.length === 0) return null;
  return rowToCertData(result.rows[0] as Record<string, unknown>);
}

export async function getCertificatesForOrg(
  organizationId: number,
  page = 1,
  limit = 50
): Promise<{ certs: CertData[]; total: number }> {
  const offset = (page - 1) * limit;
  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT * FROM certifications WHERE organization_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [organizationId, limit, offset]
    ),
    query(`SELECT COUNT(*) as cnt FROM certifications WHERE organization_id = $1`, [organizationId]),
  ]);
  return {
    certs: (dataResult.rows as Record<string, unknown>[]).map(rowToCertData),
    total: parseInt(countResult.rows[0].cnt ?? '0'),
  };
}

export async function getAllCertificates(
  page = 1,
  limit = 50
): Promise<{ certs: CertData[]; total: number }> {
  const offset = (page - 1) * limit;
  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT * FROM certifications ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    query(`SELECT COUNT(*) as cnt FROM certifications`, []),
  ]);
  return {
    certs: (dataResult.rows as Record<string, unknown>[]).map(rowToCertData),
    total: parseInt(countResult.rows[0].cnt ?? '0'),
  };
}

export async function getCertificatePDF(
  certificationNumber: string
): Promise<{ pdf: Buffer; cert: CertData } | null> {
  const result = await query(
    `SELECT * FROM certifications WHERE certification_number = $1`,
    [certificationNumber]
  );
  if (result.rows.length === 0) return null;
  const cert = rowToCertData(result.rows[0] as Record<string, unknown>);
  const pdf = await PDFService.generateCertificatePDF(cert);
  return { pdf, cert };
}
