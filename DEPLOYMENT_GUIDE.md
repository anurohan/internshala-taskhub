# TaskHub Complete Free Deployment Guide

This guide will walk you through deploying your TaskHub platform completely for **free** using Vercel (Frontend), Render (Backend), and Supabase (Database + Auth). 

I have already ensured your repository meets all submission requirements:
- The `/migrations` folder is intact.
- The `README.md` includes the Architecture, Setup, Migrations, AI Approach, and Limitations.
- I've added a root `.env.example` file so graders immediately see it.
- I've created a `backend/start.sh` script. This is a "hack" that allows you to run both your Flask API and your RQ background worker on a **single free Render instance**!

---

## 🛠️ Prerequisites
Before you start, make sure your code is pushed to a **GitHub Repository**. 

## Step 1: Set up Supabase (Database & Auth) — Free
1. Go to [Supabase](https://supabase.com/) and create a new free project.
2. Once created, go to **Project Settings -> API** to get your `Project URL`, `anon key`, and `service_role key`. Save these for later.
3. **Database Migrations:**
   - Go to the **SQL Editor** in Supabase.
   - Run the contents of your `migrations/001_initial_schema.sql`, then `002_rls_policies.sql`, and finally `003_storage_buckets.sql`.
4. **Authentication Setup:**
   - Go to **Authentication -> Providers**. 
   - Enable Google & GitHub if you want OAuth, or just Email/Password. 
   - Under **URL Configuration**, add your future Vercel domain (e.g., `https://taskhub.vercel.app`) as a Redirect URL.

## Step 2: Set up Redis (Upstash) — Free
Render doesn't provide a free Redis instance, but Upstash does!
1. Go to [Upstash](https://upstash.com/) and sign up.
2. Create a new Redis database (Free tier).
3. Scroll down to get the **Redis URL** (it looks like `redis://default:password@endpoint:port`). Save this.

## Step 3: Deploy the Backend (Render) — Free
Render allows 1 free web service. Normally you would need 2 (one for Flask, one for the RQ Worker), but I created `start.sh` so they can run together!

1. Go to [Render](https://render.com/) and create a new **Web Service**.
2. Connect your GitHub repository and select it.
3. Use the following settings:
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `bash start.sh`  *(This runs both your worker and API!)*
   - **Instance Type:** Free
4. Click **Advanced** and add these Environment Variables:
   - `SUPABASE_URL`: (from Step 1)
   - `SUPABASE_ANON_KEY`: (from Step 1)
   - `SUPABASE_SERVICE_ROLE_KEY`: (from Step 1)
   - `FAL_KEY`: (Your Fal.ai key)
   - `OPENAI_API_KEY`: (Your OpenAI key)
   - `REDIS_URL`: (from Step 2 - your Upstash URL)
   - `FLASK_SECRET_KEY`: `any-random-long-string-here`
   - `FRONTEND_URL`: (We will update this after deploying Vercel, leave empty for now or put a placeholder).
5. Click **Deploy Web Service**. Once deployed, copy your Render URL (e.g., `https://taskhub-api.onrender.com`).

## Step 4: Deploy the Frontend (Vercel) — Free
1. Go to [Vercel](https://vercel.com/) and click **Add New Project**.
2. Import your GitHub repository.
3. Set the **Framework Preset** to `Next.js`.
4. **Root Directory:** Edit this and set it to `frontend`.
5. Open **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL`: (from Step 1)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (from Step 1)
   - `NEXT_PUBLIC_API_URL`: (Your Render Backend URL from Step 3, no trailing slash)
   - `NEXT_PUBLIC_APP_URL`: (Your chosen Vercel URL, e.g. `https://taskhub-yourname.vercel.app`)
6. Click **Deploy**. 

## Step 5: Final Hookups
1. Go back to Render, and update the `FRONTEND_URL` and `ALLOWED_ORIGINS` environment variable in your Backend Web Service to match your exact Vercel URL.
2. Go to Supabase -> Authentication -> URL Configuration, and make sure your Vercel URL is added to the **Site URL** and **Redirect URLs**.
3. Visit your live Vercel URL! Sign up, and then run the SQL command in the README to promote your user to `admin` in the Supabase SQL editor.

> [!SUCCESS]
> You're done! Your app is now live, entirely on free tiers. Submit your Vercel URL as the live link, and your GitHub repo for the code portion!
