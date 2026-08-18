<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use App\Models\Window;
use App\Models\Call;
use App\Models\Section;

class StateController extends Controller
{
    protected function resolveSection(): ?Section
    {
        $sectionCode = session('sectionCode');
        return $sectionCode ? Section::firstWhere('code', $sectionCode) : null;
    }

    protected function selectWindow(Section $section): Window
    {
        $wn = session('windowNumber');

        if ($wn) {
            return Window::firstOrCreate(
                ['section_id' => $section->id, 'window_number' => $wn],
                ['current_number' => $section->current_number]
            );
        }

        return Window::firstOrCreate(
            ['section_id' => $section->id, 'window_number' => 1],
            ['current_number' => $section->current_number]
        );
    }

    protected function recordCall(Window $window, int $number): Call
    {
        if ($window->current_number !== $number) {
            $window->current_number = $number;
            $window->save();
        }

        return Call::create([
            'window_id' => $window->id,
            'called_number' => $number,
            'staff_email' => Auth::check() ? Auth::user()->email : null,
        ]);
    }

    public function sections()
    {
        $sections = Section::orderBy('code')->get(['code', 'name']);

        return response()->json($sections);
    }

    public function setSection(Request $request)
    {
        $sectionCode = strtoupper(trim($request->input('sectionCode', '')));
        $section = Section::firstWhere('code', $sectionCode);

        if (! $section) {
            return response()->json(['error' => 'Sección inválida.'], 422);
        }

        session(['sectionCode' => $section->code]);

        return response()->json(['sectionCode' => $section->code]);
    }

    public function state()
    {
        $section = $this->resolveSection();

        $sections = Section::with(['windows' => function ($query) {
                $query->orderBy('window_number')->where('current_number', '>', 0);
            }])->orderBy('code')->get(['id', 'code', 'name', 'current_number'])->map(function ($section) {
                return [
                    'code' => $section->code,
                    'name' => $section->name,
                    'currentNumber' => $section->current_number,
                    'windows' => $section->windows->map(function ($window) {
                        return [
                            'windowNumber' => $window->window_number,
                            'currentNumber' => $window->current_number,
                        ];
                    })->values(),
                ];
            });

        $windows = collect();
        $lastCall = null;

        if ($section) {
            $sessionWindow = session('windowNumber');

            $windows = Window::where('section_id', $section->id)
                ->where(function ($query) use ($sessionWindow) {
                    $query->where('current_number', '>', 0);

                    if ($sessionWindow) {
                        $query->orWhere('window_number', $sessionWindow);
                    }
                })
                ->orderBy('window_number')
                ->get()
                ->map(function ($w) {
                    return [
                        'windowNumber' => $w->window_number,
                        'currentNumber' => $w->current_number,
                    ];
                })->values();

            $lastCall = Call::whereHas('window', function ($query) use ($section) {
                $query->where('section_id', $section->id);
            })->orderBy('called_at', 'desc')->first();
        }

        $updatedAt = $lastCall ? Carbon::parse($lastCall->called_at)->toDateTimeString() : null;
        $revision = md5($sections->toJson());
        $sessionWindow = session('windowNumber');
        $currentNumber = $section ? $section->current_number : 0;

        return response()->json([
            'sections' => $sections,
            'sectionSelected' => session()->has('sectionCode'),
            'sectionCode' => $section?->code,
            'sectionName' => $section?->name,
            'windows' => $windows,
            'revision' => $revision,
            'updatedAt' => $updatedAt,
            'windowNumber' => $sessionWindow,
            'currentNumber' => $currentNumber,
        ]);
    }

    public function previous(Request $request)
    {
        $section = $this->resolveSection();
        if (! $section) {
            return response()->json(['error' => 'Sección no encontrada.'], 422);
        }

        $section->current_number = max(0, intval($section->current_number) - 1);
        $section->save();

        $window = $this->selectWindow($section);

        Call::create([
            'window_id' => $window->id,
            'called_number' => $section->current_number,
            'staff_email' => Auth::check() ? Auth::user()->email : null,
        ]);

        return $this->state();
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
            'sectionSelected' => session()->has('sectionCode'),
            'sectionCode' => session('sectionCode', 'SOME'),
        ]);
    }

    public function setWindow(Request $request)
    {
        $num = intval($request->input('windowNumber'));
        if ($num <= 0) {
            return response()->json(['error' => 'Número de ventanilla inválido'], 422);
        }

        $section = $this->resolveSection();
        if (! $section) {
            return response()->json(['error' => 'Sección no encontrada.'], 422);
        }

        session(['windowNumber' => $num]);

        Window::firstOrCreate(
            ['section_id' => $section->id, 'window_number' => $num],
            ['current_number' => $section->current_number]
        );

        return $this->state();
    }

    public function next(Request $request)
    {
        $section = $this->resolveSection();
        if (! $section) {
            return response()->json(['error' => 'Sección no encontrada.'], 422);
        }

        $section->current_number = intval($section->current_number) + 1;
        $section->save();

        $window = $this->selectWindow($section);

        $this->recordCall($window, $section->current_number);

        return $this->state();
    }

    public function recall(Request $request)
    {
        $section = $this->resolveSection();
        if (! $section) {
            return response()->json(['error' => 'Sección no encontrada.'], 422);
        }

        $window = $this->selectWindow($section);
        $windowNumber = intval($window->current_number ?: $section->current_number);

        $this->recordCall($window, $windowNumber);

        return $this->state();
    }

    public function setNumber(Request $request)
    {
        $num = intval($request->input('number'));
        if ($num < 0) {
            return response()->json(['error' => 'Número inválido'], 422);
        }

        $section = $this->resolveSection();
        if (! $section) {
            return response()->json(['error' => 'Sección no encontrada.'], 422);
        }

        $section->current_number = $num;
        $section->save();

        $window = $this->selectWindow($section);

        $this->recordCall($window, $num);

        return $this->state();
    }

    public function reset()
    {
        $section = $this->resolveSection();
        if (! $section) {
            return response()->json(['error' => 'Sección no encontrada.'], 422);
        }

        $section->current_number = 0;
        $section->save();

        Window::where('section_id', $section->id)->update(['current_number' => 0]);
        Call::whereHas('window', function ($query) use ($section) {
            $query->where('section_id', $section->id);
        })->delete();

        return $this->state();
    }

    public function authStatus()
    {
        $configured = env('AZURE_CLIENT_ID') && env('AZURE_CLIENT_SECRET') && env('AZURE_REDIRECT_URI');

        return response()->json([
            'authConfigured' => (bool) $configured,
            'devLogin' => env('APP_DEBUG', false),
        ]);
    }
}
