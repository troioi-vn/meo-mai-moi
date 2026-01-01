<?php

namespace Tests\Feature;

use App\Enums\PetStatus;
use App\Models\Pet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PetRemovalTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Pet $pet;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'password' => Hash::make('password123'),
        ]);

        $this->pet = Pet::factory()->create([
            'created_by' => $this->user->id,
            'status' => PetStatus::ACTIVE,
        ]);
    }

    #[Test]
    public function it_fails_to_delete_a_pet_profile_with_an_incorrect_password(): void
    {
        $response = $this->actingAs($this->user)->deleteJson(route('pets.destroy', $this->pet), [
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('pets', ['id' => $this->pet->id]);
    }

    #[Test]
    public function it_successfully_deletes_a_pet_profile_with_the_correct_password(): void
    {
        $response = $this->actingAs($this->user)->deleteJson(route('pets.destroy', $this->pet), [
            'password' => 'password123',
        ]);

        $response->assertStatus(204);
        // Pet uses status-based soft delete; row remains with status DELETED
        $this->assertDatabaseHas('pets', [
            'id' => $this->pet->id,
            'status' => PetStatus::DELETED->value,
        ]);
    }

    #[Test]
    public function it_fails_to_mark_a_pet_as_deceased_with_an_incorrect_password(): void
    {
        $response = $this->actingAs($this->user)->putJson(route('pets.updateStatus', $this->pet), [
            'status' => PetStatus::DECEASED->value,
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('pets', [
            'id' => $this->pet->id,
            'status' => $this->pet->status,
        ]);
    }

    #[Test]
    public function it_successfully_marks_a_pet_as_deceased_with_the_correct_password(): void
    {
        $response = $this->actingAs($this->user)->putJson(route('pets.updateStatus', $this->pet), [
            'status' => PetStatus::DECEASED->value,
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', PetStatus::DECEASED->value);

        $this->assertDatabaseHas('pets', [
            'id' => $this->pet->id,
            'status' => PetStatus::DECEASED->value,
        ]);
    }
}
