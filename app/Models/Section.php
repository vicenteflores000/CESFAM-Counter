<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Section extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'current_number',
    ];

    public function windows(): HasMany
    {
        return $this->hasMany(Window::class);
    }

    public function calls(): HasManyThrough
    {
        return $this->hasManyThrough(Call::class, Window::class);
    }
}
