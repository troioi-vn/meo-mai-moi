<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>You're on the waitlist!</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .details { background: #E5F3FF; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666; }
        .highlight { background: #FEF3C7; padding: 15px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 You're on the waitlist!</h1>
    </div>
    
    <div class="content">
        <p>Hello there!</p>
        
        <p>Thank you for your interest in <strong>{{ config('app.name') }}</strong>! We've successfully added you to our waitlist.</p>
        
        <h3>What happens next?</h3>
        <ul>
            <li>You'll be among the first to know when we have space available</li>
            <li>We'll send you an invitation as soon as possible</li>
            <li>Keep an eye on your inbox for updates</li>
        </ul>
        
        <div class="details">
            <h3>Your Details</h3>
            <p><strong>Email:</strong> {{ $waitlistEntry->email }}</p>
            <p><strong>Joined waitlist:</strong> {{ $waitlistEntry->created_at->format('F j, Y \a\t g:i A') }}</p>
            <p><strong>Status:</strong> {{ ucfirst($waitlistEntry->status) }}</p>
        </div>
        
        <div class="highlight">
            <h3>Stay Connected</h3>
            <p>While you wait, feel free to:</p>
            <ul>
                <li>Follow us on social media for updates</li>
                <li>Share {{ config('app.name') }} with friends who might be interested</li>
                <li>Reply to this email if you have any questions</li>
            </ul>
        </div>
        
        <p>We're excited to welcome you to the community soon!</p>
        
        <div class="footer">
            <p>Best regards,<br>The {{ config('app.name') }} Team</p>
            
            <hr style="margin: 20px 0;">
            
            <p><small>
                <strong>Don't want to wait?</strong> If you have a friend who's already a member, ask them to send you an invitation!
            </small></p>
            
            <p><small>
                To unsubscribe from waitlist updates, <a href="{{ url('/unsubscribe?email=' . urlencode($waitlistEntry->email)) }}">click here</a>.
            </small></p>
        </div>
    </div>
</body>
</html>