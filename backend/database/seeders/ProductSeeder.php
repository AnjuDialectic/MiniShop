<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Seed 10 curated products across 4 categories (including stock=0 and stock=2 edge cases).
     */
    public function run(): void
    {
        $products = [
            [
                'name' => 'Mechanical Keyboard Keychron K2 Wireless',
                'description' => 'Keyboard mekanikal compact 75% dengan koneksi Bluetooth 5.1 dan USB-C, tactile switch nyaman untuk kerja dan coding seharian.',
                'price' => 1299000,
                'stock' => 8,
                'category' => 'Elektronik',
                'image_url' => 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
            ],
            [
                'name' => 'Mouse Ergonomis Logitech MX Master 3S',
                'description' => 'Mouse nirkabel ergonomis dengan sensor 8000 DPI, klik senyap, dan roda scroll MagSpeed elektromagnetik ultra-presisi.',
                'price' => 1450000,
                'stock' => 5,
                'category' => 'Elektronik',
                'image_url' => 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80',
            ],
            [
                'name' => 'Earbuds Wireless ANC Sony WF-C700N',
                'description' => 'True wireless earbuds ringan dengan Active Noise Cancellation adaptif, suara jernih DSEE, dan daya tahan baterai hingga 15 jam.',
                'price' => 1199000,
                'stock' => 0,
                'category' => 'Elektronik',
                'image_url' => 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
            ],
            [
                'name' => 'USB-C Hub 7-in-1 Aluminum 4K HDMI',
                'description' => 'Adapter multiport bodi aluminium kokoh berisi HDMI 4K, 3x USB 3.0, SD/TF card reader, dan USB-C Power Delivery 100W.',
                'price' => 349000,
                'stock' => 15,
                'category' => 'Aksesoris',
                'image_url' => 'https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?auto=format&fit=crop&w=800&q=80',
            ],
            [
                'name' => 'Laptop Sleeve Kulit Vegan 14 Inch',
                'description' => 'Sarung laptop 14 inch berbahan kulit vegan tahan percikan air dengan lapisan dalam microfiber lembut dan penutup magnetik.',
                'price' => 245000,
                'stock' => 2,
                'category' => 'Aksesoris',
                'image_url' => 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
            ],
            [
                'name' => 'Stand Laptop Aluminum Foldable',
                'description' => 'Dudukan laptop lipat berbahan aluminium anodized dengan 6 level sudut ergonomis dan bantalan silikon anti-slip.',
                'price' => 189000,
                'stock' => 20,
                'category' => 'Aksesoris',
                'image_url' => 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=800&q=80',
            ],
            [
                'name' => 'Jaket Overshirt Katun Twill Olive',
                'description' => 'Overshirt potongan relaxed dari katun twill 10oz yang sejuk, dilengkapi dua saku dada fungsional untuk gaya kasual harian.',
                'price' => 385000,
                'stock' => 10,
                'category' => 'Fashion',
                'image_url' => 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=800&q=80',
            ],
            [
                'name' => 'Totebag Kanvas Heavyweight 16oz',
                'description' => 'Tas jinjing kanvas tebal 16oz dengan jahitan bartack kuat, kompartemen botol minum internal, dan saku ritsleting untuk barang kecil.',
                'price' => 165000,
                'stock' => 14,
                'category' => 'Fashion',
                'image_url' => 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
            ],
            [
                'name' => 'Tumbler Vacuum Insulated 600ml Matte Black',
                'description' => 'Botol minum stainless steel 304 dinding ganda yang menjaga minuman dingin hingga 24 jam dan panas hingga 12 jam tanpa embun.',
                'price' => 229000,
                'stock' => 12,
                'category' => 'Rumah Tangga',
                'image_url' => 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80',
            ],
            [
                'name' => 'Lampu Meja LED Minimalis Dimmer',
                'description' => 'Lampu meja belajar berdesain arsitektural dengan 3 mode suhu warna hangat-netral dan kontrol sentuh peredupan halus.',
                'price' => 275000,
                'stock' => 6,
                'category' => 'Rumah Tangga',
                'image_url' => 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
            ],
        ];

        foreach ($products as $item) {
            Product::query()->firstOrCreate(
                ['name' => $item['name']],
                $item,
            );
        }
    }
}
