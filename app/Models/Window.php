<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Window extends Model
{
    use HasFactory;

    protected $fillable = [
        'window_number',
        'current_number',
    ];

    public function calls(): HasMany
    {
        return $this->hasMany(Call::class);
    }
}