@extends('emails.notifications.layout')

@section('content')
    <div class="greeting">
        {{ __('messages.emails.common.hello', ['name' => $user->name]) }}
    </div>

    <div class="message">
        @if(isset($pet) && $pet)
            {{ __('messages.emails.placement_request_response.intro', ['pet' => $pet->name]) }}
        @else
            {{ __('messages.emails.placement_request_response.fallback_intro') }}
        @endif.
    </div>

    @if(isset($pet))
        <div class="pet-info">
            <div class="pet-name">{!! htmlspecialchars($pet->name, ENT_COMPAT, 'UTF-8', false) !!}</div>
            <div class="pet-details">
                <strong>{{ __('messages.emails.common.type') }}</strong> {{ $pet->petType->name ?? __('messages.emails.common.a_pet') }}<br>
                <strong>{{ __('messages.emails.common.location') }}</strong> {{ collect([$pet->city, $pet->state, $pet->country])->filter()->implode(', ') ?: __('messages.not_found') }}<br>
                @if($pet->birthday)
                    <strong>{{ __('messages.emails.common.age') }}</strong> {{ __('messages.emails.common.years_old', ['count' => $pet->birthday->age]) }}<br>
                @endif
            </div>
        </div>
    @endif

    @if(isset($helperProfile) && $helperProfile)
        <div class="message">
            {{ __('messages.emails.placement_request_response.helper_intro', ['helper' => $helperProfile->user->name]) }}
            {{ __('messages.emails.placement_request_response.helper_interest', ['pet' => isset($pet) && $pet ? $pet->name : __('messages.emails.common.your_pet')]) }}
        </div>

        <div style="background-color: #e8f4fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <strong>{{ __('messages.emails.placement_request_response.helper_details_title') }}</strong><br>
            <strong>{{ __('messages.emails.common.location') }}</strong> {{ collect([$helperProfile->city, $helperProfile->state, $helperProfile->country])->filter()->implode(', ') ?: __('messages.not_found') }}<br>
            <strong>{{ __('messages.emails.placement_request_response.helper_available') }}</strong>
            @if($helperProfile->can_foster && $helperProfile->can_adopt)
                {{ __('messages.emails.placement_request_response.helper_foster_adopt') }}
            @elseif($helperProfile->can_foster)
                {{ __('messages.emails.placement_request_response.helper_foster') }}
            @elseif($helperProfile->can_adopt)
                {{ __('messages.emails.placement_request_response.helper_adopt') }}
            @endif
            <br>
            @if($helperProfile->experience)
                <strong>{{ __('messages.emails.placement_request_response.helper_experience') }}</strong> {{ Str::limit($helperProfile->experience, 100) }}<br>
            @endif
        </div>
    @else
        <div class="message">
            {{ __('messages.emails.placement_request_response.fallback_intro') }}
        </div>
    @endif

    <div class="message">
        {{ __('messages.emails.placement_request_response.closing') }}
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $actionUrl }}" class="action-button" style="color: #ffffff !important;">{{ __('messages.emails.common.view_response') }}</a>
    </div>

    <div class="message" style="font-size: 14px; color: #666;">
        {{ __('messages.emails.common.footer_text') }}
    </div>
@endsection