<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | General Messages
    |--------------------------------------------------------------------------
    */
    'success' => 'Operation completed successfully.',
    'error' => 'An error occurred.',
    'not_found' => 'Resource not found.',
    'unauthorized' => 'You are not authorized to perform this action.',
    'forbidden' => 'Access forbidden.',
    'unauthenticated' => 'Unauthenticated.',

    /*
    |--------------------------------------------------------------------------
    | Auth Messages
    |--------------------------------------------------------------------------
    */
    'auth' => [
        'login_success' => 'Logged in successfully.',
        'logout_success' => 'Logged out successfully.',
        'register_success' => 'Registration successful.',
        'password_updated' => 'Password updated successfully.',
        'password_reset_sent' => 'Password reset link has been sent.',
        'password_reset_success' => 'Password has been reset successfully.',
        'email_verified' => 'Email verified successfully.',
        'verification_sent' => 'Verification email has been sent.',
        'email_already_verified' => 'Email address already verified.',
        'invalid_verification_link' => 'Invalid verification link.',
        'expired_verification_link' => 'Invalid or expired verification link.',
        'invalid_credentials' => 'Invalid credentials.',
        'account_banned' => 'Your account has been banned.',
        'email_not_verified' => 'Please verify your email address.',
        'two_factor_required' => 'Two-factor authentication required.',
        'two_factor_invalid' => 'Invalid two-factor authentication code.',
        'account_deleted' => 'Your account has been deleted.',
        'password_incorrect' => 'The provided password is incorrect.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Pet Messages
    |--------------------------------------------------------------------------
    */
    'pets' => [
        'created' => 'Pet created successfully.',
        'updated' => 'Pet updated successfully.',
        'deleted' => 'Pet deleted successfully.',
        'not_found' => 'Pet not found.',
        'archived' => 'Pet archived successfully.',
        'unarchived' => 'Pet unarchived successfully.',
        'photo_uploaded' => 'Photo uploaded successfully.',
        'photo_deleted' => 'Photo deleted successfully.',
        'photo_not_found' => 'Photo not found.',
        'microchip_created' => 'Microchip record created successfully.',
        'microchip_updated' => 'Microchip record updated successfully.',
        'microchip_deleted' => 'Microchip record deleted successfully.',
        'photo_set_primary' => 'Primary photo set successfully.',
        'relationship_added' => 'Relationship added successfully.',
        'relationship_removed' => 'Relationship removed successfully.',
        'cannot_remove_owner' => 'Cannot remove owner relationship.',
        'already_has_relationship' => 'User already has this relationship with the pet.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Medical Records Messages
    |--------------------------------------------------------------------------
    */
    'medical' => [
        'created' => 'Medical record created successfully.',
        'updated' => 'Medical record updated successfully.',
        'deleted' => 'Medical record deleted successfully.',
        'not_found' => 'Medical record not found.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Helper Profile Messages
    |--------------------------------------------------------------------------
    */
    'helper' => [
        'created' => 'Helper profile created successfully.',
        'updated' => 'Helper profile updated successfully.',
        'deleted' => 'Helper profile deleted successfully.',
        'not_found' => 'Helper profile not found.',
        'archived' => 'Helper profile archived successfully.',
        'unarchived' => 'Helper profile unarchived successfully.',
        'cannot_archive_with_requests' => 'Cannot archive profile with associated placement requests.',
        'cannot_delete_with_requests' => 'Cannot delete profile with associated placement requests.',
        'only_archived_can_be_restored' => 'Only archived profiles can be restored.',
        'cities_not_found' => 'One or more cities not found.',
        'city_country_mismatch' => 'City :name does not belong to the specified country.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Invitation Messages
    |--------------------------------------------------------------------------
    */
    'invitation' => [
        'created' => 'Invitation created successfully.',
        'sent' => 'Invitation sent successfully.',
        'accepted' => 'Invitation accepted successfully.',
        'declined' => 'Invitation declined successfully.',
        'cancelled' => 'Invitation cancelled successfully.',
        'not_found' => 'Invitation not found.',
        'expired' => 'This invitation has expired.',
        'already_used' => 'This invitation has already been used.',
        'invalid' => 'Invalid invitation.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Waitlist Messages
    |--------------------------------------------------------------------------
    */
    'waitlist' => [
        'joined' => 'You have joined the waitlist.',
        'already_joined' => 'You are already on the waitlist.',
        'email_exists' => 'This email is already on the waitlist.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Notification Messages
    |--------------------------------------------------------------------------
    */
    'notifications' => [
        'preferences_updated' => 'Notification preferences updated.',
        'marked_read' => 'Notification marked as read.',
        'all_marked_read' => 'All notifications marked as read.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Chat Messages
    |--------------------------------------------------------------------------
    */
    'chat' => [
        'created' => 'Chat created successfully.',
        'message_sent' => 'Message sent.',
        'not_found' => 'Chat not found.',
        'cannot_message_self' => 'You cannot message yourself.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Locale Messages
    |--------------------------------------------------------------------------
    */
    'locale' => [
        'updated' => 'Language preference updated.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Placement Request Messages
    |--------------------------------------------------------------------------
    */
    'placement' => [
        'not_found' => 'Placement request not found.',
        'not_active' => 'This placement request is no longer active.',
        'unauthorized_create' => 'You are not authorized to create a placement request for this pet.',
        'already_exists' => 'An active placement request of this type already exists for this pet.',
        'only_owner_can_finalize' => 'Only the pet owner can finalize this placement request.',
        'only_active_can_finalize' => 'Only active placement requests can be finalized.',
        'only_temporary_can_finalize' => 'Only temporary placements can be finalized this way.',
        'cannot_respond' => 'You cannot respond to this placement request at this time.',
        'already_responded' => 'You have already responded to this placement request.',
        'cannot_self_respond' => 'You cannot respond to your own placement request.',
        'response_cannot_accept' => 'This response cannot be accepted in its current state.',
        'response_cannot_cancel' => 'This response cannot be cancelled in its current state.',
        'response_cannot_reject' => 'This response cannot be rejected in its current state.',
        'unauthorized_view_responses' => 'You are not authorized to view responses for this placement request.',
        'terms_not_found' => 'Placement terms not found.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Transfer Request Messages
    |--------------------------------------------------------------------------
    */
    'transfer' => [
        'only_pending_reject' => 'Only pending requests can be rejected.',
        'only_pending_cancel' => 'Only pending requests can be canceled.',
        'only_pending_confirm' => 'Only pending transfers can be confirmed.',
    ],

    /*
    |--------------------------------------------------------------------------
    | City Messages
    |--------------------------------------------------------------------------
    */
    'city' => [
        'not_found' => 'City not found.',
        'country_mismatch' => 'Selected city does not belong to the specified country.',
        'limit_reached' => 'You have reached the limit of 10 cities per 24 hours. Please try again later.',
        'already_exists' => 'A city with this name already exists for this country.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Category Messages
    |--------------------------------------------------------------------------
    */
    'category' => [
        'already_exists' => 'A category with this name already exists for this pet type.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Message/Messaging Messages
    |--------------------------------------------------------------------------
    */
    'message' => [
        'unauthorized_view' => 'You are not authorized to view this message.',
        'unauthorized_mark_read' => 'You are not authorized to mark this message as read.',
        'unauthorized_delete' => 'You are not authorized to delete this message.',
        'group_not_implemented' => 'Group chats are not yet implemented.',
        'only_owner_can_message' => 'Only the placement request owner can message helpers in this request.',
        'recipient_must_be_helper' => 'Recipient must be a helper who responded to the placement request.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Email Messages
    |--------------------------------------------------------------------------
    */
    'email' => [
        'verification_unavailable' => 'We are unable to send verification email at the moment. But hopefully admins are working on it and you will receive it soon.',
        'send_failed' => 'We are unable to send email at the moment. Please try again later.',
    ],

    /*
    |--------------------------------------------------------------------------
    | User Profile Messages
    |--------------------------------------------------------------------------
    */
    'profile' => [
        'no_avatar' => 'No avatar to delete.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Admin Messages
    |--------------------------------------------------------------------------
    */
    'admin' => [
        'cannot_ban_admin' => 'Cannot ban an admin user.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Pet Additional Messages
    |--------------------------------------------------------------------------
    */
    'pets_extra' => [
        'not_public' => 'This pet profile is not publicly available.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Impersonation Messages
    |--------------------------------------------------------------------------
    */
    'impersonation' => [
        'not_impersonating' => 'Not impersonating.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Unsubscribe Messages
    |--------------------------------------------------------------------------
    */
    'unsubscribe' => [
        'invalid_request' => 'Invalid unsubscribe request. The link may be expired or invalid.',
    ],
];
