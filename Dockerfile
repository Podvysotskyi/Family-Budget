FROM php:8.4-fpm-bookworm AS php-base
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev libicu-dev libzip-dev unzip git \
    && docker-php-ext-install pdo_pgsql intl zip bcmath pcntl opcache \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
WORKDIR /var/www/html
FROM php-base AS dependencies
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-interaction --prefer-dist
FROM node:24-bookworm-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY resources resources
COPY vite.config.ts tsconfig.json ./
RUN npm run build
FROM php-base AS runtime
COPY . .
COPY --from=dependencies /var/www/html/vendor vendor
COPY --from=frontend /app/public/build public/build
RUN composer dump-autoload --no-dev --optimize \
    && mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache/data storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache
USER www-data
CMD ["php-fpm"]
FROM nginx:1.28-alpine AS web
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend /app/public/build /var/www/html/public/build
FROM dependencies AS test
COPY . .
RUN cp .env.example .env
RUN composer install --no-interaction --prefer-dist
CMD ["php", "artisan", "test"]
