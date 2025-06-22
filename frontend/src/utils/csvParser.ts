export interface StudentData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  organization_id?: number;
  course_request_id?: number;
}

export interface ParsedCSVResult {
  success: boolean;
  students: StudentData[];
  errors: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
}

export const parseCSV = (csvContent: string, courseRequestId?: number, organizationId?: number): ParsedCSVResult => {
  console.log('[TRACE] CSV Parser - Starting CSV parsing');
  console.log('[TRACE] CSV Parser - Course request ID:', courseRequestId);
  console.log('[TRACE] CSV Parser - Organization ID:', organizationId);
  
  const lines = csvContent.split('\n').filter(line => line.trim());
  console.log('[TRACE] CSV Parser - Total lines:', lines.length);
  
  if (lines.length < 2) {
    return {
      success: false,
      students: [],
      errors: ['CSV must have at least a header row and one data row'],
      totalRows: lines.length,
      validRows: 0,
      invalidRows: lines.length
    };
  }

  const headerLine = lines[0];
  const dataLines = lines.slice(1);
  
  console.log('[TRACE] CSV Parser - Header line:', headerLine);
  console.log('[TRACE] CSV Parser - Data lines count:', dataLines.length);

  // Parse headers
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
  console.log('[TRACE] CSV Parser - Parsed headers:', headers);

  // Validate required headers
  const requiredHeaders = ['first_name', 'last_name'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  
  if (missingHeaders.length > 0) {
    return {
      success: false,
      students: [],
      errors: [`Missing required headers: ${missingHeaders.join(', ')}`],
      totalRows: dataLines.length,
      validRows: 0,
      invalidRows: dataLines.length
    };
  }

  const students: StudentData[] = [];
  const errors: string[] = [];

  // Parse each data row
  dataLines.forEach((line, index) => {
    const rowNumber = index + 2; // +2 because we start from line 2 (after header)
    console.log(`[TRACE] CSV Parser - Processing row ${rowNumber}:`, line);
    
    try {
      const values = line.split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        errors.push(`Row ${rowNumber}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
        return;
      }

      // Create student object
      const student: StudentData = {
        firstName: '',
        lastName: '',
        organization_id: organizationId,
        course_request_id: courseRequestId
      };

      // Map values to headers
      headers.forEach((header, colIndex) => {
        const value = values[colIndex];
        
        switch (header) {
          case 'first_name':
            student.firstName = value;
            break;
          case 'last_name':
            student.lastName = value;
            break;
          case 'email':
            student.email = value || undefined;
            break;
          case 'phone':
            student.phone = value || undefined;
            break;
          default:
            console.log(`[TRACE] CSV Parser - Unknown header: ${header}, value: ${value}`);
        }
      });

      // Validate required fields
      if (!student.firstName || !student.lastName) {
        errors.push(`Row ${rowNumber}: Missing required fields (first_name and last_name are required)`);
        return;
      }

      // Validate email format if provided
      if (student.email && !isValidEmail(student.email)) {
        errors.push(`Row ${rowNumber}: Invalid email format: ${student.email}`);
        return;
      }

      console.log(`[TRACE] CSV Parser - Valid student data:`, student);
      students.push(student);
      
    } catch (error) {
      console.error(`[TRACE] CSV Parser - Error processing row ${rowNumber}:`, error);
      errors.push(`Row ${rowNumber}: Error processing data`);
    }
  });

  const result: ParsedCSVResult = {
    success: students.length > 0,
    students,
    errors,
    totalRows: dataLines.length,
    validRows: students.length,
    invalidRows: dataLines.length - students.length
  };

  console.log('[TRACE] CSV Parser - Parsing completed:', result);
  return result;
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}; 