<?php

namespace Database\Seeders;

use App\Enums\HelperProfileApprovalStatus;
use App\Enums\HelperProfileStatus;
use App\Enums\PlacementRequestType;
use App\Models\City;
use App\Models\HelperProfile;
use App\Models\PetType;
use App\Models\User;
use Illuminate\Database\Seeder;

class HelperProfileSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $catType = PetType::where('slug', 'cat')->first();
        $dogType = PetType::where('slug', 'dog')->first();
        $findVietnamCity = fn (string $englishName) => City::where('country', 'VN')
            ->where('name->en', $englishName)
            ->first();
        $hanoi = $findVietnamCity('Hanoi');
        $daNang = $findVietnamCity('Da Nang');
        $hoChiMinh = $findVietnamCity('Ho Chi Minh City');
        $canTho = $findVietnamCity('Can Tho');

        $publicSeeds = [
            [
                'email' => 'invitee@catarchy.space',
                'country' => 'VN',
                'state' => 'HN',
                'cities' => array_filter([$hanoi, $daNang]),
                'address' => '12 Rescue Lane',
                'zip_code' => '100000',
                'phone_number' => '+84901234567',
                'contact_details' => [
                    ['type' => 'telegram', 'value' => 'trustedfriend'],
                    ['type' => 'facebook', 'value' => 'trusted.friend.rescue'],
                ],
                'experience' => 'Experienced with cat introductions, short-term foster support, and adoption follow-up.',
                'has_pets' => true,
                'has_children' => false,
                'request_types' => [
                    PlacementRequestType::FOSTER_FREE->value,
                    PlacementRequestType::PERMANENT->value,
                ],
                'pet_types' => array_filter([$catType, $dogType]),
            ],
            [
                'email' => config('demo.user_email'),
                'country' => 'VN',
                'state' => 'SG',
                'cities' => array_filter([$hoChiMinh, $canTho]),
                'address' => '88 Community Care Street',
                'zip_code' => '700000',
                'phone_number' => '+84909876543',
                'contact_details' => [
                    ['type' => 'zalo', 'value' => 'zalo: evenings preferred'],
                    ['type' => 'whatsapp', 'value' => '84909876543'],
                ],
                'experience' => 'Comfortable with foster intakes, transport coordination, and temporary pet sitting for cats and dogs.',
                'has_pets' => true,
                'has_children' => true,
                'request_types' => [
                    PlacementRequestType::FOSTER_PAID->value,
                    PlacementRequestType::PET_SITTING->value,
                ],
                'pet_types' => array_filter([$catType, $dogType]),
            ],
        ];

        foreach ($publicSeeds as $seed) {
            $user = User::where('email', $seed['email'])->first();

            if (! $user || count($seed['cities']) === 0) {
                continue;
            }

            $primaryCity = $seed['cities'][0];

            $profile = HelperProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'country' => $seed['country'],
                    'state' => $seed['state'],
                    'city_id' => $primaryCity->id,
                    'city' => collect($seed['cities'])->pluck('name')->implode(', '),
                    'address' => $seed['address'],
                    'zip_code' => $seed['zip_code'],
                    'phone_number' => $seed['phone_number'],
                    'contact_details' => $seed['contact_details'],
                    'experience' => $seed['experience'],
                    'has_pets' => $seed['has_pets'],
                    'has_children' => $seed['has_children'],
                    'request_types' => $seed['request_types'],
                    'approval_status' => HelperProfileApprovalStatus::APPROVED,
                    'status' => HelperProfileStatus::PUBLIC,
                ]
            );

            $profile->cities()->sync(collect($seed['cities'])->pluck('id')->all());
            $profile->petTypes()->sync(collect($seed['pet_types'])->pluck('id')->all());
        }

        $users = User::query()
            ->whereDoesntHave('roles', function ($query): void {
                $query->whereIn('name', ['admin', 'super_admin']);
            })
            ->whereNotIn('email', array_column($publicSeeds, 'email'))
            ->get();

        foreach ($users as $user) {
            if ($user->helperProfiles()->exists()) {
                continue;
            }

            HelperProfile::factory()->create(['user_id' => $user->id]);
        }
    }
}
