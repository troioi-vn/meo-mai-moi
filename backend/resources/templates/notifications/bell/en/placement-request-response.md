You have a new response to your placement request{{ isset($pet) && $pet ? ' for ' . ($pet->name ?? 'your pet') : '' }}.

Open your requests page to review and respond.

{{ $actionUrl ?? '/requests' }}
