# TaskHub — AI Product Photography Platform

A full-stack task management platform for generating 8 consistent AI product images per task using FLUX AI, IP-Adapter, and GPT-4o.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    USER BROWSER                              │
├──────────────────────────────────────────────────────────────┤
│             Next.js 14 App Router (Vercel)                   │
│    TypeScript · Tailwind CSS · Supabase SSR                  │
│                                                              │
│  / Landing  /login  /admin  /dashboard  /tasks/[id]          │
└───────────────────┬──────────────────────────────────────────┘
                    │  JWT Bearer token (Supabase Auth)
┌───────────────────▼──────────────────────────────────────────┐
│             Flask API (Railway / Render)                     │
│                                                              │
│  Routes: /api/auth/*  /api/tasks/*  /api/jobs/*             │
│          /api/generations/*  /api/admin/analytics           │
│                                                              │
│  RQ Workers (Redis background jobs)                          │
│  ├── generate_image_job  ← AI pipeline per image slot       │
│  └── email dispatch                                          │
└──────────────┬────────────────────┬─────────────────────────┘
               │                    │
  ┌────────────▼────┐     ┌─────────▼──────────┐
  │   Supabase      │     │  Redis (Upstash)    │
  │  PostgreSQL     │     │  Job Queue + Cache  │
  │  Auth (OAuth)   │     └────────────────────┘
  │  Storage        │
  └─────────────────┘
        │
  ┌─────▼──────────────────┐
  │   External APIs        │
  │  Fal.ai (FLUX+Adapter) │
  │  OpenAI GPT-4o-mini    │
  │  Resend (emails)       │
  └────────────────────────┘
```

---

## 🚀 Local Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- Redis (local or Upstash URL)
- Supabase project

### 1. Clone & Configure

```bash
git clone <repo-url>
cd taskhub
```

**Backend:**
```bash
cd backend
cp .env.example .env
# Fill in all values in .env
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
```

### 2. Run Migrations

In Supabase SQL Editor, run in order:
1. `migrations/001_initial_schema.sql`
2. `migrations/002_rls_policies.sql`
3. `migrations/003_storage_buckets.sql`

### 3. Set Up Supabase Auth

In Supabase Dashboard → Authentication → Providers:
- Enable **Google** (add Client ID + Secret from Google Cloud Console)
- Enable **GitHub** (add Client ID + Secret from GitHub OAuth Apps)

Set redirect URL: `http://localhost:3000/auth/callback` (and your production URL)

### 4. Make First Admin

After signing in once, run in Supabase SQL Editor:
```sql
UPDATE public.users SET role = 'admin' WHERE email = 'your@email.com';
```

### 5. Start Development

**Terminal 1 — Flask API:**
```bash
cd backend
python run.py
```

**Terminal 2 — RQ Worker:**
```bash
cd backend
python worker.py
```

**Terminal 3 — Next.js:**
```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🎨 AI Consistency Approach

### The Problem
Generating 8 images of the same product that all look like the same physical object.

### Our Pipeline (Per Task)

#### Step 1: Background Removal (`rembg`)
```
Original photo → rembg (U²-Net model) → PNG with transparency
```
The background-removed image is stored permanently and reused for all 8 generation calls.

#### Step 2: GPT-4o Product Analysis
We send the original product image to `gpt-4o-mini` with this system prompt:
> "Describe this product for AI image generation: color, material, shape, size, texture, finish, distinguishing features. 2-3 sentences max."

Example output for pearl jewelry:
> *"A delicate freshwater pearl drop earring with 18k gold hardware, lustrous 8mm round pearls in cream-white, elegant teardrop silhouette with a tiny pavé diamond accent at the top."*

This descriptor is injected into **every prompt** and stored in the database for all re-generations.

#### Step 3: Fixed Seed Per Task
A random seed (1 to 2³¹) is generated **once** when the task is created and stored in `tasks.generation_seed`. Every generation call uses this exact seed.

#### Step 4: Fal.ai FLUX + IP-Adapter
```python
fal_client.run("fal-ai/flux-general", {
    "prompt": f"8k professional product photography, {product_descriptor}, {scene_description}",
    "seed": task.generation_seed,
    "ip_adapters": [{ "image_url": bg_removed_url, "scale": 0.82 }],
    "num_inference_steps": 28,
    "guidance_scale": 7.5
})
```

- **IP-Adapter at 0.82 scale** — strong visual reference for shape, color, and texture
- **Fixed seed** — deterministic noise initialization
- **Detailed product descriptor** — ensures the prompt accurately describes the product in every scene

### Why This Works
| Technique | Contributes To |
|-----------|---------------|
| `rembg` background removal | Clean reference image, no background interference |
| GPT-4o descriptor extraction | Consistent, accurate product description in all prompts |
| IP-Adapter 0.82 scale | Strong visual identity transfer across scenes |
| Fixed seed per task | Same noise initialization = similar structural output |
| FLUX model | Superior prompt adherence and photorealism |

### Known Limitations
1. IP-Adapter is not pixel-perfect — slight variations in proportion/angle are expected
2. Model images (slots 6-8): model face varies per generation (LoRA training on a specific model would fix this)
3. `rembg` may struggle with complex or transparent backgrounds
4. Fal.ai free tier has rate limits — upgrade for production use

---

## 📊 Status Flow

```
pending → assigned → in_progress → submitted → accepted
                          ↑                         ↓
                  revision_requested ←──────────────┘
```

---

## 📧 Email Templates

| Trigger | Recipient | Template |
|---------|-----------|----------|
| Task assigned by admin | User | `task_assigned.html` |
| Task submitted by user | Admin | `task_submitted.html` |
| Task accepted by admin | User | `task_accepted.html` |
| Revision requested | User | `revision_requested.html` |

---

## 🌐 Deployment

### Frontend → Vercel
```bash
cd frontend
npx vercel --prod
```
Set environment variables in Vercel dashboard.

### Backend → Railway
1. Push to GitHub
2. Create Railway project → Deploy from repo (select `backend/` as root)
3. Add `Redis` service in Railway
4. Set all environment variables
5. Start command: `gunicorn run:app -w 2 -b 0.0.0.0:$PORT`
6. Add worker: `python worker.py`

---

## 📁 Generated Samples

See `/generated_samples/` for 8 pearl jewelry test images demonstrating all scene types.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS) |
| `FAL_KEY` | Fal.ai API key |
| `OPENAI_API_KEY` | OpenAI API key (for GPT-4o-mini) |
| `RESEND_API_KEY` | Resend email API key |
| `RESEND_FROM_EMAIL` | Verified sender email |
| `REDIS_URL` | Redis connection URL |
| `FLASK_SECRET_KEY` | Flask session secret |
| `FRONTEND_URL` | Next.js app URL |

### Frontend (`frontend/.env.local`)
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_API_URL` | Flask backend URL |
| `NEXT_PUBLIC_APP_URL` | This app's URL |

---

## 🔒 Security

- All routes protected by Supabase JWT validation
- Row Level Security enforced at database level
- Service role key never exposed to client
- Admin role checked server-side AND database-side (RLS)
- Rate limiting on all API endpoints

---

*Built with Next.js 14, Flask, Supabase, Fal.ai, Resend, and Redis Queue*
