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

import { LOGO_URL } from './logo-base64';

interface TicketClosedEmailProps {
  systemCode: string;
  ticketTitle: string;
  ticketId: number;
  note?: string | null;
}

export const TicketClosedEmail = ({
  systemCode,
  ticketTitle,
  ticketId,
  note,
}: TicketClosedEmailProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body style={main}>
        <Preview>Maintenance complete — {systemCode} is now operational</Preview>

        <div style={outer}>
          {/* Header */}
          <div style={header}>
            <Img src={LOGO_URL} alt="ReADI" width={36} height={36} style={logoImg} />
            <span style={headerTitle}>ReADI Control Center</span>
          </div>

          {/* Card body */}
          <Container style={card}>
            <Section style={section}>
              {/* Status badge */}
              <div style={badgeWrap}>
                <span style={badge}>Ticket Closed</span>
              </div>

              <Text style={title}>Maintenance ticket resolved</Text>
              <Text style={paragraph}>
                The following maintenance ticket has been closed and the system is back online.
              </Text>

              {/* Ticket details */}
              <div style={dataCard}>
                <div style={dataRow}>
                  <span style={dataLabel}>SYSTEM</span>
                  <span style={dataValue}>{systemCode}</span>
                </div>
                <div style={dataRowBorder} />
                <div style={dataRow}>
                  <span style={dataLabel}>TICKET</span>
                  <span style={dataValue}>{ticketTitle}</span>
                </div>
                <div style={dataRowBorder} />
                <div style={dataRow}>
                  <span style={dataLabel}>STATUS</span>
                  <span style={statusChip}>Operational</span>
                </div>
              </div>

              {/* Optional resolution note */}
              {note && (
                <div style={noteCard}>
                  <Text style={noteTitle}>Resolution note</Text>
                  <Text style={noteBody}>{note}</Text>
                </div>
              )}

              <div style={infoCard}>
                <Text style={infoText}>
                  This system has been marked as operational and can now be assigned to operations.
                </Text>
              </div>

              {/* View details link */}
              <div style={actionCard}>
                <Text style={actionLabel}>View ticket details</Text>
                <Link href={`${process.env.APP_URL || 'https://app.readi.ai'}/systems/maintenance-tickets`} style={actionLink}>
                  View Ticket #{ticketId}
                </Link>
              </div>

              <div style={divider} />

              <Text style={cautionText}>
                If you have any questions, please contact your system administrator.
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

TicketClosedEmail.PreviewProps = {
  systemCode: 'DRN-001',
  ticketTitle: 'Motor replacement — System #42',
  ticketId: 123,
  note: 'Replaced motor and recalibrated sensors.',
} as TicketClosedEmailProps;

export default TicketClosedEmail;

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

const badgeWrap = {
  marginBottom: '12px',
};

const badge = {
  backgroundColor: '#d1fae5',
  color: '#065f46',
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

const statusChip = {
  backgroundColor: '#d1fae5',
  color: '#065f46',
  fontSize: '12px',
  fontWeight: '600',
  padding: '3px 10px',
  borderRadius: '12px',
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

const noteBody = {
  fontSize: '14px',
  color: '#3c4043',
  lineHeight: '22px',
  margin: '0',
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
