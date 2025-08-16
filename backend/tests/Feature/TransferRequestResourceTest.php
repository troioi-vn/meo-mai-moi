<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Cat;
use App\Models\PlacementRequest;
use App\Models\HelperProfile;
use App\Models\TransferRequest;
use App\Models\TransferHandover;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Spatie\Permission\Models\Role;
use Tests\Traits\CreatesUsers;

class TransferRequestResourceTest extends TestCase
{
    use RefreshDatabase, CreatesUsers;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create an admin user for testing
        $this->adminUser = User::factory()->create();
        $role = Role::create(['name' => 'admin']);
        $this->adminUser->assignRole($role);
    }

    public function test_admin_can_access_transfer_requests_index()
    {
        $this->actingAs($this->adminUser);
        
        $response = $this->get('/admin/transfer-requests');
        
        $response->assertStatus(200);
    }

    public function test_admin_can_view_transfer_request_details()
    {
        $this->actingAs($this->adminUser);
        
        // Create test data
        $owner = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $owner->id]);
        $placementRequest = PlacementRequest::factory()->create([
            'cat_id' => $cat->id,
            'user_id' => $owner->id,
        ]);
        
        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);
        
        $transferRequest = TransferRequest::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'requester_id' => $helper->id,
            'status' => 'pending',
        ]);
        
        $response = $this->get("/admin/transfer-requests/{$transferRequest->id}");
        
        $response->assertStatus(200);
    }

    public function test_transfer_request_has_proper_relationships()
    {
        // Create test data
        $owner = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $owner->id]);
        $placementRequest = PlacementRequest::factory()->create([
            'cat_id' => $cat->id,
            'user_id' => $owner->id,
        ]);
        
        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);
        
        $transferRequest = TransferRequest::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'requester_id' => $helper->id,
        ]);
        
        // Test relationships
        $this->assertInstanceOf(PlacementRequest::class, $transferRequest->placementRequest);
        $this->assertInstanceOf(HelperProfile::class, $transferRequest->helperProfile);
        $this->assertInstanceOf(User::class, $transferRequest->requester);
        $this->assertEquals($placementRequest->id, $transferRequest->placementRequest->id);
        $this->assertEquals($helperProfile->id, $transferRequest->helperProfile->id);
        $this->assertEquals($helper->id, $transferRequest->requester->id);
    }

    public function test_transfer_request_can_have_transfer_handover()
    {
        // Create test data
        $owner = User::factory()->create();
        $cat = Cat::factory()->create(['user_id' => $owner->id]);
        $placementRequest = PlacementRequest::factory()->create([
            'cat_id' => $cat->id,
            'user_id' => $owner->id,
        ]);
        
        $helper = User::factory()->create();
        $helperProfile = HelperProfile::factory()->create(['user_id' => $helper->id]);
        
        $transferRequest = TransferRequest::factory()->create([
            'placement_request_id' => $placementRequest->id,
            'helper_profile_id' => $helperProfile->id,
            'requester_id' => $helper->id,
        ]);
        
        $transferHandover = TransferHandover::create([
            'transfer_request_id' => $transferRequest->id,
            'owner_user_id' => $owner->id,
            'helper_user_id' => $helper->id,
            'status' => 'pending',
        ]);
        
        // Test relationship
        $this->assertInstanceOf(TransferHandover::class, $transferRequest->transferHandover);
        $this->assertEquals($transferHandover->id, $transferRequest->transferHandover->id);
    }
}