# Cloudflare Tunnel Setup Guide

## Prerequisites
- Cloudflare account with domain (ezstack.app)
- Server with Docker and cloudflared installed
- Domain DNS managed by Cloudflare

## 1. Install Cloudflared

### Windows
```powershell
# Download and install from: https://github.com/cloudflare/cloudflared/releases
# Or use winget:
winget install --id Cloudflare.cloudflared
```

### Linux
```bash
# Download latest release
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

## 2. Create Tunnel

```bash
# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create ezstack-dev

# Note the tunnel ID from output (e.g., f992b882-292a-4d07-9bc5-3d6b82a975aa)
```

## 3. Configure Tunnel

Create `cloudflared-config.yml`:

```yaml
tunnel: ezstack-dev
credentials-file: /root/.cloudflared/[TUNNEL-ID].json

# Ingress rules - order matters!
ingress:
  # Main site
  - hostname: ezstack.app
    service: http://localhost:3000
    originRequest:
      httpHostHeader: ezstack.app
  
  # API service
  - hostname: api.ezstack.app
    service: http://localhost:8080
    originRequest:
      httpHostHeader: api.ezstack.app
  
  # Auth service  
  - hostname: auth.ezstack.app
    service: http://localhost:8081
    originRequest:
      httpHostHeader: auth.ezstack.app
  
  # Catch-all (required)
  - service: http_status:404
```

**Replace `[TUNNEL-ID]` with your actual tunnel ID.**

## 4. Configure DNS Records

### Option A: Using Cloudflared (Recommended)
```bash
# Delete existing DNS records first in Cloudflare dashboard
# Then create CNAME records pointing to tunnel
cloudflared tunnel route dns ezstack-dev ezstack.app
cloudflared tunnel route dns ezstack-dev api.ezstack.app
cloudflared tunnel route dns ezstack-dev auth.ezstack.app
```

### Option B: Manual DNS Configuration
In Cloudflare Dashboard → DNS → Records:
- Delete any existing A/AAAA records for ezstack.app, api.ezstack.app, auth.ezstack.app
- Create CNAME records:
  - `ezstack.app` → `[TUNNEL-ID].cfargotunnel.com`
  - `api.ezstack.app` → `[TUNNEL-ID].cfargotunnel.com`
  - `auth.ezstack.app` → `[TUNNEL-ID].cfargotunnel.com`

## 5. Start Services

```bash
# Start Docker services
docker-compose up -d

# Start tunnel
cloudflared tunnel --config cloudflared-config.yml run ezstack-dev
```

## 6. Verify Setup

```bash
# Test local services
curl -I http://localhost:3000
curl -I http://localhost:8080
curl -I http://localhost:8081

# Test public endpoints
curl -I https://ezstack.app
curl -I https://api.ezstack.app
curl -I https://auth.ezstack.app
```

## 7. Run as Service (Linux)

```bash
# Install as systemd service
sudo cloudflared service install

# Edit service file
sudo nano /etc/systemd/system/cloudflared.service

# Update ExecStart to:
ExecStart=/usr/local/bin/cloudflared tunnel --config /path/to/cloudflared-config.yml run ezstack-dev

# Enable and start
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

## Troubleshooting

### Check tunnel status
```bash
cloudflared tunnel list
cloudflared tunnel info ezstack-dev
```

### Check DNS resolution
```bash
nslookup ezstack.app
```

### View tunnel logs
```bash
# Run in foreground to see logs
cloudflared tunnel --config cloudflared-config.yml run ezstack-dev
```

## Common Issues

1. **"DNS record already exists"** - Delete existing A/AAAA records in Cloudflare dashboard first
2. **Timeout errors** - Ensure tunnel is running and DNS records point to tunnel
3. **Service not accessible** - Check Docker services are running on correct ports
4. **Certificate warnings** - Normal on Windows, tunnel uses Cloudflare's certificates

## Security Notes

- Tunnel credentials are stored in `~/.cloudflared/[TUNNEL-ID].json`
- Keep credentials file secure and backed up
- Consider using Cloudflare Access for additional security layers
