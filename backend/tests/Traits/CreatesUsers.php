<?php

namespace Tests\Traits;

use App\Models\User;

trait CreatesUsers
{
    public function createUserAndLogin(array $attributes = []): User
    {
        $user = User::factory()->create($attributes);
        
        // Use 'web' guard for cookie-based session authentication
        $this->actingAs($user, 'web');

        return $user;
    }
}
