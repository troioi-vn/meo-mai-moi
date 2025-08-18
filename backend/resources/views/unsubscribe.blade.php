<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unsubscribe - {{ config('app.name') }}</title>
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
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 16px;
            margin-bottom: 30px;
        }
        .message {
            font-size: 18px;
            margin-bottom: 30px;
            line-height: 1.6;
        }
        .notification-type {
            background-color: #f8f9fa;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #007bff;
        }
        .button {
            display: inline-block;
            background-color: #dc3545;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 10px;
            border: none;
            cursor: pointer;
            font-size: 16px;
        }
        .button:hover {
            background-color: #c82333;
        }
        .button.secondary {
            background-color: #6c757d;
        }
        .button.secondary:hover {
            background-color: #5a6268;
        }
        .success {
            color: #28a745;
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
        .error {
            color: #721c24;
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            font-size: 14px;
            color: #666;
        }
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">{{ config('app.name') }}</div>
        <div class="subtitle">Email Notification Preferences</div>

        @if($isValid)
            <div id="unsubscribe-form">
                <div class="message">
                    You are about to unsubscribe from email notifications for:
                </div>

                <div class="notification-type">
                    <strong>{{ $notificationTypeLabel }}</strong>
                </div>

                <div class="message">
                    Are you sure you want to stop receiving these email notifications? 
                    You can always re-enable them in your account settings.
                </div>

                <button onclick="confirmUnsubscribe()" class="button">
                    Yes, Unsubscribe Me
                </button>
                
                <a href="{{ config('app.url') }}" class="button secondary">
                    Cancel
                </a>
            </div>

            <div id="success-message" class="hidden">
                <div class="success">
                    <strong>Success!</strong> You have been unsubscribed from "{{ $notificationTypeLabel }}" email notifications.
                </div>
                
                <div class="message">
                    You will no longer receive email notifications for this type of event. 
                    You can manage all your notification preferences in your account settings.
                </div>

                <a href="{{ config('app.url') }}" class="button secondary">
                    Return to {{ config('app.name') }}
                </a>
            </div>

            <div id="error-message" class="hidden">
                <div class="error">
                    <strong>Error!</strong> <span id="error-text">Something went wrong. Please try again.</span>
                </div>

                <a href="{{ config('app.url') }}" class="button secondary">
                    Return to {{ config('app.name') }}
                </a>
            </div>
        @else
            <div class="error">
                <strong>Invalid Request</strong><br>
                This unsubscribe link is invalid or has expired. Please check the link in your email or contact support if you continue to have issues.
            </div>

            <a href="{{ config('app.url') }}" class="button secondary">
                Return to {{ config('app.name') }}
            </a>
        @endif

        <div class="footer">
            <p>
                If you have any questions about your notification preferences, 
                please contact our support team or visit your account settings.
            </p>
        </div>
    </div>

    @if($isValid)
    <script>
        async function confirmUnsubscribe() {
            try {
                const response = await fetch('/api/unsubscribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        user: {{ $userId }},
                        type: '{{ $notificationType }}',
                        token: '{{ $token }}'
                    })
                });

                const data = await response.json();

                if (data.success) {
                    document.getElementById('unsubscribe-form').classList.add('hidden');
                    document.getElementById('success-message').classList.remove('hidden');
                } else {
                    document.getElementById('error-text').textContent = data.message || 'Something went wrong. Please try again.';
                    document.getElementById('unsubscribe-form').classList.add('hidden');
                    document.getElementById('error-message').classList.remove('hidden');
                }
            } catch (error) {
                document.getElementById('error-text').textContent = 'Network error. Please check your connection and try again.';
                document.getElementById('unsubscribe-form').classList.add('hidden');
                document.getElementById('error-message').classList.remove('hidden');
            }
        }
    </script>
    @endif
</body>
</html>