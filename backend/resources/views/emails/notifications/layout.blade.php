<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $appName }}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .email-container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
        }
        .content {
            margin-bottom: 30px;
        }
        .pet-info {
            background-color: #f8f9fa;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #007bff;
        }
        .pet-name {
            font-size: 18px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
        }
        .pet-details {
            color: #666;
            font-size: 14px;
        }
        .cta-container {
            text-align: center;
            margin: 30px 0;
        }
        .footer-note {
            font-size: 12px;
            color: #666;
            margin-top: 20px;
            word-break: break-word;
        }
        .action-button {
            display: inline-block;
            background-color: #007bff;
            color: #ffffff !important;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
        }
        .action-button:hover {
            background-color: #0056b3;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
        .unsubscribe {
            margin-top: 20px;
            font-size: 11px;
            color: #999;
        }
        .unsubscribe a {
            color: #999;
            text-decoration: underline;
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
        }
        .message {
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="content">
            @yield('content')
        </div>

        <div class="footer">
            <div class="logo">{{ $appName }}</div>

            <p>{{ __('messages.emails.common.sent_from', ['app' => $appName]) }}</p>

            <div class="unsubscribe">
                <p>
                    {{ __('messages.emails.common.notification_preferences_footer_before') }}
                    <a href="{{ $settingsNotificationsUrl }}">{{ __('messages.emails.common.notification_preferences_settings') }}</a>
                    {{ __('messages.emails.common.notification_preferences_footer_middle') }}
                    <a href="{{ $unsubscribeUrl }}">{{ __('messages.emails.common.unsubscribe') }}</a>
                    {{ __('messages.emails.common.notification_preferences_footer_after') }}
                </p>
            </div>
        </div>
    </div>
</body>
</html>
