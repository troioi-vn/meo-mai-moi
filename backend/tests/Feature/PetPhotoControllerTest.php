<?php

namespace Tests\Feature;

use App\Models\Pet;
use App\Models\PetType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PetPhotoControllerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected PetType $catType;

    protected PetType $dogType;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        // Create pet types
        $this->catType = PetType::create([
            'id' => 1,
            'name' => 'Cat',
            'slug' => 'cat',
            'is_system' => true,
        ]);

        $this->dogType = PetType::create([
            'id' => 2,
            'name' => 'Dog',
            'slug' => 'dog',
            'is_system' => true,
        ]);

        Storage::fake('public');
    }

    public function test_can_upload_photo_for_cat()
    {
        Sanctum::actingAs($this->user);

        $cat = Pet::factory()->create([
            'user_id' => $this->user->id,
            'pet_type_id' => $this->catType->id,
        ]);

        $file = UploadedFile::fake()->image('cat.jpg', 800, 600);

        $response = $this->postJson("/api/pets/{$cat->id}/photos", [
            'photo' => $file,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'photo_url', // This comes from the accessor
                ],
            ]);

        // Check that media was created in MediaLibrary
        $this->assertDatabaseHas('media', [
            'model_type' => Pet::class,
            'model_id' => $cat->id,
            'collection_name' => 'photos',
        ]);
    }

    public function test_can_upload_photo_for_dog()
    {
        Sanctum::actingAs($this->user);

        $dog = Pet::factory()->create([
            'user_id' => $this->user->id,
            'pet_type_id' => $this->dogType->id,
        ]);

        $file = UploadedFile::fake()->image('dog.jpg', 800, 600);

        $response = $this->postJson("/api/pets/{$dog->id}/photos", [
            'photo' => $file,
        ]);

        $response->assertStatus(200);

        // Check that media was created in MediaLibrary
        $this->assertDatabaseHas('media', [
            'model_type' => Pet::class,
            'model_id' => $dog->id,
            'collection_name' => 'photos',
        ]);
    }

    public function test_cannot_upload_photo_without_authentication()
    {
        $cat = Pet::factory()->create([
            'user_id' => $this->user->id,
            'pet_type_id' => $this->catType->id,
        ]);

        $file = UploadedFile::fake()->image('cat.jpg');

        $response = $this->postJson("/api/pets/{$cat->id}/photos", [
            'photo' => $file,
        ]);

        $response->assertStatus(401);
    }

    public function test_cannot_upload_photo_for_other_users_pet()
    {
        $otherUser = User::factory()->create();
        Sanctum::actingAs($this->user);

        $cat = Pet::factory()->create([
            'user_id' => $otherUser->id,
            'pet_type_id' => $this->catType->id,
        ]);

        $file = UploadedFile::fake()->image('cat.jpg');

        $response = $this->postJson("/api/pets/{$cat->id}/photos", [
            'photo' => $file,
        ]);

        $response->assertStatus(403);
    }

    public function test_validates_photo_file()
    {
        Sanctum::actingAs($this->user);

        $cat = Pet::factory()->create([
            'user_id' => $this->user->id,
            'pet_type_id' => $this->catType->id,
        ]);

        // Test without photo
        $response = $this->postJson("/api/pets/{$cat->id}/photos", []);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['photo']);

        // Test with non-image file
        $file = UploadedFile::fake()->create('document.pdf', 1000);
        $response = $this->postJson("/api/pets/{$cat->id}/photos", [
            'photo' => $file,
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['photo']);
    }

    public function test_validates_file_size()
    {
        Sanctum::actingAs($this->user);

        $cat = Pet::factory()->create([
            'user_id' => $this->user->id,
            'pet_type_id' => $this->catType->id,
        ]);

        // Create a file larger than 10MB
        $file = UploadedFile::fake()->create('large.jpg', 11000); // 11MB

        $response = $this->postJson("/api/pets/{$cat->id}/photos", [
            'photo' => $file,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['photo']);
    }

    public function test_can_delete_pet_photo()
    {
        Sanctum::actingAs($this->user);

        $cat = Pet::factory()->create([
            'user_id' => $this->user->id,
            'pet_type_id' => $this->catType->id,
        ]);

        // First upload a photo
        $file = UploadedFile::fake()->image('cat.jpg');
        $this->postJson("/api/pets/{$cat->id}/photos", ['photo' => $file]);

        $media = $cat->fresh()->getMedia('photos')->first();

        $response = $this->deleteJson("/api/pets/{$cat->id}/photos/{$media->id}");

        $response->assertStatus(204);

        $this->assertDatabaseMissing('media', [
            'id' => $media->id,
        ]);
    }

    public function test_cannot_delete_other_users_pet_photo()
    {
        $otherUser = User::factory()->create();
        Sanctum::actingAs($otherUser);

        $cat = Pet::factory()->create([
            'user_id' => $otherUser->id,
            'pet_type_id' => $this->catType->id,
        ]);

        // Upload photo as other user
        $file = UploadedFile::fake()->image('cat.jpg');
        $this->postJson("/api/pets/{$cat->id}/photos", ['photo' => $file]);

        $media = $cat->fresh()->getMedia('photos')->first();

        // Try to delete as different user
        Sanctum::actingAs($this->user);
        $response = $this->deleteJson("/api/pets/{$cat->id}/photos/{$media->id}");

        $response->assertStatus(403);
    }
}
