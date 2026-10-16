import { Body, Container, Head, Html, Img, Link, Preview, Section, Tailwind, Text } from '@react-email/components';

export interface EventEmailAttachment {
  name: string;
  isImage: boolean;
  /** Inline link used as the image source. */
  previewUrl: string;
  downloadUrl: string;
}

export interface EventReportedEmailProps {
  eventLabel: string;
  rows: { label: string; value: string }[];
  notes?: string | null;
  mapImageUrl?: string | null;
  mapLinkUrl?: string | null;
  attachments: EventEmailAttachment[];
  viewUrl: string;
}

export const EventReportedEmail = ({ eventLabel, rows, notes, mapImageUrl, mapLinkUrl, attachments, viewUrl }: EventReportedEmailProps) => {
  const images = attachments.filter((a) => a.isImage);
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body style={main}>
          <Preview>New event reported: {eventLabel}</Preview>

          <div style={outer}>
            <div style={header}>
              <Img src="https://readi.theun1t.com/logo-sm.png" alt="ReADI" width={36} height={36} style={logoImg} />
              <span style={headerTitle}>ReADI Control Center</span>
            </div>

            <Container style={card}>
              <Section style={section}>
                <div style={badgeWrap}>
                  <span style={badge}>Event logbook</span>
                </div>
                <Text style={title}>New event reported: {eventLabel}</Text>

                <a href={viewUrl} style={button}>
                  View event in ReADI
                </a>
                <Text style={hint}>You need to be signed in with access to the event logbook.</Text>

                <div style={dataCard}>
                  <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.label}>
                          <td style={{ ...dataLabel, ...(i < rows.length - 1 ? rowBorder : {}) }}>{r.label}</td>
                          <td style={{ ...dataValue, ...(i < rows.length - 1 ? rowBorder : {}) }}>{r.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {notes && (
                  <>
                    <Text style={sectionLabel}>Notes</Text>
                    <div style={notesCard}>
                      <Text style={notesText}>{notes}</Text>
                    </div>
                  </>
                )}

                {mapImageUrl && (
                  <>
                    <Text style={sectionLabel}>Location</Text>
                    <a href={mapLinkUrl ?? undefined}>
                      <Img src={mapImageUrl} alt="Map of the event location" width={536} style={mapImg} />
                    </a>
                    {mapLinkUrl && (
                      <Text style={hint}>
                        <Link href={mapLinkUrl} style={link}>
                          Open in Google Maps
                        </Link>
                      </Text>
                    )}
                  </>
                )}
                {!mapImageUrl && mapLinkUrl && (
                  <Text style={hint}>
                    <Link href={mapLinkUrl} style={link}>
                      Open the location in Google Maps
                    </Link>
                  </Text>
                )}

                {attachments.length > 0 && (
                  <>
                    <Text style={sectionLabel}>Attachments</Text>
                    {images.map((a) => (
                      <div key={a.downloadUrl} style={imageBlock}>
                        <Img src={a.previewUrl} alt={a.name} width={536} style={photo} />
                        <Text style={fileLine}>
                          {a.name} —{' '}
                          <Link href={a.downloadUrl} style={link}>
                            Download
                          </Link>
                        </Text>
                      </div>
                    ))}
                    {attachments
                      .filter((a) => !a.isImage)
                      .map((a) => (
                        <Text key={a.downloadUrl} style={fileLine}>
                          {a.name} —{' '}
                          <Link href={a.downloadUrl} style={link}>
                            Download
                          </Link>
                        </Text>
                      ))}
                    <Text style={hint}>Download links are valid for 7 days. Later, open the event in ReADI.</Text>
                  </>
                )}

                <div style={divider} />
                <Text style={caution}>
                  You received this email because you were selected as a recipient of this event. Changes made to the event afterwards are not sent by email.
                </Text>
              </Section>
            </Container>

            <div style={footer}>
              <Text style={footerText}>ReADI Control Center</Text>
              <Text style={footerText}>This is an automated message — please do not reply.</Text>
              <Text style={footerText}>&copy; {new Date().getFullYear()} ReADI Control Center. All rights reserved.</Text>
            </div>
          </div>
        </Body>
      </Tailwind>
    </Html>
  );
};

EventReportedEmail.PreviewProps = {
  eventLabel: 'Bird activity',
  rows: [
    { label: 'Takeoff time', value: '2026-10-16 10:30 UTC' },
    { label: 'Drone', value: 'DJI Matrice (M300-01)' },
    { label: 'Pilot', value: 'Jane Pilot' },
  ],
  notes: 'Flock crossing the route.',
  mapImageUrl: null,
  mapLinkUrl: 'https://www.google.com/maps?q=45.4,9.1',
  attachments: [],
  viewUrl: 'http://localhost:3000/logbooks/event-logbook?event=1',
} as EventReportedEmailProps;

export default EventReportedEmail;

const fontStack = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';

const main = { backgroundColor: '#f6f8fc', fontFamily: fontStack };
const outer = { maxWidth: '600px', margin: '32px auto' };
const header = { backgroundColor: '#7c3aed', borderRadius: '8px 8px 0 0', padding: '20px 32px', display: 'flex', alignItems: 'center', gap: '12px' };
const logoImg = { objectFit: 'contain' as const, filter: 'brightness(0) invert(1)' };
const headerTitle = { color: '#ffffff', fontSize: '18px', fontWeight: '600', letterSpacing: '-0.2px' };
const card = { backgroundColor: '#ffffff', borderRadius: '0 0 8px 8px', border: '1px solid #e0e0e0', borderTop: 'none' };
const section = { padding: '32px 32px 24px' };
const badgeWrap = { marginBottom: '12px' };
const badge = { backgroundColor: '#ede9fe', color: '#5b21b6', fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' as const, padding: '4px 10px', borderRadius: '20px', display: 'inline-block' };
const title = { fontSize: '22px', fontWeight: '600', color: '#202124', margin: '0 0 16px', lineHeight: '1.3' };
const button = { display: 'inline-block', backgroundColor: '#7c3aed', color: '#ffffff', fontSize: '14px', fontWeight: '600', textDecoration: 'none', padding: '10px 18px', borderRadius: '6px' };
const hint = { fontSize: '12px', color: '#5f6368', margin: '8px 0 16px', lineHeight: '18px' };
const dataCard = { backgroundColor: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: '6px', margin: '8px 0 16px' };
const rowBorder = { borderBottom: '1px solid #e0e0e0' };
const dataLabel = { padding: '10px 14px', fontSize: '11px', fontWeight: '700', color: '#5f6368', letterSpacing: '0.5px', textTransform: 'uppercase' as const, width: '130px', verticalAlign: 'top' as const };
const dataValue = { padding: '10px 14px', fontSize: '14px', color: '#202124', verticalAlign: 'top' as const };
const sectionLabel = { fontSize: '11px', fontWeight: '700', color: '#5f6368', letterSpacing: '0.5px', textTransform: 'uppercase' as const, margin: '8px 0 6px' };
const notesCard = { backgroundColor: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '12px 14px', margin: '0 0 16px' };
const notesText = { fontSize: '14px', color: '#202124', margin: '0', lineHeight: '22px', whiteSpace: 'pre-line' as const, wordBreak: 'break-word' as const };
const mapImg = { width: '100%', height: 'auto', borderRadius: '6px', border: '1px solid #e0e0e0', display: 'block' };
const imageBlock = { margin: '0 0 14px' };
const photo = { width: '100%', height: 'auto', borderRadius: '6px', border: '1px solid #e0e0e0', display: 'block' };
const fileLine = { fontSize: '13px', color: '#202124', margin: '6px 0', wordBreak: 'break-word' as const };
const link = { color: '#7c3aed', textDecoration: 'underline', fontWeight: '500' };
const divider = { height: '1px', backgroundColor: '#e8eaed', margin: '24px 0' };
const caution = { fontSize: '13px', color: '#5f6368', margin: '0', lineHeight: '20px' };
const footer = { textAlign: 'center' as const, padding: '16px 32px 8px' };
const footerText = { fontSize: '12px', color: '#9aa0a6', margin: '2px 0', lineHeight: '18px' };
