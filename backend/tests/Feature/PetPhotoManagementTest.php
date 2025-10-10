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
            ->assertJsonStructure(['data' => ['id', 'name', 'photo']]);

        $this->assertDatabaseHas('pet_photos', [
            'pet_id' => $this->pet->id,
        ]);

        $path = $response->json('data.photo.path');
        Storage::disk('public')->assertExists($path);

        $image = (new ImageManager(new Driver()))->read(Storage::disk('public')->get($path));
        $this->assertEquals(1200, $image->width());
        $this->assertEquals(675, $image->height());
    }

    #[Test]
    public function uploading_a_new_photo_replaces_the_old_one(): void
    {
        $this->actingAs($this->owner);
        $oldFile = UploadedFile::fake()->image('old_photo.jpg');
        $response = $this->postJson('/api/pets/'.$this->pet->id.'/photos', ['photo' => $oldFile]);
        $oldPath = $response->json('data.photo.path');

        $this->assertCount(1, $this->pet->photos);
        Storage::disk('public')->assertExists($oldPath);

        $newFile = UploadedFile::fake()->image('new_photo.jpg');
        $response = $this->postJson('/api/pets/'.$this->pet->id.'/photos', ['photo' => $newFile]);
        $newPath = $response->json('data.photo.path');

        $this->pet->refresh();
        $this->assertCount(1, $this->pet->photos);
        $this->assertEquals($newPath, $this->pet->photo->path);

        Storage::disk('public')->assertMissing($oldPath);
        Storage::disk('public')->assertExists($newPath);
    }

    #[Test]
    public function non_owner_cannot_upload_a_photo(): void
    {
        $nonOwner = User::factory()->create();
        $this->actingAs($nonOwner);
        $file = UploadedFile::fake()->image('photo.jpg');
        $response = $this->postJson('/api/pets/'.$this->pet->id.'/photos', ['photo' => $file]);
        $response->assertStatus(403);
        $this->assertDatabaseMissing('pet_photos', ['pet_id' => $this->pet->id]);
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
        $response = $this->postJson('/api/pets/'.$this->pet->id.'/photos', ['photo' => $file]);
        $path = $response->json('data.photo.path');
        $photo = $this->pet->photo;
        Storage::disk('public')->assertExists($path);

        $response = $this->deleteJson('/api/pets/'.$this->pet->id.'/photos/'.$photo->id);
        $response->assertStatus(204);
        $this->assertDatabaseMissing('pet_photos', ['id' => $photo->id]);
        Storage::disk('public')->assertMissing($path);
    }

    #[Test]
    public function non_owner_cannot_delete_a_photo(): void
    {
        $this->actingAs($this->owner);
        $file = UploadedFile::fake()->image('photo.jpg');
        $this->postJson('/api/pets/'.$this->pet->id.'/photos', ['photo' => $file]);
        $photo = $this->pet->photo;

        $nonOwner = User::factory()->create();
        $this->actingAs($nonOwner);
        $response = $this->deleteJson('/api/pets/'.$this->pet->id.'/photos/'.$photo->id);
        $response->assertStatus(403);
        $this->assertDatabaseHas('pet_photos', ['id' => $photo->id]);
    }
}
