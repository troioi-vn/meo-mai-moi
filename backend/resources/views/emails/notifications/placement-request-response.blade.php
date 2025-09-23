@extends('emails.notifications.layout')

@section('content')
    <div class="greeting">
        Hello {{ $user->name }},
    </div>

    <div class="message">
        Great news! You've received a new response to your placement request
        @if(isset($cat) && $cat)
            for {!! htmlspecialchars($cat->name, ENT_COMPAT, 'UTF-8', false) !!}
        @endif.
    </div>

    @if(isset($cat))
        <div class="cat-info">
            <div class="cat-name">{!! htmlspecialchars($cat->name, ENT_COMPAT, 'UTF-8', false) !!}</div>
            <div class="cat-details">
                <strong>Breed:</strong> {{ $cat->breed }}<br>
                <strong>Location:</strong> {{ $cat->location }}<br>
                @if($cat->birthday)
                    <strong>Age:</strong> {{ $cat->birthday->diffInYears(now()) }} years old<br>
                @endif
            </div>
        </div>
    @endif

    @if(isset($helperProfile) && $helperProfile)
        <div class="message">
            <strong>{{ $helperProfile->user->name }}</strong> has responded to your placement request. 
            They are interested in helping with @if(isset($cat) && $cat){!! htmlspecialchars($cat->name, ENT_COMPAT, 'UTF-8', false) !!}@else your cat @endif.
        </div>

        <div style="background-color: #e8f4fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <strong>Helper Details:</strong><br>
            <strong>Location:</strong> {{ $helperProfile->city }}, {{ $helperProfile->country }}<br>
            @if($helperProfile->can_foster && $helperProfile->can_adopt)
                <strong>Available for:</strong> Fostering and Adoption<br>
            @elseif($helperProfile->can_foster)
                <strong>Available for:</strong> Fostering<br>
            @elseif($helperProfile->can_adopt)
                <strong>Available for:</strong> Adoption<br>
            @endif
            @if($helperProfile->experience)
                <strong>Experience:</strong> {{ Str::limit($helperProfile->experience, 100) }}<br>
            @endif
        </div>
    @else
        <div class="message">
            Someone has responded to your placement request and is interested in helping with your cat.
        </div>
    @endif

    <div class="message">
        You can review their profile and respond to their interest by visiting your requests page.
    </div>

    <div style="text-align: center; margin: 30px 0;">
        <a href="{{ $actionUrl }}" class="action-button">View Response</a>
    </div>

    <div class="message" style="font-size: 14px; color: #666;">
        Remember to respond promptly to maintain good communication with potential helpers.
    </div>
@endsection