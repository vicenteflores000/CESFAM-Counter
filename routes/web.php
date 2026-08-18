<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\StateController;

Route::get('/', function () {
    return view('patient');
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

// Simple API endpoints for state and operator actions
Route::get('/events', [StateController::class, 'events']);
Route::prefix('api')->group(function () {
    Route::get('/state', [StateController::class, 'state']);
    Route::get('/me', [StateController::class, 'me']);
    Route::get('/sections', [StateController::class, 'sections']);
    Route::post('/section', [StateController::class, 'setSection']);
    Route::post('/window', [StateController::class, 'setWindow']);
    Route::post('/next', [StateController::class, 'next']);
    Route::post('/previous', [StateController::class, 'previous']);
    Route::post('/recall', [StateController::class, 'recall']);
    Route::post('/reset', [StateController::class, 'reset']);
    Route::post('/set', [StateController::class, 'setNumber']);
    Route::get('/auth-status', [StateController::class, 'authStatus']);
});
