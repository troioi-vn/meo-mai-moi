@extends('emails.notifications.layout')

@section('content')
    <div class="greeting">
        {{ __('messages.emails.helper_response_accepted.greeting', ['name' => $user->name]) }}
    </div>

    <div class="message">
        {{ __('messages.emails.helper_response_accepted.intro') }}
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
                @if($pet->description)
                    <strong>{{ __('messages.emails.helper_response_accepted.about_pet', ['name' => $pet->name]) }}</strong> {{ Str::limit($pet->description, 150) }}<br>
                @endif
            </div>
        </div>
    @endif

    @if(isset($placementRequest))
        <div style="background-color: #d4edda; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745;">
            <strong>{{ __('messages.emails.helper_response_accepted.request_details') }}</strong><br>
            <strong>{{ __('messages.emails.common.type') }}</strong> {{ ucfirst(str_replace('_', ' ', $placementRequest->request_type->value)) }}<br>
            @if($placementRequest->start_date)
                <strong>{{ __('messages.emails.helper_response_accepted.start_date') }}</strong> {{ $placementRequest->start_date->format('M j, Y') }}<br>
            @endif
            @if($placementRequest->end_date)
                <strong>{{ __('messages.emails.helper_response_accepted.end_date') }}</strong> {{ $placementRequest->end_date->format('M j, Y') }}<br>
            @endif
            @if($placementRequest->notes)
                <strong>{{ __('messages.emails.helper_response_accepted.special_notes') }}</strong> {{ Str::limit($placementRequest->notes, 100) }}<br>
            @endif
        </div>
    @endif

    <div class="message">
        {{ __('messages.emails.helper_response_accepted.next_steps') }}
    </div>

    <div class="message">
        <strong>{{ __('messages.emails.helper_response_accepted.checklist_title') }}</strong>
        <ul style="margin: 15px 0; padding-left: 20px;">
            <li>{{ __('messages.emails.helper_response_accepted.checklist_space', ['pet' => isset($pet) ? $pet->name : __('messages.emails.common.the_pet')]) }}</li>
            <li>{{ __('messages.emails.helper_response_accepted.checklist_supplies') }}</li>
            <li>{{ __('messages.emails.helper_response_accepted.checklist_medical') }}</li>
            <li>{{ __('messages.emails.helper_response_accepted.checklist_logistics') }}</li>
            <li>{{ __('messages.emails.helper_response_accepted.checklist_contact') }}</li>
        </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $actionUrl }}" class="action-button">{{ __('messages.emails.common.view_request') }}</a>
    </div>

    <div class="message" style="font-size: 14px; color: #666; background-color: #e8f4fd; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff;">
        {{ __('messages.emails.helper_response_accepted.closing', ['pet' => isset($pet) ? $pet->name : __('messages.emails.common.a_pet')]) }}
    </div>
@endsection