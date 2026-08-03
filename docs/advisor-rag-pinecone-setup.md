# Advisor RAG + Pinecone setup

## 1. Create a Pinecone account

1. Go to [https://www.pinecone.io](https://www.pinecone.io) and sign up.
2. Open the Pinecone console and create a **project** (e.g. LifeStacks Production).

## 2. Create one index

1. **Indexes** → **Create index**
2. **Name:** `lifestacks-advisor` (must match `PINECONE_INDEX_NAME`)
3. **Dimensions:** `1536` (OpenAI `text-embedding-3-small`)
4. **Metric:** cosine
5. **Type:** Serverless is fine for starting out
6. Wait until status is **Ready**

You do **not** create an index per user. One index holds all users; each user gets a **namespace** (their user UUID).

## 3. Copy your API key

1. **API keys** → **Create key**
2. Copy the key (starts with `pc-`)

## 4. Add to `.env.local`

```bash
PINECONE_API_KEY=pc-your-key-here
PINECONE_INDEX_NAME=lifestacks-advisor
ADVISOR_RAG_ENABLED=true
```

Also add the same variables in **Vercel → Project → Settings → Environment Variables** for production.

## 5. Run the database migration

In **Supabase → SQL Editor**, run:

`supabase/migrations/091_advisor_vector_index.sql`

Or, if linked to Supabase CLI:

```bash
supabase db push
```

## 6. Restart the dev server

```bash
npm run dev
```

## 7. Verify

1. Open the app as a user and open the **Advisor** (triggers context + vector sync).
2. Go to **Admin → Advisor Memory (RAG / Pinecone)** → **Refresh status**.
3. You should see Pinecone **Connected**, namespaces increasing, and users indexed.

## How it works

| Step          | What happens                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| Cache refresh | Goals, tasks, modules are chunked → embedded → stored in Pinecone under namespace = `user_id`        |
| Chat question | Question is embedded → Pinecone returns top matches → injected as `RETRIEVED EVIDENCE` in the prompt |
| Evidence tab  | Shows retrieved chunks, match %, and updated confidence score                                        |
| Admin         | Health, warnings, 24h sync/retrieve analytics, reindex buttons                                       |

## Disable RAG

Set `ADVISOR_RAG_ENABLED=false` or remove `PINECONE_API_KEY`. The advisor falls back to cache-only context.
