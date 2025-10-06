<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>You're Invited!</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666; }
        .highlight { background: #FEF3C7; padding: 15px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 You're Invited!</h1>
    </div>
    
    <div class="content">
        <p>Hello there! 👋</p>
        
        <p><strong>{{ $inviter->name }}</strong> has invited you to join <strong>{{ config('app.name') }}</strong>.</p>
        
        <p>We're building an amazing community and would love to have you as part of it!</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ $invitationUrl }}" class="button">Accept Invitation</a>
        </div>
        
        <div class="highlight">
            <h3>Important Notes:</h3>
            <ul>
                <li>This invitation is personal to you and cannot be shared</li>
                <li>The invitation link will expire if not used</li>
                <li>If you have any questions, just reply to this email</li>
            </ul>
        </div>
        
        <p>We can't wait to welcome you to the community!</p>
        
        <div class="footer">
            <p>Best regards,<br>The {{ config('app.name') }} Team</p>
            
            <hr style="margin: 20px 0;">
            
            <p><small>
                If you're having trouble clicking the "Accept Invitation" button, copy and paste the URL below into your web browser:<br>
                <a href="{{ $invitationUrl }}">{{ $invitationUrl }}</a>
            </small></p>
        </div>
    </div>
</body>
</html>