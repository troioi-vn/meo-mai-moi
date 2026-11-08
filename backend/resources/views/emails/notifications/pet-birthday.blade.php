@extends('emails.notifications.layout')

@section('content')
    <h1>{{ __('messages.emails.pet_birthday.title') }}</h1>

    <p>{{ __('messages.emails.common.hello', ['name' => $user->name ?? __('messages.emails.common.someone')]) }}</p>

    @php
        $petName = $pet->name ?? null;
        $age = $age ?? null;
    @endphp

    <p>
        @if($age)
            {{ $petName !== null ? __('messages.emails.pet_birthday.intro', ['pet' => $petName, 'age' => $age]) : __('messages.emails.pet_birthday.intro_without_pet', ['age' => $age]) }}
        @else
            {{ $petName !== null ? __('messages.emails.pet_birthday.intro_no_age', ['pet' => $petName]) : __('messages.emails.pet_birthday.intro_no_age_without_pet') }}
        @endif
    </p>

    <p>
        {{ __('messages.emails.pet_birthday.celebrate') }}
    </p>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $actionUrl }}" class="action-button" style="color: #ffffff !important;">{{ __('messages.emails.common.view_pet') }}</a>
    </div>
@endsection
