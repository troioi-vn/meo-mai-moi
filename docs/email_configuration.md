# Email Configuration Guide

This guide explains how to set up and use email configurations for dev.meo-mai-moi.com.

## Quick Setup

### Using the Artisan Command (Recommended)

```bash
# Set up configurations with your credentials
php artisan email:setup \
  --smtp-username=your-email@gmail.com \
  --smtp-password=your-app-password \
  --mailgun-api-key=key-your-actual-api-key \
  --activate=smtp

# Or set up without credentials (update later in admin panel)
php artisan email:setup
```

### Using Database Seeder

```bash
php artisan db:seed --class=EmailConfigurationSeeder
```

## Configuration Details

Both SMTP and Mailgun configurations are pre-configured with:

- **Domain**: `dev.meo-mai-moi.com`
- **From Email**: `mail@meo-mai-moi.com`
- **From Name**: `Meo Mai Moi`
- **Test Email**: `pavel@catarchy.space`

### SMTP Configuration

- **Host**: `smtp.gmail.com`
- **Port**: `587`
- **Encryption**: `tls`
- **Username**: Your Gmail address
- **Password**: Your Gmail app password

### Mailgun Configuration

- **Domain**: `dev.meo-mai-moi.com`
- **Endpoint**: `api.mailgun.net`
- **API Key**: Your Mailgun API key

## Admin Panel Usage

### Accessing Email Configurations

1. Go to `/admin/email-configurations`
2. View, edit, or create new configurations
3. Test configurations using the "Send Test Email" button

### Testing Email Configurations

1. Both SMTP and Mailgun now require a **Test Email Address**
2. Test emails are sent to `pavel@catarchy.space` by default
3. All test emails now appear in `/admin/email-logs`

### Viewing Email Logs

1. Go to `/admin/email-logs`
2. View all sent emails including test emails
3. Check delivery status and error messages
4. Retry failed emails if needed

## New Features

### ✅ Test Email Address for Mailgun

- Mailgun configurations now have a "Test Email Address" field
- Consistent experience between SMTP and Mailgun
- Required for sending test emails

### ✅ Test Emails in Email Logs

- All test emails are now logged in the database
- Visible in the admin panel at `/admin/email-logs`
- Proper status tracking (pending → sent/failed)
- Error messages for failed test emails

## Troubleshooting

### Test Email Not Received

1. Check `/admin/email-logs` for delivery status
2. Verify the test email address is correct
3. Check spam folder
4. Ensure email configuration is valid and active

### Database Connection Issues

If you see database connection errors:

1. Ensure your database is running
2. Check your `.env` file database settings
3. Run `php artisan migrate` if needed

### Gmail SMTP Issues

1. Use an App Password, not your regular password
2. Enable 2-factor authentication first
3. Generate App Password in Google Account settings

### Mailgun Issues

1. Verify your domain is properly configured in Mailgun
2. Check your API key is correct and active
3. Ensure your domain is verified in Mailgun dashboard

## Commands Reference

```bash
# Setup email configurations
php artisan email:setup

# Setup with credentials
php artisan email:setup --smtp-username=email@gmail.com --smtp-password=password

# Setup and activate SMTP
php artisan email:setup --activate=smtp

# Setup and activate Mailgun
php artisan email:setup --activate=mailgun

# Run email configuration seeder
php artisan db:seed --class=EmailConfigurationSeeder

# Check migration status
php artisan migrate:status

# Run migrations
php artisan migrate
```

## Security Notes

- Never commit real credentials to version control
- Use environment variables for sensitive data
- Regularly rotate API keys and passwords
- Use App Passwords for Gmail SMTP