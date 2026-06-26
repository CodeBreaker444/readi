# D-Flight Certificate Setup Guide

## Local Development

1. **Certificate Location**
   - Place your D-Flight SSL certificates in the `certificates/` folder at the project root
   - Required files:
     - `certificates/20260622_1446-readi-NTF-EXPOUSS-keycloak.crt` (Certificate file)
     - `certificates/20260622_1446-readi-NTF-EXPOUSS-keycloak-nopass.key` (Private key file)

2. **Configuration**
   - The certificate is automatically loaded from the default paths
   - No user configuration needed in the D-Flight Settings page
   - The system will use:
     - `certificates/20260622_1446-readi-NTF-EXPOUSS-keycloak.crt`
     - `certificates/20260622_1446-readi-NTF-EXPOUSS-keycloak-nopass.key`

3. **Git Ignore**
   - The `certificates/` folder is already added to `.gitignore`
   - Certificates will NOT be committed to your repository

## Vercel Deployment

### Using Environment Variables (Recommended for Production)

The D-Flight service supports multiple environment variables for certificate configuration:

1. **Option A: Certificate Content (Recommended)**
   - Add these environment variables in Vercel project settings:
     - `DFLIGHT_CERT_CONTENT`: Full content of the .crt file
     - `DFLIGHT_KEY_CONTENT`: Full content of the .key file
     - `DFLIGHT_CERT_PASSPHRASE`: Passphrase for the key (if required)

   **How to get the content:**
   ```bash
   # Read certificate file
   cat certificates/20260622_1446-readi-NTF-EXPOUSS-keycloak.crt
   
   # Read key file
   cat certificates/20260622_1446-readi-NTF-EXPOUSS-keycloak-nopass.key
   ```

2. **Option B: File Paths (Alternative)**
   - Add these environment variables in Vercel:
     - `DFLIGHT_CERT_PATH`: Path to .crt file
     - `DFLIGHT_KEY_PATH`: Path to .key file
     - `DFLIGHT_CERT_PASSPHRASE`: Passphrase for the key (if required)

   Note: This requires uploading files to Vercel or using a file storage solution.

## Environment Variable Priority

The system checks environment variables in this order:
1. `DFLIGHT_CERT_CONTENT` + `DFLIGHT_KEY_CONTENT` (Highest priority - for Vercel)
2. `DFLIGHT_CERT_PATH` + `DFLIGHT_KEY_PATH` (For custom file locations)
3. Default local paths (For local development)

## Implementation Notes

The current implementation uses:
- **Dual certificate files**: Uses both .crt and .key files (not just .pem)
- **Passphrase support**: Supports passphrase-protected private keys
- **https.Agent**: Uses Node.js https.Agent with certificate for SSL authentication
- **Environment variables**: Full support for Vercel deployment via environment variables
- **Fallback**: If certificate is not found, it logs a warning and continues without it

## Security Considerations

- Never commit certificates to version control
- Use environment variables for production deployments
- Rotate certificates regularly
- Limit access to certificate files
- Use separate certificates for development and production
- Keep passphrases secure and rotate them regularly

## Troubleshooting

### Certificate Not Found
- Check that the files exist in the certificates folder
- Verify file names match exactly (case-sensitive)
- Check file permissions

### 403 Forbidden Errors
- Ensure both .crt and .key files are present
- Verify the passphrase is correct if the key is password-protected
- Check that the certificate is valid and not expired
- Verify the certificate matches the D-Flight endpoint (pre.d-flight.it)

### SSL Errors
- Ensure the certificate is valid and not expired
- Verify the certificate matches the D-Flight endpoint
- Check if `rejectUnauthorized` needs adjustment (currently set to `false`)

### Vercel Deployment Issues
- Verify environment variables are set correctly
- Check that certificate/key content is complete (include BEGIN/END markers)
- Review Vercel build logs for certificate-related errors
- Ensure passphrase is set correctly if required

## Example Certificate Files

Your certificate files should look like this:

**20260622_1446-readi-NTF-EXPOUSS-keycloak.crt:**
```
-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKL...
-----END CERTIFICATE-----
```

**20260622_1446-readi-NTF-EXPOUSS-keycloak-nopass.key:**
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0...
-----END PRIVATE KEY-----
```
