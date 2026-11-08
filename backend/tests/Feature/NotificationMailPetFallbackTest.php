<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Mail\HelperResponseAcceptedMail;
use App\Mail\HelperResponseCanceledMail;
use App\Mail\HelperResponseRejectedMail;
use App\Mail\PetBirthdayMail;
use App\Mail\PlacementEndedMail;
use App\Mail\PlacementRequestResponseMail;
use App\Mail\TransferConfirmedMail;
use App\Mail\VaccinationReminderMail;
use App\Models\Pet;
use App\Models\User;
use Database\Seeders\PetTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class NotificationMailPetFallbackTest extends TestCase
{
    use RefreshDatabase;

    public static function locales(): array
    {
        return array_combine(['en', 'ru', 'uk', 'vi'], [['en'], ['ru'], ['uk'], ['vi']]);
    }

    #[DataProvider('locales')]
    public function test_mail_uses_whole_sentences_when_the_pet_is_deleted_before_rendering(string $locale): void
    {
        $this->seed(PetTypeSeeder::class);
        app()->setLocale($locale);
        $user = User::factory()->create(['locale' => $locale]);
        $pet = Pet::factory()->create(['name' => 'Мурка']);
        $types = [
            HelperResponseAcceptedMail::class => NotificationType::HELPER_RESPONSE_ACCEPTED,
            HelperResponseRejectedMail::class => NotificationType::HELPER_RESPONSE_REJECTED,
            HelperResponseCanceledMail::class => NotificationType::HELPER_RESPONSE_CANCELED,
            PlacementEndedMail::class => NotificationType::PLACEMENT_ENDED,
            PlacementRequestResponseMail::class => NotificationType::PLACEMENT_REQUEST_RESPONSE,
            TransferConfirmedMail::class => NotificationType::TRANSFER_CONFIRMED,
            PetBirthdayMail::class => NotificationType::PET_BIRTHDAY,
            VaccinationReminderMail::class => NotificationType::VACCINATION_REMINDER,
        ];
        $pending = [];
        foreach ($types as $class => $type) {
            $data = ['pet_id' => $pet->id, 'age' => 3, 'helperName' => 'Alex'];
            $named = new $class($user, $type, $data);
            $this->assertStringContainsString('Мурка', $named->envelope()->subject);
            $pending[] = new $class($user, $type, $data);
        }

        $pet->delete();
        $this->assertNull(Pet::find($pet->id));
        $this->assertNotNull(Pet::withoutGlobalScopes()->find($pet->id)?->deleted_at);

        foreach ($pending as $mail) {
            $subject = $mail->envelope()->subject;
            $html = $mail->render();
            foreach ([$subject, $html] as $text) {
                $this->assertStringNotContainsString('Мурка', $text);
                $this->assertStringNotContainsString(':pet', $text);
                $this->assertStringNotContainsString('_without_pet', $text);
                $this->assertStringNotContainsString('«', $text);
                $this->assertStringNotContainsString('Питомец:', $text);
                $this->assertStringNotContainsString('Тваринка:', $text);
            }
        }

        // These events already carry a name snapshot; keep using it in the subject.
        foreach ([HelperResponseCanceledMail::class, PlacementEndedMail::class, TransferConfirmedMail::class] as $class) {
            $mail = new $class($user, $types[$class], ['pet_id' => $pet->id, 'pet_name' => 'Мурка']);
            $this->assertStringContainsString('Мурка', $mail->envelope()->subject);
        }
    }
}
