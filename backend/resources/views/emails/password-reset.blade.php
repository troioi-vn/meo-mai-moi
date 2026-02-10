<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ __('messages.emails.subjects.password_reset', ['app' => config('app.name')]) }}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
            line-height: 1.6 !important;
            color: #333333 !important;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa !important;
        }
        .email-container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
        }
        .content {
            margin-bottom: 30px;
            color: #333333 !important;
        }
        .content p {
            color: #333333 !important;
        }
        .reset-info {
            background-color: #f8f9fa;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #007bff;
        }
        .reset-button {
            display: inline-block;
            background-color: #007bff !important;
            color: #ffffff !important;
            text-decoration: none !important;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
        }
        .reset-button:hover {
            background-color: #0056b3 !important;
            color: #ffffff !important;
        }
        .security-notice {
            background-color: #fff3cd;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            border-left: 4px solid #ffc107;
            font-size: 14px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            font-size: 14px;
            color: #666;
        }
        .small-text {
            font-size: 12px;
            color: #888;
            margin-top: 15px;
        }
        .url-fallback {
            word-break: break-all;
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            color: #666;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">{{ config('app.name') }}</div>
            <div>{{ __('messages.emails.password_reset.title') }}</div>
        </div>

        <div class="content" style="color: #333333;">
            <h2 style="color: #333333;">{{ __('messages.emails.common.hello', ['name' => $user->name]) }}</h2>

            <p style="color: #333333;">{{ __('messages.emails.password_reset.intro', ['app' => config('app.name')]) }}</p>

            <div class="reset-info" style="color: #333333;">
                <p style="color: #333333;"><strong>{{ __('messages.emails.password_reset.account') }}</strong> {{ $user->email }}</p>
                <p style="color: #333333;"><strong>{{ __('messages.emails.password_reset.requested_at') }}</strong> {{ now()->format('M d, Y \a\t g:i A') }}</p>
            </div>

            <p style="color: #333333;">{{ __('messages.emails.password_reset.click_button') }}</p>

            <div style="text-align: center;">
                <a href="{{ $resetUrl }}" class="reset-button" style="color: #ffffff !important;">{{ __('messages.emails.common.reset_password') }}</a>
            </div>

            <p style="color: #333333;">{{ __('messages.emails.common.button_trouble', ['action' => __('messages.emails.common.reset_password')]) }}</p>
            <div class="url-fallback" style="color: #333333;">{{ $resetUrl }}</div>

            <div class="security-notice" style="color: #333333;">
                <strong style="color: #333333;">{{ __('messages.emails.password_reset.notice_title') }}</strong><br>
                • {{ __('messages.emails.password_reset.notice_expire', ['minutes' => 60]) }}<br>
                • {{ __('messages.emails.password_reset.notice_ignore') }}<br>
                • {{ __('messages.emails.password_reset.notice_safety') }}
            </div>

            <p style="color: #333333;">{{ __('messages.emails.password_reset.support') }}</p>
        </div>

        <div class="footer" style="color: #666666;">
            <p style="color: #666666;">{{ __('messages.emails.password_reset.sent_from', ['app' => config('app.name')]) }}</p>
            <p class="small-text" style="color: #888888;">
                {{ __('messages.emails.password_reset.unsubscribe_notice') }}
            </p>
        </div>
    </div>
</body>
</html>