<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_succeeds_creates_order_with_snapshots_and_decrements_stock(): void
    {
        $keyboard = Product::factory()->create([
            'name' => 'Mechanical Keyboard Keychron K2',
            'price' => 1299000,
            'stock' => 8,
            'image_url' => 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
        ]);
        $sleeve = Product::factory()->create([
            'name' => 'Laptop Sleeve 14 Inch',
            'price' => 245000,
            'stock' => 2,
            'image_url' => 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
        ]);

        // Submit items in descending product_id order to verify deterministic ascending lock/deduct order
        $response = $this->postJson('/api/v1/orders', [
            'customer_name' => 'Budi Santoso',
            'customer_email' => 'budi@example.com',
            'notes' => 'Packing bubble wrap tebal.',
            'items' => [
                ['product_id' => $sleeve->id, 'quantity' => 2],
                ['product_id' => $keyboard->id, 'quantity' => 1],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.customer_name', 'Budi Santoso')
            ->assertJsonPath('data.customer_email', 'budi@example.com')
            ->assertJsonPath('data.notes', 'Packing bubble wrap tebal.')
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.total_quantity', 3)
            ->assertJsonPath('data.items_count', 2)
            ->assertJsonPath('data.total_amount', 1789000)
            ->assertJsonCount(2, 'data.items');

        $this->assertMatchesRegularExpression('/^ORD-\d{8}-[A-F0-9]{6}$/', (string) $response->json('data.order_code'));

        // Verify accurate stock deduction in DB
        $this->assertSame(7, $keyboard->fresh()->stock);
        $this->assertSame(0, $sleeve->fresh()->stock);

        // Verify snapshot fields saved in order_items
        $this->assertDatabaseHas('order_items', [
            'order_id' => $response->json('data.id'),
            'product_id' => $keyboard->id,
            'product_name' => 'Mechanical Keyboard Keychron K2',
            'unit_price' => 1299000,
            'quantity' => 1,
            'subtotal' => 1299000,
        ]);
        $this->assertDatabaseHas('order_items', [
            'order_id' => $response->json('data.id'),
            'product_id' => $sleeve->id,
            'product_name' => 'Laptop Sleeve 14 Inch',
            'unit_price' => 245000,
            'quantity' => 2,
            'subtotal' => 490000,
        ]);
    }

    public function test_checkout_enforces_server_side_price_authority(): void
    {
        $product = Product::factory()->create([
            'price' => 500000,
            'stock' => 5,
        ]);

        $response = $this->postJson('/api/v1/orders', [
            'customer_name' => 'Tamper Tester',
            'total_amount' => 1,
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 2,
                    'price' => 1,
                    'unit_price' => 1,
                ],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.total_amount', 1000000)
            ->assertJsonPath('data.items.0.unit_price', 500000)
            ->assertJsonPath('data.items.0.subtotal', 1000000);
    }

    public function test_checkout_fails_with_409_and_rolls_back_all_stock_when_one_item_has_insufficient_stock(): void
    {
        $availableProduct = Product::factory()->create([
            'name' => 'USB-C Hub',
            'price' => 349000,
            'stock' => 10,
        ]);
        $limitedProduct = Product::factory()->create([
            'name' => 'Laptop Sleeve Kulit Vegan 14 Inch',
            'price' => 245000,
            'stock' => 2,
        ]);

        $response = $this->postJson('/api/v1/orders', [
            'customer_name' => 'Siti Aminah',
            'items' => [
                ['product_id' => $availableProduct->id, 'quantity' => 3],
                ['product_id' => $limitedProduct->id, 'quantity' => 4],
            ],
        ]);

        $response->assertStatus(409)
            ->assertJsonPath('success', false)
            ->assertJsonPath('errors.items.0.product_id', $limitedProduct->id)
            ->assertJsonPath('errors.items.0.product_name', 'Laptop Sleeve Kulit Vegan 14 Inch')
            ->assertJsonPath('errors.items.0.requested_quantity', 4)
            ->assertJsonPath('errors.items.0.available_stock', 2)
            ->assertJsonPath('errors.items.0.reason', 'INSUFFICIENT_STOCK');

        // Full rollback: neither product stock changed and no order was created
        $this->assertSame(10, $availableProduct->fresh()->stock);
        $this->assertSame(2, $limitedProduct->fresh()->stock);
        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('order_items', 0);
    }

    public function test_checkout_rejects_out_of_stock_soft_deleted_and_missing_products_with_409(): void
    {
        $okProduct = Product::factory()->create(['stock' => 10]);
        $zeroStock = Product::factory()->outOfStock()->create(['name' => 'Sony Earbuds']);
        $deletedProduct = Product::factory()->create(['name' => 'Discontinued Lamp', 'stock' => 5]);
        $deletedProduct->delete();

        $response = $this->postJson('/api/v1/orders', [
            'customer_name' => 'Dina Putri',
            'items' => [
                ['product_id' => $okProduct->id, 'quantity' => 1],
                ['product_id' => $zeroStock->id, 'quantity' => 1],
                ['product_id' => $deletedProduct->id, 'quantity' => 1],
                ['product_id' => 99999, 'quantity' => 2],
            ],
        ]);

        $response->assertStatus(409)
            ->assertJsonPath('success', false)
            ->assertJsonCount(3, 'errors.items')
            ->assertJsonFragment([
                'product_id' => $zeroStock->id,
                'product_name' => 'Sony Earbuds',
                'requested_quantity' => 1,
                'available_stock' => 0,
                'reason' => 'INSUFFICIENT_STOCK',
            ])
            ->assertJsonFragment([
                'product_id' => $deletedProduct->id,
                'product_name' => 'Discontinued Lamp',
                'requested_quantity' => 1,
                'available_stock' => 0,
                'reason' => 'PRODUCT_UNAVAILABLE',
            ])
            ->assertJsonFragment([
                'product_id' => 99999,
                'product_name' => null,
                'requested_quantity' => 2,
                'available_stock' => 0,
                'reason' => 'PRODUCT_UNAVAILABLE',
            ]);

        // Stock of valid item in the same checkout must remain completely untouched
        $this->assertSame(10, $okProduct->fresh()->stock);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_checkout_rolls_back_earlier_item_decrement_if_conditional_update_hits_concurrent_stock_drop(): void
    {
        $first = Product::factory()->create(['name' => 'Item Pertama', 'stock' => 5]);
        $second = Product::factory()->create(['name' => 'Item Kedua', 'stock' => 2]);

        // Simulate stock dropping on $second right after the first conditional UPDATE runs
        $simulatedRace = false;
        DB::listen(function ($query) use ($first, $second, &$simulatedRace): void {
            if (! $simulatedRace && str_contains($query->sql, 'update "products"') && in_array($first->id, $query->bindings, true)) {
                $simulatedRace = true;
                DB::table('products')->where('id', $second->id)->update(['stock' => 0]);
            }
        });

        $response = $this->postJson('/api/v1/orders', [
            'customer_name' => 'Race Condition Check',
            'items' => [
                ['product_id' => $first->id, 'quantity' => 2],
                ['product_id' => $second->id, 'quantity' => 1],
            ],
        ]);

        $response->assertStatus(409)
            ->assertJsonPath('success', false)
            ->assertJsonPath('errors.items.0.product_id', $second->id)
            ->assertJsonPath('errors.items.0.available_stock', 0)
            ->assertJsonPath('errors.items.0.reason', 'INSUFFICIENT_STOCK');

        // Entire transaction rolled back: race fired, $first reverted to 5, zero orders persisted
        $this->assertTrue($simulatedRace);
        $this->assertSame(5, $first->fresh()->stock);
        $this->assertSame(2, $second->fresh()->stock);
        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('order_items', 0);
    }

    public function test_checkout_validation_rejects_empty_items_duplicate_product_ids_and_invalid_customer(): void
    {
        $product = Product::factory()->create(['stock' => 5]);

        // Empty items & missing customer_name
        $this->postJson('/api/v1/orders', [
            'customer_name' => '',
            'customer_email' => 'not-an-email',
            'items' => [],
        ])
            ->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors(['customer_name', 'customer_email', 'items']);

        // Duplicate product_id
        $this->postJson('/api/v1/orders', [
            'customer_name' => 'Budi Santoso',
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
                ['product_id' => $product->id, 'quantity' => 2],
            ],
        ])
            ->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors(['items.0.product_id', 'items.1.product_id']);

        // Quantity <= 0
        $this->postJson('/api/v1/orders', [
            'customer_name' => 'Budi Santoso',
            'items' => [
                ['product_id' => $product->id, 'quantity' => 0],
            ],
        ])
            ->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors(['items.0.quantity']);

        $this->assertSame(5, $product->fresh()->stock);
    }
}
