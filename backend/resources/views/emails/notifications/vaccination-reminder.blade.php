@extends('emails.notifications.layout')

@section('content')
    <h1>Vaccination Reminder</h1>

    <p>Hello {{ $user->name ?? 'there' }},</p>

    @php
        $petName = isset($pet) && $pet ? $pet->name : 'your pet';
        $vaccine = $vaccine_name ?? 'a vaccine';
        $dueDate = isset($due_at) ? (new \Carbon\Carbon($due_at))->toFormattedDateString() : null;
    @endphp

    <p>
        This is a friendly reminder that {{ $petName }} is due for {{ $vaccine }}
        @if($dueDate)
            on {{ $dueDate }}.
        @else
            soon.
        @endif
    </p>

    @if(isset($notes) && $notes !== '')
        <p><strong>Notes:</strong> {{ $notes }}</p>
    @endif

    <p>
        You can view {{ $petName }}'s health records here:
        <a href="{{ $actionUrl }}">Open Pet Profile</a>
    </p>

    <p>If you no longer wish to receive these reminders, you can manage your preferences here: <a href="{{ $unsubscribeUrl }}">Unsubscribe</a></p>
@endsection
