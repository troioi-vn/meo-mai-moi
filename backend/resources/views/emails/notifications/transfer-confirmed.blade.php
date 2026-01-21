@extends('emails.notifications.layout')

@section('content')
    <div class="greeting">
        Hello {{ $user->name }},
    </div>

    <div class="message">
        Great news! The physical handover has been confirmed.
    </div>

    @if(isset($pet))
        <div class="pet-info">
            <div class="pet-name">{{ $pet->name }}</div>
            <div class="pet-details">
                <strong>Type:</strong> {{ $pet->petType->name ?? 'Pet' }}<br>
                @if(isset($placementType))
                    <strong>Placement type:</strong> {{ ucfirst(str_replace('_', ' ', $placementType)) }}
                @endif
            </div>
        </div>
    @endif

    @if(isset($helperName))
        <div class="message">
            <strong>{{ $helperName }}</strong> has confirmed that they have received {{ isset($pet) ? $pet->name : 'your pet' }}.
        </div>
    @endif

    <div style="background-color: #d4edda; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745;">
        <strong>Handover Complete!</strong><br>
        The placement is now active. You can communicate with the helper through the app's messaging system if you need to share any information about {{ isset($pet) ? $pet->name . "'s" : 'your pet\'s' }} care routine.
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $actionUrl }}" class="action-button">View Pet Profile</a>
    </div>

    <div class="message" style="font-size: 14px; color: #666;">
        Thank you for using our platform to find the best care for your pet.
    </div>
@endsection

