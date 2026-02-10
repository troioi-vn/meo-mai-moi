@extends('emails.notifications.layout')

@section('content')
    <div class="greeting">
        {{ __('messages.emails.common.hello', ['name' => $user->name]) }}
    </div>

    <div class="message">
        {{ __('messages.emails.helper_response_canceled.intro') }}
    </div>

    @if(isset($pet))
        <div class="pet-info">
            <div class="pet-name">{{ $pet->name }}</div>
            <div class="pet-details">
                <strong>{{ __('messages.emails.common.type') }}</strong> {{ $pet->petType->name ?? __('messages.emails.common.a_pet') }}<br>
                <strong>{{ __('messages.emails.common.status') }}</strong> {{ __('messages.emails.helper_response_canceled.status_active') }}
            </div>
        </div>
    @endif

    @if(isset($helperName))
        <div class="message">
            {{ __('messages.emails.helper_response_canceled.reason', ['helper' => $helperName]) }}
        </div>
    @endif

    <div style="background-color: #e8f4fd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #007bff;">
        <strong>{{ __('messages.emails.helper_response_canceled.next_steps_title') }}</strong><br>
        {{ __('messages.emails.helper_response_canceled.next_steps_intro') }}
        <ul style="margin: 10px 0; padding-left: 20px;">
            <li>{{ __('messages.emails.helper_response_canceled.next_step_review') }}</li>
            <li>{{ __('messages.emails.helper_response_canceled.next_step_wait') }}</li>
            <li>{{ __('messages.emails.helper_response_canceled.next_step_update') }}</li>
        </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $actionUrl }}" class="action-button" style="color: #ffffff !important;">{{ __('messages.emails.helper_response_canceled.view_request') }}</a>
    </div>
@endsection

