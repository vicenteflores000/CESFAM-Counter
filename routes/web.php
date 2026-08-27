<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\StateController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\TTSController;

Route::get('/', function () {
    $code = request()->query('code');
    $state = app(StateController::class)->state()->getData();
    return view('patient', [
        'sectionCode' => $code ? strtoupper($code) : null,
        'initialState' => $state,
    ]);
});

Route::middleware('auth')->group(function () {
    Route::get('/staff', function () {
        return view('staff');
    });
});

// Auth routes (Microsoft / Azure AD)
Route::get('/login', function () {
    return redirect()->to('/auth/microsoft');
})->name('login');
Route::get('/auth/microsoft', [AuthController::class, 'redirect'])->name('auth.microsoft.redirect');
Route::get('/auth/microsoft/callback', [AuthController::class, 'callback'])->name('auth.microsoft.callback');
Route::get('/logout', [AuthController::class, 'logout'])->name('logout');

// Public API endpoints for TV displays and status
Route::get('/events', [StateController::class, 'events']);
Route::prefix('api')->group(function () {
    Route::get('/state', [StateController::class, 'state']);
    Route::get('/me', [StateController::class, 'me']);
    Route::get('/sections', [StateController::class, 'sections']);
    Route::get('/auth-status', [StateController::class, 'authStatus']);
    Route::get('/tts', [TTSController::class, 'speak']);

    // Authenticated staff endpoints
    Route::middleware('auth')->group(function () {
        Route::post('/section', [StateController::class, 'setSection']);
        Route::post('/window', [StateController::class, 'setWindow']);
        Route::post('/next', [StateController::class, 'next']);
        Route::post('/previous', [StateController::class, 'previous']);
        Route::post('/recall', [StateController::class, 'recall']);
        Route::post('/reset', [StateController::class, 'reset']);
        Route::post('/clear', [StateController::class, 'clearSection']);
        Route::post('/set', [StateController::class, 'setNumber']);

        // Patient queue endpoints (for sections with call_type = 'patient_list')
        Route::get('/patients', [StateController::class, 'getPatients']);
        Route::post('/patients', [StateController::class, 'storePatient']);
        Route::post('/patients/{patient}/call', [StateController::class, 'callPatient']);
        Route::post('/patients/{patient}/status', [StateController::class, 'updatePatientStatus']);
        Route::delete('/patients/{patient}', [StateController::class, 'destroyPatient']);

        // Admin endpoints
        Route::prefix('admin')->group(function () {
            Route::get('/data', [AdminController::class, 'getData']);
            Route::post('/sections', [AdminController::class, 'storeSection']);
            Route::put('/sections/{section}', [AdminController::class, 'updateSection']);
            Route::delete('/sections/{section}', [AdminController::class, 'destroySection']);
            Route::post('/sections/{section}/reset', [AdminController::class, 'resetSection']);

            Route::post('/users', [AdminController::class, 'storeUser']);
            Route::post('/users/{user}/role', [AdminController::class, 'updateUserRole']);
            Route::post('/users/{user}/sections', [AdminController::class, 'updateUserSections']);
            Route::delete('/users/{user}', [AdminController::class, 'destroyUser']);
        });
    });
});

// Sector route for patient screen (e.g. /SOME, /FARMACIA, /sector/SOME)
Route::get('/sector/{code}', function (string $code) {
    $state = app(StateController::class)->state()->getData();
    return view('patient', [
        'sectionCode' => strtoupper($code),
        'initialState' => $state,
    ]);
});

Route::get('/{code}', function (string $code) {
    $state = app(StateController::class)->state()->getData();
    return view('patient', [
        'sectionCode' => strtoupper($code),
        'initialState' => $state,
    ]);
})->where('code', '^(?!staff|login|logout|events|api|auth|assets|build|favicon\.ico|robots\.txt).*$');
