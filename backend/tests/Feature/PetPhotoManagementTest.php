<?php

namespace Tests\Feature;

use App\Models\Pet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PetPhotoManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Pet $pet;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        if (! extension_loaded('gd')) {
            $this->markTestSkipped('The GD extension is not available.');
        }

        $this->owner = User::factory()->create();
        $this->pet = Pet::factory()->create(['user_id' => $this->owner->id]);
    }

    #[Test]
    public function pet_owner_can_upload_a_photo(): void
    {
        $this->actingAs($this->owner);
        $file = UploadedFile::fake()->image('photo1.jpg', 2000, 1500);
        $response = $this->postJson('/api/pets/'.$this->pet->id.'/photos', ['photo' => $file]);

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => ['id', 'name', 'photo_url']]);

        $this->assertDatabaseHas('media', [
            'model_type' => Pet::class,
            'model_id' => $this->pet->id,
            'collection_name' => 'photos',
        ]);

        // Check that the pet has a photo_url from MediaLibrary
        $this->pet->refresh();
        $this->assertNotNull($this->pet->photo_url);

        // Check that conversions were created
        $media = $this->pet->getMedia('photos')->first();
        $this->assertNotNull($media);
        $this->assertTrue($media->hasGeneratedConversion('thumb'));
        $this->assertTrue($media->hasGeneratedConversion('medium'));
        $this->assertTrue($media->hasGeneratedConversion('webp'));
    }

    #[Test]
    public function uploading_multiple_photos_adds_to_collection(): void
    {
        $this->actingAs($this->owner);
        
        // Upload first photo
        $oldFile = UploadedFile::fake()->image('old_photo.jpg');
        $this->postJson('/api/pets/'.$this->pet->id.'/photos', ['photo' => $oldFile]);

        $this->pet->refresh();
        $this->assertCount(1, $this->pet->getMedia('photos'));

        // Upload second photo - should add to collection, not replace
        $newFile = UploadedFile::fake()->image('new_photo.jpg');
        $this->postJson('/api/pets/'.$this->pet->id.'/photos', ['photo' => $newFile]);

        $this->pet->refresh();
        $this->assertCount(2, $this->pet->getMedia('photos'));
        $this->assertNotNull($this->pet->photo_url);
    }

    #[Test]
    public function non_owner_cannot_upload_a_photo(): void
    {
        $nonOwner = User::factory()->create();
        $this->actingAs($nonOwner);
        $file = UploadedFile::fake()->image('photo.jpg');
        $response = $this->postJson('/api/pets/'.$this->pet->id.'/photos', ['photo' => $file]);
        $response->assertStatus(403);
        $this->assertDatabaseMissing('media', [
            'model_type' => Pet::class,
            'model_id' => $this->pet->id,
            'collection_name' => 'photos',
        ]);
    }

    #[Test]
    public function unauthenticated_user_cannot_upload_a_photo(): void
    {
        $file = UploadedFile::fake()->image('photo.jpg');
        $response = $this->postJson('/api/pets/'.$this->pet->id.'/photos', ['photo' => $file]);
        $response->assertStatus(401);
    }

    #[Test]
    public function photo_upload_requires_an_image_file(): void
    {
        $this->actingAs($this->owner);
        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');
        $response = $this->postJson('/api/pets/'.$this->pet->id.'/photos', ['photo' => $file]);
        $response->assertStatus(422)->assertJsonValidationErrors('photo');
    }

    #[Test]
    public function pet_owner_can_delete_a_photo(): void
    {
        $this->actingAs($this->owner);
        $file = UploadedFile::fake()->image('photo.jpg');
        $this->postJson('/api/pets/'.$this->pet->id.'/photos', ['photo' => $file]);
        
        $this->pet->refresh();
        $media = $this->pet->getMedia('photos')->first();

        $response = $this->deleteJson('/api/pets/'.$this->pet->id.'/photos/'.$media->id);
        $response->assertStatus(204);
        $this->assertDatabaseMissing('media', ['id' => $media->id]);
    }

    #[Test]
    public function non_owner_cannot_delete_a_photo(): void
    {
        $this->actingAs($this->owner);
        $file = UploadedFile::fake()->image('photo.jpg');
        $this->postJson('/api/pets/'.$this->pet->id.'/photos', ['photo' => $file]);
        
        $this->pet->refresh();
        $media = $this->pet->getMedia('photos')->first();

        $nonOwner = User::factory()->create();
        $this->actingAs($nonOwner);
        $response = $this->deleteJson('/api/pets/'.$this->pet->id.'/photos/'.$media->id);
        $response->assertStatus(403);
        $this->assertDatabaseHas('media', ['id' => $media->id]);
    }
}
