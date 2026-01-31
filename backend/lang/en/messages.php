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
];
