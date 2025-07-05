# Email Verification Setup Guide

This guide explains how to configure email verification for the Malan chatbot application.

## What's Already Implemented

✅ **Complete email verification system** using Better Auth
✅ **Database schema** with verification tables
✅ **UI components** for verification flow
✅ **Email templates** and service configuration
✅ **Resend verification** functionality

## Email Provider Setup

### Option 1: Resend (Recommended)

1. **Sign up for Resend**: Go to [resend.com](https://resend.com) and create an account
2. **Get API Key**: Copy your API key from the dashboard
3. **Verify Domain**: Add and verify your domain in Resend
4. **Add Environment Variables**:

```bash
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

### Option 2: SendGrid

1. **Sign up for SendGrid**: Go to [sendgrid.com](https://sendgrid.com)
2. **Get API Key**: Create an API key with mail send permissions
3. **Verify Domain**: Add and verify your domain
4. **Add Environment Variables**:

```bash
# .env.local
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
```

### Option 3: SMTP (Gmail, etc.)

1. **Enable 2FA** on your Gmail account
2. **Generate App Password**: Go to Google Account settings → Security → App passwords
3. **Add Environment Variables**:

```bash
# .env.local
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

## Development vs Production

### Development

- Emails are logged to console instead of being sent
- No email provider setup required
- Perfect for testing the verification flow

### Production

- Requires a real email provider (Resend recommended)
- Must verify your domain
- Emails are actually sent to users

## Testing Email Verification

1. **Start the development server**: `npm run dev`
2. **Sign up with a new account**: Go to `/signup`
3. **Check console logs**: You'll see the verification email details
4. **Test verification link**: Copy the URL from console and visit it
5. **Verify success**: Should redirect to dashboard

## Customization

### Email Templates

Edit `src/lib/email-service.ts` to customize email templates.

### Verification Flow

- **Auto sign-in after verification**: Enabled by default
- **Verification required**: Enabled by default
- **Token expiration**: 24 hours (configurable in Better Auth)

### UI Customization

- **Signup success page**: `src/components/signup-form.tsx`
- **Login verification error**: `src/components/login-form.tsx`
- **Verification success page**: `src/app/verify-email/page.tsx`

## Troubleshooting

### Common Issues

1. **Emails not sending in production**
   - Check API key is correct
   - Verify domain is configured
   - Check email provider dashboard for errors

2. **Verification links not working**
   - Ensure `baseURL` is correct in auth config
   - Check that verification tokens are being generated
   - Verify database connection

3. **Users can't sign in after verification**
   - Check if `autoSignInAfterVerification` is enabled
   - Verify session configuration
   - Check for middleware issues

### Debug Mode

Enable debug logging by checking the console for:

- `✅ Verification email sent to user@example.com`
- `❌ Failed to send verification email to user@example.com`

## Security Considerations

- **Token expiration**: 24 hours by default
- **Rate limiting**: Better Auth handles this automatically
- **CSRF protection**: Built-in
- **Secure cookies**: Configured automatically

## Next Steps

1. **Choose an email provider** (Resend recommended)
2. **Add environment variables**
3. **Test the flow** in development
4. **Deploy and test** in production
5. **Monitor email delivery** through your provider's dashboard
