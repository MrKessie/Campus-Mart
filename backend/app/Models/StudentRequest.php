<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentRequest extends Model {
    use HasFactory;

    protected $table = 'requests';

    protected $fillable = [
        'user_id',
        'category_id',
        'title',
        'description',
        'budget',
        'status',
    ];

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function category() {
        return $this->belongsTo(Category::class);
    }
}