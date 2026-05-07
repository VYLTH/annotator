---
name: annotator
description: Process design feedback dropped into ./.annot/ by the Vylth annotator widget. Each annotation is a PNG + Markdown pair with the screenshot, the URL, the clicked element selector, and the console/network errors at the moment of capture.
---

# Annotator skill

The user has the [vylth-annotator](https://github.com/VYLTH/annotator) widget installed on their site. Every time someone clicks the bubble and submits, an annotation drops into the local filesystem as **two files in the same directory**:

```
.annot/<project>/<id8>-<slug>.png      # screenshot with rectangles drawn on
.annot/<project>/<id8>-<slug>.md       # YAML frontmatter + readable envelope
```

The `.md` file is the entry point. Read it directly — it has the comment, the target element selector, the console logs, network errors, and a relative reference to the screenshot.

## When to act

Look for annotations whenever the user says any of:

- "Any feedback?" / "Any annotations?" / "Anything new?"
- "Check `.annot/`" / "What did wisdom flag?"
- "Process the queue" / "Work the annotation queue"

Or proactively at the start of a session if `.annot/` exists in the current working directory.

## Discovery

```bash
# list all open annotations across projects
find .annot -name "*.md" -exec grep -l "^status: open" {} \;
```

Each `.md` has frontmatter like:

```yaml
---
id: 9c3a4f8e-...
project: local
status: open
created: 2026-05-07T17:24:00Z
url: http://localhost:3000/dashboard
pathname: /dashboard
viewport: { w: 1440, h: 900 }
image: 9c3a4f8e-fix-hero-button.png
target_selector: main > section.hero > button.cta
counts: { errors: 1, network: 1, console: 6 }
---
```

## How to act on each annotation

For each open `.md` file:

1. **Read the markdown.** It contains the user's comment, target element, diagnostic excerpts, and an embedded image reference.
2. **Read the screenshot** at the path in the `image:` frontmatter field (it sits next to the .md). The PNG has rectangles drawn on the part of the page the user is referring to.
3. **Find the code.** Use `target_selector` from the frontmatter as your starting clue. The `pathname:` tells you which route. The console/network sections tell you what went wrong.
4. **Fix it** in the codebase.
5. **Resolve the annotation** by ONE of:
   - Editing the frontmatter: change `status: open` to `status: resolved`
   - Running `annotator resolve <id>` if the annotator API is also reachable
   - Deleting both the `.md` and matching `.png`

Do not delete only the `.png` — the `.md` is the source of truth.

## Multi-project layout

Subdirectories under `.annot/` are project IDs. A monorepo will have:

```
.annot/
  cricket/   ← annotations from the Cricket frontend
  mint/      ← annotations from the Mint app
  local/     ← annotations from a generic localhost dev site
```

Scope to the project the user is working in unless they ask for cross-project review.

## Working in batches

When the user has many annotations queued, propose a plan:

> I see 4 open annotations in `.annot/cricket/`:
> 1. "13-up too tall" → `LabRender.tsx`
> 2. "button does nothing on mobile" → `Hero.tsx`
> 3. "spacing tight" → `Templates.tsx`
> 4. "wrong colour" → `tokens.css`
>
> Want me to fix them in order, or pick the most impactful first?

Don't silently chain through them — the user wants to know what they're getting.

## Rules

- **Never invent** target elements or console errors. If the `.md` doesn't have them, they weren't captured.
- **Always cite** the annotation `id` (or short id) when you propose a fix, so the user can cross-reference.
- **One fix per annotation** unless multiple annotations clearly describe the same root cause — in that case, resolve all of them.
- **Don't move** the `.md` or `.png` files. They live where they live.
