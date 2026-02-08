<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UpdatePasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_can_be_updated(): void
    {
        $this->actingAs($user = User::factory()->create());

        $this->put('/user/password', [
            'current_password' => 'Password1secure',
            'password' => 'NewPassword2strong',
            'password_confirmation' => 'NewPassword2strong',
        ]);

        $this->assertTrue(Hash::check('NewPassword2strong', $user->fresh()->password));
    }

    public function test_current_password_must_be_correct(): void
    {
        $this->actingAs($user = User::factory()->create());

        $response = $this->put('/user/password', [
            'current_password' => 'wrong-password',
            'password' => 'NewPassword2strong',
            'password_confirmation' => 'NewPassword2strong',
        ]);

        $response->assertSessionHasErrors();

        $this->assertTrue(Hash::check('Password1secure', $user->fresh()->password));
    }

    public function test_new_passwords_must_match(): void
    {
        $this->actingAs($user = User::factory()->create());

        $response = $this->put('/user/password', [
            'current_password' => 'Password1secure',
            'password' => 'NewPassword2strong',
            'password_confirmation' => 'wrong-password',
        ]);

        $response->assertSessionHasErrors();

        $this->assertTrue(Hash::check('Password1secure', $user->fresh()->password));
    }
}
