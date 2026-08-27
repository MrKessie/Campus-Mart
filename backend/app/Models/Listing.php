<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Listing extends Model {
    use HasFactory;

    protected $fillable = [
        'user_id', 'category_id', 'title', 'description',
        'price', 'image', 'images', 'status', 'is_service', 'course_code'
    ];

    protected $casts = [
        'images'     => 'array',
        'is_service' => 'boolean',
        'price'      => 'decimal:2',
    ];

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function category() {
        return $this->belongsTo(Category::class);
    }

    public function ratings() {
        return $this->hasMany(Rating::class);
    }

    public function offers() {
        return $this->hasMany(Offer::class);
    }

    public function scopeAvailable($query) {
        return $query->where('status', 'available');
    }

    public function scopeSearch($query, $term) {
        return $query->where(function($q) use ($term) {
            $q->where('title', 'like', "%{$term}%")
              ->orWhere('description', 'like', "%{$term}%")
              ->orWhere('course_code', 'like', "%{$term}%");
        });
    }
}