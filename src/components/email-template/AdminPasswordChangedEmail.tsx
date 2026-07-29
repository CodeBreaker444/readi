import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';


interface AdminPasswordChangedEmailProps {
  organization: string;
  fullname: string;
  username: string;
  newPassword: string;
}

export const AdminPasswordChangedEmail = ({
  organization,
  fullname,
  username,
  newPassword,
}: AdminPasswordChangedEmailProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body style={main}>
        <Preview>Your admin password has been updated — {organization}</Preview>

        <div style={outer}>
          {/* Header */}
          <div style={header}>
            <Img src='https://readi.theun1t.com/logo-sm.png' alt="ReADI" width={36} height={36} style={logoImg} />
            <span style={headerTitle}>{organization}</span>
          </div>

          {/* Card body */}
          <Container style={card}>
            <Section style={section}>
              <Text style={title}>Your password has been reset</Text>
              <Text style={paragraph}>Hello {fullname},</Text>
              <Text style={paragraph}>
                Your admin account password for <strong>{organization}</strong> has been reset by a
                Super Administrator. Use the credentials below to log in.
              </Text>

              {/* Credentials */}
              <div style={dataCard}>
                <div style={dataRow}>
                  <span style={dataLabel}>USERNAME</span>
                  <span style={dataValue}>{username}</span>
                </div>
                <div style={dataRowBorder} />
                <div style={dataRow}>
                  <span style={dataLabel}>NEW PASSWORD</span>
                  <span style={monoValue}>{newPassword}</span>
                </div>
              </div>

              {/* Warning notice */}
              <div style={warningCard}>
                <Text style={warningTitle}>Security notice</Text>
                <Text style={warningBody}>
                  Please log in immediately and change this password from your profile settings. Do
                  not share this password with anyone.
                </Text>
              </div>

              <div style={divider} />

              <Text style={cautionText}>
                If you did not expect this change or believe it was made in error, contact your
                Super Administrator immediately.
              </Text>
            </Section>
          </Container>

          {/* Footer */}
          <div style={footer}>
            <Text style={footerText}>{organization}</Text>
            <Text style={footerText}>This is an automated message — please do not reply.</Text>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} {organization}. All rights reserved.
            </Text>
          </div>
        </div>
      </Body>
    </Tailwind>
  </Html>
);

AdminPasswordChangedEmail.PreviewProps = {
  organization: 'ReADI Control Center',
  fullname: 'Jane Admin',
  username: 'jane.admin',
  newPassword: 'Temp@1234',
} as AdminPasswordChangedEmailProps;

export default AdminPasswordChangedEmail;

/* ── Styles ──────────────────────────────────────────────── */

const fontStack =
  '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';

const main = {
  backgroundColor: '#f6f8fc',
  fontFamily: fontStack,
};

const outer = {
  maxWidth: '600px',
  margin: '32px auto',
};

const header = {
  backgroundColor: '#7c3aed',
  borderRadius: '8px 8px 0 0',
  padding: '20px 32px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const logoImg = {
  objectFit: 'contain' as const,
  filter: 'brightness(0) invert(1)',
  display: 'block',
};

const headerTitle = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '600',
  letterSpacing: '-0.2px',
};

const card = {
  backgroundColor: '#ffffff',
  borderRadius: '0 0 8px 8px',
  border: '1px solid #e0e0e0',
  borderTop: 'none',
};

const section = {
  padding: '32px 32px 24px',
};

const title = {
  fontSize: '22px',
  fontWeight: '600',
  color: '#202124',
  margin: '0 0 20px',
  lineHeight: '1.3',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#3c4043',
  margin: '0 0 16px',
};

const dataCard = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  margin: '20px 0',
  overflow: 'hidden',
};

const dataRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '14px 18px',
};

const dataRowBorder = {
  height: '1px',
  backgroundColor: '#e0e0e0',
  margin: '0 18px',
};

const dataLabel = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#5f6368',
  letterSpacing: '0.6px',
  textTransform: 'uppercase' as const,
};

const dataValue = {
  fontSize: '14px',
  color: '#202124',
  fontWeight: '500',
};

const monoValue = {
  fontFamily: '"Roboto Mono","Courier New",monospace',
  fontSize: '16px',
  fontWeight: '700',
  color: '#7c3aed',
  letterSpacing: '1px',
};

const warningCard = {
  backgroundColor: '#fef9ec',
  border: '1px solid #fbbf24',
  borderRadius: '6px',
  padding: '16px 18px',
  margin: '20px 0',
};

const warningTitle = {
  fontSize: '13px',
  fontWeight: '700',
  color: '#92400e',
  margin: '0 0 6px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.4px',
};

const warningBody = {
  fontSize: '14px',
  color: '#78350f',
  lineHeight: '22px',
  margin: '0',
};

const divider = {
  height: '1px',
  backgroundColor: '#e8eaed',
  margin: '24px 0',
};

const cautionText = {
  fontSize: '13px',
  color: '#5f6368',
  margin: '0',
  lineHeight: '20px',
};

const footer = {
  textAlign: 'center' as const,
  padding: '16px 32px 8px',
};

const footerText = {
  fontSize: '12px',
  color: '#9aa0a6',
  margin: '2px 0',
  lineHeight: '18px',
};
