<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ __('messages.emails.subjects.invitation', ['app' => config('app.name')]) }}</title>
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
        <h1>{{ __('messages.emails.invitation.title') }}</h1>
    </div>

    <div class="content">
        <p>{{ __('messages.emails.common.hello_simple') }} 👋</p>

        <p><strong>{{ $inviter->name }}</strong> {{ __('messages.emails.invitation.intro', ['app' => config('app.name'), 'inviter' => '']) }}</p>

        <p>{{ __('messages.emails.invitation.community') }}</p>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ $invitationUrl }}" class="button" style="display: inline-block; background-color: #4F46E5; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">{{ __('messages.emails.common.accept_invitation') }}</a>
        </div>

        <div class="highlight">
            <h3>{{ __('messages.emails.invitation.notes_title') }}:</h3>
            <ul>
                <li>{{ __('messages.emails.invitation.note_personal') }}</li>
                <li>{{ __('messages.emails.invitation.note_expire') }}</li>
                <li>{{ __('messages.emails.invitation.note_questions') }}</li>
            </ul>
        </div>

        <p>{{ __('messages.emails.invitation.closing') }}</p>

        <div class="footer">
            <p>{{ __('messages.emails.common.best_regards') }},<br>{{ __('messages.emails.common.team', ['app' => config('app.name')]) }}</p>

            <hr style="margin: 20px 0;">

            <p><small>
                {{ __('messages.emails.common.button_trouble', ['action' => __('messages.emails.common.accept_invitation')]) }}<br>
                <a href="{{ $invitationUrl }}">{{ $invitationUrl }}</a>
            </small></p>
        </div>
    </div>
</body>
</html>