@extends('emails.notifications.layout')

@section('content')
    <h1>🎂 Happy Birthday!</h1>

    <p>Hello {{ $user->name ?? 'there' }},</p>

    @php
        $petName = isset($pet) && $pet ? $pet->name : 'your pet';
        $age = $age ?? null;
    @endphp

    <p>
        Today is a special day! {{ $petName }} is celebrating
        @if($age)
            their {{ $age }}<sup>@php
                $suffix = match($age % 10) {
                    1 => 'st',
                    2 => 'nd',
                    3 => 'rd',
                    default => 'th'
                };
                echo $suffix;
            @endphp</sup> birthday!
        @else
            their birthday!
        @endif
    </p>

    <p>
        Don't forget to celebrate with them! 🎉
    </p>

    <p>
        You can view {{ $petName }}'s profile here:
        <a href="{{ $actionUrl }}">Open Pet Profile</a>
    </p>

    <p>If you no longer wish to receive these reminders, you can manage your preferences here: <a href="{{ $unsubscribeUrl }}">Unsubscribe</a></p>
@endsection
