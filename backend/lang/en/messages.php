<?php

declare(strict_types=1);

return [
    'enums' => [
        'placement_request_type' => [
            'foster_paid' => 'Foster (Paid)',
            'foster_free' => 'Foster (Free)',
            'permanent' => 'Permanent',
            'pet_sitting' => 'Pet Sitting',
        ],
        'placement_request_status' => [
            'open' => 'Open',
            'fulfilled' => 'Fulfilled',
            'pending_transfer' => 'Pending Transfer',
            'active' => 'Active',
            'finalized' => 'Finalized',
            'expired' => 'Expired',
            'cancelled' => 'Cancelled',
        ],
    ],

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
    'image_preview' => '📷 Image',

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
        'no_relationship' => 'You do not have an active relationship with this pet.',
        'last_owner_cannot_leave' => 'You are the last owner of this pet and cannot leave.',
        'left' => 'You have left this pet.',
        'user_removed' => 'User removed from this pet.',
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
        'no_longer_valid' => 'This invitation is no longer valid.',
        'cannot_accept_own' => 'You cannot accept your own invitation.',
        'revoked' => 'Invitation revoked.',
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
        'groups' => [
            'placement_owner' => 'Your Placement Requests',
            'placement_helper' => 'Your Responses to Placements',
            'pet_reminders' => 'Pet Reminders',
            'account' => 'Account',
            'messaging' => 'Messaging',
            'other' => 'Other',
        ],
        'types' => [
            'placement_request_response' => [
                'label' => 'New response to your request',
                'description' => 'When someone responds to your placement request',
            ],
            'helper_response_accepted' => [
                'label' => 'Your response was accepted',
                'description' => 'When a pet owner accepts your response',
            ],
            'helper_response_rejected' => [
                'label' => 'Your response was declined',
                'description' => 'When a pet owner declines your response',
            ],
            'helper_response_canceled' => [
                'label' => 'Helper withdrew their response',
                'description' => 'When a helper withdraws their response',
            ],
            'transfer_confirmed' => [
                'label' => 'Pet handover confirmed',
                'description' => 'When a helper confirms receiving a pet',
            ],
            'placement_ended' => [
                'label' => 'Placement has ended',
                'description' => 'When a placement you participated in has ended',
            ],
            'vaccination_reminder' => [
                'label' => 'Vaccination due soon',
                'description' => 'Reminders when vaccinations are due',
            ],
            'pet_birthday' => [
                'label' => 'Pet birthday',
                'description' => 'Notifications on your pet\'s birthday',
            ],
            'email_verification' => [
                'label' => 'Email verification',
                'description' => 'Emails to verify your email address',
            ],
            'new_message' => [
                'label' => 'New message',
                'description' => 'When you receive a new message',
            ],
            'chat_digest' => [
                'label' => 'Chat digest',
                'description' => 'Periodic summary of unread messages',
            ],
            'placement_request' => [
                'label' => 'Placement Request',
            ],
            'transfer_accepted' => [
                'label' => 'Transfer Accepted',
            ],
        ],
        'actions' => [
            'city_unapprove' => [
                'label' => 'Unapprove',
                'confirm_title' => 'Unapprove this city?',
                'confirm_description' => 'This will make the city unavailable to regular users until it is approved again.',
                'disabled_not_found' => 'City not found',
                'disabled_already' => 'Already unapproved',
                'success' => 'City unapproved',
                'already_unapproved' => 'City already unapproved',
            ],
        ],
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
    'emails' => [
        'app_description' => 'Meo Mai Moi is a comprehensive pet care management platform',
        'subjects' => [
            'placement_request_response' => 'New response to your placement request for :pet',
            'helper_response_accepted' => 'Great news! Your response for :pet has been accepted',
            'placement_ended' => 'Your placement for :pet has ended',
            'new_message' => 'New message from :sender',
            'chat_digest' => 'You have :count new message(s)',
            'vaccination_reminder' => 'Reminder: :pet is due for :vaccine :due',
            'pet_birthday' => '🎂 Happy Birthday :pet! :age',
            'helper_response_canceled' => 'A helper withdrew their response for :pet',
            'helper_response_rejected' => 'Update on your response for :pet',
            'transfer_confirmed' => 'Handover confirmed for :pet',
            'email_verification' => 'Verify Your Email Address - :app',
            'password_reset' => 'Reset Your Password - :app',
            'invitation' => "You're Invited! - :app",
            'waitlist' => "You're on the waitlist! - :app",
        ],
        'common' => [
            'hello' => 'Hello :name,',
            'hello_simple' => 'Hello there!',
            'hi' => 'Hi :name,',
            'thanks' => 'Thanks,',
            'team' => 'The :app Team',
            'best_regards' => 'Best regards,',
            'view_response' => 'View Response',
            'view_message' => 'View Message',
            'view_messages' => 'View Messages',
            'view_request' => 'View Request Details',
            'view_pet' => 'Open Pet Profile',
            'browse_requests' => 'Browse Other Requests',
            'verify_email' => 'Verify Email',
            'reset_password' => 'Reset My Password',
            'accept_invitation' => 'Accept Invitation',
            'unsubscribe' => 'Unsubscribe',
            'button_trouble' => "If you're having trouble clicking the \":action\" button, copy and paste the URL below into your web browser:",
            'footer_text' => 'Remember to respond promptly to maintain good communication with potential helpers.',
            'your_pet' => 'your pet',
            'a_pet' => 'a pet',
            'the_pet' => 'the pet',
            'someone' => 'Someone',
            'a_vaccine' => 'a vaccine',
            'soon' => 'soon',
            'type' => 'Type:',
            'location' => 'Location:',
            'age' => 'Age:',
            'years_old' => ':count years old',
            'status' => 'Status:',
        ],
        'verification' => [
            'title' => 'Verify Your Email Address',
            'welcome' => 'Welcome to :app!',
            'thanks_registering' => 'Thank you for registering with :app! To complete your registration and start managing your cat\'s care, please verify your email address by clicking the button below.',
            'expire' => 'This verification link will expire in :minutes minutes for security reasons.',
            'ignore' => 'If you didn\'t create an account with :app, you can safely ignore this email.',
        ],
        'password_reset' => [
            'title' => 'Password Reset Request',
            'intro' => 'We received a request to reset your password for your :app account.',
            'account' => 'Account:',
            'requested_at' => 'Requested at:',
            'click_button' => 'Click the button below to reset your password:',
            'notice_title' => 'Security Notice:',
            'notice_expire' => 'This link will expire in :minutes minutes',
            'notice_ignore' => 'If you didn\'t request this reset, you can safely ignore this email',
            'notice_safety' => 'Your password won\'t be changed unless you click the link above',
            'support' => 'If you\'re having trouble accessing your account or didn\'t request this password reset, please contact our support team.',
            'sent_from' => 'This email was sent from :app',
            'unsubscribe_notice' => 'If you no longer wish to receive these emails, please update your account preferences or contact support.',
        ],
        'invitation' => [
            'title' => '🎉 You\'re Invited!',
            'intro' => ':inviter has invited you to join :app.',
            'community' => 'We\'re building an amazing community and would love to have you as part of it!',
            'notes_title' => 'Important Notes:',
            'note_personal' => 'This invitation is personal to you and cannot be shared',
            'note_expire' => 'The invitation link will expire if not used',
            'note_questions' => 'If you have any questions, just reply to this email',
            'closing' => 'We can\'t wait to welcome you to the community!',
        ],
        'waitlist' => [
            'title' => '🎉 You\'re on the waitlist!',
            'intro' => 'Thank you for your interest in :app! We\'ve successfully added you to our waitlist.',
            'next_steps_title' => 'What happens next?',
            'next_step_first' => 'You\'ll be among the first to know when we have space available',
            'next_step_invite' => 'We\'ll send you an invitation as soon as possible',
            'next_step_inbox' => 'Keep an eye on your inbox for updates',
            'details_title' => 'Your Details',
            'details_email' => 'Email:',
            'details_joined' => 'Joined waitlist:',
            'details_status' => 'Status:',
            'stay_connected_title' => 'Stay Connected',
            'stay_connected_intro' => 'While you wait, feel free to:',
            'stay_connected_social' => 'Follow us on social media for updates',
            'stay_connected_share' => 'Share :app with friends who might be interested',
            'stay_connected_questions' => 'Reply to this email if you have any questions',
            'closing' => 'We\'re excited to welcome you to the community soon!',
            'dont_want_wait_title' => 'Don\'t want to wait?',
            'dont_want_wait_text' => 'If you have a friend who\'s already a member, ask them to send you an invitation!',
            'unsubscribe_text' => 'To unsubscribe from waitlist updates,',
            'click_here' => 'click here',
        ],
        'helper_response_accepted' => [
            'greeting' => 'Wonderful news, :name!',
            'intro' => 'Your response to help with a pet has been accepted! The pet owner has chosen you to provide care.',
            'about_pet' => 'About :name:',
            'request_details' => '✓ Request Details:',
            'start_date' => 'Start Date:',
            'end_date' => 'End Date:',
            'special_notes' => 'Special Notes:',
            'next_steps' => 'The pet owner will be in touch with you soon to coordinate the handover details. Please be prepared to:',
            'checklist_title' => 'Preparation Checklist:',
            'checklist_space' => 'Prepare a safe and comfortable space for :pet',
            'checklist_supplies' => 'Stock up on necessary supplies (food, litter, toys)',
            'checklist_medical' => 'Review any medical or care instructions from the owner',
            'checklist_logistics' => 'Coordinate pickup/delivery logistics',
            'checklist_contact' => 'Exchange contact information for ongoing communication',
            'closing' => 'Thank you for opening your heart and home to help :pet in need. Your kindness makes a real difference!',
        ],
        'helper_response_canceled' => [
            'intro' => 'A helper has withdrawn their response to your placement request.',
            'status_active' => 'Status: Your placement request is still active',
            'reason' => ':helper has decided to withdraw their response. This could be due to personal circumstances or scheduling conflicts.',
            'next_steps_title' => 'What\'s next?',
            'next_steps_intro' => 'Your placement request remains open and other helpers can still respond. You can:',
            'next_step_review' => 'Review other existing responses',
            'next_step_wait' => 'Wait for new responses from other helpers',
            'next_step_update' => 'Update your placement request details if needed',
            'view_request' => 'View Your Placement Request',
        ],
        'helper_response_rejected' => [
            'intro' => 'Thank you for your interest in helping with a pet placement request. While your response wasn\'t selected this time, we truly appreciate your willingness to help.',
            'explanation' => 'The pet owner has chosen another helper for :pet. This decision may have been based on various factors such as location, timing, or specific care requirements.',
            'encouragement_title' => 'Don\'t be discouraged!',
            'encouragement_text' => 'Your willingness to help is valuable, and there are many pets who need caring people like you. We encourage you to:',
            'encouragement_browse' => 'Continue browsing available placement requests',
            'encouragement_profile' => 'Keep your helper profile updated and active',
            'encouragement_types' => 'Consider different types of help (fostering, adoption, temporary care)',
            'mission' => 'Every pet deserves a loving home, and your contribution to our community helps make that possible. Thank you for being part of our mission to help animals in need.',
            'stay_connected' => 'Stay Connected: Keep an eye on new placement requests that match your preferences. The perfect match might be just around the corner!',
        ],
        'new_message' => [
            'intro' => 'You have received a new message from :sender.',
        ],
        'chat_digest' => [
            'intro' => 'You have :count unread message(s) waiting for you.',
            'message_count' => '{1} :count message|[2,*] :count messages',
        ],
        'pet_birthday' => [
            'title' => '🎂 Happy Birthday!',
            'intro' => 'Today is a special day! :pet is celebrating their :age birthday!',
            'intro_no_age' => 'Today is a special day! :pet is celebrating their birthday!',
            'celebrate' => 'Don\'t forget to celebrate with them! 🎉',
            'view_profile' => 'You can view :pet\'s profile here:',
            'unsubscribe_notice' => 'If you no longer wish to receive these reminders, you can manage your preferences here:',
        ],
        'placement_ended' => [
            'intro' => 'The placement has come to an end.',
            'status_returned' => 'Status: Returned to owner',
            'explanation' => 'The owner has marked :pet as returned, and the placement is now complete. Thank you for your dedication and care during this time!',
            'thanks_helping' => 'Thank you for helping!',
            'contribution' => 'Your contribution made a real difference. Pet owners like you help make our community stronger.',
            'next_steps_intro' => 'Consider helping with future placement requests',
            'next_step_profile' => 'Keep your helper profile updated',
            'next_step_share' => 'Share your experience with others',
            'closing' => 'Thank you for being part of our pet care community!',
        ],
        'placement_request_response' => [
            'intro' => 'Great news! You\'ve received a new response to your placement request for :pet',
            'helper_intro' => ':helper has responded to your placement request.',
            'helper_interest' => 'They are interested in helping with :pet.',
            'helper_details_title' => 'Helper Details:',
            'helper_available' => 'Available for:',
            'helper_foster_adopt' => 'Fostering and Adoption',
            'helper_foster' => 'Fostering',
            'helper_adopt' => 'Adoption',
            'helper_experience' => 'Experience:',
            'fallback_intro' => 'Someone has responded to your placement request and is interested in helping with your pet.',
            'closing' => 'You can review their profile and respond to their interest by visiting your requests page.',
        ],
        'transfer_confirmed' => [
            'intro' => 'Great news! The physical handover has been confirmed.',
            'placement_type' => 'Placement type:',
            'confirmation' => ':helper has confirmed that they have received :pet.',
            'complete_title' => 'Handover Complete!',
            'active_intro' => 'The placement is now active. You can communicate with the helper through the app\'s messaging system if you need to share any information about :pet\'s care routine.',
            'closing' => 'Thank you for using our platform to find the best care for your pet.',
        ],
        'vaccination_reminder' => [
            'title' => 'Vaccination Reminder',
            'intro' => 'This is a friendly reminder that :pet is due for :vaccine on :date.',
            'due_soon' => 'This is a friendly reminder that :pet is due for :vaccine soon.',
            'notes' => 'Notes:',
            'view_health' => 'You can view :pet\'s health records here:',
            'unsubscribe_notice' => 'If you no longer wish to receive these reminders, you can manage your preferences here:',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Email Service Messages
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
