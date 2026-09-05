# Housing Patel — PHP backend container
# Works identically on Koyeb, Render, Railway, Fly.io, or any Docker host.

FROM php:8.3-apache

# Install PostgreSQL client headers + required PHP extensions.
# pdo_pgsql: talks to the Neon (PostgreSQL) database.
# mbstring: needed for accurate string-length checks (bcrypt password limits, name validation).
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql mbstring \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Apache: allow .htaccess overrides and enable clean URL rewriting if needed later.
RUN a2enmod rewrite

# Copy the application code into Apache's web root.
COPY . /var/www/html/

# Apache listens on port 80 by default; most hosts (Koyeb, Render, Railway)
# auto-detect this or read it from the PORT env var — see apache-port.sh below.
COPY docker/apache-port.sh /usr/local/bin/apache-port.sh
RUN chmod +x /usr/local/bin/apache-port.sh

EXPOSE 80

CMD ["/usr/local/bin/apache-port.sh"]
