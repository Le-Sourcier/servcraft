# GitHub Secrets Setup Guide

## Required Secrets

The deployment workflow requires the following secrets to be configured in GitHub:

## 1. SERVER_SSH_KEY

**What it is:** Your SSH private key for accessing the production server.

**How to get it:**

```bash
# On your local machine or server
cat ~/.ssh/id_rsa
# or if you use ed25519:
cat ~/.ssh/id_ed25519
```

**Format:** Copy the ENTIRE content including the header and footer:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
... (many lines)
-----END OPENSSH PRIVATE KEY-----
```

**⚠️ Important:**
- Make sure the corresponding public key is in `~/.ssh/authorized_keys` on your server
- Keep this private key SECRET - never share it or commit it to git

---

## 2. SERVER_HOST

**What it is:** The IP address or hostname of your production server.

**Examples:**
```
139.59.147.82
```
or
```
servcraft.nexuscorporat.com
```

**How to get it:**
- Check your VPS provider dashboard
- Or run `hostname -I` on your server

---

## 3. SERVER_USER

**What it is:** The SSH username for connecting to your server.

**Common values:**
```
root
```
or
```
ubuntu
```
or your custom username

**How to verify:** The user that has access to `/www/wwwroot/` and can run Docker commands.

---

## 4. NEXT_PUBLIC_API_BASE_URL

**What it is:** The base URL of your ServCraft API.

**Examples:**
```
https://api.servcraft.io
```
or
```
https://servcraft.io/api
```

**Note:** This will be exposed to the browser (that's why it starts with `NEXT_PUBLIC_`)

---

## 5. ADMIN_JWT_SECRET

**What it is:** A secret key used to sign JWT tokens for admin authentication.

**How to generate:**

```bash
# Generate a secure random secret
openssl rand -base64 32
```

**Example output:**
```
k8sP9mN2xQ7vR3wT6yU4zL5hJ1gF8eD0cA+bN9mV2x
```

**⚠️ Important:** Keep this secret! Anyone with this key can generate admin tokens.

---

## How to Add Secrets to GitHub

### Step 1: Go to Repository Settings

1. Navigate to your GitHub repository
2. Click on **Settings** (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Add Each Secret

1. Click **New repository secret**
2. Enter the secret name (exactly as shown above)
3. Paste the secret value
4. Click **Add secret**

### Step 3: Repeat for All Secrets

Add all 5 secrets:
- `SERVER_SSH_KEY`
- `SERVER_HOST`
- `SERVER_USER`
- `NEXT_PUBLIC_API_BASE_URL`
- `ADMIN_JWT_SECRET`

### Step 4: Verify Configuration

After adding all secrets, you can verify they're configured correctly:

1. Go to **Actions** tab
2. Click on **🔍 Check Secrets Configuration** workflow
3. Click **Run workflow** dropdown → **Run workflow**
4. Wait for the workflow to complete
5. Check the output - should show ✅ for all secrets

---

## Testing SSH Connection

Before running the deployment, test your SSH connection:

```bash
# From your local machine
ssh -i ~/.ssh/id_rsa root@your-server-ip

# Once connected, verify Docker is available:
docker --version
docker ps
```

If this works, your SSH setup is correct!

---

## Troubleshooting

### "Permission denied (publickey)"

**Problem:** SSH key not authorized on server

**Solution:**
```bash
# On your server, check authorized_keys
cat ~/.ssh/authorized_keys

# Should contain your public key:
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC... your-email@example.com

# If not, add it:
cat ~/.ssh/id_rsa.pub  # on local machine
# Copy the output, then on server:
echo "paste-your-public-key-here" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### "Host key verification failed"

**Problem:** Server fingerprint not in known_hosts

**Solution:** The workflow handles this automatically with `ssh-keyscan`. If you see this error, it's likely a different issue.

### "rsync: command not found"

**Problem:** rsync not installed on server

**Solution:**
```bash
# On Ubuntu/Debian
apt-get update && apt-get install -y rsync

# On CentOS/RHEL
yum install -y rsync
```

### "Permission denied" when accessing /www/wwwroot/

**Problem:** User doesn't have access to deployment directory

**Solution:**
```bash
# On server, create directory with proper permissions
mkdir -p /www/wwwroot/servcraft.nexuscorporat.com
chown -R $USER:$USER /www/wwwroot/servcraft.nexuscorporat.com
```

---

## Security Best Practices

1. ✅ **Never commit secrets to git** - Always use GitHub Secrets
2. ✅ **Use separate keys for CI/CD** - Don't reuse your personal SSH key
3. ✅ **Rotate secrets regularly** - Change JWT secret and SSH keys periodically
4. ✅ **Limit SSH key permissions** - Use a dedicated user with minimal permissions
5. ✅ **Enable 2FA on GitHub** - Protect your repository settings

---

## Next Steps

After configuring all secrets:

1. Push any changes to the `docs` branch
2. GitHub Actions will automatically deploy to your server
3. Monitor the deployment in the **Actions** tab
4. Access your deployed app at `https://servcraft.nexuscorporat.com`

🎉 Done! Your automated deployment is configured!
