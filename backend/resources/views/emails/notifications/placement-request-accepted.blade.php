@extends('emails.notifications.layout')

@section('content')
    <div class="greeting">
        Congratulations {{ $user->name }}!
    </div>

    <div class="message">
        Your placement request has been accepted! This is an important step in finding the right care for your cat.
    </div>

    @if(isset($cat))
        <div class="cat-info">
            <div class="cat-name">{{ $cat->name }}</div>
            <div class="cat-details">
                <strong>Breed:</strong> {{ $cat->breed }}<br>
                <strong>Location:</strong> {{ $cat->location }}<br>
                @if($cat->birthday)
                    <strong>Age:</strong> {{ $cat->birthday->diffInYears(now()) }} years old<br>
                @endif
            </div>
        </div>
    @endif

    @if(isset($helperProfile))
        <div class="message">
            <strong>{{ $helperProfile->user->name }}</strong> has accepted your placement request for {{ isset($cat) ? $cat->name : 'your cat' }}.
        </div>

        <div style="background-color: #d4edda; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745;">
            <strong>✓ Accepted Helper:</strong><br>
            <strong>Name:</strong> {{ $helperProfile->user->name }}<br>
            <strong>Location:</strong> {{ $helperProfile->city }}, {{ $helperProfile->country }}<br>
            <strong>Contact:</strong> {{ $helperProfile->user->email }}<br>
            @if($helperProfile->phone_number)
                <strong>Phone:</strong> {{ $helperProfile->phone_number }}<br>
            @endif
        </div>
    @endif

    <div class="message">
        <strong>Next Steps:</strong>
        <ul style="margin: 15px 0; padding-left: 20px;">
            <li>Contact the helper to arrange the handover details</li>
            <li>Prepare any necessary documentation for {{ isset($cat) ? $cat->name : 'your cat' }}</li>
            <li>Coordinate the transfer timeline</li>
            <li>Share important care instructions and medical history</li>
        </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $actionUrl }}" class="action-button">View Details & Contact Helper</a>
    </div>

    <div class="message" style="font-size: 14px; color: #666; background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">
        <strong>Important:</strong> Please maintain regular communication with the helper and follow up on {{ isset($cat) ? $cat->name . "'s" : 'your cat\'s' }} wellbeing.
    </div>
@endsection