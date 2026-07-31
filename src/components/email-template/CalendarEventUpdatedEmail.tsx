import {
  Body,
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


interface CalendarEventUpdatedEmailProps {
  eventTitle: string;
  eventType: string;
  updatedBy: string;
  changes: string[];
  startDate?: string;
  endDate?: string;
  location?: string;
}

export const CalendarEventUpdatedEmail = ({
  eventTitle,
  eventType,
  updatedBy,
  changes,
  startDate,
  endDate,
  location,
}: CalendarEventUpdatedEmailProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body style={main}>
        <Preview>Calendar event updated — {eventTitle}</Preview>

        <div style={outer}>
          {/* Header */}
          <div style={header}>
            <Img src='https://readi.theun1t.com/logo-sm.png' alt="ReADI" width={36} height={36} style={logoImg} />
            <span style={headerTitle}>ReADI Control Center</span>
          </div>

          {/* Card body */}
          <Container style={card}>
            <Section style={section}>
              {/* Status badge */}
              <div style={badgeWrap}>
                <span style={badge}>Event Updated</span>
              </div>

              <Text style={title}>Calendar event modified</Text>
              <Text style={paragraph}>
                The following calendar event has been updated with changes.
              </Text>

              {/* Event details */}
              <div style={dataCard}>
                <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={dataRow}>
                  <tbody>
                    <tr>
                      <td style={{ ...dataLabel, borderBottom: '1px solid #e0e0e0' }}>EVENT TITLE</td>
                      <td style={{ ...dataValue, borderBottom: '1px solid #e0e0e0' }}>{eventTitle}</td>
                    </tr>
                    <tr>
                      <td style={{ ...dataLabel, borderBottom: '1px solid #e0e0e0' }}>TYPE</td>
                      <td style={{ ...dataValue, borderBottom: '1px solid #e0e0e0' }}>{eventType}</td>
                    </tr>
                    <tr>
                      <td style={{ ...dataLabel, borderBottom: '1px solid #e0e0e0' }}>UPDATED BY</td>
                      <td style={{ ...dataValue, borderBottom: '1px solid #e0e0e0' }}>{updatedBy}</td>
                    </tr>
                    {startDate && (
                      <tr>
                        <td style={{ ...dataLabel, borderBottom: '1px solid #e0e0e0' }}>START DATE</td>
                        <td style={{ ...dataValue, borderBottom: '1px solid #e0e0e0' }}>{startDate}</td>
                      </tr>
                    )}
                    {endDate && (
                      <tr>
                        <td style={{ ...dataLabel, borderBottom: '1px solid #e0e0e0' }}>END DATE</td>
                        <td style={{ ...dataValue, borderBottom: '1px solid #e0e0e0' }}>{endDate}</td>
                      </tr>
                    )}
                    {location && (
                      <tr>
                        <td style={{ ...dataLabel, borderBottom: 'none' }}>LOCATION</td>
                        <td style={{ ...dataValue, borderBottom: 'none' }}>{location}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Changes list */}
              <div style={noteCard}>
                <Text style={noteTitle}>Changes made</Text>
                {changes.map((change, index) => (
                  <Text key={index} style={changeItem}>
                    • {change}
                  </Text>
                ))}
              </div>

              <div style={infoCard}>
                <Text style={infoText}>
                  Please review the updated event details in the calendar.
                </Text>
              </div>

              {/* View details link */}
              <div style={actionCard}>
                <Text style={actionLabel}>View calendar</Text>
                <Link href={`${process.env.APP_URL}/operations/calendar`} style={actionLink}>
                  View Calendar
                </Link>
              </div>

              <div style={divider} />

              <Text style={cautionText}>
                If you have any questions, please contact your operations manager.
              </Text>
            </Section>
          </Container>

          {/* Footer */}
          <div style={footer}>
            <Text style={footerText}>ReADI Control Center</Text>
            <Text style={footerText}>This is an automated message — please do not reply.</Text>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} ReADI Control Center. All rights reserved.
            </Text>
          </div>
        </div>
      </Body>
    </Tailwind>
  </Html>
);

CalendarEventUpdatedEmail.PreviewProps = {
  eventTitle: 'Team Training Session',
  eventType: 'Training',
  updatedBy: 'John Smith',
  changes: ['Start time changed from 09:00 to 10:00', 'Location changed to Training Room B'],
  startDate: '2024-01-15 10:00',
  endDate: '2024-01-15 17:00',
  location: 'Training Room B',
} as CalendarEventUpdatedEmailProps;

export default CalendarEventUpdatedEmail;

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

const badgeWrap = {
  marginBottom: '12px',
};

const badge = {
  backgroundColor: '#fef3c7',
  color: '#92400e',
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '0.5px',
  textTransform: 'uppercase' as const,
  padding: '4px 10px',
  borderRadius: '20px',
  display: 'inline-block',
};

const title = {
  fontSize: '22px',
  fontWeight: '600',
  color: '#202124',
  margin: '0 0 16px',
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
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const dataLabel = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#5f6368',
  letterSpacing: '0.6px',
  textTransform: 'uppercase' as const,
  textAlign: 'left' as const,
  padding: '14px 8px 14px 18px',
  whiteSpace: 'nowrap' as const,
};

const dataValue = {
  fontSize: '14px',
  color: '#202124',
  fontWeight: '500',
  textAlign: 'right' as const,
  padding: '14px 18px 14px 8px',
};

const noteCard = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  padding: '16px 18px',
  margin: '16px 0',
};

const noteTitle = {
  fontSize: '11px',
  fontWeight: '700',
  color: '#5f6368',
  letterSpacing: '0.5px',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px',
};

const changeItem = {
  fontSize: '14px',
  color: '#3c4043',
  lineHeight: '22px',
  margin: '4px 0',
};

const infoCard = {
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '6px',
  padding: '14px 18px',
  margin: '16px 0',
};

const infoText = {
  fontSize: '13px',
  color: '#1e40af',
  lineHeight: '20px',
  margin: '0',
};

const actionCard = {
  backgroundColor: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '6px',
  padding: '14px 18px',
  margin: '16px 0',
};

const actionLabel = {
  fontSize: '11px',
  fontWeight: '700',
  color: '#1e40af',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 6px',
};

const actionLink = {
  fontSize: '13px',
  color: '#7c3aed',
  textDecoration: 'none',
  wordBreak: 'break-all' as const,
  fontWeight: '500',
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
