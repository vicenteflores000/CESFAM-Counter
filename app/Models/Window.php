<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Call;
use App\Models\Section;

class Window extends Model
{
    use HasFactory;

    protected $fillable = [
        'section_id',
        'window_number',
        'current_number',
    ];

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    public function calls(): HasMany
    {
        return $this->hasMany(Call::class);
    }
}