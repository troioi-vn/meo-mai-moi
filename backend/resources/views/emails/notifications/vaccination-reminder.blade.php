@extends('emails.notifications.layout')

@section('content')
    <h1>{{ __('messages.emails.vaccination_reminder.title') }}</h1>

    <p>{{ __('messages.emails.common.hello', ['name' => $user->name ?? __('messages.emails.common.someone')]) }},</p>

    @php
        $petName = isset($pet) && $pet ? $pet->name : __('messages.emails.common.your_pet');
        $vaccine = $vaccine_name ?? __('messages.emails.common.a_vaccine');
        $dueDate = isset($due_at) ? (new \Carbon\Carbon($due_at))->toFormattedDateString() : null;
    @endphp

    <p>
        @if($dueDate)
            {{ __('messages.emails.vaccination_reminder.intro', ['pet' => $petName, 'vaccine' => $vaccine, 'date' => $dueDate]) }}
        @else
            {{ __('messages.emails.vaccination_reminder.due_soon', ['pet' => $petName, 'vaccine' => $vaccine]) }}
        @endif
    </p>

    @if(!empty($notes))
        <p><strong>{{ __('messages.emails.vaccination_reminder.notes') }}</strong> {{ $notes }}</p>
    @endif

    <p>
        {{ __('messages.emails.vaccination_reminder.view_health', ['pet' => $petName]) }}
    </p>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $actionUrl }}" class="action-button" style="color: #ffffff !important;">{{ __('messages.emails.common.view_pet') }}</a>
    </div>

    <p>{{ __('messages.emails.vaccination_reminder.unsubscribe_notice') }} <a href="{{ $unsubscribeUrl }}">{{ __('messages.emails.common.unsubscribe') }}</a></p>
@endsection
