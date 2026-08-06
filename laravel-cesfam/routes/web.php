<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\StateController;

Route::get('/', function () {
    return view('patient');
});

Route::get('/staff', function () {
    return view('staff');
});

// Auth routes (Socialite Azure)
Route::get('/login/azure', [AuthController::class, 'redirect']);
Route::get('/login/azure/callback', [AuthController::class, 'callback']);
Route::get('/logout', [AuthController::class, 'logout']);

// Simple API endpoints for state and operator actions
Route::get('/events', [StateController::class, 'events']);
Route::prefix('api')->group(function () {
    Route::get('/state', [StateController::class, 'state']);
    Route::get('/me', [StateController::class, 'me']);
    Route::post('/window', [StateController::class, 'setWindow']);
    Route::post('/next', [StateController::class, 'next']);
    Route::post('/recall', [StateController::class, 'recall']);
    Route::post('/set', [StateController::class, 'setNumber']);
    Route::get('/auth-status', [StateController::class, 'authStatus']);
});

// Preflight OPTIONS for CORS (allow any origin temporarily)
Route::options('/events', function () {
    return response('', 200)->withHeaders([
        'Access-Control-Allow-Origin' => implode(', ', config('cors.allowed_origins', ['*'])),
        'Access-Control-Allow-Methods' => implode(', ', config('cors.allowed_methods', ['GET','POST','OPTIONS'])),
        'Access-Control-Allow-Headers' => implode(', ', config('cors.allowed_headers', ['Content-Type','Authorization','X-Requested-With'])),
    ]);
});

Route::options('api/{any}', function () {
    return response('', 200)->withHeaders([
        'Access-Control-Allow-Origin' => implode(', ', config('cors.allowed_origins', ['*'])),
        'Access-Control-Allow-Methods' => implode(', ', config('cors.allowed_methods', ['GET','POST','OPTIONS'])),
        'Access-Control-Allow-Headers' => implode(', ', config('cors.allowed_headers', ['Content-Type','Authorization','X-Requested-With'])),
    ]);
})->where('any', '.*');
