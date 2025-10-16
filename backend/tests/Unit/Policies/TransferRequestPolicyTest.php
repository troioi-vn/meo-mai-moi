<?php

namespace Tests\Unit\Policies;

use App\Enums\PlacementRequestStatus;
use App\Models\Pet;
use App\Models\PlacementRequest;
use App\Models\TransferRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransferRequestPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_accept_and_reject_transfer_request(): void
    {
        $owner = User::factory()->create();
        $pet = Pet::factory()->create(['user_id' => $owner->id]);
        $placement = PlacementRequest::factory()->create(['pet_id' => $pet->id, 'user_id' => $owner->id, 'status' => PlacementRequestStatus::OPEN]);
        $transfer = TransferRequest::factory()->create([
            'pet_id' => $pet->id,
            'recipient_user_id' => $owner->id,
            'placement_request_id' => $placement->id,
            'status' => 'pending',
        ]);

        $this->actingAs($owner);
        $this->assertTrue($owner->can('accept', $transfer));
        $this->assertTrue($owner->can('reject', $transfer));
    }

    public function test_non_owner_cannot_accept_or_reject_transfer_request_by_default(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $pet = Pet::factory()->create(['user_id' => $owner->id]);
        $placement = PlacementRequest::factory()->create(['pet_id' => $pet->id, 'user_id' => $owner->id, 'status' => PlacementRequestStatus::OPEN]);
        $transfer = TransferRequest::factory()->create([
            'pet_id' => $pet->id,
            'recipient_user_id' => $owner->id,
            'placement_request_id' => $placement->id,
            'status' => 'pending',
        ]);

        $this->actingAs($other);
        $this->assertFalse($other->can('accept', $transfer));
        $this->assertFalse($other->can('reject', $transfer));
    }
}
