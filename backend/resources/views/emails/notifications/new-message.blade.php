@extends('emails.notifications.layout')

@section('content')
    <div class="greeting">
        {{ __('messages.emails.common.hello', ['name' => $user->name]) }}
    </div>

    <div class="message">
        {{ __('messages.emails.new_message.intro', ['sender' => $sender_name ?? __('messages.emails.common.someone')]) }}
    </div>

    @if(isset($message_content))
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3490dc; font-style: italic;">
            "{!! nl2br(htmlspecialchars($message_content, ENT_COMPAT, 'UTF-8', false)) !!}"
        </div>
    @elseif(isset($preview))
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3490dc; font-style: italic;">
            "{!! nl2br(htmlspecialchars($preview, ENT_COMPAT, 'UTF-8', false)) !!}..."
        </div>
    @endif

    <div class="cta-container">
        <a href="{{ $actionUrl }}" class="action-button" style="color: #ffffff !important;">
            {{ __('messages.emails.common.view_message') }}
        </a>
    </div>

    <div class="footer-note">
        {{ __('messages.emails.common.button_trouble', ['action' => __('messages.emails.common.view_message')]) }}<br>
        <a href="{{ $actionUrl }}">{{ $actionUrl }}</a>
    </div>
@endsection
