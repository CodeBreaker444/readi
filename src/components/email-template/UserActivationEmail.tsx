import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';


interface UserActivationEmailProps {
  organization: string;
  username: string;
  passcode: string;
  loginlink: string;
  fullname: string;
}

export const UserActivationEmail = ({
  organization,
  username,
  passcode,
  loginlink,
  fullname,
}: UserActivationEmailProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body style={main}>
        <Preview>Activate your {organization} account</Preview>

        {/* Outer wrapper */}
        <div style={outer}>
          {/* Header */}
          <div style={header}>
            <Img src='https://readi.theun1t.com/logo-sm.png' alt="ReADI" width={36} height={36} style={logoImg} />
            <span style={headerTitle}>{organization}</span>
          </div>

          {/* Card body */}
          <Container style={card}>
            <Section style={section}>
              <Text style={title}>Activate your account</Text>
              <Text style={paragraph}>Hello {fullname},</Text>
              <Text style={paragraph}>
                Your account has been created in <strong>{organization}</strong>. Use the
                credentials below to complete activation and set up your password.
              </Text>

              {/* Credentials table */}
              <div style={dataCard}>
                <div style={dataRow}>
                  <span style={dataLabel}>USERNAME</span>
                  <span style={dataValue}>{username}</span>
                </div>
                <div style={dataRowBorder} />
                <div style={dataRow}>
                  <span style={dataLabel}>TEMPORARY PASSCODE</span>
                  <span style={monoValue}>{passcode}</span>
                </div>
              </div>

              <Text style={hintText}>
                You will need both your username and this passcode to complete activation.
              </Text>

              {/* CTA */}
              <div style={buttonWrap}>
                <Button href={loginlink} style={cta}>
                  Activate Account
                </Button>
              </div>

              {/* Divider */}
              <div style={divider} />

              {/* Fallback link */}
              <Text style={smallText}>
                If the button does not work, copy and paste this link into your browser:
              </Text>
              <div style={linkBox}>
                <Link href={loginlink} style={linkStyle}>{loginlink}</Link>
              </div>

              <div style={divider} />

              {/* Steps */}
              <Text style={stepsTitle}>Next steps</Text>
              <div style={stepsList}>
                {[
                  'Click the activation button above',
                  'Enter your username and temporary passcode',
                  'Create a new secure password',
                  `Start using ${organization}`,
                ].map((step, i) => (
                  <div key={i} style={stepRow}>
                    <span style={stepNum}>{i + 1}</span>
                    <span style={stepText}>{step}</span>
                  </div>
                ))}
              </div>

              <div style={divider} />

              <Text style={cautionText}>
                If you did not request this account, please contact your system administrator
                immediately.
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

UserActivationEmail.PreviewProps = {
  organization: 'ReADI Control Center',
  username: 'johndoe',
  passcode: 'ABC123XYZ',
  loginlink: 'https://app.readi.ai/activate?o=1&email=john@example.com&id=abc123',
  fullname: 'John Doe',
} as UserActivationEmailProps;

export default UserActivationEmail;

/* ── Shared styles ─────────────────────────────────────── */

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
  padding: '0',
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

const hintText = {
  fontSize: '13px',
  color: '#5f6368',
  margin: '0 0 24px',
  lineHeight: '20px',
};

const buttonWrap = {
  textAlign: 'center' as const,
  margin: '28px 0',
};

const cta = {
  backgroundColor: '#7c3aed',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  display: 'inline-block',
};

const divider = {
  height: '1px',
  backgroundColor: '#e8eaed',
  margin: '24px 0',
};

const smallText = {
  fontSize: '13px',
  color: '#5f6368',
  margin: '0 0 10px',
};

const linkBox = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e0e0e0',
  borderRadius: '4px',
  padding: '10px 14px',
  margin: '0 0 24px',
  wordBreak: 'break-all' as const,
};

const linkStyle = {
  color: '#7c3aed',
  fontSize: '12px',
  textDecoration: 'none',
};

const stepsTitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#202124',
  margin: '0 0 14px',
};

const stepsList = {
  margin: '0 0 8px',
};

const stepRow = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  marginBottom: '10px',
};

const stepNum = {
  backgroundColor: '#7c3aed',
  color: '#ffffff',
  borderRadius: '50%',
  width: '20px',
  height: '20px',
  fontSize: '11px',
  fontWeight: '700',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  textAlign: 'center' as const,
  lineHeight: '20px',
};

const stepText = {
  fontSize: '14px',
  color: '#3c4043',
  lineHeight: '20px',
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
