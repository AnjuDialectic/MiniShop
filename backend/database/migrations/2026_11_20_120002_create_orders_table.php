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
        Schema::create('orders', function (Blueprint $table): void {
            $table->id();
            $table->string('order_code', 32)->unique();
            $table->string('customer_name', 120);
            $table->string('customer_email', 150)->nullable();
            $table->text('notes')->nullable();
            $table->bigInteger('total_amount');
            $table->integer('total_quantity');
            $table->string('status', 30)->default('completed');
            $table->timestamps();

            $table->index('created_at', 'idx_orders_created_at');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE orders ADD CONSTRAINT orders_total_amount_positive CHECK (total_amount > 0)');
            DB::statement('ALTER TABLE orders ADD CONSTRAINT orders_total_quantity_positive CHECK (total_quantity > 0)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
