# Step 3a Notes: Atlas Vector Search & Syntax Verification

## 1. Verified Working Index Definition JSON

This is the exact index definition accepted by MongoDB Atlas (`M10` dedicated tier) and verified in `READY` status on the `people` collection:

```json
{
  "name": "people_vector",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      {
        "type": "autoEmbed",
        "path": "text",
        "model": "voyage-4-lite",
        "modality": "text"
      }
    ]
  }
}
```

*Atlas automatically generated 1024 dimensions, cosine similarity, and scalar quantization across all cluster shards.*

---

## 2. Verified Working `$vectorSearch` Aggregation Stage

When querying an `autoEmbed` index, pass raw text to `query` (do **NOT** use `queryVector` as it expects pre-computed float arrays):

```js
[
  {
    $vectorSearch: {
      index: "people_vector",
      path: "text",
      query: "<raw_query_string>",
      numCandidates: 20,
      limit: 10
    }
  },
  {
    $project: {
      _id: 0,
      handle: 1,
      name: 1,
      description: 1,
      tags: 1,
      score: { $meta: "vectorSearchScore" }
    }
  }
]
```

---

## 3. `$rerank` Availability Verdict

**`$rerank` is NOT available as a native pipeline stage on this cluster tier (M10).**
Attempting to run `{ $rerank: { query: "..." } }` throws:
`Unrecognized pipeline stage name: '$rerank'`

👉 **Decision for Step 3b:** `$rerank` is cut from the MongoDB pipeline. Candidate ranking will use hybrid scoring (`vectorSearchScore` + inverse-frequency-weighted tag intersection score from `tagstats`).
