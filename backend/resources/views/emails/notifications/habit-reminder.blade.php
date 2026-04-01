@extends('emails.notifications.layout')

@section('content')
<p>{{ __('messages.notifications.email_lines.habit_reminder', ['habit' => $habit_name ?? __('messages.habits.default_name'), 'date' => $date ?? '']) }}</p>

@if(!empty($actionUrl))
<p><a href="{{ $actionUrl }}">{{ __('messages.habits.open_habit') }}</a></p>
@endif
@endsection
