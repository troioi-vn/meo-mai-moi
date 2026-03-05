<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Settings;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PhotoStorageLimitMiddlewareTest extends TestCase
{
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    #[Test]
    public function image_upload_is_blocked_when_storage_limit_is_reached(): void
    {
        Settings::set('storage_limit_default_mb', '1');

        DB::table('media')->insert([
            'model_type' => User::class,
            'model_id' => $this->user->id,
            'collection_name' => 'avatar',
            'name' => 'avatar',
            'file_name' => 'avatar.jpg',
            'mime_type' => 'image/jpeg',
            'disk' => 'public',
            'conversions_disk' => 'public',
            'size' => 1024 * 1024,
            'manipulations' => '[]',
            'custom_properties' => '[]',
            'generated_conversions' => '[]',
            'responsive_images' => '[]',
            'order_column' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $file = UploadedFile::fake()->image('new-avatar.jpg', 400, 400)->size(100);

        $response = $this->postJson('/api/users/me/avatar', ['avatar' => $file]);

        $response
            ->assertStatus(413)
            ->assertJsonPath('success', false)
            ->assertJsonPath('error_code', 'STORAGE_LIMIT_EXCEEDED');
    }
}
