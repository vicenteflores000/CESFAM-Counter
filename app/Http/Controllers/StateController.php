<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use App\Models\Window;
use App\Models\Call;
use App\Models\Section;
use App\Models\Patient;

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
                ['section_id' => $section->id, 'window_number' => (string) $wn],
                ['current_number' => $section->current_number]
            );
        }

        return Window::firstOrCreate(
            ['section_id' => $section->id, 'window_number' => '1'],
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
        $user = Auth::user();

        if ($user) {
            // Si el usuario es administrador, puede ver y atender todas las secciones
            if ($user->is_admin) {
                return response()->json(Section::orderBy('code')->get(['code', 'name', 'station_type', 'call_type']));
            }

            // Si es funcionario, retorna únicamente las secciones asignadas (o arreglo vacío si no tiene)
            $assigned = $user->sections()->orderBy('code')->get(['code', 'name', 'station_type', 'call_type']);
            return response()->json($assigned);
        }

        // Acceso público (ej. televisores y pantallas de espera)
        $sections = Section::orderBy('code')->get(['code', 'name', 'station_type', 'call_type']);

        return response()->json($sections);
    }

    public function setSection(Request $request)
    {
        $sectionCode = strtoupper(trim($request->input('sectionCode', '')));
        $section = Section::firstWhere('code', $sectionCode);

        if (! $section) {
            return response()->json(['error' => 'Sección inválida.'], 422);
        }

        $user = Auth::user();
        if ($user && ! $user->is_admin) {
            $allowedSectionIds = $user->sections()->pluck('sections.id');
            if (! $allowedSectionIds->contains($section->id)) {
                return response()->json(['error' => 'No tienes permisos asignados para atender esta sección.'], 403);
            }
        }

        session(['sectionCode' => $section->code]);

        return response()->json(['sectionCode' => $section->code]);
    }

    public function state()
    {
        $section = $this->resolveSection();

        $sections = Section::with(['windows' => function ($query) {
                $query->orderBy('window_number');
            }])->orderBy('code')->get(['id', 'code', 'name', 'current_number', 'station_type', 'call_type'])->map(function ($section) {
                return [
                    'code' => $section->code,
                    'name' => $section->name,
                    'currentNumber' => $section->current_number,
                    'stationType' => $section->station_type ?? 'ventanilla',
                    'callType' => $section->call_type ?? 'number',
                    'windows' => $section->windows->filter(function ($window) use ($section) {
                        if ($section->call_type === 'patient_list') {
                            return Call::where('window_id', $window->id)->whereNotNull('patient_name')->exists() || $window->current_number > 0;
                        }
                        return $window->current_number > 0;
                    })->map(function ($window) {
                        $lastWindowCall = Call::where('window_id', $window->id)->latest('id')->first();
                        return [
                            'windowNumber' => $window->window_number,
                            'currentNumber' => $window->current_number,
                            'patientName' => $lastWindowCall?->patient_name,
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

        $latestCall = Call::with('window.section')->latest('id')->first();
        $lastCallData = $latestCall ? [
            'id' => $latestCall->id,
            'calledNumber' => $latestCall->called_number,
            'patientName' => $latestCall->patient_name,
            'patientIdentifier' => $latestCall->patient_identifier,
            'windowNumber' => $latestCall->window?->window_number,
            'sectionCode' => $latestCall->window?->section?->code,
            'sectionName' => $latestCall->window?->section?->name,
            'stationType' => $latestCall->window?->section?->station_type ?? 'ventanilla',
            'callType' => $latestCall->window?->section?->call_type ?? 'number',
            'calledAt' => Carbon::parse($latestCall->called_at ?? $latestCall->created_at)->toDateTimeString(),
        ] : null;

        if (! $updatedAt && $latestCall) {
            $updatedAt = Carbon::parse($latestCall->called_at ?? $latestCall->created_at)->toDateTimeString();
        }

        $revision = md5($sections->toJson() . ($latestCall ? $latestCall->id : ''));
        $sessionWindow = session('windowNumber');
        $currentNumber = $section ? $section->current_number : 0;

        return response()->json([
            'sections' => $sections,
            'sectionSelected' => session()->has('sectionCode'),
            'sectionCode' => $section?->code,
            'stationType' => $section?->station_type ?? 'ventanilla',
            'callType' => $section?->call_type ?? 'number',
            'windowNumber' => $sessionWindow,
            'currentNumber' => $currentNumber,
            'windows' => $windows,
            'updatedAt' => $updatedAt,
            'revision' => $revision,
            'lastCall' => $lastCallData,
        ]);
    }

    public function previous(Request $request)
    {
        $section = $this->resolveSection();
        if (! $section) {
            return response()->json(['error' => 'Sección no encontrada.'], 422);
        }

        if ($section->call_type === 'patient_list') {
            return response()->json(['error' => 'Esta sección atiende mediante listado de pacientes, no por números correlativos.'], 422);
        }

        $section->current_number = max(0, intval($section->current_number) - 1);
        $section->save();

        $window = $this->selectWindow($section);

        $this->recordCall($window, $section->current_number);

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
        $user = Auth::user();
        $section = $this->resolveSection();

        return response()->json([
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => (bool) $user->is_admin,
            ] : null,
            'windowNumber' => session('windowNumber'),
            'sectionSelected' => session()->has('sectionCode'),
            'sectionCode' => $section?->code ?? session('sectionCode', 'SOME'),
            'stationType' => $section?->station_type ?? 'ventanilla',
            'callType' => $section?->call_type ?? 'number',
        ]);
    }

    public function setWindow(Request $request)
    {
        $input = trim((string) $request->input('windowNumber', ''));
        if ($input === '') {
            return response()->json(['error' => 'Debes ingresar un número o nombre para el puesto/box.'], 422);
        }

        $section = $this->resolveSection();
        if (! $section) {
            return response()->json(['error' => 'Sección no encontrada.'], 422);
        }

        $oldWindowNumber = session('windowNumber');
        $userEmail = Auth::check() ? Auth::user()->email : null;

        session(['windowNumber' => $input]);

        if ($oldWindowNumber && $oldWindowNumber !== $input) {
            $oldWindow = Window::where('section_id', $section->id)
                ->where('window_number', $oldWindowNumber)
                ->first();

            $existingTargetWindow = Window::where('section_id', $section->id)
                ->where('window_number', $input)
                ->first();

            if ($oldWindow) {
                if ($existingTargetWindow) {
                    Call::where('window_id', $oldWindow->id)->update(['window_id' => $existingTargetWindow->id]);
                    if ($existingTargetWindow->current_number == 0 && $oldWindow->current_number > 0) {
                        $existingTargetWindow->current_number = $oldWindow->current_number;
                        $existingTargetWindow->save();
                    }
                    $oldWindow->delete();
                } else {
                    $oldWindow->window_number = $input;
                    $oldWindow->save();
                }

                Patient::where('section_id', $section->id)
                    ->where('station_number', $oldWindowNumber)
                    ->update(['station_number' => $input]);
            }
        }

        if ($userEmail) {
            $otherWindowsWithMyCalls = Window::where('section_id', $section->id)
                ->where('window_number', '!=', $input)
                ->whereHas('calls', function ($q) use ($userEmail) {
                    $q->where('staff_email', $userEmail);
                })
                ->get();

            $targetWindow = Window::firstOrCreate(
                ['section_id' => $section->id, 'window_number' => $input],
                ['current_number' => $section->current_number]
            );

            foreach ($otherWindowsWithMyCalls as $ow) {
                $otherStaffCalls = Call::where('window_id', $ow->id)
                    ->where('staff_email', '!=', $userEmail)
                    ->exists();

                if (! $otherStaffCalls) {
                    Call::where('window_id', $ow->id)->update(['window_id' => $targetWindow->id]);
                    $ow->delete();
                }
            }
        }

        Window::firstOrCreate(
            ['section_id' => $section->id, 'window_number' => $input],
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

        if ($section->call_type === 'patient_list') {
            return response()->json(['error' => 'Esta sección atiende mediante listado de pacientes, no por números correlativos.'], 422);
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

        if ($section->call_type === 'patient_list') {
            $lastPatientCall = Call::where('window_id', $window->id)
                ->whereNotNull('patient_name')
                ->latest('id')
                ->first();

            if (! $lastPatientCall) {
                return response()->json(['error' => 'No hay llamados previos de pacientes en este puesto para repetir.'], 422);
            }

            Call::create([
                'window_id' => $window->id,
                'called_number' => 0,
                'patient_name' => $lastPatientCall->patient_name,
                'patient_identifier' => $lastPatientCall->patient_identifier,
                'called_at' => now(),
                'staff_email' => Auth::check() ? Auth::user()->email : null,
            ]);

            return $this->state();
        }

        $windowNumber = intval($window->current_number ?: $section->current_number);

        $this->recordCall($window, $windowNumber);

        return $this->state();
    }

    public function setNumber(Request $request)
    {
        $section = $this->resolveSection();
        if (! $section) {
            return response()->json(['error' => 'Sección no encontrada.'], 422);
        }

        if ($section->call_type === 'patient_list') {
            return response()->json(['error' => 'Esta sección atiende mediante listado de pacientes, no por números correlativos.'], 422);
        }

        $num = intval($request->input('number'));
        if ($num < 0) {
            return response()->json(['error' => 'Número inválido'], 422);
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

        Patient::where('section_id', $section->id)->where('status', 'calling')->update([
            'status' => 'pending',
            'called_at' => null,
            'station_number' => null,
        ]);

        return $this->state();
    }

    public function clearSection()
    {
        return $this->reset();
    }

    public function authStatus()
    {
        $configured = env('AZURE_CLIENT_ID') && env('AZURE_CLIENT_SECRET') && env('AZURE_REDIRECT_URI');

        return response()->json([
            'authConfigured' => (bool) $configured,
            'devLogin' => env('APP_DEBUG', false),
        ]);
    }

    public function getPatients()
    {
        $section = $this->resolveSection();
        if (! $section) {
            return response()->json([]);
        }

        $patients = Patient::where('section_id', $section->id)
            ->orderByRaw("CASE WHEN status = 'calling' THEN 1 WHEN status = 'pending' THEN 2 WHEN status = 'attended' THEN 3 ELSE 4 END")
            ->orderBy('id', 'asc')
            ->get();

        return response()->json($patients);
    }

    public function storePatient(Request $request)
    {
        $section = $this->resolveSection();
        if (! $section) {
            return response()->json(['error' => 'Sección no seleccionada.'], 422);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'identifier' => ['nullable', 'string', 'max:50'],
        ]);

        $patient = Patient::create([
            'section_id' => $section->id,
            'name' => trim($validated['name']),
            'identifier' => ! empty($validated['identifier']) ? trim($validated['identifier']) : null,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => "Paciente {$patient->name} agregado a la lista.",
            'patient' => $patient,
        ], 201);
    }

    public function callPatient(Patient $patient)
    {
        $section = $this->resolveSection();
        if (! $section || $patient->section_id !== $section->id) {
            return response()->json(['error' => 'El paciente no pertenece a la sección activa.'], 422);
        }

        $windowNumber = session('windowNumber', 1);

        $window = Window::firstOrCreate(
            ['section_id' => $section->id, 'window_number' => $windowNumber],
            ['current_number' => 0]
        );

        $patient->update([
            'status' => 'calling',
            'station_number' => $windowNumber,
            'called_at' => now(),
            'called_by' => Auth::check() ? Auth::user()->email : null,
        ]);

        Call::create([
            'window_id' => $window->id,
            'called_number' => 0,
            'patient_name' => $patient->name,
            'patient_identifier' => $patient->identifier,
            'called_at' => now(),
            'staff_email' => Auth::check() ? Auth::user()->email : null,
        ]);

        return response()->json([
            'message' => "Llamando a {$patient->name}.",
            'patient' => $patient,
            'state' => $this->state()->getData(),
        ]);
    }

    public function updatePatientStatus(Request $request, Patient $patient)
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:pending,calling,attended,cancelled'],
        ]);

        $patient->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'Estado del paciente actualizado.',
            'patient' => $patient,
        ]);
    }

    public function destroyPatient(Patient $patient)
    {
        $patient->delete();

        return response()->json(['message' => 'Paciente eliminado de la lista.']);
    }
}
