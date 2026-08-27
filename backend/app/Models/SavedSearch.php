<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SavedSearch extends Model {
    use HasFactory;

    protected $fillable = [
        'user_id',
        'keyword',
        'category_id',
        'max_price',
    ];

    protected $casts = [
        'max_price' => 'decimal:2',
    ];

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function category() {
        return $this->belongsTo(Category::class);
    }
}
