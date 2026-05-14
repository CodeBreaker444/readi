import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

interface NotificationEmailProps {
  title: string;
  message: string;
  notificationType?: string;
  actionUrl?: string | null;
}

export const NotificationEmail = ({
  title,
  message,
  notificationType,
  actionUrl,
}: NotificationEmailProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body style={main}>
        <Preview>{title}</Preview>
        <Container style={container}>
          <div className="flex flex-row items-center gap-3 mb-6">
            <Img
              src="https://demo.ai-inspection.com/api/utils/imgs/logo_circle.png"
              width={60}
              height={60}
              alt="ReADI Control Center"
              style={{ borderRadius: '50%' }}
            />
            <Heading as="h1" className="text-3xl font-bold text-gray-700">
              ReADI Control Center
            </Heading>
          </div>

          <Heading style={heading}>{title}</Heading>

          <Section style={body}>
            <div style={messageBox}>
              {notificationType && (
                <Text style={typeLabel}>
                  {notificationType.replace(/_/g, ' ').toUpperCase()}
                </Text>
              )}
              <Text style={messageText}>{message}</Text>
            </div>

            {actionUrl && (
              <div style={actionBox}>
                <Text style={actionText}>
                  View details:{' '}
                  <a href={actionUrl} style={actionLink}>
                    {actionUrl}
                  </a>
                </Text>
              </div>
            )}

            <Hr style={divider} />

            <Text style={paragraph}>
              This notification was sent because your organisation has email notifications enabled.
              Log in to ReADI Control Center to view and manage your notifications.
            </Text>
          </Section>

          <Text style={paragraph}>
            Best regards,
            <br />
            <strong>ReADI Control Center Team</strong>
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

          <Text style={footer}>ReADI Control Center</Text>
          <Text style={footer}>This is an automated message. Please do not reply to this email.</Text>
          <Text style={footer}>
            &copy; {new Date().getFullYear()} ReADI Control Center. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

NotificationEmail.PreviewProps = {
  title: 'New Mission Assignment',
  message: 'You have been assigned to mission MSSN-2024-001. Please review and confirm.',
  notificationType: 'MISSION',
  actionUrl: null,
} as NotificationEmailProps;

export default NotificationEmail;

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
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#667eea',
  marginTop: '24px',
  marginBottom: '16px',
};

const body = {
  margin: '24px 0',
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '26px',
  color: '#555555',
  margin: '16px 0',
};

const messageBox = {
  backgroundColor: '#f8f9fa',
  borderLeft: '4px solid #667eea',
  padding: '20px',
  margin: '24px 0',
  borderRadius: '4px',
};

const typeLabel = {
  fontSize: '12px',
  fontWeight: '600' as const,
  color: '#667eea',
  letterSpacing: '1px',
  margin: '0 0 8px 0',
};

const messageText = {
  fontSize: '15px',
  color: '#333333',
  lineHeight: '24px',
  margin: '0',
};

const actionBox = {
  backgroundColor: '#d1ecf1',
  borderLeft: '4px solid #17a2b8',
  padding: '15px',
  margin: '20px 0',
  borderRadius: '4px',
};

const actionText = {
  margin: '0',
  color: '#0c5460',
  fontSize: '14px',
  lineHeight: '22px',
};

const actionLink = {
  color: '#0c5460',
  fontWeight: '600' as const,
};

const divider = {
  height: '1px',
  backgroundColor: '#e9ecef',
  margin: '24px 0',
  border: 'none',
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
