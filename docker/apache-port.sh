#!/bin/bash
# Most hosting platforms (Koyeb, Render, Railway) inject a $PORT
# environment variable and expect the app to listen on it.
# This rewrites Apache's config to use that port instead of the
# hardcoded 80, then starts Apache normally.

set -e

PORT="${PORT:-80}"

sed -i "s/80/${PORT}/g" /etc/apache2/ports.conf
sed -i "s/:80/:${PORT}/g" /etc/apache2/sites-enabled/000-default.conf

exec apache2-foreground
