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

interface TicketClosedEmailProps {
  systemCode: string;
  ticketTitle: string;
  note?: string | null;
}

export const TicketClosedEmail = ({
  systemCode,
  ticketTitle,
  note,
}: TicketClosedEmailProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body style={main}>
        <Preview>Maintenance Complete — {systemCode} is now operational</Preview>
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

          <Heading style={heading}>✅ Maintenance Ticket Closed</Heading>

          <Section style={body}>
            <Text style={paragraph}>
              The following maintenance ticket has been resolved and the system is back online.
            </Text>

            <div style={detailsBox}>
              <Text style={detailLabel}>🛸 System:</Text>
              <Text style={detailValue}>{systemCode}</Text>

              <Text style={{ ...detailLabel, marginTop: '16px' }}>🎫 Ticket:</Text>
              <Text style={detailValue}>{ticketTitle}</Text>

              <Text style={{ ...detailLabel, marginTop: '16px' }}>📊 Status:</Text>
              <Text style={statusValue}>OPERATIONAL</Text>
            </div>

            {note && (
              <div style={noteBox}>
                <Text style={noteLabel}>📝 Resolution Note:</Text>
                <Text style={noteText}>{note}</Text>
              </div>
            )}

            <div style={infoBox}>
              <Text style={infoText}>
                📌 <strong>Note:</strong> This system has been marked as operational. You may now assign it to operations.
              </Text>
            </div>

            <Hr style={divider} />

            <Text style={paragraph}>
              If you have any questions, please contact your system administrator.
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

TicketClosedEmail.PreviewProps = {
  systemCode: 'DRN-001',
  ticketTitle: 'Maintenance - System #42',
  note: 'Replaced motor and recalibrated sensors.',
} as TicketClosedEmailProps;

export { TicketClosedEmail as default };

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

const detailsBox = {
  backgroundColor: '#f8f9fa',
  borderLeft: '4px solid #667eea',
  padding: '20px',
  margin: '24px 0',
  borderRadius: '4px',
};

const detailLabel = {
  fontSize: '15px',
  fontWeight: '600' as const,
  color: '#333333',
  margin: '8px 0',
};

const detailValue = {
  fontSize: '15px',
  color: '#555555',
  marginLeft: '20px',
  margin: '4px 0 4px 20px',
};

const statusValue = {
  fontFamily: '"Courier New", monospace',
  backgroundColor: '#ffffff',
  padding: '8px 12px',
  borderRadius: '4px',
  display: 'inline-block',
  marginTop: '8px',
  fontSize: '16px',
  letterSpacing: '1px',
  color: '#28a745',
  fontWeight: 'bold' as const,
  marginLeft: '20px',
};

const noteBox = {
  backgroundColor: '#f8f9fa',
  borderLeft: '4px solid #6c757d',
  padding: '20px',
  margin: '24px 0',
  borderRadius: '4px',
};

const noteLabel = {
  fontSize: '15px',
  fontWeight: '600' as const,
  color: '#333333',
  margin: '0 0 8px 0',
};

const noteText = {
  fontSize: '15px',
  color: '#555555',
  margin: '4px 0',
  lineHeight: '24px',
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
