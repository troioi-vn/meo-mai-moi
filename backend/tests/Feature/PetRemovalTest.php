<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\LedgerPetAssignmentSource;
use App\Enums\PetStatus;
use App\Models\Group;
use App\Models\GroupPet;
use App\Models\Ledger;
use App\Models\LedgerPetAssignment;
use App\Models\Pet;
use App\Models\User;
use Database\Seeders\CurrencySeeder;
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
    public function it_deletes_a_pet_profile_even_with_an_incorrect_password(): void
    {
        $response = $this->actingAs($this->user)->deleteJson(route('pets.destroy', $this->pet), [
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(204);
        $this->assertDatabaseHas('pets', [
            'id' => $this->pet->id,
            'status' => PetStatus::DELETED->value,
        ]);
    }

    #[Test]
    public function it_successfully_deletes_a_pet_profile_without_password(): void
    {
        $response = $this->actingAs($this->user)->deleteJson(route('pets.destroy', $this->pet));

        $response->assertStatus(204);
        // Pet uses status-based soft delete; row remains with status DELETED
        $this->assertDatabaseHas('pets', [
            'id' => $this->pet->id,
            'status' => PetStatus::DELETED->value,
        ]);
    }

    #[Test]
    public function deleting_a_pet_ends_group_and_group_synced_ledger_assignments(): void
    {
        $this->seed(CurrencySeeder::class);

        $group = Group::factory()->create([
            'created_by_user_id' => $this->user->id,
        ]);
        GroupPet::factory()->active()->create([
            'group_id' => $group->id,
            'pet_id' => $this->pet->id,
            'added_by_user_id' => $this->user->id,
        ]);
        $ledger = Ledger::query()->create([
            'title' => 'Pet care',
            'currency_code' => 'VND',
            'group_id' => $group->id,
            'sync_group_pets' => true,
            'created_by_user_id' => $this->user->id,
        ]);
        LedgerPetAssignment::query()->create([
            'ledger_id' => $ledger->id,
            'pet_id' => $this->pet->id,
            'source' => LedgerPetAssignmentSource::GROUP_SYNC,
            'source_group_id' => $group->id,
            'start_at' => now(),
        ]);

        $this->actingAs($this->user)
            ->deleteJson(route('pets.destroy', $this->pet))
            ->assertNoContent();

        $this->assertDatabaseMissing('group_pets', [
            'group_id' => $group->id,
            'pet_id' => $this->pet->id,
            'end_at' => null,
        ]);
        $this->assertDatabaseMissing('ledger_pet_assignments', [
            'ledger_id' => $ledger->id,
            'pet_id' => $this->pet->id,
            'source' => LedgerPetAssignmentSource::GROUP_SYNC->value,
            'source_group_id' => $group->id,
            'end_at' => null,
        ]);
    }

    #[Test]
    public function it_marks_a_pet_as_deceased_even_with_an_incorrect_password(): void
    {
        $response = $this->actingAs($this->user)->putJson(route('pets.updateStatus', $this->pet), [
            'status' => PetStatus::DECEASED->value,
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', PetStatus::DECEASED->value);
        $this->assertDatabaseHas('pets', [
            'id' => $this->pet->id,
            'status' => PetStatus::DECEASED->value,
        ]);
    }

    #[Test]
    public function it_successfully_marks_a_pet_as_deceased_without_password(): void
    {
        $response = $this->actingAs($this->user)->putJson(route('pets.updateStatus', $this->pet), [
            'status' => PetStatus::DECEASED->value,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', PetStatus::DECEASED->value);

        $this->assertDatabaseHas('pets', [
            'id' => $this->pet->id,
            'status' => PetStatus::DECEASED->value,
        ]);
    }
}
