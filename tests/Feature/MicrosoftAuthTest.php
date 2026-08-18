<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Tests\TestCase;

class MicrosoftAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_microsoft_callback_creates_user_with_generated_password_for_institutional_account(): void
    {
        putenv('AZURE_CLIENT_ID=client-id');
        putenv('AZURE_CLIENT_SECRET=client-secret');
        putenv('AZURE_REDIRECT_URI=http://localhost/auth/microsoft/callback');
        putenv('AZURE_ALLOWED_DOMAINS=mdonihue.cl');

        $socialiteUser = new SocialiteUser();
        $socialiteUser->map([
            'id' => '12345',
            'name' => 'Vicente Flores Arriaza',
            'email' => 'vfloresa@mdonihue.cl',
            'user' => ['mail' => 'vfloresa@mdonihue.cl'],
        ]);

        Socialite::shouldReceive('driver')
            ->with('microsoft')
            ->andReturnSelf();

        Socialite::shouldReceive('user')
            ->andReturn($socialiteUser);

        $response = $this->get('/auth/microsoft/callback');

        $response->assertRedirect('/staff');
        $this->assertDatabaseHas('users', ['email' => 'vfloresa@mdonihue.cl']);

        $user = User::first();
        $this->assertNotNull($user);
        $this->assertNotEmpty($user->password);
    }
}
