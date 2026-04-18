import { env } from '@/backend/config/env';
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
      from: 'deepinspect <no-reply@app.d3d.ai>',
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
    const { error } = await resend.emails.send({
      from: 'deepinspect <no-reply@app.d3d.ai>',
      to: emails,
      subject: `Maintenance Complete — ${systemCode}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
          <h2 style="color:#1a1a1a">Maintenance Ticket Closed</h2>
          <p><strong>System:</strong> ${systemCode}</p>
          <p><strong>Ticket:</strong> ${ticketTitle}</p>
          <p><strong>Status:</strong> ${systemCode} is now <span style="color:green;font-weight:bold">OPERATIONAL</span></p>
          ${note ? `<p><strong>Resolution Note:</strong> ${note}</p>` : ''}
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
          <p style="color:#666;font-size:12px">This is an automated notification from ReADI Control Center.</p>
        </div>
      `,
    });
    if (error) console.error('sendTicketClosedEmail error:', error);
  } catch (err) {
    console.error('sendTicketClosedEmail exception:', err);
  }
};

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
//       from: 'deepinspect <no-reply@support.d3d.ai>',
//       to: [email],
//       subject: 'Email Verification',
//       react: UserActivationEmail({
//         organization: 'DeepInspect',
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