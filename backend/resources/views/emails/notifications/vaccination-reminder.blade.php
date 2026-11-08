@extends('emails.notifications.layout')

@section('content')
    <h1>{{ __('messages.emails.vaccination_reminder.title') }}</h1>

    <p>{{ __('messages.emails.common.hello', ['name' => $user->name ?? __('messages.emails.common.someone')]) }}</p>

    @php
        $petName = $pet->name ?? null;
        $vaccine = $vaccine_name ?? __('messages.emails.common.a_vaccine');
        $dueDate = isset($due_at) ? (new \Carbon\Carbon($due_at))->locale(app()->getLocale())->isoFormat('ll') : null;
    @endphp

    <p>
        @if($dueDate)
            {{ $petName !== null ? __('messages.emails.vaccination_reminder.intro', ['pet' => $petName, 'vaccine' => $vaccine, 'date' => $dueDate]) : __('messages.emails.vaccination_reminder.intro_without_pet', ['vaccine' => $vaccine, 'date' => $dueDate]) }}
        @else
            {{ $petName !== null ? __('messages.emails.vaccination_reminder.due_soon', ['pet' => $petName, 'vaccine' => $vaccine]) : __('messages.emails.vaccination_reminder.due_soon_without_pet', ['vaccine' => $vaccine]) }}
        @endif
    </p>

    @if(!empty($notes))
        <p><strong>{{ __('messages.emails.vaccination_reminder.notes') }}</strong> {{ $notes }}</p>
    @endif

    <p>
        {{ $petName !== null ? __('messages.emails.vaccination_reminder.view_health', ['pet' => $petName]) : __('messages.emails.vaccination_reminder.view_health_without_pet') }}
    </p>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $actionUrl }}" class="action-button" style="color: #ffffff !important;">{{ __('messages.emails.common.view_pet') }}</a>
    </div>
@endsection
