@extends('emails.notifications.layout')

@section('content')
    <div class="greeting">
        {{ __('messages.emails.common.hello', ['name' => $user->name]) }}
    </div>

    <div class="message">
        {{ __('messages.emails.transfer_confirmed.intro') }}
    </div>

    @if(isset($pet))
        <div class="pet-info">
            <div class="pet-name">{{ $pet->name }}</div>
            <div class="pet-details">
                <strong>{{ __('messages.emails.common.type') }}</strong> {{ $pet->petType->name ?? __('messages.emails.common.a_pet') }}<br>
                @if(isset($placementType))
                    <strong>{{ __('messages.emails.transfer_confirmed.placement_type') }}</strong> {{ ucfirst(str_replace('_', ' ', $placementType)) }}
                @endif
            </div>
        </div>
    @endif

    @if(isset($helperName))
        <div class="message">
            {{ __('messages.emails.transfer_confirmed.confirmation', ['helper' => $helperName, 'pet' => isset($pet) ? $pet->name : __('messages.emails.common.your_pet')]) }}
        </div>
    @endif

    <div style="background-color: #d4edda; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745;">
        <strong>{{ __('messages.emails.transfer_confirmed.complete_title') }}</strong><br>
        {{ __('messages.emails.transfer_confirmed.active_intro', ['pet' => isset($pet) ? $pet->name : __('messages.emails.common.your_pet')]) }}
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $actionUrl }}" class="action-button" style="color: #ffffff !important;">{{ __('messages.emails.common.view_pet') }}</a>
    </div>

    <div class="message" style="font-size: 14px; color: #666;">
        {{ __('messages.emails.transfer_confirmed.closing') }}
    </div>
@endsection

