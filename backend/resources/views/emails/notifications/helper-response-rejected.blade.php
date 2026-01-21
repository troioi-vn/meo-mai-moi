@extends('emails.notifications.layout')

@section('content')
    <div class="greeting">
        Hello {{ $user->name }},
    </div>

    <div class="message">
        Thank you for your interest in helping with a pet placement request. While your response wasn't selected this time, we truly appreciate your willingness to help.
    </div>

    @if(isset($pet))
        <div class="pet-info">
            <div class="pet-name">{{ $pet->name }}</div>
            <div class="pet-details">
                <strong>Type:</strong> {{ $pet->petType->name ?? 'Pet' }}<br>
                <strong>Location:</strong> {{ collect([$pet->city, $pet->state, $pet->country])->filter()->implode(', ') ?: 'Unknown' }}<br>
                @if($pet->birthday)
                    <strong>Age:</strong> {{ $pet->birthday->age }} years old<br>
                @endif
            </div>
        </div>
    @endif

    <div class="message">
        The pet owner has chosen another helper for {{ isset($pet) ? $pet->name : 'this placement' }}. This decision may have been based on various factors such as location, timing, or specific care requirements.
    </div>

    <div style="background-color: #e8f4fd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #007bff;">
        <strong>Don't be discouraged!</strong><br>
    Your willingness to help is valuable, and there are many pets who need caring people like you. We encourage you to:
        <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Continue browsing available placement requests</li>
            <li>Keep your helper profile updated and active</li>
            <li>Consider different types of help (fostering, adoption, temporary care)</li>
        </ul>
    </div>

    <div class="message">
        Every pet deserves a loving home, and your contribution to our community helps make that possible. Thank you for being part of our mission to help animals in need.
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $actionUrl }}" class="action-button">Browse Other Requests</a>
    </div>

    <div class="message" style="font-size: 14px; color: #666; background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">
        <strong>Stay Connected:</strong> Keep an eye on new placement requests that match your preferences. The perfect match might be just around the corner!
    </div>
@endsection