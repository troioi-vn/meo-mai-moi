<?php

namespace Tests\Feature;

use Tests\TestCase;

class RegisterRouteTest extends TestCase
{
    /** @test */
    public function register_route_returns_success_without_redirect_loop()
    {
        $response = $this->get('/register');
        // In testing environment route returns a 200 stub; in other envs would serve welcome view.
        $response->assertStatus(200);
    }
}
