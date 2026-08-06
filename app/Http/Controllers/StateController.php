<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use App\Models\Window;
use App\Models\Call;

class StateController extends Controller
{
    public function state()
    {
        $windows = Window::orderBy('window_number')->get()->map(function ($w) {
            return [
                'windowNumber' => $w->window_number,
                'currentNumber' => $w->current_number,
            ];
        })->values();

        $lastCall = Call::orderBy('called_at', 'desc')->first();

        $updatedAt = $lastCall ? Carbon::parse($lastCall->called_at)->toDateTimeString() : null;
        $revision = $lastCall ? strtotime($lastCall->called_at) : 0;

        $sessionWindow = session('windowNumber');
        $currentNumber = null;
        if ($sessionWindow) {
            $w = Window::where('window_number', $sessionWindow)->first();
            $currentNumber = $w ? $w->current_number : null;
        }

        return response()->json([
            'windows' => $windows,
            'revision' => $revision,
            'updatedAt' => $updatedAt,
            'windowNumber' => $sessionWindow,
            'currentNumber' => $currentNumber,
        ]);
    }

    public function events()
    {
        $state = $this->state()->getData(true);

        $body = "event: state\n" . 'data: ' . json_encode($state) . "\n\n";

        return response($body, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
        ]);
    }

    public function me()
    {
        return response()->json([
            'user' => Auth::check() ? Auth::user() : null,
            'windowNumber' => session('windowNumber'),
        ]);
    }

    public function setWindow(Request $request)
    {
        $num = intval($request->input('windowNumber'));
        if ($num <= 0) {
            return response()->json(['error' => 'Número de ventanilla inválido'], 422);
        }

        session(['windowNumber' => $num]);

        // ensure window exists
        Window::firstOrCreate(['window_number' => $num]);

        return $this->state();
    }

    public function next(Request $request)
    {
        $wn = session('windowNumber');
        if (!$wn) return response()->json(['error' => 'Ventanilla no configurada'], 422);

        $window = Window::firstOrCreate(['window_number' => $wn]);
        $window->current_number = intval($window->current_number) + 1;
        $window->save();

        Call::create([
            'window_id' => $window->id,
            'called_number' => $window->current_number,
            'staff_email' => Auth::check() ? Auth::user()->email : null,
        ]);

        return $this->state();
    }

    public function recall(Request $request)
    {
        $wn = session('windowNumber');
        if (!$wn) return response()->json(['error' => 'Ventanilla no configurada'], 422);

        $window = Window::where('window_number', $wn)->first();
        if (!$window) return response()->json(['error' => 'Ventanilla no encontrada'], 404);

        // create a recall call entry
        Call::create([
            'window_id' => $window->id,
            'called_number' => $window->current_number,
            'staff_email' => Auth::check() ? Auth::user()->email : null,
        ]);

        return $this->state();
    }

    public function setNumber(Request $request)
    {
        $num = intval($request->input('number'));
        $wn = session('windowNumber');
        if (!$wn) return response()->json(['error' => 'Ventanilla no configurada'], 422);
        if ($num < 0) return response()->json(['error' => 'Número inválido'], 422);

        $window = Window::firstOrCreate(['window_number' => $wn]);
        $window->current_number = $num;
        $window->save();

        Call::create([
            'window_id' => $window->id,
            'called_number' => $num,
            'staff_email' => Auth::check() ? Auth::user()->email : null,
        ]);

        return $this->state();
    }

    public function authStatus()
    {
        // Indicate whether auth is configured (simple check for env vars)
        $configured = env('AZURE_CLIENT_ID') && env('AZURE_CLIENT_SECRET') && env('AZURE_REDIRECT_URI');
        return response()->json([
            'authConfigured' => (bool) $configured,
            'devLogin' => env('APP_DEBUG', false),
        ]);
    }
}
