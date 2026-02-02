@extends('emails.notifications.layout')

@section('content')
    <div class="greeting">
        {{ __('messages.emails.common.hello', ['name' => $user->name]) }}
    </div>

    <div class="message">
        {{ __('messages.emails.helper_response_rejected.intro') }}
    </div>

    @if(isset($pet))
        <div class="pet-info">
            <div class="pet-name">{{ $pet->name }}</div>
            <div class="pet-details">
                <strong>{{ __('messages.emails.common.type') }}</strong> {{ $pet->petType->name ?? __('messages.emails.common.a_pet') }}<br>
                <strong>{{ __('messages.emails.common.location') }}</strong> {{ collect([$pet->city, $pet->state, $pet->country])->filter()->implode(', ') ?: __('messages.not_found') }}<br>
                @if($pet->birthday)
                    <strong>{{ __('messages.emails.common.age') }}</strong> {{ __('messages.emails.common.years_old', ['count' => $pet->birthday->age]) }}<br>
                @endif
            </div>
        </div>
    @endif

    <div class="message">
        {{ __('messages.emails.helper_response_rejected.explanation', ['pet' => isset($pet) ? $pet->name : __('messages.emails.common.a_pet')]) }}
    </div>

    <div style="background-color: #e8f4fd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #007bff;">
        <strong>{{ __('messages.emails.helper_response_rejected.encouragement_title') }}</strong><br>
        {{ __('messages.emails.helper_response_rejected.encouragement_text') }}
        <ul style="margin: 10px 0; padding-left: 20px;">
            <li>{{ __('messages.emails.helper_response_rejected.encouragement_browse') }}</li>
            <li>{{ __('messages.emails.helper_response_rejected.encouragement_profile') }}</li>
            <li>{{ __('messages.emails.helper_response_rejected.encouragement_types') }}</li>
        </ul>
    </div>

    <div class="message">
        {{ __('messages.emails.helper_response_rejected.mission') }}
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $actionUrl }}" class="action-button">{{ __('messages.emails.common.browse_requests') }}</a>
    </div>

    <div class="message" style="font-size: 14px; color: #666; background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">
        {{ __('messages.emails.helper_response_rejected.stay_connected') }}
    </div>
@endsection