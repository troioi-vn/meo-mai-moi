@component('mail::message')
# Welcome to {{ $appName }}!

Hi {{ $user->name }},

Thank you for registering with {{ $appName }}! To complete your registration and start managing your cat's care, please verify your email address by clicking the button below.

@component('mail::button', ['url' => $verificationUrl])
Verify Email Address
@endcomponent

This verification link will expire in 60 minutes for security reasons.

If you didn't create an account with {{ $appName }}, you can safely ignore this email.

Thanks,<br>
The {{ $appName }} Team

---

If you're having trouble clicking the "Verify Email Address" button, copy and paste the URL below into your web browser:
{{ $verificationUrl }}
@endcomponent