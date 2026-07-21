import { env } from '@/backend/config/env';
import { AdminPasswordChangedEmail } from '@/components/email-template/AdminPasswordChangedEmail';
import { CalendarEventCreatedEmail } from '@/components/email-template/CalendarEventCreatedEmail';
import { CalendarEventUpdatedEmail } from '@/components/email-template/CalendarEventUpdatedEmail';
import { InterventionEndedEmail } from '@/components/email-template/InterventionEndedEmail';
import { InterventionStartedEmail } from '@/components/email-template/InterventionStartedEmail';
import { MaintenanceAlertEmail } from '@/components/email-template/MaintenanceAlertEmail';
import { MaintenanceDueEmail } from '@/components/email-template/MaintenanceDueEmail';
import { MissionCompletedEmail } from '@/components/email-template/MissionCompletedEmail';
import { MissionCreatedEmail } from '@/components/email-template/MissionCreatedEmail';
import { MissionStartedEmail } from '@/components/email-template/MissionStartedEmail';
import { NotificationEmail } from '@/components/email-template/NotificationEmail';
import { TicketAssignedEmail } from '@/components/email-template/TicketAssignedEmail';
import { TicketClosedEmail } from '@/components/email-template/TicketClosedEmail';
import { TicketCreatedEmail } from '@/components/email-template/TicketCreatedEmail';
import { UserActivationEmail } from '@/components/email-template/UserActivationEmail';
import { render } from '@react-email/components';
import { Resend } from 'resend';

const resend = new Resend(env.RESEND_API_KEY);

interface ActivationEmailData {
  organization: string;
  username: string;
  passcode: string;
  loginlink: string;
}

export const sendUserActivationEmail = async (
  email: string,
  fullname: string,
  emailData: ActivationEmailData
) => {
  const emailHtml = await render(
    UserActivationEmail({
      organization: emailData.organization,
      username: emailData.username,
      passcode: emailData.passcode,
      loginlink: emailData.loginlink,
      fullname: fullname,
    })
  );

  const { data, error } = await resend.emails.send({
    from: 'ReADI <no-reply@readi.theun1t.com>',
    to: [email],
    subject: `ReADI Control Center Account for: ${fullname}`,
    html: emailHtml,
  });

  if (error) {
    console.error('[Resend] sendUserActivationEmail failed:', JSON.stringify(error));
    throw new Error(`Email delivery failed: ${(error as any).message ?? JSON.stringify(error)}`);
  }

  console.log('[Resend] activation email sent — id:', data?.id, '→', email);
  return {
    data,
    error: null,
    message: `Email sent successfully to ${email}`,
  };
};
export const sendTicketClosedEmail = async (
  emails: string[],
  systemCode: string,
  ticketTitle: string,
  ticketId: number,
  note?: string | null
) => {
  if (!emails.length) return;
  try {
    const emailHtml = await render(
      TicketClosedEmail({ systemCode, ticketTitle, ticketId, note })
    );

    const { error } = await resend.emails.send({
      from: 'ReADI <no-reply@readi.theun1t.com>',
      to: emails,
      subject: `Maintenance Complete — ${systemCode}`,
      html: emailHtml,
    });
    if (error) console.error('sendTicketClosedEmail error:', error);
  } catch (err) {
    console.error('sendTicketClosedEmail exception:', err);
  }
};

export const sendTicketCreatedEmail = async (
  emails: string[],
  systemCode: string,
  ticketTitle: string,
  ticketId: number,
  createdBy?: string,
  description?: string
) => {
  if (!emails.length) return;
  try {
    const emailHtml = await render(
      TicketCreatedEmail({ systemCode, ticketTitle, ticketId, createdBy, description })
    );

    const { error } = await resend.emails.send({
      from: 'ReADI <no-reply@readi.theun1t.com>',
      to: emails,
      subject: `New Maintenance Ticket — ${systemCode}`,
      html: emailHtml,
    });
    if (error) console.error('sendTicketCreatedEmail error:', error);
  } catch (err) {
    console.error('sendTicketCreatedEmail exception:', err);
  }
};

export const sendTicketAssignedEmail = async (
  emails: string[],
  systemCode: string,
  ticketTitle: string,
  ticketId: number,
  technicianName: string,
  assignedBy?: string,
  description?: string
) => {
  if (!emails.length) return;
  try {
    const emailHtml = await render(
      TicketAssignedEmail({ systemCode, ticketTitle, ticketId, technicianName, assignedBy, description })
    );

    const { error } = await resend.emails.send({
      from: 'ReADI <no-reply@readi.theun1t.com>',
      to: emails,
      subject: `Ticket Assigned — ${systemCode}`,
      html: emailHtml,
    });
    if (error) console.error('sendTicketAssignedEmail error:', error);
  } catch (err) {
    console.error('sendTicketAssignedEmail exception:', err);
  }
};

export const sendInterventionStartedEmail = async (
  emails: string[],
  systemCode: string,
  ticketTitle: string,
  ticketId: number,
  technicianName: string,
  startTime?: string,
  description?: string
) => {
  if (!emails.length) return;
  try {
    const emailHtml = await render(
      InterventionStartedEmail({ systemCode, ticketTitle, ticketId, technicianName, startTime, description })
    );

    const { error } = await resend.emails.send({
      from: 'ReADI <no-reply@readi.theun1t.com>',
      to: emails,
      subject: `Maintenance In Progress — ${systemCode}`,
      html: emailHtml,
    });
    if (error) console.error('sendInterventionStartedEmail error:', error);
  } catch (err) {
    console.error('sendInterventionStartedEmail exception:', err);
  }
};

export const sendInterventionEndedEmail = async (
  emails: string[],
  systemCode: string,
  ticketTitle: string,
  ticketId: number,
  technicianName: string,
  endTime?: string,
  notes?: string
) => {
  if (!emails.length) return;
  try {
    const emailHtml = await render(
      InterventionEndedEmail({ systemCode, ticketTitle, ticketId, technicianName, endTime, notes })
    );

    const { error } = await resend.emails.send({
      from: 'ReADI <no-reply@readi.theun1t.com>',
      to: emails,
      subject: `Intervention Ended — ${systemCode}`,
      html: emailHtml,
    });
    if (error) console.error('sendInterventionEndedEmail error:', error);
  } catch (err) {
    console.error('sendInterventionEndedEmail exception:', err);
  }
};

export const sendMaintenanceAlertEmail = async (
  emails: string[],
  systemCode: string,
  componentName: string,
  status: 'ALERT' | 'DUE',
  triggers: string[]
) => {
  if (!emails.length) return;
  try {
    const emailHtml = await render(
      MaintenanceAlertEmail({ systemCode, componentName, status, triggers })
    );

    const subject = status === 'DUE'
      ? `Maintenance Required — ${systemCode}`
      : `Maintenance Alert — ${systemCode}`;

    const { error } = await resend.emails.send({
      from: 'ReADI <no-reply@readi.theun1t.com>',
      to: emails,
      subject,
      html: emailHtml,
    });
    if (error) console.error('sendMaintenanceAlertEmail error:', error);
  } catch (err) {
    console.error('sendMaintenanceAlertEmail exception:', err);
  }
};

export const sendMaintenanceDueEmail = async (
  emails: string[],
  systemCode: string,
  componentName: string,
  triggers: string[]
) => {
  if (!emails.length) return;
  try {
    const emailHtml = await render(
      MaintenanceDueEmail({ systemCode, componentName, triggers })
    );

    const { error } = await resend.emails.send({
      from: 'ReADI <no-reply@readi.theun1t.com>',
      to: emails,
      subject: `Maintenance Due — ${systemCode}`,
      html: emailHtml,
    });
    if (error) console.error('sendMaintenanceDueEmail error:', error);
  } catch (err) {
    console.error('sendMaintenanceDueEmail exception:', err);
  }
};

export const sendAdminPasswordChangedEmail = async (
  email: string,
  fullname: string,
  username: string,
  newPassword: string,
  organization: string
) => {
  try {
    const emailHtml = await render(
      AdminPasswordChangedEmail({ organization, fullname, username, newPassword })
    );

    const { data, error } = await resend.emails.send({
      from: 'ReADI <no-reply@readi.theun1t.com>',
      to: [email],
      subject: `Your admin password has been updated — ${organization}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Resend API error:', error);
      return { data: null, error, message: 'Email sending failed' };
    }

    return { data, error: null, message: `Email sent successfully to ${email}` };
  } catch (error) {
    console.error('Email sending error:', error);
    return { data: null, error, message: 'Email sending failed' };
  }
};

export const sendNotificationEmail = async (
  emails: string[],
  title: string,
  message: string,
  notificationType?: string,
  actionUrl?: string | null
) => {
  if (!emails.length) return;
  try {
    const emailHtml = await render(
      NotificationEmail({ title, message, notificationType, actionUrl })
    );

    const { error } = await resend.emails.send({
      from: 'ReADI <no-reply@readi.theun1t.com>',
      to: emails,
      subject: title,
      html: emailHtml,
    });

    if (error) console.error('sendNotificationEmail error:', error);
  } catch (err) {
    console.error('sendNotificationEmail exception:', err);
  }
};

export const sendMissionCreatedEmail = async (
  emails: string[],
  missionCode: string,
  missionType: string,
  createdBy: string,
  scheduledDate?: string,
  description?: string
) => {
  if (!emails.length) return;
  try {
    const emailHtml = await render(
      MissionCreatedEmail({ missionCode, missionType, createdBy, scheduledDate, description })
    );

    const { error } = await resend.emails.send({
      from: 'ReADI <no-reply@readi.theun1t.com>',
      to: emails,
      subject: `New Mission Created — ${missionCode}`,
      html: emailHtml,
    });
    if (error) console.error('sendMissionCreatedEmail error:', error);
  } catch (err) {
    console.error('sendMissionCreatedEmail exception:', err);
  }
};

export const sendMissionStartedEmail = async (
  emails: string[],
  missionCode: string,
  missionType: string,
  startedBy: string,
  startTime: string,
  pilot?: string
) => {
  if (!emails.length) return;
  try {
    const emailHtml = await render(
      MissionStartedEmail({ missionCode, missionType, startedBy, startTime, pilot })
    );

    const { error } = await resend.emails.send({
      from: 'ReADI <no-reply@readi.theun1t.com>',
      to: emails,
      subject: `Mission Started — ${missionCode}`,
      html: emailHtml,
    });
    if (error) console.error('sendMissionStartedEmail error:', error);
  } catch (err) {
    console.error('sendMissionStartedEmail exception:', err);
  }
};

export const sendMissionCompletedEmail = async (
  emails: string[],
  missionCode: string,
  missionType: string,
  completedBy: string,
  completionTime: string,
  duration?: string,
  notes?: string
) => {
  if (!emails.length) return;
  try {
    const emailHtml = await render(
      MissionCompletedEmail({ missionCode, missionType, completedBy, completionTime, duration, notes })
    );

    const { error } = await resend.emails.send({
      from: 'ReADI <no-reply@readi.theun1t.com>',
      to: emails,
      subject: `Mission Completed — ${missionCode}`,
      html: emailHtml,
    });
    if (error) console.error('sendMissionCompletedEmail error:', error);
  } catch (err) {
    console.error('sendMissionCompletedEmail exception:', err);
  }
};

export const sendCalendarEventCreatedEmail = async (
  emails: string[],
  eventTitle: string,
  eventType: string,
  createdBy: string,
  startDate: string,
  endDate?: string,
  location?: string,
  description?: string
) => {
  if (!emails.length) return;
  try {
    const emailHtml = await render(
      CalendarEventCreatedEmail({ eventTitle, eventType, createdBy, startDate, endDate, location, description })
    );

    const { error } = await resend.emails.send({
      from: 'ReADI <no-reply@readi.theun1t.com>',
      to: emails,
      subject: `New Calendar Event — ${eventTitle}`,
      html: emailHtml,
    });
    if (error) console.error('sendCalendarEventCreatedEmail error:', error);
  } catch (err) {
    console.error('sendCalendarEventCreatedEmail exception:', err);
  }
};

export const sendCalendarEventUpdatedEmail = async (
  emails: string[],
  eventTitle: string,
  eventType: string,
  updatedBy: string,
  changes: string[],
  startDate?: string,
  endDate?: string,
  location?: string
) => {
  if (!emails.length) return;
  try {
    const emailHtml = await render(
      CalendarEventUpdatedEmail({ eventTitle, eventType, updatedBy, changes, startDate, endDate, location })
    );

    const { error } = await resend.emails.send({
      from: 'ReADI <no-reply@readi.theun1t.com>',
      to: emails,
      subject: `Calendar Event Updated — ${eventTitle}`,
      html: emailHtml,
    });
    if (error) console.error('sendCalendarEventUpdatedEmail error:', error);
  } catch (err) {
    console.error('sendCalendarEventUpdatedEmail exception:', err);
  }
};

// /**
//  * Send maintenance alert email to maintenance managers (OPM / RM / ADMIN).
//  * Uncomment when MaintenanceAlertEmail template is created under
//  * src/components/email-template/MaintenanceAlertEmail.tsx.
//  */
// export const sendMaintenanceAlertEmail = async (
//   emails: string[],
//   systemCode: string,
//   componentName: string,
//   status: 'ALERT' | 'DUE',
//   triggers: string[]
// ) => {
//   if (!emails.length) return;
//   try {
//     const { MaintenanceAlertEmail } = await import('@/components/email-template/MaintenanceAlertEmail');
//     const emailHtml = await render(MaintenanceAlertEmail({ systemCode, componentName, status, triggers }));
//     const subject = status === 'DUE'
//       ? `Maintenance Required — ${systemCode}`
//       : `Maintenance Alert — ${systemCode}`;
//     const { error } = await resend.emails.send({
//       from: 'ReADI <no-reply@readi.theun1t.com>',
//       to: emails,
//       subject,
//       html: emailHtml,
//     });
//     if (error) console.error('sendMaintenanceAlertEmail error:', error);
//   } catch (err) {
//     console.error('sendMaintenanceAlertEmail exception:', err);
//   }
// };

/**
 * Send verification email
 */
// export const sendVerifyMail = async (email: string, id: string, fullName: string) => {
//   try {
//     const jwt = await import('jsonwebtoken');
//     const token = jwt.sign(
//       { email: email, id: id },
//       serverEnv.NEXTAUTH_SECRET as string,
//       { expiresIn: 3600 * 24 }
//     );
//     const verifyLink = `${serverEnv.NEXTAUTH_URL}/api/user/verifyEmail?verificationToken=${token}`;

//     const { data, error } = await resend.emails.send({
//       from: 'ReADI <no-reply@readi.theun1t.com>',
//       to: [email],
//       subject: 'Email Verification',
//       react: UserActivationEmail({
//         organization: 'ReADI',
//         username: fullName,
//         passcode: token.substring(0, 10),
//         loginlink: verifyLink,
//         fullname: fullName,
//       }) as ReactElement,
//     });
//     return { data, error };
//   } catch (error) {
//     throw error;
//   }
// };