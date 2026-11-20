<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

final class CategoryController extends Controller
{
    /**
     * List distinct product categories from active (non-deleted) products.
     */
    public function __invoke(): JsonResponse
    {
        $categories = Product::query()
            ->select('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->values()
            ->all();

        return ApiResponse::success($categories, 'Daftar kategori berhasil diambil.');
    }
}
