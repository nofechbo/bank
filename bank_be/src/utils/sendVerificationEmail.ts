import nodemailer from 'nodemailer';

const APP_NAME = "Tuna Bank LTD"
const from = `${APP_NAME} <${process.env.GMAIL_ADDRESS}>`;

export async function sendVerificationEmail(to: string, clientName: string, link: string): Promise<void> {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_ADDRESS,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });

    const message = `<h2>Welcome to ${APP_NAME}!</h2>
                    <p>Dear ${clientName},</p>
                    <p>Thank you for choosing us for your banking needs.</p>
                    <p>Your money is in good paws!</p>
                    <p>Please verify your email:
                    <a href="${link}">Verify Email</a></p>
                    <p>Always here for you,</p>
                    <p>Tuna Bank LTD</p>`;
    
    const info = await transporter.sendMail({
        from,
        to,
        subject: `verify your email`,
        html: message,
    });
}