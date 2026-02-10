@extends('emails.notifications.layout')

@section('content')
    <h1>{{ __('messages.emails.pet_birthday.title') }}</h1>

    <p>{{ __('messages.emails.common.hello', ['name' => $user->name ?? __('messages.emails.common.someone')]) }},</p>

    @php
        $petName = isset($pet) && $pet ? $pet->name : __('messages.emails.common.your_pet');
        $age = $age ?? null;
    @endphp

    <p>
        @if($age)
            {{ __('messages.emails.pet_birthday.intro', ['pet' => $petName, 'age' => $age]) }}
        @else
            {{ __('messages.emails.pet_birthday.intro_no_age', ['pet' => $petName]) }}
        @endif
    </p>

    <p>
        {{ __('messages.emails.pet_birthday.celebrate') }}
    </p>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $actionUrl }}" class="action-button" style="color: #ffffff !important;">{{ __('messages.emails.common.view_pet') }}</a>
    </div>

    <p>{{ __('messages.emails.pet_birthday.unsubscribe_notice') }} <a href="{{ $unsubscribeUrl }}">{{ __('messages.emails.common.unsubscribe') }}</a></p>
@endsection
