<?php

namespace Tests\Feature;

use App\Models\Call;
use App\Models\Patient;
use App\Models\Section;
use App\Models\User;
use App\Models\Window;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClearSectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_clear_section_only_clears_active_section_windows_and_calls(): void
    {
        $user = User::factory()->create();

        $sectionA = Section::create([
            'code' => 'SECA',
            'name' => 'Sección A',
            'station_type' => 'box',
            'call_type' => 'patient_list',
            'current_number' => 5,
        ]);

        $sectionB = Section::create([
            'code' => 'SECB',
            'name' => 'Sección B',
            'station_type' => 'ventanilla',
            'call_type' => 'number',
            'current_number' => 12,
        ]);

        // Create windows and calls for Section A
        $winA1 = Window::create(['section_id' => $sectionA->id, 'window_number' => 'Box 1', 'current_number' => 5]);
        $winA2 = Window::create(['section_id' => $sectionA->id, 'window_number' => 'Box 2', 'current_number' => 6]);
        Call::create(['window_id' => $winA1->id, 'called_number' => 5, 'patient_name' => 'Paciente 1']);
        Call::create(['window_id' => $winA2->id, 'called_number' => 6, 'patient_name' => 'Paciente 2']);
        $patA = Patient::create(['section_id' => $sectionA->id, 'name' => 'Paciente 1', 'status' => 'calling', 'station_number' => 'Box 1']);

        // Create windows and calls for Section B
        $winB1 = Window::create(['section_id' => $sectionB->id, 'window_number' => '1', 'current_number' => 12]);
        Call::create(['window_id' => $winB1->id, 'called_number' => 12]);

        // Clear Section A
        $response = $this->actingAs($user)
            ->withSession(['sectionCode' => 'SECA', 'windowNumber' => 'Box 1'])
            ->postJson('/api/clear');

        $response->assertOk();

        // Section A should be cleared
        $this->assertEquals(0, $sectionA->fresh()->current_number);
        $this->assertEquals(0, Window::where('section_id', $sectionA->id)->where('current_number', '>', 0)->count());
        $this->assertEquals(0, Call::whereHas('window', fn($q) => $q->where('section_id', $sectionA->id))->count());
        $this->assertEquals('pending', $patA->fresh()->status);
        $this->assertNull($patA->fresh()->station_number);

        // Section B must remain intact
        $this->assertEquals(12, $sectionB->fresh()->current_number);
        $this->assertEquals(1, Window::where('section_id', $sectionB->id)->where('current_number', '>', 0)->count());
        $this->assertEquals(1, Call::whereHas('window', fn($q) => $q->where('section_id', $sectionB->id))->count());
    }
}
