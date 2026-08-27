<?php

namespace Tests\Feature;

use App\Models\Call;
use App\Models\Patient;
use App\Models\Section;
use App\Models\User;
use App\Models\Window;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SetWindowRenameTest extends TestCase
{
    use RefreshDatabase;

    public function test_changing_window_name_updates_existing_window_and_prevents_duplicates(): void
    {
        $user = User::factory()->create();

        $section = Section::create([
            'code' => 'CSD',
            'name' => 'Control Signos Doñihue',
            'station_type' => 'box',
            'call_type' => 'patient_list',
            'current_number' => 0,
        ]);

        $patient = Patient::create([
            'section_id' => $section->id,
            'name' => 'Jose Perez',
            'status' => 'pending',
        ]);

        // 1. Staff logs in, sets window "Control de Signos" and calls patient
        $this->actingAs($user)
            ->withSession(['sectionCode' => 'CSD', 'windowNumber' => 'Control de Signos'])
            ->postJson("/api/patients/{$patient->id}/call");

        $this->assertEquals(1, Window::where('section_id', $section->id)->count());
        $this->assertDatabaseHas('windows', [
            'section_id' => $section->id,
            'window_number' => 'Control de Signos',
        ]);
        $this->assertEquals('Control de Signos', $patient->fresh()->station_number);

        // 2. Staff changes box name to "Box 1"
        $response = $this->actingAs($user)
            ->withSession(['sectionCode' => 'CSD', 'windowNumber' => 'Control de Signos'])
            ->postJson('/api/window', ['windowNumber' => 'Box 1']);

        $response->assertOk();

        // 3. There should ONLY be 1 window ("Box 1") and NO duplicate "Control de Signos"
        $this->assertEquals(1, Window::where('section_id', $section->id)->count());
        $this->assertDatabaseMissing('windows', [
            'section_id' => $section->id,
            'window_number' => 'Control de Signos',
        ]);
        $this->assertDatabaseHas('windows', [
            'section_id' => $section->id,
            'window_number' => 'Box 1',
        ]);
        $this->assertEquals('Box 1', $patient->fresh()->station_number);

        // The state returned should only contain 1 active window
        $activeWindows = collect($response->json('sections'))
            ->firstWhere('code', 'CSD')['windows'];
        $this->assertCount(1, $activeWindows);
        $this->assertEquals('Box 1', $activeWindows[0]['windowNumber']);
        $this->assertEquals('Jose Perez', $activeWindows[0]['patientName']);
    }
}
