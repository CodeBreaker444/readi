import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
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
        <Container style={container}>
          <div className="flex flex-row items-center gap-3 mb-6">
            <Img
              src="https://demo.ai-inspection.com/api/utils/imgs/logo_circle.png"
              width={60}
              height={60}
              alt={organization}
              style={{ borderRadius: '50%' }}
            />
            <Heading as="h1" className="text-3xl font-bold text-gray-700">
              {organization}
            </Heading>
          </div>

          <Heading style={heading}>🎉 Your Account Has Been Created!</Heading>

          <Section style={body}>
            <Text style={paragraph}>Hello {fullname},</Text>

            <Text style={paragraph}>
              We&apos;re excited to have you on board! Your account has been successfully created in
              the {organization} system. To get started, you&apos;ll need to activate your account
              and set up your password.
            </Text>

            <div style={credentialsBox}>
              <Text style={credentialsLabel}>👤 Username:</Text>
              <Text style={credentialsValue}>{username}</Text>

              <Text style={{ ...credentialsLabel, marginTop: '16px' }}>🔑 Temporary Passcode:</Text>
              <Text style={passcodeStyle}>{passcode}</Text>
            </div>

            <div style={infoBox}>
              <Text style={infoText}>
                📌 <strong>Important:</strong> You&apos;ll use your username and this temporary
                passcode to complete the activation process.
              </Text>
            </div>

            <div style={{ textAlign: 'center', margin: '32px 0' }}>
              <Button href={loginlink} style={buttonStyle}>
                ✨ Activate Your Account Now
              </Button>
            </div>

            <Hr style={divider} />

            <Text style={smallText}>Having trouble with the button? Copy and paste this link:</Text>

            <div style={linkBox}>
              <Link href={loginlink} style={linkStyle}>
                {loginlink}
              </Link>
            </div>


            <Hr style={divider} />

            <Text style={paragraph}>
              <strong>What&apos;s Next?</strong>
            </Text>
            <ol style={listStyle}>
              <li style={listItem}>Click the activation button above</li>
              <li style={listItem}>Use your username and temporary passcode to log in</li>
              <li style={listItem}>Set up a secure password</li>
              <li style={listItem}>Start using {organization}!</li>
            </ol>

            <Hr style={divider} />

            <Text style={paragraph}>
              If you didn&apos;t request this account or if you have any questions, please contact
              your system administrator immediately.
            </Text>
          </Section>

          <Text style={paragraph}>
            Best regards,
            <br />
            <strong>{organization} Team</strong>
          </Text>

          <Hr style={hr} />

          <Img
            src="https://demo.ai-inspection.com/api/utils/imgs/logo_circle.png"
            width={48}
            height={48}
            style={{
              WebkitFilter: 'grayscale(100%)',
              filter: 'grayscale(100%)',
              margin: '20px 0',
              borderRadius: '50%',
            }}
          />

          <Text style={footer}>{organization}</Text>
          <Text style={footer}>This is an automated message. Please do not reply to this email.</Text>
          <Text style={footer}>
            &copy; {new Date().getFullYear()} {organization}. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

UserActivationEmail.PreviewProps = {
  organization: 'ReADI Control Center',
  username: 'johndoe',
  passcode: 'ABC123XYZ',
  loginlink: 'https://app.ai-inspection.com/activate?o=1&email=john@example.com&id=abc123',
  fullname: 'John Doe',
} as UserActivationEmailProps;

export { UserActivationEmail as default };

const main = {
  backgroundColor: '#f4f4f4',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 30px',
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  maxWidth: '600px',
};

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#667eea',
  marginTop: '24px',
  marginBottom: '16px',
};

const body = {
  margin: '24px 0',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#555555',
  margin: '16px 0',
};

const credentialsBox = {
  backgroundColor: '#f8f9fa',
  borderLeft: '4px solid #667eea',
  padding: '20px',
  margin: '24px 0',
  borderRadius: '4px',
};

const credentialsLabel = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#333333',
  margin: '8px 0',
};

const credentialsValue = {
  fontSize: '15px',
  color: '#555555',
  marginLeft: '20px',
  margin: '4px 0 4px 20px',
};

const passcodeStyle = {
  fontFamily: '"Courier New", monospace',
  backgroundColor: '#ffffff',
  padding: '8px 12px',
  borderRadius: '4px',
  display: 'inline-block',
  marginTop: '8px',
  fontSize: '18px',
  letterSpacing: '1px',
  color: '#667eea',
  fontWeight: 'bold',
  marginLeft: '20px',
};

const infoBox = {
  backgroundColor: '#d1ecf1',
  borderLeft: '4px solid #17a2b8',
  padding: '15px',
  margin: '20px 0',
  borderRadius: '4px',
};

const infoText = {
  margin: '0',
  color: '#0c5460',
  fontSize: '14px',
  lineHeight: '22px',
};

const buttonStyle = {
  display: 'inline-block',
  padding: '14px 32px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#ffffff',
  textDecoration: 'none',
  borderRadius: '6px',
  fontSize: '16px',
  fontWeight: '600',
};

const divider = {
  height: '1px',
  backgroundColor: '#e9ecef',
  margin: '24px 0',
  border: 'none',
};

const smallText = {
  fontSize: '14px',
  color: '#6c757d',
  margin: '12px 0',
};

const linkBox = {
  backgroundColor: '#f8f9fa',
  padding: '15px',
  borderRadius: '4px',
  margin: '16px 0',
};

const linkStyle = {
  color: '#667eea',
  textDecoration: 'none',
  fontSize: '13px',
};

const alertBox = {
  backgroundColor: '#fff3cd',
  borderLeft: '4px solid #ffc107',
  padding: '15px',
  margin: '20px 0',
  borderRadius: '4px',
};

const alertText = {
  margin: '0',
  color: '#856404',
  fontSize: '14px',
  lineHeight: '22px',
};

const listStyle = {
  marginLeft: '20px',
  color: '#555555',
  fontSize: '16px',
  lineHeight: '26px',
};

const listItem = {
  margin: '8px 0',
};

const hr = {
  borderColor: '#dddddd',
  marginTop: '32px',
  marginBottom: '32px',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  margin: '4px 0',
};