# Email Setup for Password Reset

This guide explains how to configure email sending for the password reset functionality.

## Gmail Setup

The application is configured to send emails from `scanfvaibhav@gmail.com` using Gmail SMTP.

### Step 1: Enable 2-Step Verification

1. Go to your Google Account settings: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification**
3. Enable 2-Step Verification if not already enabled

### Step 2: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select **App** → **Mail**
3. Select **Device** → **Other (Custom name)**
4. Enter a name like "Denotes App"
5. Click **Generate**
6. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

### Step 3: Configure Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Email Configuration
EMAIL_FROM=scanfvaibhav@gmail.com
EMAIL_PASSWORD=your-16-character-app-password-here
# OR use EMAIL_APP_PASSWORD instead
EMAIL_APP_PASSWORD=your-16-character-app-password-here

# Base URL for reset links (required for password reset emails)
NEXTAUTH_URL=http://localhost:3000
```

**Important Notes:**
- Remove spaces from the app password when adding it to `.env.local`
- The app password should be 16 characters without spaces
- Never commit your `.env.local` file to version control

### Step 4: Test Email Sending

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the login page and click "Forgot password?"
3. Enter a registered email address
4. Check the email inbox (and spam folder) for the password reset link

## Troubleshooting

### Email Not Sending

1. **Check App Password**: Ensure you're using the App Password, not your regular Gmail password
2. **Check Environment Variables**: Verify `EMAIL_FROM` and `EMAIL_PASSWORD` are set correctly
3. **Check Console Logs**: Look for error messages in the server console
4. **Check Gmail Settings**: Ensure "Less secure app access" is not required (App Passwords should work)

### Common Errors

- **"Invalid login"**: Your app password is incorrect or expired
- **"Connection timeout"**: Check your internet connection and firewall settings
- **"Email not received"**: Check spam folder, verify email address is correct

## Production Setup

For production, consider using a dedicated email service:

- **SendGrid**: https://sendgrid.com/
- **Resend**: https://resend.com/
- **AWS SES**: https://aws.amazon.com/ses/
- **Mailgun**: https://www.mailgun.com/

To use a different email service, update the `lib/email.ts` file with the appropriate SMTP configuration.

## Security Best Practices

1. **Never commit credentials**: Always use environment variables
2. **Use App Passwords**: Never use your main Gmail password
3. **Rotate passwords**: Regularly update your app passwords
4. **Monitor usage**: Check your Google Account for unusual activity
5. **Rate limiting**: Consider implementing rate limiting for password reset requests

