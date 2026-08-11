# FlyRank Auth API — Assignment A4

A secure REST API built with **Node.js + Express** and **Supabase Auth**.  
Handles Sign Up, Log In, Log Out, and guards protected routes with JWT verification.

---

## Project Structure

```
w4/
├── index.js                  # Entry point — starts the Express server
├── src/
│   ├── supabaseClient.js     # Initialises the Supabase client from .env
│   ├── openapi.json          # OpenAPI 3.0 spec (powers Swagger UI)
│   ├── middleware/
│   │   └── authGuard.js      # Reusable JWT verification middleware
│   └── routes/
│       ├── auth.js           # POST /auth/signup  login  logout
│       ├── public.js         # GET  /public/info
│       └── protected.js      # GET  /protected/profile  /dashboard
├── .env.example              # Key names with placeholder values
├── .gitignore                # Keeps .env and node_modules out of Git
└── package.json
```

---

## Setup

### 1 — Clone & install

```bash
git clone <your-repo-url>
cd w4
npm install
```

### 2 — Create your `.env`

Copy the example file and fill in your real Supabase values:

```bash
cp .env.example .env
```

Open `.env` and set:

```
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_KEY=your_anon_key_here
PORT=3000
```

> **Where to find these:** Supabase Dashboard → Project Settings → API  
> Use the **anon / public** key. Never use the `service_role` key here.

### 3 — Disable email confirmation (once, for dev)

In the Supabase Dashboard go to  
**Authentication → Sign In / Providers → Email** and turn **"Confirm email" off**.  
This lets a fresh signup log in immediately without clicking a confirmation link.

---

## Run

```bash
node index.js
```

The server starts at **http://localhost:3000** and prints:

```
Server running on http://localhost:3000
Swagger docs  → http://localhost:3000/docs
Connected to Supabase ✓
```

---

## API Reference

| Method | Route | Auth required | Status codes | Description |
|--------|-------|:---:|---|---|
| `POST` | `/auth/signup` | ✗ | 201 · 400 | Create a new user account |
| `POST` | `/auth/login` | ✗ | 200 · 400 · 401 | Authenticate & return JWT |
| `POST` | `/auth/logout` | ✓ Bearer | 204 · 401 | End the user's session |
| `GET`  | `/protected/profile` | ✓ Bearer | 200 · 401 | Read private profile data |
| `GET`  | `/protected/dashboard` | ✓ Bearer | 200 · 401 | Protected dashboard (middleware reuse demo) |
| `GET`  | `/public/info` | ✗ | 200 | Read public, open data |

### Status code guide

| Code | Meaning |
|------|---------|
| 201 | Created — new account made |
| 200 | OK — request succeeded |
| 204 | No Content — logout succeeded |
| 400 | Bad Request — missing `email` or `password` |
| 401 | Unauthorized — missing, malformed, invalid, or expired token |
| 403 | Forbidden — identity known but action not allowed |

---

## Quick test with curl

```bash
# 1 — Sign up
curl -i -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# → 201

# 2 — Log in (copy the access_token from the response)
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# → 200 + access_token

# 3 — Access protected profile
curl -i http://localhost:3000/protected/profile \
  -H "Authorization: Bearer <PASTE_ACCESS_TOKEN_HERE>"
# → 200 + user details

# 4 — Tamper with the token (change one character)
# → 401 Invalid or expired token

# 5 — Public route (no token needed)
curl -i http://localhost:3000/public/info
# → 200

# 6 — Missing token
curl -i http://localhost:3000/protected/profile
# → 401 Access token required
```

---

## Swagger UI

Open **http://localhost:3000/docs** in your browser.

1. Click **Authorize** (the padlock 🔒 icon, top right)
2. Paste your `access_token` from `/auth/login`
3. Click **Try it out** on any protected route — no curl needed

> Screenshot: *(add your Swagger screenshot here after running the server)*

---

## How auth works (the trust triangle)

```
Client  ──── email + password ────▶  Supabase
              ◀──── JWT (access_token) ────

Client  ──── Bearer <token> ────▶  Your server
                                       │
                              supabase.auth.getUser(token)
                                       │
                              ✓ valid → 200   ✗ invalid → 401
```

1. **Sign up / Log in** — client sends credentials to Supabase directly  
2. **Supabase returns a JWT** — cryptographically signed, short-lived (1 hour)  
3. **Client attaches token** to every protected request via `Authorization: Bearer`  
4. **Your server verifies** it by calling `supabase.auth.getUser(token)` — no crypto code needed

---

## Security notes

- Passwords are **never stored or hashed by your code** — Supabase handles all of that
- The `.env` file is git-ignored; only `.env.example` (with placeholder values) is committed
- The `service_role` key is never used here — it bypasses all security
- The reusable `authGuard` middleware means every protected route is guarded consistently

---

## Commits

```
Stage 0: setup server and supabase client
Stage 1: signup and login routes working
Stage 2: public route and unverified protected route
Stage 3: profile route token verification
Stage 4: auth middleware and logout endpoint
Stage 5: Swagger UI documentation with bearer auth
Stage 6: publish to GitHub and write README
```
