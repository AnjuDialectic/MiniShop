<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ProductController extends Controller
{
    /**
     * List active products with optional case-insensitive search, category filter, sorting, and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::query();

        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            if (DB::getDriverName() === 'pgsql') {
                $query->where('name', 'ilike', '%'.$search.'%');
            } else {
                $query->whereRaw('LOWER(name) LIKE ?', ['%'.mb_strtolower($search).'%']);
            }
        }

        $category = trim((string) $request->query('category', ''));
        if ($category !== '') {
            $query->where('category', $category);
        }

        match ((string) $request->query('sort', 'newest')) {
            'price_asc' => $query->orderBy('price', 'asc')->orderByDesc('id'),
            'price_desc' => $query->orderBy('price', 'desc')->orderByDesc('id'),
            'name_asc' => $query->orderBy('name', 'asc')->orderByDesc('id'),
            default => $query->orderByDesc('created_at')->orderByDesc('id'),
        };

        $requestedPerPage = $request->integer('per_page');
        $perPage = $requestedPerPage > 0 ? min(100, $requestedPerPage) : 20;
        $products = $query->paginate($perPage);

        return ApiResponse::success(
            ProductResource::collection($products->getCollection()),
            'Daftar produk berhasil diambil.',
            200,
            [
                'total' => $products->total(),
                'per_page' => $products->perPage(),
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
            ],
        );
    }

    /**
     * Show a single active product.
     */
    public function show(Product $product): JsonResponse
    {
        return ApiResponse::success(
            new ProductResource($product),
            'Produk berhasil diambil.',
        );
    }

    /**
     * Create a new product (Admin).
     */
    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = Product::query()->create($request->validated());

        return ApiResponse::success(
            new ProductResource($product),
            'Produk berhasil ditambahkan.',
            201,
        );
    }

    /**
     * Update an existing active product (Admin).
     */
    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $product->update($request->validated());

        return ApiResponse::success(
            new ProductResource($product->refresh()),
            'Produk berhasil diperbarui.',
        );
    }

    /**
     * Soft-delete a product so historical order snapshots remain intact (Admin).
     */
    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return ApiResponse::success(null, 'Produk berhasil dihapus.');
    }
}
