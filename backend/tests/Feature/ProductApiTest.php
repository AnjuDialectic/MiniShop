<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_and_unknown_endpoint_return_consistent_json(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'ok')
            ->assertJsonPath('data.database', 'connected');

        $this->getJson('/api/v1/unknown-endpoint')
            ->assertNotFound()
            ->assertJson([
                'success' => false,
                'message' => 'Resource tidak ditemukan.',
            ]);
    }

    public function test_can_list_active_products_with_pagination_meta(): void
    {
        Product::factory()->count(2)->create(['stock' => 5]);
        Product::factory()->outOfStock()->create();
        $deleted = Product::factory()->create(['name' => 'Deleted Product']);
        $deleted->delete();

        $response = $this->getJson('/api/v1/products?per_page=2');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'description',
                        'price',
                        'stock',
                        'category',
                        'image_url',
                        'is_in_stock',
                        'created_at',
                        'updated_at',
                    ],
                ],
                'meta' => ['total', 'per_page', 'current_page', 'last_page'],
            ]);
    }

    public function test_can_search_case_insensitively_filter_category_and_sort_products(): void
    {
        Product::factory()->create([
            'name' => 'Mechanical Keyboard Keychron K2',
            'category' => 'Elektronik',
            'price' => 1299000,
            'stock' => 8,
        ]);
        Product::factory()->create([
            'name' => 'Mouse Ergonomis Logitech',
            'category' => 'Elektronik',
            'price' => 1450000,
            'stock' => 5,
        ]);
        Product::factory()->create([
            'name' => 'Keychain Kulit Minimalis',
            'category' => 'Aksesoris',
            'price' => 95000,
            'stock' => 10,
        ]);

        // Case-insensitive search across categories
        $this->getJson('/api/v1/products?search=KEY')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        // Exact category filter
        $this->getJson('/api/v1/products?category=Elektronik&sort=price_desc')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Mouse Ergonomis Logitech')
            ->assertJsonPath('data.1.name', 'Mechanical Keyboard Keychron K2');

        // Combined search + category filter
        $this->getJson('/api/v1/products?search=key&category=Elektronik')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Mechanical Keyboard Keychron K2');

        // Sort price_asc
        $this->getJson('/api/v1/products?sort=price_asc')
            ->assertOk()
            ->assertJsonPath('data.0.price', 95000);

        // Sort name_asc
        $this->getJson('/api/v1/products?sort=name_asc')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Keychain Kulit Minimalis');
    }

    public function test_categories_endpoint_returns_distinct_sorted_active_categories(): void
    {
        Product::factory()->create(['category' => 'Rumah Tangga']);
        Product::factory()->create(['category' => 'Elektronik']);
        Product::factory()->create(['category' => 'Elektronik']);
        $deleted = Product::factory()->create(['category' => 'Obsolete']);
        $deleted->delete();

        $this->getJson('/api/v1/categories')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data', ['Elektronik', 'Rumah Tangga']);
    }

    public function test_can_show_active_product_and_returns_404_when_missing_or_invalid(): void
    {
        $product = Product::factory()->outOfStock()->create([
            'name' => 'Earbuds ANC',
            'price' => 1199000,
        ]);

        $this->getJson("/api/v1/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $product->id)
            ->assertJsonPath('data.name', 'Earbuds ANC')
            ->assertJsonPath('data.price', 1199000)
            ->assertJsonPath('data.stock', 0)
            ->assertJsonPath('data.is_in_stock', false);

        $this->getJson('/api/v1/products/999999')
            ->assertNotFound()
            ->assertJsonPath('success', false);

        $this->getJson('/api/v1/products/not-a-number')
            ->assertNotFound()
            ->assertJsonPath('success', false);
    }

    public function test_admin_can_create_update_and_soft_delete_product(): void
    {
        $createPayload = [
            'name' => 'Deskmat Felt 80x30cm',
            'description' => 'Alas meja wool felt lembut dengan lapisan anti-slip.',
            'price' => 159000,
            'stock' => 15,
            'category' => 'Aksesoris',
            'image_url' => 'https://images.unsplash.com/photo-1616400619175-5beda3a17896?auto=format&fit=crop&w=800&q=80',
        ];

        $createResponse = $this->postJson('/api/v1/products', $createPayload);
        $createResponse->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Deskmat Felt 80x30cm')
            ->assertJsonPath('data.price', 159000)
            ->assertJsonPath('data.stock', 15)
            ->assertJsonPath('data.is_in_stock', true);

        $productId = $createResponse->json('data.id');
        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'name' => 'Deskmat Felt 80x30cm',
            'price' => 159000,
            'stock' => 15,
        ]);

        // Update product (including setting stock to 0)
        $updatePayload = [
            'name' => 'Deskmat Felt XL 90x40cm',
            'description' => 'Versi ukuran lebih lebar untuk setup dual monitor.',
            'price' => 199000,
            'stock' => 0,
            'category' => 'Aksesoris',
            'image_url' => 'https://images.unsplash.com/photo-1616400619175-5beda3a17896?auto=format&fit=crop&w=800&q=80',
        ];

        $this->putJson("/api/v1/products/{$productId}", $updatePayload)
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Deskmat Felt XL 90x40cm')
            ->assertJsonPath('data.price', 199000)
            ->assertJsonPath('data.stock', 0)
            ->assertJsonPath('data.is_in_stock', false);

        // Soft delete product
        $this->deleteJson("/api/v1/products/{$productId}")
            ->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Produk berhasil dihapus.',
                'data' => null,
            ]);

        $this->assertSoftDeleted('products', ['id' => $productId]);

        // Soft-deleted product is hidden from public catalog & show endpoint
        $this->getJson("/api/v1/products/{$productId}")->assertNotFound();
        $this->getJson('/api/v1/products')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_product_validation_rejects_invalid_inputs_with_422(): void
    {
        // Missing required fields
        $this->postJson('/api/v1/products', [])
            ->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors(['name', 'description', 'price', 'stock', 'category', 'image_url']);

        // price <= 0, stock < 0, unsafe javascript: image_url
        $this->postJson('/api/v1/products', [
            'name' => 'Invalid Product',
            'description' => 'Testing invalid values',
            'price' => 0,
            'stock' => -1,
            'category' => 'Elektronik',
            'image_url' => 'javascript:alert(1)',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors(['price', 'stock', 'image_url']);

        // Update also validates strictly (non-http scheme & negative price)
        $product = Product::factory()->create();

        $this->putJson("/api/v1/products/{$product->id}", [
            'name' => 'Updated',
            'description' => 'Desc',
            'price' => -5000,
            'stock' => -2,
            'category' => 'Elektronik',
            'image_url' => 'data:image/png;base64,abc',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors(['price', 'stock', 'image_url']);
    }
}
