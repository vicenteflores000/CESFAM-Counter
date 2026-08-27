<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class AuthController extends Controller
{
    protected function azureConfigured(): bool
    {
        return ! empty(env('MICROSOFT_OAUTH_CLIENT_ID', env('AZURE_CLIENT_ID')))
            && ! empty(env('MICROSOFT_OAUTH_CLIENT_SECRET', env('AZURE_CLIENT_SECRET')))
            && ! empty(env('MICROSOFT_OAUTH_REDIRECT_URI', env('AZURE_REDIRECT_URI')));
    }

    protected function allowedDomains(): array
    {
        $domains = env('AZURE_ALLOWED_DOMAINS');

        if (! empty($domains)) {
            return array_values(array_filter(array_map(function ($item) {
                return strtolower(trim($item));
            }, preg_split('/[\s,;]+/', $domains))));
        }

        return ['salud.mdonihue.cl', 'mdonihue.cl'];
    }

    public function redirect()
    {
        if (! $this->azureConfigured()) {
            return redirect('/')->with('error', 'Microsoft Azure no está configurado. Debes definir AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_REDIRECT_URI y AZURE_ALLOWED_DOMAINS.');
        }

        return Socialite::driver('microsoft')
            ->scopes(['openid', 'profile', 'email'])
            ->redirect();
    }

    public function callback()
    {
        try {
            $azureUser = Socialite::driver('microsoft')->user();
        } catch (\Throwable $exception) {
            return redirect('/login')->with('error', 'No se pudo iniciar sesión con Microsoft Azure.');
        }

        $email = strtolower((string) ($azureUser->getEmail()
            ?? ($azureUser->user['mail'] ?? null)
            ?? ($azureUser->user['userPrincipalName'] ?? null)));

        if (empty($email)) {
            return redirect('/login')->with('error', 'No se pudo obtener el correo institucional de Microsoft.');
        }

        $domain = substr(strrchr($email, '@'), 1);
        if (! in_array($domain, $this->allowedDomains(), true)) {
            return redirect('/login')->with('error', 'Acceso denegado. Solo cuentas institucionales habilitadas con Azure son permitidas.');
        }

        $hasAdmin = User::where('is_admin', true)->exists();

        $user = User::firstWhere('email', $email);

        if (! $user) {
            $user = User::create([
                'email' => $email,
                'name' => $azureUser->getName() ?? $azureUser->getNickname() ?? ucfirst(strstr($email, '@', true)),
                'email_verified_at' => now(),
                'password' => bcrypt(str()->uuid()->toString()),
                'is_admin' => ! $hasAdmin, // Primer usuario registrado es administrador
            ]);
        } else {
            $user->update([
                'name' => $azureUser->getName() ?? $azureUser->getNickname() ?? $user->name,
                'email_verified_at' => now(),
            ]);
        }

        Auth::login($user);

        return redirect()->intended('/staff');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}