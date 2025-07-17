<?php

namespace Tests\Feature;

use App\Models\Cat;
use App\Models\User;
use App\Enums\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Tests\TestCase;
use PHPUnit\Framework\Attributes\Test;

class CatPhotoManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;
    private Cat $cat;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        if (!extension_loaded('gd')) {
            $this->markTestSkipped('The GD extension is not available.');
        }

        $this->owner = User::factory()->create(['role' => UserRole::CAT_OWNER]);
        $this->cat = Cat::factory()->create(['user_id' => $this->owner->id]);
    }

    #[Test]
    public function cat_owner_can_upload_a_photo()
    {
        $this->actingAs($this->owner);

        $file = UploadedFile::fake()->image('photo1.jpg', 2000, 1500);

        $response = $this->postJson('/api/cats/' . $this->cat->id . '/photos', [
            'photo' => $file,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'path']);

        $this->assertDatabaseHas('cat_photos', [
            'cat_id' => $this->cat->id,
        ]);

        $path = $response->json('path');
        Storage::disk('public')->assertExists($path);

        // Verify image dimensions
        $image = (new ImageManager(new Driver()))->read(Storage::disk('public')->get($path));
        $this->assertEquals(1200, $image->width());
        $this->assertEquals(675, $image->height());
    }

    #[Test]
    public function uploading_a_new_photo_replaces_the_old_one()
    {
        $this->actingAs($this->owner);

        // Upload initial photo
        $oldFile = UploadedFile::fake()->image('old_photo.jpg');
        $response = $this->postJson('/api/cats/' . $this->cat->id . '/photos', ['photo' => $oldFile]);
        $oldPath = $response->json('path');

        $this->assertCount(1, $this->cat->photos);
        Storage::disk('public')->assertExists($oldPath);

        // Upload new photo
        $newFile = UploadedFile::fake()->image('new_photo.jpg');
        $response = $this->postJson('/api/cats/' . $this->cat->id . '/photos', ['photo' => $newFile]);
        $newPath = $response->json('path');

        $this->cat->refresh();
        $this->assertCount(1, $this->cat->photos);
        $this->assertEquals($newPath, $this->cat->photo->path);

        Storage::disk('public')->assertMissing($oldPath);
        Storage::disk('public')->assertExists($newPath);
    }

    #[Test]
    public function non_owner_cannot_upload_a_photo()
    {
        $nonOwner = User::factory()->create();
        $this->actingAs($nonOwner);

        $file = UploadedFile::fake()->image('photo.jpg');

        $response = $this->postJson('/api/cats/' . $this->cat->id . '/photos', [
            'photo' => $file,
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('cat_photos', ['cat_id' => $this->cat->id]);
    }

    #[Test]
    public function unauthenticated_user_cannot_upload_a_photo()
    {
        $file = UploadedFile::fake()->image('photo.jpg');

        $response = $this->postJson('/api/cats/' . $this->cat->id . '/photos', [
            'photo' => $file,
        ]);

        $response->assertStatus(401);
    }

    #[Test]
    public function photo_upload_requires_an_image_file()
    {
        $this->actingAs($this->owner);
        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $response = $this->postJson('/api/cats/' . $this->cat->id . '/photos', [
            'photo' => $file,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('photo');
    }

    #[Test]
    public function cat_owner_can_delete_a_photo()
    {
        $this->actingAs($this->owner);

        // Upload a photo first
        $file = UploadedFile::fake()->image('photo.jpg');
        $response = $this->postJson('/api/cats/' . $this->cat->id . '/photos', ['photo' => $file]);
        $path = $response->json('path');
        $photo = $this->cat->photo;

        Storage::disk('public')->assertExists($path);

        // Delete the photo
        $response = $this->deleteJson('/api/cats/' . $this->cat->id . '/photos/' . $photo->id);

        $response->assertStatus(200)->assertJson(['message' => 'Photo deleted successfully']);
        $this->assertDatabaseMissing('cat_photos', ['id' => $photo->id]);
        Storage::disk('public')->assertMissing($path);
    }

    #[Test]
    public function non_owner_cannot_delete_a_photo()
    {
        $this->actingAs($this->owner);
        $file = UploadedFile::fake()->image('photo.jpg');
        $this->postJson('/api/cats/' . $this->cat->id . '/photos', ['photo' => $file]);
        $photo = $this->cat->photo;

        $nonOwner = User::factory()->create();
        $this->actingAs($nonOwner);

        $response = $this->deleteJson('/api/cats/' . $this->cat->id . '/photos/' . $photo->id);

        $response->assertStatus(403);
        $this->assertDatabaseHas('cat_photos', ['id' => $photo->id]);
    }
}