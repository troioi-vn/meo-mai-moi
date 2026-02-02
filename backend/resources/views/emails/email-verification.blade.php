@component('mail::message')

# {{ __('messages.emails.verification.title') }}

{{ __('messages.emails.common.hi', ['name' => $user->name ?? __('messages.emails.common.someone')]) }}

{{ __('messages.emails.verification.thanks_registering', ['app' => $appName]) }}

@component('mail::button', ['url' => $verificationUrl])
{{ __('messages.emails.common.verify_email') }}
@endcomponent

{{ __('messages.emails.verification.expire', ['minutes' => 60]) }}

{{ __('messages.emails.verification.ignore', ['app' => $appName]) }}

{{ __('messages.emails.common.thanks') }}<br>
{{ __('messages.emails.common.team', ['app' => $appName]) }}

---

{{ __('messages.emails.common.button_trouble', ['action' => __('messages.emails.common.verify_email')]) }}
{{ $verificationUrl }}

@endcomponent