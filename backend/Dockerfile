# syntax=docker/dockerfile:1

FROM php:8.4-cli-alpine

WORKDIR /var/www/html

# System libraries and PHP extensions required by Laravel 13 (PostgreSQL + SQLite)
RUN apk add --no-cache \
        bash \
        curl \
        icu-dev \
        libzip-dev \
        oniguruma-dev \
        postgresql-dev \
        sqlite-dev \
        unzip \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        intl \
        mbstring \
        opcache \
        pdo \
        pdo_pgsql \
        pdo_sqlite \
        zip

# Install Composer from official image
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Install production PHP dependencies first for better layer caching
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --prefer-dist \
    --no-interaction \
    --no-progress \
    --no-scripts \
    --optimize-autoloader

# Copy application source
COPY . .

RUN mkdir -p \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && composer dump-autoload --optimize --no-dev --no-interaction \
    && chmod -R ug+rwx storage bootstrap/cache

ENV APP_ENV=production \
    APP_DEBUG=false \
    PORT=8000

EXPOSE 8000

CMD ["sh", "-c", "php artisan config:cache && php artisan migrate --force && if [ \"${RUN_SEEDER:-false}\" = \"true\" ]; then php artisan db:seed --force; fi && exec php artisan serve --host=0.0.0.0 --port=${PORT:-8000}"]
