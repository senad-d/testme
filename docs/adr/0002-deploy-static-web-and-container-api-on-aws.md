# Deploy a static web application and container API on AWS

The first release will use a static React/Vite frontend in a private S3 bucket behind CloudFront, a TypeScript/Fastify API on ECS Fargate behind an Application Load Balancer, Cognito for Parent identity, and RDS PostgreSQL for persistence. CloudFront will route `/api/*` to the backend as one public origin, and Docker Compose will run the same built frontend assets, API container, configuration contract, migrations, and PostgreSQL baseline locally. This deliberately replaces the provisional single Next.js deployment on Vercel/Neon because the owner intends to operate on AWS and requires local-to-cloud parity while retaining separate UI, server, domain, persistence, and content boundaries.

## Considered Options

- A single full-stack Next.js application on Vercel with Neon PostgreSQL was considered and rejected because it does not match the intended AWS operating model.
- A static browser application plus a separately deployed API was selected because it maps directly to CloudFront/S3 and ECS while preserving server-owned authority and learning rules.

## Consequences

The frontend cannot depend on server rendering and must consume a versioned API contract. CloudFront routing, secure opaque application sessions, and CSRF controls must preserve one public origin. Local authentication connects to a dedicated non-production Cognito User Pool because Docker Compose has no production-equivalent local Cognito service. The AWS region and production data residency remain subject to the separate privacy-jurisdiction decision.
