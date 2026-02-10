@extends('emails.notifications.layout')

@section('content')
    <div class="greeting">
        {{ __('messages.emails.common.hello', ['name' => $user->name]) }}
    </div>

    <div class="message">
        {{ __('messages.emails.placement_ended.intro') }}
    </div>

    @if(isset($pet))
        <div class="pet-info">
            <div class="pet-name">{{ $pet->name }}</div>
            <div class="pet-details">
                <strong>{{ __('messages.emails.common.type') }}</strong> {{ $pet->petType->name ?? __('messages.emails.common.a_pet') }}<br>
                <strong>{{ __('messages.emails.common.status') }}</strong> {{ __('messages.emails.placement_ended.status_returned') }}
            </div>
        </div>
    @endif

    <div class="message">
        {{ __('messages.emails.placement_ended.explanation', ['pet' => isset($pet) ? $pet->name : __('messages.emails.common.the_pet')]) }}
    </div>

    <div style="background-color: #d4edda; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745;">
        <strong>{{ __('messages.emails.placement_ended.thanks_helping') }}</strong><br>
        {{ __('messages.emails.placement_ended.contribution') }}
        <ul style="margin: 10px 0; padding-left: 20px;">
            <li>{{ __('messages.emails.placement_ended.next_steps_intro') }}</li>
            <li>{{ __('messages.emails.placement_ended.next_step_profile') }}</li>
            <li>{{ __('messages.emails.placement_ended.next_step_share') }}</li>
        </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $actionUrl }}" class="action-button" style="color: #ffffff !important;">{{ __('messages.emails.common.browse_requests') }}</a>
    </div>

    <div class="message" style="font-size: 14px; color: #666;">
        {{ __('messages.emails.placement_ended.closing') }}
    </div>
@endsection

