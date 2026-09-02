<?php

declare(strict_types=1);

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum NotificationType: string implements HasColor, HasLabel
{
    // Owner receives: when someone responds to their placement request
    case PLACEMENT_REQUEST_RESPONSE = 'placement_request_response';

    // Helper receives: when owner accepts their response
    case HELPER_RESPONSE_ACCEPTED = 'helper_response_accepted';

    // Helper receives: when owner rejects their response (before or after acceptance)
    case HELPER_RESPONSE_REJECTED = 'helper_response_rejected';

    // Owner receives: when helper cancels their response or transfer
    case HELPER_RESPONSE_CANCELED = 'helper_response_canceled';

    // Owner receives: when a member of the public asks a question about the pet
    case PLACEMENT_QUESTION_RECEIVED = 'placement_question_received';

    // Owner receives: when helper confirms physical handover
    case TRANSFER_CONFIRMED = 'transfer_confirmed';

    // Helper receives: when owner marks pet as returned (placement ended)
    case PLACEMENT_ENDED = 'placement_ended';

    // Pet health reminders
    case VACCINATION_REMINDER = 'vaccination_reminder';
    case PET_BIRTHDAY = 'pet_birthday';
    case HABIT_REMINDER = 'habit_reminder';

    // Receipts for the acting user's own action. In-app only: see isActivityReceipt().
    case OWN_PLACEMENT_RESPONSE = 'own_placement_response';
    case HELPER_PROFILE_AUTO_CREATED = 'helper_profile_auto_created';

    // Account & messaging
    case EMAIL_VERIFICATION = 'email_verification';
    case SYSTEM_ANNOUNCEMENT = 'system_announcement';
    case NEW_MESSAGE = 'new_message';
    case CHAT_DIGEST = 'chat_digest';

    public function getGroup(): string
    {
        return match ($this) {
            // Owner-side placement notifications
            self::PLACEMENT_REQUEST_RESPONSE,
            self::HELPER_RESPONSE_CANCELED,
            self::PLACEMENT_QUESTION_RECEIVED,
            self::TRANSFER_CONFIRMED => 'placement_owner',

            // Helper-side placement notifications
            self::HELPER_RESPONSE_ACCEPTED,
            self::HELPER_RESPONSE_REJECTED,
            self::PLACEMENT_ENDED => 'placement_helper',

            // Pet reminders
            self::VACCINATION_REMINDER,
            self::PET_BIRTHDAY,
            self::HABIT_REMINDER => 'pet_reminders',

            // Receipts for something the user just did themselves
            self::OWN_PLACEMENT_RESPONSE,
            self::HELPER_PROFILE_AUTO_CREATED => 'activity',

            // Account
            self::EMAIL_VERIFICATION,
            self::SYSTEM_ANNOUNCEMENT => 'account',

            // Messaging
            self::NEW_MESSAGE,
            self::CHAT_DIGEST => 'messaging',
        };
    }

    public function getGroupLabel(): string
    {
        return __("messages.notifications.groups.{$this->getGroup()}");
    }

    public function getLabel(): string
    {
        return __("messages.notifications.types.{$this->value}.label");
    }

    public function getColor(): string
    {
        return match ($this) {
            self::PLACEMENT_REQUEST_RESPONSE => 'info',
            self::PLACEMENT_QUESTION_RECEIVED => 'info',
            self::HELPER_RESPONSE_ACCEPTED, self::TRANSFER_CONFIRMED => 'success',
            self::HELPER_RESPONSE_REJECTED, self::HELPER_RESPONSE_CANCELED => 'danger',
            self::PLACEMENT_ENDED => 'warning',
            self::VACCINATION_REMINDER => 'primary',
            self::PET_BIRTHDAY => 'warning',
            self::HABIT_REMINDER => 'primary',
            self::EMAIL_VERIFICATION => 'info',
            self::SYSTEM_ANNOUNCEMENT => 'gray',
            self::NEW_MESSAGE, self::CHAT_DIGEST => 'success',
            self::OWN_PLACEMENT_RESPONSE => 'info',
            self::HELPER_PROFILE_AUTO_CREATED => 'gray',
        };
    }

    /**
     * A record of something the user did themselves, rather than news about
     * someone else's action.
     *
     * These exist so a fact outlives the toast that announced it: an offer you
     * made, or a profile that was created for you without you filling anything
     * in. They are delivered in-app only and are not user-configurable, because
     * emailing somebody about their own click is noise and a switch that
     * silences a disclosure is worse than no switch.
     */
    public function isActivityReceipt(): bool
    {
        return match ($this) {
            self::OWN_PLACEMENT_RESPONSE,
            self::HELPER_PROFILE_AUTO_CREATED => true,
            default => false,
        };
    }

    /**
     * @return array<int, self>
     */
    public static function configurableCases(): array
    {
        return array_values(array_filter(
            self::cases(),
            static fn (self $type): bool => ! $type->isActivityReceipt(),
        ));
    }

    public function getDescription(): string
    {
        return __("messages.notifications.types.{$this->value}.description");
    }
}
