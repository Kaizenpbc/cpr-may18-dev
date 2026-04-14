import { query } from './database.js';

export async function initializeCertificationDatabase(): Promise<void> {
  try {
    // Check if table needs migration (old schema has user_id, new has course_student_id)
    const colCheck = await query(`SHOW COLUMNS FROM certifications LIKE 'course_student_id'`);
    if (colCheck.rows.length > 0) {
      console.log('✅ Certifications database ready');
      return;
    }
    // Old schema exists — drop and recreate (table is always empty; was never populated)
    await query(`DROP TABLE IF EXISTS certifications`);
    console.log('Dropped old certifications table for schema migration');
  } catch {
    // Table does not exist yet — will be created below
  }

  await query(`
    CREATE TABLE IF NOT EXISTS certifications (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      course_student_id INTEGER NOT NULL,
      course_request_id INTEGER NOT NULL,
      organization_id INTEGER,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      course_name VARCHAR(255) NOT NULL,
      certification_number VARCHAR(50) NOT NULL UNIQUE,
      issue_date DATE NOT NULL,
      expiration_date DATE NOT NULL,
      instructor_name VARCHAR(255) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      pdf_generated_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_cert_student FOREIGN KEY (course_student_id) REFERENCES course_students(id) ON DELETE CASCADE,
      CONSTRAINT fk_cert_course FOREIGN KEY (course_request_id) REFERENCES course_requests(id) ON DELETE CASCADE,
      CONSTRAINT fk_cert_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_certifications_course_request ON certifications(course_request_id)',
    'CREATE INDEX IF NOT EXISTS idx_certifications_cert_number ON certifications(certification_number)',
    'CREATE INDEX IF NOT EXISTS idx_certifications_email ON certifications(email)',
    'CREATE INDEX IF NOT EXISTS idx_certifications_org ON certifications(organization_id)',
  ];
  for (const sql of indexes) {
    await query(sql).catch(() => {});
  }

  console.log('✅ Certifications database initialized');
}
