<?php

declare(strict_types=1);

namespace Tests\Feature\Filament;

use App\Filament\Resources\GroupResource\Pages\ViewGroup;
use App\Filament\Resources\HabitResource\Pages\ViewHabit;
use App\Filament\Resources\LedgerResource\Pages\ViewLedger;
use App\Filament\Resources\LitterResource\Pages\ViewLitter;
use App\Filament\Resources\PetResource\Pages\ViewPet;
use App\Models\Group;
use App\Models\Habit;
use App\Models\Ledger;
use App\Models\Litter;
use App\Models\Pet;
use App\Models\User;
use Database\Seeders\CurrencySeeder;
use Database\Seeders\PetTypeSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * These models have membership-based policies that give admins no shortcut.
 * The admin panel must still open their records for an admin who is not a member.
 */
class AdminRecordViewAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed([CurrencySeeder::class, PetTypeSeeder::class]);
    }

    /**
     * @return array<string, array{class-string, string}>
     */
    public static function viewPages(): array
    {
        return [
            'group' => [ViewGroup::class, 'group'],
            'habit' => [ViewHabit::class, 'habit'],
            'ledger' => [ViewLedger::class, 'ledger'],
            'litter' => [ViewLitter::class, 'litter'],
            'pet' => [ViewPet::class, 'pet'],
        ];
    }

    #[DataProvider('viewPages')]
    public function test_admin_without_membership_can_open_view_page(string $page, string $kind): void
    {
        $record = $this->makeRecord($kind, User::factory()->create());

        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $this->actingAs($admin);

        Livewire::test($page, ['record' => $record->getRouteKey()])->assertSuccessful();
    }

    #[DataProvider('viewPages')]
    public function test_user_without_admin_role_cannot_open_view_page(string $page, string $kind): void
    {
        $record = $this->makeRecord($kind, User::factory()->create());

        $this->actingAs(User::factory()->create());

        Livewire::test($page, ['record' => $record->getRouteKey()])->assertForbidden();
    }

    private function makeRecord(string $kind, User $owner): Model
    {
        return match ($kind) {
            'group' => Group::factory()->create(),
            'habit' => Habit::query()->create([
                'created_by' => $owner->id,
                'name' => 'Daily care',
                'timezone' => 'UTC',
                'value_type' => 'yes_no',
                'day_summary_mode' => 'average_scored_pets',
                'share_with_coowners' => false,
                'reminder_enabled' => false,
            ]),
            'ledger' => Ledger::query()->create([
                'title' => 'Shared',
                'currency_code' => 'VND',
                'created_by_user_id' => $owner->id,
            ]),
            'litter' => Litter::factory()->create(),
            'pet' => Pet::factory()->create(['created_by' => $owner->id]),
        };
    }
}
