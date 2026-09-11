const APP_NAME = 'Tuna Bank LTD';
const senderEmail = process.env.BREVO_SENDER_EMAIL ?? 'tunabankltd@gmail.com';
const senderName = process.env.BREVO_SENDER_NAME ?? APP_NAME;

export async function sendVerificationEmail(to: string, clientName: string, link: string): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
        throw new Error('BREVO_API_KEY is not configured');
    }

    const message = `<h2>Welcome to ${APP_NAME}!</h2>
                    <p>Dear ${clientName},</p>
                    <p>Thank you for choosing us for your banking needs.</p>
                    <p>Your money is in good paws!</p>
                    <p>Please verify your email:
                    <a href="${link}">Verify Email</a></p>
                    <p>Always here for you,</p>
                    <p>Tuna Bank LTD</p>`;
    
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            sender: {
                name: senderName,
                email: senderEmail,
            },
            to: [{ email: to, name: clientName }],
            subject: 'Verify your email',
            htmlContent: message,
        }),
    });

    if (!response.ok) {
        throw new Error(`Brevo failed (${response.status}): ${await response.text()}`);
    }
}
