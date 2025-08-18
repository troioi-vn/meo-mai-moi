@extends('emails.notifications.layout')

@section('content')
    <div class="greeting">
        Wonderful news, {{ $user->name }}!
    </div>

    <div class="message">
        Your response to help with a cat has been accepted! The cat owner has chosen you to provide care.
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
                @if($cat->description)
                    <strong>About {{ $cat->name }}:</strong> {{ Str::limit($cat->description, 150) }}<br>
                @endif
            </div>
        </div>
    @endif

    @if(isset($placementRequest))
        <div style="background-color: #d4edda; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745;">
            <strong>✓ Request Details:</strong><br>
            <strong>Type:</strong> {{ ucfirst(str_replace('_', ' ', $placementRequest->request_type->value)) }}<br>
            @if($placementRequest->start_date)
                <strong>Start Date:</strong> {{ $placementRequest->start_date->format('M j, Y') }}<br>
            @endif
            @if($placementRequest->end_date)
                <strong>End Date:</strong> {{ $placementRequest->end_date->format('M j, Y') }}<br>
            @endif
            @if($placementRequest->notes)
                <strong>Special Notes:</strong> {{ Str::limit($placementRequest->notes, 100) }}<br>
            @endif
        </div>
    @endif

    <div class="message">
        The cat owner will be in touch with you soon to coordinate the handover details. Please be prepared to:
    </div>

    <div class="message">
        <strong>Preparation Checklist:</strong>
        <ul style="margin: 15px 0; padding-left: 20px;">
            <li>Prepare a safe and comfortable space for {{ isset($cat) ? $cat->name : 'the cat' }}</li>
            <li>Stock up on necessary supplies (food, litter, toys)</li>
            <li>Review any medical or care instructions from the owner</li>
            <li>Coordinate pickup/delivery logistics</li>
            <li>Exchange contact information for ongoing communication</li>
        </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $actionUrl }}" class="action-button">View Request Details</a>
    </div>

    <div class="message" style="font-size: 14px; color: #666; background-color: #e8f4fd; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff;">
        <strong>Thank you</strong> for opening your heart and home to help {{ isset($cat) ? $cat->name : 'a cat' }} in need. Your kindness makes a real difference!
    </div>
@endsection