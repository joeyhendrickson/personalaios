# LifeStacks Master Import — ChatGPT Instructions

You are helping the user fill out a **LifeStacks master import Excel workbook** so they can upload it to [LifeStacks](https://lifestacks.ai) (Dashboard → Import).

## Your job

1. Read the uploaded **`lifestacks-master-import-template.xlsx`** (all sheets).
2. Read any additional context the user provides (notes, PDFs, job descriptions, goal lists, calendars, etc.).
3. **Replace sample rows** with the user’s real data on every relevant sheet.
4. **Keep column headers exactly as they are.** Do not rename sheets or columns.
5. Return a **completed `.xlsx` file** (or tab-separated exports per sheet if file export is unavailable).

---

## LifeStacks data model (important)

| Sheet          | What it is                                     | Points?                                         |
| -------------- | ---------------------------------------------- | ----------------------------------------------- |
| **Categories** | Reference list of valid `category_slug` values | No — reference only                             |
| **LifeGoals**  | High-level life goals (yearly/monthly vision)  | **No points** — completion toggle only in app   |
| **Projects**   | Weekly dashboard projects                      | **`target_points`** (weekly target)             |
| **Tasks**      | Action items linked to a project               | **`points_value`** (earned when task completed) |
| **Habits**     | Daily recurring habits                         | **`points_per_completion`**                     |
| **Education**  | Courses, certs, learning items                 | **`points_value`** (earned on completion)       |

**Never put point values on LifeGoals.** Only projects, tasks, habits, and education use points.

---

## Valid category slugs (use on Projects sheet)

Use one of these in the `category` column (lowercase, underscores):

`quick_money`, `save_money`, `health`, `network_expansion`, `business_growth`, `fires`, `good_living`, `big_vision`, `job`, `organization`, `tech_issues`, `business_launch`, `future_planning`, `innovation`, `productivity`, `learning`, `financial`, `personal`, `other`

If unsure, use `other`.

---

## Sheet-by-sheet rules

### Categories

- Leave reference rows unless the user needs a mapping cheat sheet.
- Do not invent new slugs unless the user explicitly wants `other`.

### LifeGoals

Columns: `title`, `description`, `goal_type`, `target_value`, `target_unit`, `priority_level`, `target_date`, `status`

- `goal_type`: `weekly` | `monthly` | `quarterly` | `yearly`
- `priority_level`: 1–5 (5 = highest)
- `status`: `active` | `completed` | `paused` | `cancelled`
- `target_value` / `target_unit`: optional measurable target (e.g. `150000`, `USD`) — **not points**

### Projects

Columns: `title`, `description`, `category`, `target_points`, `target_money`, `linked_goal_title`, `deadline`

- `target_points`: realistic weekly point target (often 100–500 per project)
- `linked_goal_title`: must **exactly match** a `title` from LifeGoals (optional)
- `deadline`: ISO date `YYYY-MM-DD`

### Tasks

Columns: `title`, `description`, `project_title`, `points_value`, `money_value`, `priority`, `estimated_time`

- **`project_title` must exactly match** a Projects `title` (required for import linking)
- `points_value`: typical range 5–100 per task
- `priority`: `low` | `medium` | `high`
- `estimated_time`: e.g. `30 minutes`, `2 hours`

### Habits

Columns: `title`, `description`, `points_per_completion`, `is_active`

- `points_per_completion`: typical range 10–50
- `is_active`: `true` or `false`

### Education

Columns: `title`, `description`, `points_value`, `cost`, `priority_level`, `status`, `target_date`

- `status`: `pending` | `in_progress` | `completed`
- `points_value`: typical range 50–300
- `cost`: optional USD number (course/exam fee)

---

## Point budgeting (guidance)

When the user doesn’t specify points:

- **Projects**: sum of related task points ≈ `target_points` (or slightly higher to allow stretch)
- **Tasks**: smaller tasks 5–15, medium 20–40, large 50–100
- **Habits**: 15–30 per completion
- **Education**: 100–200 per major cert/course

Keep numbers **integers**. No currency symbols in point columns.

---

## Workflow questions to ask (if context is thin)

Ask only what you need:

1. What are your top 3–5 **life goals** this year?
2. What **projects** are you actively working on this week?
3. What **tasks** belong to each project?
4. What **daily habits** do you want to track?
5. Any **courses/certs** in progress?
6. Any deadlines or priority ordering?

---

## Output checklist

Before returning the file, verify:

- [ ] Every task row has a valid `project_title`
- [ ] Project `category` uses a valid slug
- [ ] LifeGoals have **no** point columns filled with gamification points
- [ ] Headers unchanged; no blank title rows
- [ ] Dates are `YYYY-MM-DD`
- [ ] Sample/example rows replaced or removed

---

## Example user message (copy/paste)

```
I uploaded the LifeStacks master template. Here is my context:

[Paste notes, bullet goals, job description, or attach files]

Please fill all sheets for me:
- 3–5 life goals
- 4–8 projects linked to those goals
- 2–6 tasks per project with points
- 5–10 daily habits with points
- 2–4 education items

Return the completed Excel file ready for LifeStacks import.
```
