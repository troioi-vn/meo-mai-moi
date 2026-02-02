<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ __('messages.emails.subjects.waitlist', ['app' => config('app.name')]) }}</title>
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
        <h1>{{ __('messages.emails.waitlist.title') }}</h1>
    </div>

    <div class="content">
        <p>{{ __('messages.emails.common.hello_simple') }}</p>

        <p>{{ __('messages.emails.waitlist.intro', ['app' => config('app.name')]) }}</p>

        <h3>{{ __('messages.emails.waitlist.next_steps_title') }}</h3>
        <ul>
            <li>{{ __('messages.emails.waitlist.next_step_first') }}</li>
            <li>{{ __('messages.emails.waitlist.next_step_invite') }}</li>
            <li>{{ __('messages.emails.waitlist.next_step_inbox') }}</li>
        </ul>

        <div class="details">
            <h3>{{ __('messages.emails.waitlist.details_title') }}</h3>
            <p><strong>{{ __('messages.emails.waitlist.details_email') }}</strong> {{ $waitlistEntry->email }}</p>
            <p><strong>{{ __('messages.emails.waitlist.details_joined') }}</strong> {{ $waitlistEntry->created_at->format('F j, Y \a\t g:i A') }}</p>
            <p><strong>{{ __('messages.emails.waitlist.details_status') }}</strong> {{ ucfirst($waitlistEntry->status) }}</p>
        </div>

        <div class="highlight">
            <h3>{{ __('messages.emails.waitlist.stay_connected_title') }}</h3>
            <p>{{ __('messages.emails.waitlist.stay_connected_intro') }}</p>
            <ul>
                <li>{{ __('messages.emails.waitlist.stay_connected_social') }}</li>
                <li>{{ __('messages.emails.waitlist.stay_connected_share', ['app' => config('app.name')]) }}</li>
                <li>{{ __('messages.emails.waitlist.stay_connected_questions') }}</li>
            </ul>
        </div>

        <p>{{ __('messages.emails.waitlist.closing') }}</p>

        <div class="footer">
            <p>{{ __('messages.emails.common.best_regards') }},<br>{{ __('messages.emails.common.team', ['app' => config('app.name')]) }}</p>

            <hr style="margin: 20px 0;">

            <p><small>
                <strong>{{ __('messages.emails.waitlist.dont_want_wait_title') }}</strong> {{ __('messages.emails.waitlist.dont_want_wait_text') }}
            </small></p>

            <p><small>
                {{ __('messages.emails.waitlist.unsubscribe_text') }} <a href="{{ url('/unsubscribe?email=' . urlencode($waitlistEntry->email)) }}">{{ __('messages.emails.waitlist.click_here') }}</a>.
            </small></p>
        </div>
    </div>
</body>
</html>