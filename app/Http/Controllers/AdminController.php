<?php

namespace App\Http\Controllers;

use App\Models\Section;
use App\Models\User;
use App\Models\Window;
use App\Models\Call;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    protected function authorizeAdmin(): void
    {
        if (! Auth::check() || ! Auth::user()->is_admin) {
            abort(403, 'Acceso denegado. Se requieren privilegios de administrador.');
        }
    }

    public function getData()
    {
        $this->authorizeAdmin();

        $users = User::with(['sections' => function ($q) {
            $q->select('sections.id', 'sections.code', 'sections.name');
        }])->orderBy('name')->get(['id', 'name', 'email', 'is_admin', 'created_at']);

        $sections = Section::withCount(['windows', 'users'])
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'current_number', 'station_type', 'call_type']);

        return response()->json([
            'users' => $users,
            'sections' => $sections,
        ]);
    }

    public function storeSection(Request $request)
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', 'unique:sections,code'],
            'name' => ['required', 'string', 'max:100'],
            'station_type' => ['sometimes', 'string', 'in:ventanilla,box'],
            'call_type' => ['sometimes', 'string', 'in:number,patient_list'],
        ]);

        $section = Section::create([
            'code' => strtoupper(trim($validated['code'])),
            'name' => trim($validated['name']),
            'current_number' => 0,
            'station_type' => $validated['station_type'] ?? 'ventanilla',
            'call_type' => $validated['call_type'] ?? 'number',
        ]);

        return response()->json([
            'message' => 'Sección creada correctamente.',
            'section' => $section,
        ], 201);
    }

    public function updateSection(Request $request, Section $section)
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', Rule::unique('sections', 'code')->ignore($section->id)],
            'name' => ['required', 'string', 'max:100'],
            'station_type' => ['sometimes', 'string', 'in:ventanilla,box'],
            'call_type' => ['sometimes', 'string', 'in:number,patient_list'],
        ]);

        $section->update([
            'code' => strtoupper(trim($validated['code'])),
            'name' => trim($validated['name']),
            'station_type' => $validated['station_type'] ?? $section->station_type,
            'call_type' => $validated['call_type'] ?? $section->call_type,
        ]);

        return response()->json([
            'message' => 'Sección actualizada correctamente.',
            'section' => $section,
        ]);
    }

    public function destroySection(Section $section)
    {
        $this->authorizeAdmin();

        $section->delete();

        return response()->json(['message' => 'Sección eliminada con éxito.']);
    }

    public function resetSection(Section $section)
    {
        $this->authorizeAdmin();

        $section->update(['current_number' => 0]);
        Window::where('section_id', $section->id)->update(['current_number' => 0]);
        Call::whereHas('window', function ($q) use ($section) {
            $q->where('section_id', $section->id);
        })->delete();

        Patient::where('section_id', $section->id)->where('status', 'calling')->update([
            'status' => 'pending',
            'called_at' => null,
            'station_number' => null,
        ]);

        return response()->json(['message' => "Contador y llamados de sección {$section->code} reiniciados."]);
    }

    public function storeUser(Request $request)
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'is_admin' => ['sometimes', 'boolean'],
            'section_ids' => ['sometimes', 'array'],
            'section_ids.*' => ['exists:sections,id'],
        ]);

        $user = User::create([
            'name' => trim($validated['name']),
            'email' => strtolower(trim($validated['email'])),
            'password' => Hash::make(str()->uuid()->toString()),
            'is_admin' => $request->boolean('is_admin'),
            'email_verified_at' => now(),
        ]);

        if (! empty($validated['section_ids'])) {
            $user->sections()->sync($validated['section_ids']);
        }

        return response()->json([
            'message' => 'Usuario registrado correctamente para acceso con Azure AD.',
            'user' => $user->load('sections:id,code,name'),
        ], 201);
    }

    public function updateUserRole(Request $request, User $user)
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'is_admin' => ['required', 'boolean'],
        ]);

        $newAdminState = $validated['is_admin'];

        // Prevenir que el único administrador se despoje a sí mismo de permisos
        if (! $newAdminState && $user->is_admin && User::where('is_admin', true)->count() <= 1) {
            return response()->json(['error' => 'No puedes remover al único administrador del sistema.'], 422);
        }

        $user->is_admin = $newAdminState;
        $user->save();

        return response()->json([
            'message' => 'Rol de usuario actualizado.',
            'user' => $user->load('sections:id,code,name'),
        ]);
    }

    public function updateUserSections(Request $request, User $user)
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'section_ids' => ['present', 'array'],
            'section_ids.*' => ['exists:sections,id'],
        ]);

        $user->sections()->sync($validated['section_ids']);

        return response()->json([
            'message' => 'Alcance de secciones actualizado.',
            'user' => $user->load('sections:id,code,name'),
        ]);
    }

    public function destroyUser(User $user)
    {
        $this->authorizeAdmin();

        if (Auth::id() === $user->id) {
            return response()->json(['error' => 'No puedes eliminar tu propia cuenta mientras estás conectado.'], 422);
        }

        if ($user->is_admin && User::where('is_admin', true)->count() <= 1) {
            return response()->json(['error' => 'No puedes eliminar al único administrador del sistema.'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'Usuario eliminado correctamente.']);
    }
}

