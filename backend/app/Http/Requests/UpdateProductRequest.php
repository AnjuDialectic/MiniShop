<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'description' => ['required', 'string', 'max:1000'],
            'price' => ['required', 'integer', 'min:1'],
            'stock' => ['required', 'integer', 'min:0'],
            'category' => ['required', 'string', 'max:60'],
            'image_url' => ['required', 'string', 'url:http,https', 'max:2048'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Nama produk wajib diisi.',
            'name.max' => 'Nama produk maksimal 150 karakter.',
            'description.required' => 'Deskripsi produk wajib diisi.',
            'description.max' => 'Deskripsi produk maksimal 1000 karakter.',
            'price.required' => 'Harga produk wajib diisi.',
            'price.integer' => 'Harga produk harus berupa angka bulat.',
            'price.min' => 'Harga harus lebih dari 0.',
            'stock.required' => 'Stok produk wajib diisi.',
            'stock.integer' => 'Stok produk harus berupa angka bulat.',
            'stock.min' => 'Stok tidak boleh kurang dari 0.',
            'category.required' => 'Kategori produk wajib diisi.',
            'category.max' => 'Kategori produk maksimal 60 karakter.',
            'image_url.required' => 'URL gambar wajib diisi.',
            'image_url.url' => 'URL gambar harus menggunakan format http:// atau https:// yang valid.',
            'image_url.max' => 'URL gambar maksimal 2048 karakter.',
        ];
    }
}
