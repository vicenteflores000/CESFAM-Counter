<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class AuthController extends Controller
{
    public function redirect()
    {
        return Socialite::driver('azure')->redirect();
    }

    public function callback()
    {
        try {
            $azureUser = Socialite::driver('azure')->user();
        } catch (\Exception $e) {
            return redirect('/login')->with('error', 'Authentication failed');
        }

        $email = $azureUser->getEmail();
        $domain = substr(strrchr($email, "@"), 1);

        if (!in_array($domain, ['salud.mdonihue.cl', 'mdonihue.cl'])) {
            return redirect('/login')->with('error', 'Acceso denegado. Solo correos institucionales permitidos.');
        }

        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $azureUser->getName(),
                'email_verified_at' => now(),
            ]
        );

        Auth::login($user);

        return redirect()->intended('/staff');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }
}