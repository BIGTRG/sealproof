# SealProof — DNS Records

Point the following records to the TRG application server IP before deployment.

| Type  | Host                   | Value                        | TTL  |
|-------|------------------------|------------------------------|------|
| A     | sealproof.ai           | `<TRG_SERVER_IP>`            | 300  |
| CNAME | www.sealproof.ai       | sealproof.ai                 | 300  |
| A     | notary.sealproof.ai    | `<TRG_SERVER_IP>`            | 300  |
| A     | admin.sealproof.ai     | `<TRG_SERVER_IP>`            | 300  |
| A     | api.sealproof.ai       | `<TRG_SERVER_IP>`            | 300  |

## Email records (for noreply@sealproof.ai via SendGrid)

| Type  | Host                   | Value                        | TTL  |
|-------|------------------------|------------------------------|------|
| TXT   | sealproof.ai           | `v=spf1 include:sendgrid.net ~all` | 3600 |
| CNAME | em1234.sealproof.ai    | `<SendGrid DKIM CNAME 1>`   | 3600 |
| CNAME | s1._domainkey.sealproof.ai | `<SendGrid DKIM CNAME 2>` | 3600 |
| CNAME | s2._domainkey.sealproof.ai | `<SendGrid DKIM CNAME 3>` | 3600 |
| TXT   | _dmarc.sealproof.ai    | `v=DMARC1; p=quarantine; rua=mailto:dmarc@sealproof.ai` | 3600 |

## Notes

- Replace `<TRG_SERVER_IP>` with the production server's public IP
- SendGrid CNAME values are provided during domain authentication setup
- After DNS propagation, run `deploy/scripts/setup-ssl.sh` to generate SSL certs
- Verify with: `dig +short sealproof.ai`, `dig +short notary.sealproof.ai`, etc.
