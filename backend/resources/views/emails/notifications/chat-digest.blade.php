@extends('emails.notifications.layout')

@section('content')
    <div class="greeting">
        {{ __('messages.emails.common.hello', ['name' => $user->name]) }}
    </div>

    <div class="message">
        {{ __('messages.emails.chat_digest.intro', ['count' => $total_messages ?? 0]) }}
    </div>

    @if(!empty($chats_summary))
        @foreach($chats_summary as $chatSummary)
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #3490dc;">
                <strong>{{ $chatSummary['sender_name'] }}</strong>
                <span style="color: #666; font-size: 0.9em;">
                    — {{ trans_choice('messages.emails.chat_digest.message_count', $chatSummary['count'], ['count' => $chatSummary['count']]) }}
                </span>
                @if(!empty($chatSummary['preview']))
                    <div style="margin-top: 8px; font-style: italic; color: #555;">
                        "{!! nl2br(htmlspecialchars($chatSummary['preview'], ENT_COMPAT, 'UTF-8', false)) !!}"
                    </div>
                @endif
            </div>
        @endforeach
    @endif

    <div class="cta-container">
        <a href="{{ $actionUrl }}" class="action-button" style="color: #ffffff !important;">
            {{ __('messages.emails.common.view_messages') }}
        </a>
    </div>

    <div class="footer-note">
        {{ __('messages.emails.common.button_trouble', ['action' => __('messages.emails.common.view_messages')]) }}<br>
        <a href="{{ $actionUrl }}">{{ $actionUrl }}</a>
    </div>
@endsection
