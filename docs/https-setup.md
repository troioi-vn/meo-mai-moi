# HTTPS Setup Guide

This guide covers HTTPS configuration for both local development and production deployments.

## Local Development (Self-Signed Certificates)

For local HTTPS development (useful for testing features requiring secure context like Service Workers, Web Crypto API, etc.):

### Quick Setup

```bash
# 1. Enable HTTPS in backend/.env.docker
APP_ENV=development
ENABLE_HTTPS=true

# 2. Generate self-signed certificates (one-time setup)
./utils/generate-dev-certs.sh

# 3. Deploy (single entry point)
./utils/deploy.sh

# 4. Access via HTTPS
# https://localhost
# https://localhost/admin
# https://localhost/docs
```

### What Happens

- Single docker-compose flow: HTTPS is controlled by `ENABLE_HTTPS` in `backend/.env.docker`
- When `ENABLE_HTTPS=true` and `APP_ENV=development`, the deploy script enables a Compose profile that runs a small HTTPS proxy (nginx) on port 443 which forwards to the backend
- Nginx serves both HTTP (port 80) and HTTPS (port 443) when certificates are present
- Self-signed certificates trigger browser security warnings (expected behavior)
- Click "Advanced" → "Proceed to localhost (unsafe)" to continue

### Certificate Details

- **Location**: `backend/certs/` (gitignored)
- **Validity**: 365 days
- **Domains**: `localhost`, `*.localhost`, `127.0.0.1`
- **Regenerate**: Script will NOT overwrite existing certs. Delete files in `backend/certs/` or run `./utils/generate-dev-certs.sh --force` to regenerate

### Trust Certificate System-Wide (Optional)

To avoid browser warnings on every visit:

**Linux (Debian/Ubuntu)**:

```bash
sudo cp backend/certs/localhost.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

**macOS**:

```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain backend/certs/localhost.crt
```

**Windows**:

```powershell
certutil -addstore -f "ROOT" backend\certs\localhost.crt
```

### Reverting to HTTP Only

```bash
# Stop containers
docker compose down

# Start without dev override (HTTP only)
docker compose up -d --build

# Access via HTTP
# http://localhost:8000
```

## Production Deployment

**⚠️ CRITICAL: Never use self-signed certificates in production**

### Architecture

Production HTTPS is handled by a **reverse proxy** in front of the application container:

```
Internet → Reverse Proxy (HTTPS:443) → Container (HTTP:80)
          ↓
       SSL Termination
       Valid Certificate
```

### Recommended Setup

#### Option 1: Caddy (Automatic HTTPS)

**Easiest option** - Caddy automatically obtains and renews Let's Encrypt certificates.

Create `Caddyfile`:

```txt
example.com {
    reverse_proxy localhost:8000

    # Optional: rate limiting, compression, etc.
    encode gzip
}
```

Start Caddy:

```bash
caddy run
```

Caddy automatically:

- Obtains Let's Encrypt certificates
- Handles HTTPS on port 443
- Redirects HTTP → HTTPS
- Renews certificates before expiry

#### Option 2: Nginx + Certbot

**Traditional option** with manual certificate management.

1. Install Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
```

2. Create Nginx config `/etc/nginx/sites-available/meo-mai-moi`:

```nginx
server {
    listen 80;
    server_name example.com;

    # Certbot validation endpoint
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name example.com;

    # SSL certificates (managed by certbot)
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Proxy to application container
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

3. Obtain certificate:

```bash
sudo certbot --nginx -d example.com
```

4. Enable auto-renewal:

```bash
sudo systemctl enable certbot.timer
```

#### Option 3: Cloudflare (Proxy Mode)

**Simplest for Cloudflare users** - SSL handled entirely by Cloudflare.

1. Add your domain to Cloudflare
2. Enable "Full (strict)" SSL mode in Cloudflare dashboard
3. Point DNS A/AAAA records to your server
4. Cloudflare provides:
   - Free SSL certificates (visitor → Cloudflare)
   - DDoS protection
   - CDN caching
   - Origin certificate (Cloudflare → your server)

### Laravel Configuration

Update `backend/.env` for production:

```dotenv
APP_URL=https://example.com
FRONTEND_URL=https://example.com

# Trust proxy (when behind reverse proxy)
TRUSTED_PROXIES=*
```

### Verification

After setup, verify:

1. **HTTPS works**: `curl https://example.com`
2. **HTTP redirects**: `curl -I http://example.com` should return `301` or `302`
3. **SSL grade**: Check at https://www.ssllabs.com/ssltest/
4. **Headers**: Verify `X-Forwarded-*` headers are passed correctly

## Troubleshooting

### Browser Shows "Not Secure" in Dev

**Expected** when using self-signed certificates. Click "Advanced" → "Proceed" or trust certificate system-wide.

### "Connection Refused" on HTTPS

Check:

- Docker container is running: `docker compose ps`
- Container listens on 443; if `ENABLE_HTTPS=true` and certificates exist, HTTPS will be enabled
- Certificates exist: `ls -la backend/certs/`

### "NET::ERR_CERT_AUTHORITY_INVALID"

Normal for self-signed certs. Trust certificate or click through warning.

### Production HTTPS Not Working

Check:

1. Reverse proxy is running: `systemctl status nginx` or `systemctl status caddy`
2. Firewall allows 443: `sudo ufw allow 443/tcp`
3. DNS points to server: `dig example.com`
4. Certificate is valid: `sudo certbot certificates`

### Mixed Content Warnings

If your app loads HTTP resources on HTTPS page:

- Fix hardcoded `http://` URLs to use `https://` or protocol-relative `//`
- Check browser console for mixed content errors
- Use relative URLs (`/api/...`) instead of absolute URLs

## Security Best Practices

### Development

- ✅ Self-signed certs are fine for local dev
- ✅ Use a single docker-compose flow; toggle HTTPS with `ENABLE_HTTPS`
- ❌ Never commit certificates to git (already in `.gitignore`)
- ❌ Never use dev certs on public servers

### Production

- ✅ Use valid certificates (Let's Encrypt, commercial CA)
- ✅ Enable HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- ✅ Regular certificate renewal (automated with Caddy/Certbot)
- ✅ Strong SSL/TLS configuration (TLS 1.2+, modern ciphers)
- ❌ Never expose port 80 without HTTPS redirect
- ❌ Never use self-signed certs for public-facing sites

## References

- [Let's Encrypt](https://letsencrypt.org/) - Free SSL certificates
- [Caddy](https://caddyserver.com/) - Automatic HTTPS web server
- [Certbot](https://certbot.eff.org/) - Let's Encrypt client for Nginx/Apache
- [SSL Labs](https://www.ssllabs.com/ssltest/) - Test SSL configuration
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/) - Generate secure configs
