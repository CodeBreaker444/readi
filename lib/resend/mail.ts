import { env } from '@/backend/config/env';
import { TicketClosedEmail } from '@/components/email-template/TicketClosedEmail';
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
  try {
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
      console.error('Resend API error:', error);
      return {
        data: null,
        error,
        message: 'Email sending failed',
      };
    }

    console.log('Email sent successfully:', data?.id);
    return {
      data,
      error: null,
      message: `Email sent successfully to ${email}`,
    };
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      data: null,
      error,
      message: 'Email sending failed',
    };
  }
};
export const sendTicketClosedEmail = async (
  emails: string[],
  systemCode: string,
  ticketTitle: string,
  note?: string | null
) => {
  if (!emails.length) return;
  try {
    const emailHtml = await render(
      TicketClosedEmail({ systemCode, ticketTitle, note })
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