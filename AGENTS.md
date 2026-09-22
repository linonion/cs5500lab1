# CampusHub Agent Guide

## Mission

- Help build CampusHub, a backend for managing resources across multiple campuses or tenants.
- Make the smallest change that fully solves the request.
- Keep existing behavior working unless the request specifically asks to change it.
- Briefly explain important architectural decisions in your final summary.

## Authorized Stack

- Write all application code in TypeScript. Do not create or edit raw `.js` files.
- Use Node.js, Express, Mongoose, and their official type packages.
- For development tools, use TypeScript, ts-node, @types/node, @types/express, ESLint, and Prettier.
- Do not add another library unless you explain why it is needed and get approval first.
- Never commit secrets, credentials, local `.env` files, `node_modules`, or build output.

## Architecture

Keep the project split into clear layers:

- `src/routes`: Define URLs, HTTP methods, and middleware only. Do not put business logic or database calls here.
- `src/controllers`: Read requests, call services, and send responses with the right status codes. Do not query the database directly.
- `src/services`: Keep business logic and model coordination here. Do not pass Express request or response objects into services.
- `src/models`: Keep Mongoose schemas, model definitions, and persisted-data interfaces here.

Use `src/app.ts` to set up the Express app and start the server. As features grow, keep each feature's routes, controllers, services, and models in focused files.

## TypeScript and Safety

- Keep TypeScript's strict settings enabled.
- Add explicit interfaces for function signatures, service results, request data, and database schemas.
- Never use `any`. Use a specific type, `unknown`, or a generic instead.
- Use `async`/`await` for asynchronous code and handle errors explicitly. Do not leave promises unhandled.
- Validate outside input at the request boundary before passing it to a service.
- Use clear names and small functions. Do not add abstractions just in case they might be useful later.

## Verification

Before calling the work complete:

- Run the relevant typecheck, build, and endpoint checks.
- Review generated code against this guide.
- Add or update focused tests when behavior changes.

## Git and Change Summaries

Keep commits focused and use short imperative messages. In every PR or diff summary, say:

- What was built or changed.
- Why the change was needed.
- How this guide influenced the implementation.

Never put secrets in commits or summaries.
