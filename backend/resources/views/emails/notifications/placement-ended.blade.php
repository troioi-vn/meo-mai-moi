@extends('emails.notifications.layout')

@section('content')
    <div class="greeting">
        Hello {{ $user->name }},
    </div>

    <div class="message">
        The placement has come to an end.
    </div>

    @if(isset($pet))
        <div class="pet-info">
            <div class="pet-name">{{ $pet->name }}</div>
            <div class="pet-details">
                <strong>Type:</strong> {{ $pet->petType->name ?? 'Pet' }}<br>
                <strong>Status:</strong> Returned to owner
            </div>
        </div>
    @endif

    <div class="message">
        The owner has marked {{ isset($pet) ? $pet->name : 'the pet' }} as returned, and the placement is now complete. Thank you for your dedication and care during this time!
    </div>

    <div style="background-color: #d4edda; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745;">
        <strong>Thank you for helping!</strong><br>
        Your contribution made a real difference. Pet owners like you help make our community stronger.
        <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Consider helping with future placement requests</li>
            <li>Keep your helper profile updated</li>
            <li>Share your experience with others</li>
        </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $actionUrl }}" class="action-button">Browse Placement Requests</a>
    </div>

    <div class="message" style="font-size: 14px; color: #666;">
        Thank you for being part of our pet care community!
    </div>
@endsection

