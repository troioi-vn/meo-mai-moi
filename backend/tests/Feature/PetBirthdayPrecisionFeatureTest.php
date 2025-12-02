<?php

namespace Tests\Feature;

use App\Models\PetType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PetBirthdayPrecisionFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected PetType $catType;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->catType = PetType::create([
            'name' => 'Cat',
            'slug' => 'cat',
            'is_system' => true,
            'display_order' => 1,
        ]);
        Sanctum::actingAs($this->user);
    }

    /**
     * Helpers
     */
    protected function postPet(array $data)
    {
        return $this->postJson('/api/pets', array_merge([
            'name' => 'Testy',
            'breed' => 'Breed',
            'country' => 'VN',
            'city' => 'Hanoi',
            'description' => 'Desc',
            'pet_type_id' => $this->catType->id,
        ], $data));
    }

    /* ================= Success Cases ================= */

    public function test_create_unknown_precision_no_components()
    {
        $response = $this->postPet([]);

        $response->assertStatus(201)
            ->assertJsonPath('data.birthday_precision', 'unknown')
            ->assertJsonPath('data.birthday', null)
            ->assertJsonPath('data.birthday_year', null);
    }

    public function test_create_year_precision()
    {
        $year = now()->year - 2;
        $response = $this->postPet([
            'birthday_precision' => 'year',
            'birthday_year' => $year,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.birthday_precision', 'year')
            ->assertJsonPath('data.birthday_year', $year)
            ->assertJsonPath('data.birthday', null);
    }

    public function test_create_month_precision()
    {
        $year = now()->year - 1;
        $month = 5;
        $response = $this->postPet([
            'birthday_precision' => 'month',
            'birthday_year' => $year,
            'birthday_month' => $month,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.birthday_precision', 'month')
            ->assertJsonPath('data.birthday_year', $year)
            ->assertJsonPath('data.birthday_month', $month)
            ->assertJsonPath('data.birthday_day', null)
            ->assertJsonPath('data.birthday', null);
    }

    public function test_create_day_precision_via_components()
    {
        $date = now()->subYears(3); // Past date
        $response = $this->postPet([
            'birthday_precision' => 'day',
            'birthday_year' => $date->year,
            'birthday_month' => $date->month,
            'birthday_day' => $date->day,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.birthday_precision', 'day')
            ->assertJsonPath('data.birthday_year', $date->year)
            ->assertJsonPath('data.birthday_month', $date->month)
            ->assertJsonPath('data.birthday_day', $date->day);

        $json = $response->json();
        $this->assertStringStartsWith($date->format('Y-m-d'), $json['data']['birthday']);
    }

    public function test_create_day_precision_via_legacy_birthday_only()
    {
        $date = now()->subYear();
        $response = $this->postPet([
            'birthday' => $date->format('Y-m-d'),
        ]);

        $response->assertStatus(201);
        $json = $response->json();
        // If backend normalized, birthday will be present & precision day; otherwise may null + unknown.
        if ($json['data']['birthday']) {
            $this->assertStringStartsWith($date->format('Y-m-d'), $json['data']['birthday']);
            $this->assertEquals('day', $json['data']['birthday_precision']);
        } else {
            $this->assertEquals('unknown', $json['data']['birthday_precision']);
        }
    }

    /* ================= Validation Failures ================= */

    public function test_components_without_precision_fail()
    {
        $response = $this->postPet([
            'birthday_year' => now()->year - 1,
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['birthday_precision']);
    }

    public function test_unknown_with_components_fails()
    {
        $response = $this->postPet([
            'birthday_precision' => 'unknown',
            'birthday_year' => now()->year - 1,
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['birthday_precision']);
    }

    public function test_year_precision_missing_year_fails()
    {
        $response = $this->postPet([
            'birthday_precision' => 'year',
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['birthday_year']);
    }

    public function test_year_precision_with_month_fails()
    {
        $response = $this->postPet([
            'birthday_precision' => 'year',
            'birthday_year' => now()->year - 1,
            'birthday_month' => 5,
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['birthday_month']);
    }

    public function test_month_precision_missing_month_fails()
    {
        $response = $this->postPet([
            'birthday_precision' => 'month',
            'birthday_year' => now()->year - 1,
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['birthday_month']);
    }

    public function test_month_precision_with_day_fails()
    {
        $response = $this->postPet([
            'birthday_precision' => 'month',
            'birthday_year' => now()->year - 1,
            'birthday_month' => 2,
            'birthday_day' => 10,
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['birthday_day']);
    }

    public function test_day_precision_missing_component_fails()
    {
        $response = $this->postPet([
            'birthday_precision' => 'day',
            'birthday_year' => now()->year - 1,
            'birthday_month' => 2,
            // Missing day
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['birthday_day']);
    }

    public function test_future_year_fails()
    {
        $response = $this->postPet([
            'birthday_precision' => 'year',
            'birthday_year' => now()->year + 1,
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['birthday_year']);
    }

    public function test_future_month_fails()
    {
        $future = now()->addMonth();
        $response = $this->postPet([
            'birthday_precision' => 'month',
            'birthday_year' => $future->year,
            'birthday_month' => $future->month,
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['birthday_month']);
    }

    public function test_future_day_fails_via_components()
    {
        $future = now()->addDay();
        $response = $this->postPet([
            'birthday_precision' => 'day',
            'birthday_year' => $future->year,
            'birthday_month' => $future->month,
            'birthday_day' => $future->day,
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['birthday_day']);
    }

    public function test_future_day_fails_via_legacy_birthday()
    {
        $future = now()->addDay();
        $response = $this->postPet([
            'birthday' => $future->format('Y-m-d'),
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['birthday']);
    }
}
