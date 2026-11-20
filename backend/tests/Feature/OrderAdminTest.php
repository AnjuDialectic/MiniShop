<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class OrderAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_orders_newest_first_with_items_count(): void
    {
        $p1 = Product::factory()->create(['price' => 100000, 'stock' => 10]);
        $p2 = Product::factory()->create(['price' => 200000, 'stock' => 10]);

        Carbon::setTestNow(Carbon::parse('2026-11-19 09:00:00'));
        $firstOrderResponse = $this->postJson('/api/v1/orders', [
            'customer_name' => 'Pembeli Lama',
            'items' => [
                ['product_id' => $p1->id, 'quantity' => 1],
            ],
        ])->assertCreated();

        Carbon::setTestNow(Carbon::parse('2026-11-20 14:30:00'));
        $secondOrderResponse = $this->postJson('/api/v1/orders', [
            'customer_name' => 'Pembeli Baru',
            'items' => [
                ['product_id' => $p1->id, 'quantity' => 2],
                ['product_id' => $p2->id, 'quantity' => 1],
            ],
        ])->assertCreated();

        Carbon::setTestNow();

        $listResponse = $this->getJson('/api/v1/orders');

        $listResponse->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.id', $secondOrderResponse->json('data.id'))
            ->assertJsonPath('data.0.customer_name', 'Pembeli Baru')
            ->assertJsonPath('data.0.items_count', 2)
            ->assertJsonPath('data.0.total_quantity', 3)
            ->assertJsonPath('data.0.total_amount', 400000)
            ->assertJsonPath('data.1.id', $firstOrderResponse->json('data.id'))
            ->assertJsonPath('data.1.items_count', 1)
            ->assertJsonMissingPath('data.0.items');
    }

    public function test_order_detail_preserves_item_snapshots_after_product_price_change_and_soft_delete(): void
    {
        $product = Product::factory()->create([
            'name' => 'Tumbler Matte Black',
            'price' => 229000,
            'stock' => 10,
            'image_url' => 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80',
        ]);

        $checkoutResponse = $this->postJson('/api/v1/orders', [
            'customer_name' => 'Andi Wijaya',
            'customer_email' => 'andi@example.com',
            'notes' => 'Kirim cepat.',
            'items' => [
                ['product_id' => $product->id, 'quantity' => 2],
            ],
        ])->assertCreated();

        $orderId = $checkoutResponse->json('data.id');

        // Admin edits product name, price, and image_url
        $this->putJson("/api/v1/products/{$product->id}", [
            'name' => 'Tumbler Edisi Baru',
            'description' => $product->description,
            'price' => 350000,
            'stock' => 20,
            'category' => $product->category,
            'image_url' => 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
        ])->assertOk();

        // Admin soft-deletes the product
        $this->deleteJson("/api/v1/products/{$product->id}")->assertOk();
        $this->assertSoftDeleted('products', ['id' => $product->id]);

        // Historical order detail MUST still return original snapshot values
        $this->getJson("/api/v1/orders/{$orderId}")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $orderId)
            ->assertJsonPath('data.customer_name', 'Andi Wijaya')
            ->assertJsonPath('data.total_quantity', 2)
            ->assertJsonPath('data.items_count', 1)
            ->assertJsonPath('data.total_amount', 458000)
            ->assertJsonPath('data.items.0.product_id', $product->id)
            ->assertJsonPath('data.items.0.product_name', 'Tumbler Matte Black')
            ->assertJsonPath('data.items.0.product_image_url', 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80')
            ->assertJsonPath('data.items.0.unit_price', 229000)
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonPath('data.items.0.subtotal', 458000);

        // Verify Eloquent relationship OrderItem->product resolves even after soft-delete
        $order = Order::query()->with('items.product')->findOrFail($orderId);
        $this->assertNotNull($order->items->first()?->product);
        $this->assertTrue($order->items->first()?->product?->trashed());

        // Non-existent order returns 404
        $this->getJson('/api/v1/orders/999999')
            ->assertNotFound()
            ->assertJsonPath('success', false);
    }

    public function test_database_seeder_populates_10_products_across_4_categories_and_2_orders(): void
    {
        $this->seed();

        $this->getJson('/api/v1/products')
            ->assertOk()
            ->assertJsonPath('meta.total', 10);

        $this->getJson('/api/v1/categories')
            ->assertOk()
            ->assertJsonCount(4, 'data');

        $this->assertSame(1, Product::query()->where('stock', 0)->count());
        $this->assertSame(1, Product::query()->where('stock', 2)->count());

        $ordersResponse = $this->getJson('/api/v1/orders')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        $latestOrderId = $ordersResponse->json('data.0.id');
        $this->getJson("/api/v1/orders/{$latestOrderId}")
            ->assertOk()
            ->assertJsonPath('data.items_count', 3)
            ->assertJsonCount(3, 'data.items');
    }
}
