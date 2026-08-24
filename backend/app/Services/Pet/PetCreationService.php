<?php

declare(strict_types=1);

namespace App\Services\Pet;

use App\Enums\PetRelationshipType;
use App\Enums\PetStatus;
use App\Enums\PetTypeStatus;
use App\Exceptions\DuplicatePetException;
use App\Exceptions\GroupException;
use App\Exceptions\InvalidPetDataException;
use App\Models\Category;
use App\Models\City;
use App\Models\Group;
use App\Models\Pet;
use App\Models\PetType;
use App\Models\User;
use App\Services\Groups\GroupCapabilityService;
use App\Services\Groups\GroupPetService;
use App\Services\PetRelationshipService;
use Carbon\Carbon;

final class PetCreationService
{
    public function __construct(
        private readonly GroupCapabilityService $groupCapabilities,
        private readonly GroupPetService $groupPetService,
        private readonly PetRelationshipService $relationshipService,
    ) {}

    /**
     * Create a pet from already-validated data.
     *
     * The caller owns the transaction boundary so this method can be invoked
     * repeatedly inside a single outer transaction (e.g. litter creation).
     *
     * @param  array<string, mixed>  $data  validated attributes (without allow_duplicate)
     *
     * @throws DuplicatePetException when MCP duplicate guard fires (409)
     * @throws InvalidPetDataException for city/category 422 cases
     * @throws GroupException for group attachment failures
     */
    public function create(User $actor, array $data, bool $allowDuplicate = false): Pet
    {
        // Normalise country to upper-case (preserves StorePetController behaviour).
        if (isset($data['country']) && is_string($data['country'])) {
            $data['country'] = strtoupper($data['country']);
        }

        // City / country cross-check.
        if (! empty($data['city_id'])) {
            /** @var City|null $city */
            $city = City::find($data['city_id']);
            if (! $city) {
                throw InvalidPetDataException::cityNotFound();
            }
            if ($city->country !== $data['country']) {
                throw InvalidPetDataException::cityCountryMismatch();
            }
            $data['city'] = $city->name;
        } else {
            $data['city'] = null;
            $data['city_id'] = null;
        }

        // Birthday precision normalization (mirrors StorePetController).
        $precision = $data['birthday_precision'] ?? 'unknown';
        $birthdayDate = null;
        if ($precision === 'day') {
            if (! empty($data['birthday'])) {
                $birthdayDate = $data['birthday'];
                $dt = Carbon::parse($birthdayDate);
                $data['birthday_year'] = (int) $dt->year;
                $data['birthday_month'] = (int) $dt->month;
                $data['birthday_day'] = (int) $dt->day;
            } else {
                $birthdayDate = sprintf('%04d-%02d-%02d', $data['birthday_year'], $data['birthday_month'], $data['birthday_day']);
            }
        } else {
            $data['birthday'] = null;
        }

        // Resolve pet type (defaults to cat, creates system cat if missing).
        $petTypeId = $data['pet_type_id'] ?? PetType::where('slug', 'cat')->value('id');
        if (! $petTypeId) {
            $petTypeId = PetType::create([
                'name' => 'Cat',
                'slug' => 'cat',
                'status' => PetTypeStatus::ACTIVE,
                'is_system' => true,
                'display_order' => 0,
            ])->id;
        }

        if (isset($data['category_ids'])) {
            $visibleCount = Category::query()
                ->visibleTo($actor)
                ->where('pet_type_id', $petTypeId)
                ->whereKey($data['category_ids'])
                ->count();
            if ($visibleCount !== count($data['category_ids'])) {
                throw InvalidPetDataException::invalidCategories();
            }
        }

        // MCP duplicate guard — only for bearer-token clients holding pet:write and when allow_duplicate is false.
        $accessToken = $actor->currentAccessToken();
        $enforceMcpDuplicateGuard = $accessToken !== null && $accessToken->can('pet:write');
        if ($enforceMcpDuplicateGuard && ! $allowDuplicate) {
            // Lock the actor row to prevent concurrent duplicate races (same as original controller).
            $actor->newQuery()
                ->whereKey($actor->id)
                ->lockForUpdate()
                ->firstOrFail();

            $existingPetIds = Pet::query()
                ->where('created_by', $actor->id)
                ->where('pet_type_id', $petTypeId)
                ->whereRaw('LOWER(name) = ?', [mb_strtolower(trim((string) $data['name']))])
                ->orderBy('id')
                ->pluck('id')
                ->map(static fn (mixed $id): int => (int) $id)
                ->all();

            if ($existingPetIds !== []) {
                throw new DuplicatePetException($existingPetIds);
            }
        }

        $pet = Pet::create([
            'name' => $data['name'],
            'sex' => $data['sex'] ?? 'not_specified',
            'birthday' => $birthdayDate,
            'birthday_year' => $data['birthday_year'] ?? null,
            'birthday_month' => $data['birthday_month'] ?? null,
            'birthday_day' => $data['birthday_day'] ?? null,
            'birthday_precision' => $precision,
            'country' => $data['country'],
            'state' => $data['state'] ?? null,
            'city_id' => $data['city_id'],
            'city' => $data['city'],
            'address' => $data['address'] ?? null,
            'description' => $data['description'] ?? '',
            'pet_type_id' => $petTypeId,
            'created_by' => $actor->id,
            'status' => PetStatus::ACTIVE,
        ]);

        // Sync categories if provided.
        if (isset($data['category_ids'])) {
            $pet->categories()->sync($data['category_ids']);
        }

        // Sync viewers / editors if provided.
        if (isset($data['viewer_user_ids'])) {
            $this->relationshipService->syncRelationships($pet, $data['viewer_user_ids'], PetRelationshipType::VIEWER, $actor);
        }
        if (isset($data['editor_user_ids'])) {
            $this->relationshipService->syncRelationships($pet, $data['editor_user_ids'], PetRelationshipType::EDITOR, $actor);
        }

        if (! empty($data['group_id'])) {
            /** @var Group $group */
            $group = Group::query()->findOrFail((int) $data['group_id']);

            if (! $this->groupCapabilities->isActiveAdmin($actor, $group)) {
                throw GroupException::notGroupAdmin();
            }

            $this->groupPetService->addPet($group, $pet, $actor);
        }

        return $pet;
    }
}
