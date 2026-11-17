<?php

declare(strict_types=1);

namespace Tests\Feature\Filament;

use App\Filament\Resources\CityResource\Pages\ListCities;
use App\Models\City;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class TranslatableListFallbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_city_list_hints_the_english_name_when_active_locale_has_no_translation(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $this->actingAs($admin);

        $untranslated = City::factory()->create(['name' => ['en' => 'Zzyzx Springs']]);
        $translated = City::factory()->create(['name' => ['en' => 'Qwerty Bay', 'ru' => 'Залив Кверти']]);

        Livewire::test(ListCities::class)
            ->set('activeLocale', 'ru')
            ->assertCanSeeTableRecords([$untranslated, $translated])
            ->assertTableColumnStateSet('name', null, $untranslated)
            ->assertSee('Zzyzx Springs')
            ->assertTableColumnStateSet('name', 'Залив Кверти', $translated)
            ->assertDontSee('Qwerty Bay');
    }
}
