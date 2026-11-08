<?php

namespace Tests\Feature;

use App\Enums\NotificationType;
use App\Mail\PetBirthdayMail;
use App\Models\Pet;
use App\Models\User;
use Database\Seeders\PetTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PetBirthdayMailLocalizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_subject_and_body_use_localized_age_phrases_with_and_without_a_pet(): void
    {
        $this->seed(PetTypeSeeder::class);
        $pet = Pet::factory()->create(['name' => 'Murka']);
        $user = User::factory()->create();

        $translations = [
            'en' => ['🎂 Happy birthday, Murka!', '🎂 Happy birthday to your pet!', ':age today', [1 => '1 year old', 3 => '3 years old', 21 => '21 years old']],
            'ru' => ['🎂 С днём рождения, Murka!', '🎂 С днём рождения вашего питомца!', 'Сегодня :age', [1 => '1 год', 3 => '3 года', 21 => '21 год']],
            'uk' => ['🎂 З днем народження, Murka!', '🎂 З днем народження вашої тваринки!', 'Сьогодні :age', [1 => '1 рік', 3 => '3 роки', 21 => '21 рік']],
            'vi' => ['🎂 Chúc mừng sinh nhật Murka!', '🎂 Chúc mừng sinh nhật thú cưng của bạn!', 'Hôm nay tròn :age', [1 => '1 tuổi', 3 => '3 tuổi', 21 => '21 tuổi']],
        ];

        foreach ($translations as $locale => [$namedSubject, $unnamedSubject, $ageSentence, $ages]) {
            app()->setLocale($locale);
            $user->locale = $locale;

            foreach ([true, false] as $hasPet) {
                foreach ([1, 3, 21, null] as $age) {
                    $data = ['age' => $age];
                    if ($hasPet) {
                        $data['pet_id'] = $pet->id;
                    }
                    $mail = new PetBirthdayMail($user, NotificationType::PET_BIRTHDAY, $data);
                    $expected = $hasPet ? $namedSubject : $unnamedSubject;
                    if ($age !== null) {
                        $expected .= ' '.str_replace(':age', $ages[$age], $ageSentence);
                    }

                    $this->assertSame($expected, $mail->envelope()->subject);
                    $body = $mail->render();
                    if ($age !== null) {
                        $this->assertStringContainsString('('.$ages[$age].')', $body);
                    } else {
                        $this->assertStringNotContainsString('()', $body);
                        $this->assertStringNotContainsString(':age', $body);
                    }
                }
            }
        }
    }
}
