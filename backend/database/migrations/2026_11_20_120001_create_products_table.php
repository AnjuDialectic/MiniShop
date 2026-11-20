<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 150);
            $table->text('description');
            $table->bigInteger('price');
            $table->integer('stock');
            $table->string('category', 60);
            $table->string('image_url', 2048);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['category', 'deleted_at'], 'idx_products_category_deleted');
            $table->index('name', 'idx_products_name');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE products ADD CONSTRAINT products_price_positive CHECK (price > 0)');
            DB::statement('ALTER TABLE products ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
