@extends('emails.notifications.layout')

@section('content')
    <div class="greeting">
        Hello {{ $user->name }},
    </div>

    <div class="message">
        A helper has withdrawn their response to your placement request.
    </div>

    @if(isset($pet))
        <div class="pet-info">
            <div class="pet-name">{{ $pet->name }}</div>
            <div class="pet-details">
                <strong>Type:</strong> {{ $pet->petType->name ?? 'Pet' }}<br>
                <strong>Status:</strong> Your placement request is still active
            </div>
        </div>
    @endif

    @if(isset($helperName))
        <div class="message">
            <strong>{{ $helperName }}</strong> has decided to withdraw their response. This could be due to personal circumstances or scheduling conflicts.
        </div>
    @endif

    <div style="background-color: #e8f4fd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #007bff;">
        <strong>What's next?</strong><br>
        Your placement request remains open and other helpers can still respond. You can:
        <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Review other existing responses</li>
            <li>Wait for new responses from other helpers</li>
            <li>Update your placement request details if needed</li>
        </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $actionUrl }}" class="action-button">View Your Placement Request</a>
    </div>
@endsection

