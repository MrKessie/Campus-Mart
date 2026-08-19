<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;

class CategorySeeder extends Seeder {
    public function run(): void {
        $categories = [
            ['name' => 'Textbooks', 'icon' => '📚'],
            ['name' => 'Electronics', 'icon' => '💻'],
            ['name' => 'Clothing', 'icon' => '👕'],
            ['name' => 'Food & Drinks', 'icon' => '🍱'],
            ['name' => 'Furniture', 'icon' => '🪑'],
            ['name' => 'Stationery', 'icon' => '✏️'],
            ['name' => 'Tutoring', 'icon' => '🎓'],
            ['name' => 'Photography', 'icon' => '📷'],
            ['name' => 'Graphic Design', 'icon' => '🎨'],
            ['name' => 'Hair & Beauty', 'icon' => '💇'],
            ['name' => 'Transport', 'icon' => '🚗'],
            ['name' => 'Other', 'icon' => '📦'],
        ];

        foreach ($categories as $category) {
            Category::create($category);
        }
    }
}