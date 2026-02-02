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
        }
        .cat-info {
            background-color: #f8f9fa;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #007bff;
        }
        .cat-name {
            font-size: 18px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
        }
        .cat-details {
            color: #666;
            font-size: 14px;
        }
        .action-button {
            display: inline-block;
            background-color: #007bff;
            color: white;
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
        <div class="header">
            <div class="logo">{{ $appName }}</div>
            <div style="color: #666; font-size: 14px;">{{ __('messages.emails.app_description') }}</div>
        </div>

        <div class="content">
            @yield('content')
        </div>

        <div class="footer">
            <p>{{ __('messages.emails.password_reset.sent_from', ['app' => $appName]) }}. {{ __('messages.emails.password_reset.support') }}</p>

            <div class="unsubscribe">
                <p>
                    {{ __('messages.emails.waitlist.unsubscribe_text') }}
                    <a href="{{ $unsubscribeUrl }}">{{ __('messages.emails.common.unsubscribe') }}</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>