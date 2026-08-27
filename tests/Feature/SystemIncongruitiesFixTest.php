<?php

namespace Tests\Feature;

use App\Models\Call;
use App\Models\Patient;
use App\Models\Section;
use App\Models\User;
use App\Models\Window;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SystemIncongruitiesFixTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_requests_to_operator_endpoints_are_rejected(): void
    {
        $this->postJson('/api/next')->assertUnauthorized();
        $this->postJson('/api/previous')->assertUnauthorized();
        $this->postJson('/api/recall')->assertUnauthorized();
        $this->postJson('/api/reset')->assertUnauthorized();
        $this->postJson('/api/clear')->assertUnauthorized();
        $this->postJson('/api/set', ['number' => 10])->assertUnauthorized();
        $this->postJson('/api/window', ['windowNumber' => 'Box 1'])->assertUnauthorized();
        $this->getJson('/api/patients')->assertUnauthorized();
        $this->postJson('/api/patients', ['name' => 'Test'])->assertUnauthorized();
    }

    public function test_numeric_actions_are_blocked_on_patient_list_sections(): void
    {
        $user = User::factory()->create(['is_admin' => true]);

        $section = Section::create([
            'code' => 'BOXD',
            'name' => 'Box Dental',
            'station_type' => 'box',
            'call_type' => 'patient_list',
            'current_number' => 0,
        ]);

        $session = ['sectionCode' => 'BOXD', 'windowNumber' => 'Dental 1'];

        // Next should fail
        $nextRes = $this->actingAs($user)->withSession($session)->postJson('/api/next');
        $nextRes->assertStatus(422);
        $nextRes->assertJsonFragment(['error' => 'Esta sección atiende mediante listado de pacientes, no por números correlativos.']);

        // Previous should fail
        $prevRes = $this->actingAs($user)->withSession($session)->postJson('/api/previous');
        $prevRes->assertStatus(422);

        // Set number should fail
        $setRes = $this->actingAs($user)->withSession($session)->postJson('/api/set', ['number' => 10]);
        $setRes->assertStatus(422);
    }

    public function test_non_admin_user_with_no_sections_sees_empty_array_and_admin_sees_all(): void
    {
        Section::create(['code' => 'A', 'name' => 'Sec A', 'current_number' => 0]);
        Section::create(['code' => 'B', 'name' => 'Sec B', 'current_number' => 0]);

        $staff = User::factory()->create(['is_admin' => false]);
        $admin = User::factory()->create(['is_admin' => true]);

        // Non-admin without assignments gets empty array
        $staffRes = $this->actingAs($staff)->getJson('/api/sections');
        $staffRes->assertOk();
        $staffRes->assertJsonCount(0);

        // Admin gets all sections
        $adminRes = $this->actingAs($admin)->getJson('/api/sections');
        $adminRes->assertOk();
        $adminRes->assertJsonCount(2);

        // Guest (public TV) gets all sections
        $guestRes = $this->getJson('/api/sections');
        $guestRes->assertOk();
        $guestRes->assertJsonCount(2);
    }

    public function test_admin_reset_section_resets_calling_patients_to_pending(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $section = Section::create([
            'code' => 'MED',
            'name' => 'Medicina',
            'station_type' => 'box',
            'call_type' => 'patient_list',
            'current_number' => 0,
        ]);

        $win = Window::create(['section_id' => $section->id, 'window_number' => 'Box 1', 'current_number' => 0]);
        $pat = Patient::create(['section_id' => $section->id, 'name' => 'Carlos', 'status' => 'calling', 'station_number' => 'Box 1']);
        Call::create(['window_id' => $win->id, 'called_number' => 0, 'patient_name' => 'Carlos']);

        $res = $this->actingAs($admin)->postJson("/api/admin/sections/{$section->id}/reset");
        $res->assertOk();

        $this->assertEquals('pending', $pat->fresh()->status);
        $this->assertNull($pat->fresh()->station_number);
        $this->assertEquals(0, Call::where('window_id', $win->id)->count());
    }
}
