# Managing Production Environment Variables

There are two ways to handle your production `.env` file with GitHub Actions:

## Option 1: Manual SCP (Current Method)

**Current approach:** You manually copy `.env` to the server via SCP.

**Pros:**
- Simple and straightforward
- .env file never in GitHub
- Easy to update independently

**Cons:**
- Manual step required
- Need to remember to update server when .env changes

## Option 2: Store in GitHub Secrets (Automated)

**Better approach:** Store environment variables as GitHub Secrets and create `.env` dynamically.

### Step 1: Add Environment Variables as GitHub Secrets

Go to **Settings** → **Secrets and variables** → **Actions** and add each production environment variable:

```
PROD_PORT_EZSTACK=8080
PROD_PORT_EZAUTH=8081
PROD_REDIS_URL=redis://redis:6379
PROD_FASTIFY_PUBLIC_APIKEY_PEPPER=your_secure_pepper_here
PROD_EMAIL_FROM=no-reply@ezstack.app
PROD_EMAIL_DRY_RUN=false
PROD_OTP_DRY_RUN=false
PROD_AWS_REGION=us-east-1
PROD_AWS_ACCESS_KEY_ID=your_aws_key
PROD_AWS_SECRET_ACCESS_KEY=your_aws_secret
PROD_CORS_ORIGIN=https://ezstack.app
# Add all your other production variables...
```

**Note:** Prefix with `PROD_` to distinguish from Firebase build secrets.

### Step 2: Modify Workflow to Create .env File

Add this step to your workflow BEFORE copying files to the server:

```yaml
- name: Create production .env file
  run: |
    cat > .env << EOF
    PORT_EZSTACK=${{ secrets.PROD_PORT_EZSTACK }}
    PORT_EZAUTH=${{ secrets.PROD_PORT_EZAUTH }}
    REDIS_URL=${{ secrets.PROD_REDIS_URL }}
    FASTIFY_PUBLIC_APIKEY_PEPPER=${{ secrets.PROD_FASTIFY_PUBLIC_APIKEY_PEPPER }}
    EMAIL_FROM=${{ secrets.PROD_EMAIL_FROM }}
    EMAIL_DRY_RUN=${{ secrets.PROD_EMAIL_DRY_RUN }}
    OTP_DRY_RUN=${{ secrets.PROD_OTP_DRY_RUN }}
    AWS_REGION=${{ secrets.PROD_AWS_REGION }}
    AWS_ACCESS_KEY_ID=${{ secrets.PROD_AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY=${{ secrets.PROD_AWS_SECRET_ACCESS_KEY }}
    CORS_ORIGIN=${{ secrets.PROD_CORS_ORIGIN }}
    NODE_ENV=production
    # Add all your other variables...
    EOF
```

Then this `.env` file will be automatically copied to your server during the "Copy files to server" step.

### Step 3: Update "Copy files to server" step

The existing step already copies `.env`:

```yaml
- name: Copy files to server
  run: |
    # Copy docker-compose file
    scp docker-compose.prod.deploy.yaml ${{ env.DO_USER }}@${{ env.DO_HOST }}:/srv/ezstack/docker-compose.prod.yaml
    
    # Copy .env file (now dynamically created from secrets)
    scp .env ${{ env.DO_USER }}@${{ env.DO_HOST }}:/srv/ezstack/.env
    
    # Copy secrets directory
    scp -r ./secrets ${{ env.DO_USER }}@${{ env.DO_HOST }}:/srv/ezstack/
    
    # Copy scripts directory
    scp -r ./scripts ${{ env.DO_USER }}@${{ env.DO_HOST }}:/srv/ezstack/
```

## Option 3: Store Entire .env as a Single Secret

**Alternative:** Store the entire `.env` file content as one secret.

### Step 1: Add Secret

1. Copy your entire production `.env` file content
2. Go to **Settings** → **Secrets** → **New repository secret**
3. Name: `PRODUCTION_ENV_FILE`
4. Value: Paste the entire `.env` content

### Step 2: Add to Workflow

Add this step BEFORE copying files:

```yaml
- name: Create production .env file
  run: |
    echo "${{ secrets.PRODUCTION_ENV_FILE }}" > .env
```

## Security Comparison

| Method | Security | Convenience | Best For |
|--------|----------|-------------|----------|
| Manual SCP | Good (never in GitHub) | Low (manual) | Small teams |
| Individual Secrets | Excellent (granular control) | Medium (setup) | Production use |
| Single Secret | Good (encrypted) | High (easy) | Quick setup |

## Recommendation

**For production:** Use **Option 2** (Individual Secrets)

**Why?**
- Each variable is independently managed
- Easy to update individual values
- Clear audit trail
- Team members can see what variables exist (names, not values)
- Follows principle of least privilege

**For quick testing:** Use **Option 3** (Single Secret)

## Important Security Notes

1. **GitHub Secrets are encrypted at rest** - They use strong encryption
2. **Secrets are redacted in logs** - They won't appear in workflow output
3. **Only repo admins can view/edit** - Team members can't see values
4. **Use different secrets for different environments** - Never share prod/staging secrets

## Current Status

Your workflow currently uses **Option 1** (Manual SCP). The `.env` file must exist on the server before deployment.

To switch to automated `.env` management, follow the steps in Option 2 or Option 3 above.

## Migration Path

If you want to switch from manual to automated:

1. Add all your environment variables as GitHub Secrets
2. Add the "Create production .env file" step to workflow
3. Test by triggering a manual workflow run
4. Once confirmed working, delete the old `.env` from the server (optional)
5. Future deployments will automatically update `.env`

## Example: Adding AWS Credentials

Instead of having AWS credentials in your local `.env`:

```bash
# Old way: in local .env file (risky if committed)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Store them as GitHub Secrets:
- `PROD_AWS_ACCESS_KEY_ID` = `AKIAIOSFODNN7EXAMPLE`
- `PROD_AWS_SECRET_ACCESS_KEY` = `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

Then reference in workflow:
```yaml
AWS_ACCESS_KEY_ID=${{ secrets.PROD_AWS_ACCESS_KEY_ID }}
AWS_SECRET_ACCESS_KEY=${{ secrets.PROD_AWS_SECRET_ACCESS_KEY }}
```

Much safer!

