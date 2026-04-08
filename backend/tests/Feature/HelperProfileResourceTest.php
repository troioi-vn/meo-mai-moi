<?php

namespace Tests\Feature;

use App\Filament\Resources\HelperProfileResource;
use App\Models\HelperProfile;
use App\Models\PetType;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class HelperProfileResourceTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->artisan('db:seed', ['--class' => RolesAndPermissionsSeeder::class]);

        $this->adminUser = User::factory()->create([
            'email' => 'admin-helper@test.com',
        ]);
        $this->adminUser->assignRole('admin');

        $this->actingAs($this->adminUser);
    }

    #[Test]
    public function admin_can_render_helper_profile_edit_page(): void
    {
        $helperOwner = User::factory()->create();
        $helperProfile = HelperProfile::factory()->for($helperOwner)->create();

        $this->get(HelperProfileResource::getUrl('edit', ['record' => $helperProfile]))
            ->assertSuccessful();
    }

    #[Test]
    public function admin_can_mark_helper_profile_as_public_in_filament()
    {
        $user = User::factory()->create();
        $petType = PetType::factory()->create([
            'name' => 'Cat',
            'slug' => 'cat',
            'placement_requests_allowed' => true,
            'is_system' => true,
        ]);

        Livewire::test(HelperProfileResource\Pages\CreateHelperProfile::class)
            ->fillForm([
                'user_id' => $user->id,
                'request_types' => ['foster_free'],
                'country' => 'VN',
                'address' => '123 Test Street',
                'city' => 'Hanoi',
                'state' => 'HN',
                'phone_number' => '+84123456789',
                'experience' => 'Experienced helper',
                'has_pets' => true,
                'has_children' => false,
                'pet_type_ids' => [$petType->id],
                'approval_status' => 'approved',
                'is_public' => true,
            ])
            ->call('create')
            ->assertHasNoFormErrors();

        $this->assertDatabaseHas('helper_profiles', [
            'status' => 'public',
            'user_id' => $user->id,
        ]);
    }
}
