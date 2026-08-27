<?php

namespace Tests\Feature;

use App\Models\Section;
use App\Models\User;
use App\Models\Window;
use App\Models\Call;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_access_admin_api(): void
    {
        $response = $this->getJson('/api/admin/data');
        $response->assertUnauthorized();
    }

    public function test_non_admin_user_gets_forbidden(): void
    {
        $user = User::factory()->create([
            'is_admin' => false,
        ]);

        $response = $this->actingAs($user)->getJson('/api/admin/data');
        $response->assertForbidden();
    }

    public function test_admin_can_fetch_data(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
        ]);

        Section::create([
            'code' => 'SOME',
            'name' => 'SOME Central',
            'current_number' => 0,
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/data');
        $response->assertOk();
        $response->assertJsonStructure([
            'users' => [
                '*' => ['id', 'name', 'email', 'is_admin', 'sections'],
            ],
            'sections' => [
                '*' => ['id', 'code', 'name', 'current_number', 'windows_count', 'users_count'],
            ],
        ]);
    }

    public function test_admin_can_create_update_and_delete_section(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
        ]);

        // Create with box and patient_list
        $createRes = $this->actingAs($admin)->postJson('/api/admin/sections', [
            'code' => 'DEN',
            'name' => 'Dental',
            'station_type' => 'box',
            'call_type' => 'patient_list',
        ]);
        $createRes->assertCreated();
        $this->assertDatabaseHas('sections', [
            'code' => 'DEN',
            'name' => 'Dental',
            'station_type' => 'box',
            'call_type' => 'patient_list',
        ]);

        $section = Section::firstWhere('code', 'DEN');

        // Update to ventanilla and number
        $updateRes = $this->actingAs($admin)->putJson("/api/admin/sections/{$section->id}", [
            'code' => 'DENT',
            'name' => 'Dental Odontología',
            'station_type' => 'ventanilla',
            'call_type' => 'number',
        ]);
        $updateRes->assertOk();
        $this->assertDatabaseHas('sections', [
            'code' => 'DENT',
            'name' => 'Dental Odontología',
            'station_type' => 'ventanilla',
            'call_type' => 'number',
        ]);

        // Delete
        $deleteRes = $this->actingAs($admin)->deleteJson("/api/admin/sections/{$section->id}");
        $deleteRes->assertOk();
        $this->assertDatabaseMissing('sections', ['id' => $section->id]);
    }

    public function test_admin_can_assign_sections_and_staff_scope_is_enforced(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $staff = User::factory()->create(['is_admin' => false]);

        $some = Section::create(['code' => 'SOME', 'name' => 'SOME', 'current_number' => 0]);
        $far = Section::create(['code' => 'FAR', 'name' => 'Farmacia', 'current_number' => 0]);
        $vac = Section::create(['code' => 'VAC', 'name' => 'Vacunatorio', 'current_number' => 0]);

        // Initially with no assigned sections, non-admin staff sees 0 sections
        $initialSectionsRes = $this->actingAs($staff)->getJson('/api/sections');
        $initialSectionsRes->assertOk();
        $this->assertCount(0, $initialSectionsRes->json());

        // Admin assigns only 'FAR' and 'VAC' to staff
        $assignRes = $this->actingAs($admin)->postJson("/api/admin/users/{$staff->id}/sections", [
            'section_ids' => [$far->id, $vac->id],
        ]);
        $assignRes->assertOk();

        // Staff now only gets assigned sections in /api/sections
        $staffSectionsRes = $this->actingAs($staff)->getJson('/api/sections');
        $staffSectionsRes->assertOk();
        $staffSections = $staffSectionsRes->json();
        $this->assertCount(2, $staffSections);
        $this->assertEquals(['FAR', 'VAC'], collect($staffSections)->pluck('code')->sort()->values()->all());

        // Staff cannot select unauthorized section
        $unauthorizedSelect = $this->actingAs($staff)->postJson('/api/section', [
            'sectionCode' => 'SOME',
        ]);
        $unauthorizedSelect->assertForbidden();

        // Staff can select authorized section
        $authorizedSelect = $this->actingAs($staff)->postJson('/api/section', [
            'sectionCode' => 'FAR',
        ]);
        $authorizedSelect->assertOk();
    }
}

