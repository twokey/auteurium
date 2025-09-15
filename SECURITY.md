# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| develop | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** create a public issue
2. Email security reports to the maintainers
3. Include detailed information about the vulnerability
4. Allow reasonable time for the issue to be addressed

## Security Features

### Authentication & Authorization
- AWS Cognito integration with JWT validation
- User data isolation (users can only access their own data)
- Admin users cannot access user snippet content
- Secure password requirements (8+ characters)

### Data Protection
- All user data is scoped to individual users
- Project deletion cascades to all contained snippets
- Input validation using Zod schemas
- SQL injection protection via DynamoDB parameterized queries

### Infrastructure Security
- AWS CDK for Infrastructure as Code
- IAM roles with least privilege access
- VPC isolation for resources
- Encrypted data at rest and in transit

### Development Security
- Dependency vulnerability scanning with Dependabot
- Secret detection in CI/CD pipeline
- ESLint security rules enforcement
- TypeScript for type safety

## Security Best Practices

### Environment Variables
- Never commit `.env` files with real credentials
- Use `.env.example` templates for documentation
- Rotate credentials regularly
- Use AWS Secrets Manager for production secrets

### Code Security
- No hardcoded secrets or credentials
- Proper error handling without information disclosure
- Input validation on all user inputs
- HTTPS everywhere in production

### Deployment Security
- Use GitHub Secrets for CI/CD credentials
- Enable branch protection rules
- Require PR reviews before merging
- Run security scans before deployment

## Security Monitoring

### Automated Scans
- Weekly dependency vulnerability scans
- Secret detection on every commit
- Security linting in CI/CD pipeline
- CloudWatch monitoring for suspicious activity

### Manual Reviews
- Security code reviews for sensitive changes
- Regular access reviews for AWS resources
- Periodic security assessments
- Incident response procedures

## Compliance

This project follows security best practices including:
- OWASP Top 10 guidelines
- AWS Well-Architected Framework security pillar
- Industry-standard authentication flows
- Secure development lifecycle practices