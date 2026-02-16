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