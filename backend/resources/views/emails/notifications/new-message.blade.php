@extends('emails.notifications.layout')

@section('content')
    <div class="greeting">
        Hello {{ $user->name }},
    </div>

    <div class="message">
        You have received a new message from <strong>{{ $sender_name ?? 'another user' }}</strong>.
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
        <a href="{{ $actionUrl }}" class="button">
            View Message
        </a>
    </div>

    <div class="footer-note">
        If the button above doesn't work, copy and paste this link into your browser:<br>
        <a href="{{ $actionUrl }}">{{ $actionUrl }}</a>
    </div>
@endsection
