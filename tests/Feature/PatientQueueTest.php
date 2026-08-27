<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientQueueTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_add_list_and_call_patient_in_patient_list_section(): void
    {
        $user = User::factory()->create();

        $section = Section::create([
            'code' => 'MED',
            'name' => 'Medicina General',
            'station_type' => 'box',
            'call_type' => 'patient_list',
            'current_number' => 0,
        ]);

        // Select section and window in session
        $this->actingAs($user)
            ->withSession(['sectionCode' => 'MED', 'windowNumber' => 3]);

        // 1. Add patient
        $storeRes = $this->actingAs($user)
            ->withSession(['sectionCode' => 'MED', 'windowNumber' => 3])
            ->postJson('/api/patients', [
                'name' => 'Juan Pérez',
                'identifier' => '11.222.333-4',
            ]);

        $storeRes->assertCreated();
        $this->assertDatabaseHas('patients', [
            'section_id' => $section->id,
            'name' => 'Juan Pérez',
            'identifier' => '11.222.333-4',
            'status' => 'pending',
        ]);

        $patient = Patient::firstWhere('name', 'Juan Pérez');

        // 2. List patients
        $listRes = $this->actingAs($user)
            ->withSession(['sectionCode' => 'MED', 'windowNumber' => 3])
            ->getJson('/api/patients');

        $listRes->assertOk();
        $listRes->assertJsonCount(1);
        $listRes->assertJsonFragment(['name' => 'Juan Pérez']);

        // 3. Call patient to Box 3
        $callRes = $this->actingAs($user)
            ->withSession(['sectionCode' => 'MED', 'windowNumber' => 3])
            ->postJson("/api/patients/{$patient->id}/call");

        $callRes->assertOk();
        $this->assertDatabaseHas('patients', [
            'id' => $patient->id,
            'status' => 'calling',
            'station_number' => 3,
        ]);
        $this->assertDatabaseHas('calls', [
            'patient_name' => 'Juan Pérez',
            'patient_identifier' => '11.222.333-4',
        ]);

        // 4. Verify state includes patient in lastCall
        $stateRes = $this->getJson('/api/state');
        $stateRes->assertOk();
        $stateRes->assertJsonPath('lastCall.patientName', 'Juan Pérez');
        $stateRes->assertJsonPath('lastCall.stationType', 'box');
        $stateRes->assertJsonPath('lastCall.windowNumber', '3');

        // 5. Update status to attended
        $attendRes = $this->actingAs($user)
            ->withSession(['sectionCode' => 'MED', 'windowNumber' => 3])
            ->postJson("/api/patients/{$patient->id}/status", [
                'status' => 'attended',
            ]);
        $attendRes->assertOk();
        $this->assertDatabaseHas('patients', [
            'id' => $patient->id,
            'status' => 'attended',
        ]);

        // 6. Delete patient
        $deleteRes = $this->actingAs($user)
            ->withSession(['sectionCode' => 'MED', 'windowNumber' => 3])
            ->deleteJson("/api/patients/{$patient->id}");
        $deleteRes->assertOk();
        $this->assertDatabaseMissing('patients', ['id' => $patient->id]);
    }

    public function test_can_set_alphanumeric_box_name_and_call_patient(): void
    {
        $user = User::factory()->create();

        $section = Section::create([
            'code' => 'DENT',
            'name' => 'Odontología',
            'station_type' => 'box',
            'call_type' => 'patient_list',
            'current_number' => 0,
        ]);

        // Set station name as text (e.g. "Dental 2")
        $windowRes = $this->actingAs($user)
            ->withSession(['sectionCode' => 'DENT'])
            ->postJson('/api/window', [
                'windowNumber' => 'Dental 2',
            ]);
        $windowRes->assertOk();
        $this->assertDatabaseHas('windows', [
            'section_id' => $section->id,
            'window_number' => 'Dental 2',
        ]);

        // Create and call patient
        $patient = Patient::create([
            'section_id' => $section->id,
            'name' => 'Camila Soto',
            'status' => 'pending',
        ]);

        $callRes = $this->actingAs($user)
            ->withSession(['sectionCode' => 'DENT', 'windowNumber' => 'Dental 2'])
            ->postJson("/api/patients/{$patient->id}/call");

        $callRes->assertOk();
        $this->assertDatabaseHas('patients', [
            'id' => $patient->id,
            'status' => 'calling',
            'station_number' => 'Dental 2',
        ]);

        $stateRes = $this->getJson('/api/state');
        $stateRes->assertOk();
        $stateRes->assertJsonPath('lastCall.patientName', 'Camila Soto');
        $stateRes->assertJsonPath('lastCall.windowNumber', 'Dental 2');
    }
}

