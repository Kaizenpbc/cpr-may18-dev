import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Divider,
  Paper,
  Link,
  Button,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/login')}
        sx={{ mb: 3 }}
        variant="text"
      >
        Back to Login
      </Button>

      <Paper elevation={2} sx={{ p: { xs: 3, md: 5 } }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Privacy Policy
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Last updated: April 2026
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Applies to: CPR Training Portal at{' '}
          <Link href="https://cpr.kpbc.ca" target="_blank" rel="noopener noreferrer">
            https://cpr.kpbc.ca
          </Link>
          {' '}operated by KPBC.
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Section 1 */}
        <Typography variant="h6" component="h2" gutterBottom>
          1. Information We Collect
        </Typography>
        <Typography variant="body1" paragraph>
          When you use the CPR Training Portal, we collect the following personal information:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">
              <strong>Account information:</strong> full name, email address, username, and assigned role (e.g., instructor, organization administrator)
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">
              <strong>Organization information:</strong> the name of the organization you are associated with
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">
              <strong>Training records:</strong> course attendance records, certification dates, and completion status
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">
              <strong>Billing and payment records:</strong> invoices issued, payment status, and transaction history associated with your organization's account
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">
              <strong>Security and audit data:</strong> login timestamps and IP addresses stored in system audit logs for security and compliance purposes
            </Typography>
          </Box>
        </Box>
        <Typography variant="body1" paragraph>
          We do not collect payment card numbers or banking details directly — billing is handled through organizational invoicing.
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Section 2 */}
        <Typography variant="h6" component="h2" gutterBottom>
          2. Why We Collect This Information
        </Typography>
        <Typography variant="body1" paragraph>
          We collect and use your personal information solely to provide the CPR Training Portal service, which includes:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">Scheduling and managing CPR training courses</Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">Tracking attendance and issuing training certificates</Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">Managing billing and invoicing for organizations</Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">Maintaining audit trails for security and regulatory compliance</Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">Communicating account-related information (e.g., password resets, course notifications)</Typography>
          </Box>
        </Box>
        <Typography variant="body1" paragraph>
          We do not use your information for advertising, marketing to third parties, or any purpose beyond operating this service.
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Section 3 */}
        <Typography variant="h6" component="h2" gutterBottom>
          3. Who Can See Your Information
        </Typography>
        <Typography variant="body1" paragraph>
          Access to your personal information is limited to:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">
              <strong>Your organization's administrator:</strong> can view accounts, course records, and billing data associated with your organization
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">
              <strong>KPBC system administrators:</strong> have access to all data for the purpose of operating, maintaining, and troubleshooting the platform
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">
              <strong>Instructors:</strong> can view attendance records for courses they are assigned to teach
            </Typography>
          </Box>
        </Box>
        <Typography variant="body1" paragraph>
          We do not sell, rent, or share your personal information with unaffiliated third parties for their own purposes.
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Section 4 */}
        <Typography variant="h6" component="h2" gutterBottom>
          4. Third-Party Service Providers
        </Typography>
        <Typography variant="body1" paragraph>
          To operate this service, we engage the following sub-processors who may process your personal data. All providers are bound by contractual data protection obligations:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Box component="li" sx={{ mb: 1 }}>
            <Typography variant="body1">
              <strong>TMD Hosting</strong> (Canada) — provides the web hosting and MySQL database service where all application data, including personal information, is stored. Data is hosted on servers in Canada.
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 1 }}>
            <Typography variant="body1">
              <strong>KPBC mail server (kpbc.ca)</strong> — used for transactional email delivery (e.g., password reset emails, course notifications). Emails are sent from noreply@kpbc.ca via our own mail infrastructure.
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 1 }}>
            <Typography variant="body1">
              <strong>Sentry (Functional Software Inc.)</strong> (United States) — used for application error monitoring. Error reports may include technical context such as usernames or request data; personal information captured in error logs is minimized and used solely for diagnosing application issues.
            </Typography>
          </Box>
        </Box>
        <Typography variant="body1" paragraph>
          <strong>Cross-border transfer notice:</strong> Application data and backups are stored in Canada (TMD Hosting). Error monitoring data (Sentry) may be processed in the United States. We take reasonable steps to ensure your data is protected in accordance with PIPEDA.
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Section 5 */}
        <Typography variant="h6" component="h2" gutterBottom>
          5. Data Retention
        </Typography>
        <Typography variant="body1" paragraph>
          We retain personal information only as long as necessary for the purposes described in this policy or as required by law:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">
              <strong>Account data</strong> (name, email, username, role): retained while your account is active, plus 2 years after account closure
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">
              <strong>Course and attendance records:</strong> retained for 7 years from the date of the training event for regulatory and certification compliance purposes
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">
              <strong>Payment and invoice records:</strong> retained for 7 years in accordance with Canadian financial record-keeping requirements
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">
              <strong>Audit logs and login records:</strong> retained for 2 years for security purposes
            </Typography>
          </Box>
        </Box>
        <Typography variant="body1" paragraph>
          When data is no longer required, it is anonymised or securely deleted.
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Section 6 */}
        <Typography variant="h6" component="h2" gutterBottom>
          6. Your Rights Under PIPEDA
        </Typography>
        <Typography variant="body1" paragraph>
          Under Canada's Personal Information Protection and Electronic Documents Act (PIPEDA), you have the following rights:
        </Typography>
        <Box component="ul" sx={{ pl: 3, mb: 2 }}>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">
              <strong>Right of access:</strong> You may download a copy of all personal information we hold about you directly from the portal. When logged in, go to your account settings and select <em>"Download My Data"</em>. This exports your profile, session history, audit log, notification preferences, and profile change history as a JSON file.
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">
              <strong>Right to correction:</strong> You may request that inaccurate or incomplete personal information be corrected. Contact your organization's administrator or email us at the address below.
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">
              <strong>Right to erasure:</strong> You may request erasure of your personal data directly from the portal. When logged in, go to your account settings and select <em>"Delete My Account & Data"</em>. This anonymises your profile information immediately. Note that certain records (course attendance, payment records) are retained for the regulatory periods described in Section 5 even after erasure, but will no longer be linked to your identity.
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">
              <strong>Right to withdraw consent:</strong> You may withdraw consent at any time by requesting account erasure as described above. Withdrawing consent will prevent us from providing the service to you.
            </Typography>
          </Box>
          <Box component="li" sx={{ mb: 0.5 }}>
            <Typography variant="body1">
              <strong>Right to lodge a complaint:</strong> You have the right to file a complaint with the Office of the Privacy Commissioner of Canada at{' '}
              <Link href="https://www.priv.gc.ca" target="_blank" rel="noopener noreferrer">
                www.priv.gc.ca
              </Link>
            </Typography>
          </Box>
        </Box>
        <Typography variant="body1" paragraph>
          To exercise your rights, use the self-service tools in your account settings or contact us directly at the address below. We will respond to all written privacy requests within 30 days as required by PIPEDA.
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Section 7 */}
        <Typography variant="h6" component="h2" gutterBottom>
          7. Contact Us
        </Typography>
        <Typography variant="body1" paragraph>
          For privacy-related inquiries, requests to access or correct your personal information, or requests for deletion, please contact:
        </Typography>
        <Box sx={{ pl: 2, borderLeft: 3, borderColor: 'primary.main', mb: 2 }}>
          <Typography variant="body1">
            <strong>Privacy Officer, KPBC</strong>
          </Typography>
          <Typography variant="body1">
            Email:{' '}
            <Link href="mailto:privacy@kpbc.ca">
              privacy@kpbc.ca
            </Link>
          </Typography>
          <Typography variant="body1">
            Service: CPR Training Portal — https://cpr.kpbc.ca
          </Typography>
        </Box>
        <Typography variant="body1" paragraph>
          We will respond to all privacy requests within 30 days as required by PIPEDA.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="body2" color="text.secondary">
          This privacy policy may be updated periodically. The date at the top of this page reflects the most recent revision. Continued use of the service after updates constitutes acceptance of the revised policy.
        </Typography>
      </Paper>
    </Container>
  );
};

export default PrivacyPolicy;
