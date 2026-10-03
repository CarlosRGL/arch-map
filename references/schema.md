# architecture.json schema

The viewer renders exactly this file. Write it to `<project>/.arch/architecture.json`.

```jsonc
{
  "title": "NoteRepo",                       // project name
  "description": "One or two sentences: what the app does, for whom.",
  "commit": "1b640ff",                        // short git hash at analysis time (optional)
  "generatedAt": "2026-10-03T15:00:00Z",      // ISO date
  "groups": [
    { "id": "admin-app", "label": "Admin app", "color": "blue" }
  ],
  "components": [
    {
      "id": "booking-service",                // unique, kebab-case
      "label": "Booking service",             // 2-4 words, shown on the node
      "group": "domain",                      // a group id
      "kind": "service",                      // see kinds below
      "tech": "PHP · wpdb",                   // short stack hint, shown under the label
      "description": "Plain-language role: what it does and why it exists. 1-3 sentences.",
      "files": ["includes/Booking/Service.php"]   // real repo paths (verified), optional
    }
  ],
  "connections": [
    {
      "id": "c1",
      "source": "admin-ui",                   // component id
      "target": "booking-service",            // component id
      "label": "creates bookings"             // verb phrase, 1-4 words, lowercase
    }
  ],
  "tour": [
    {
      "title": "A member books a class",      // user-facing step title
      "description": "What happens, in plain words. 1-3 sentences.",
      "components": ["portal-planning", "booking-service"],  // highlighted nodes
      "connections": ["c1", "c4"]                            // highlighted edges (animated)
    }
  ]
}
```

## Kinds

`user`, `ui`, `api`, `service`, `worker`, `cli`, `database`, `storage`, `external`, `config`.
Each kind gets its own icon and tint in the viewer.

## Group colors

`blue`, `violet`, `emerald`, `amber`, `rose`, `cyan`, `slate`, `orange`.

## Sizing rules

- 12-40 components. Fewer than 12 is not an architecture; more than 40 is a file listing.
- 4-8 groups. Every component belongs to exactly one group.
- Connections follow real runtime relations (calls, reads, writes, renders, schedules, sends to),
  not imports. Direction is the direction of the initiating call or data push.
- 4-7 tour steps, each telling one user-visible flow end to end with at most 8 components (a step that lights up half the map teaches nothing), in the order a newcomer
  should learn them. Every component and connection id referenced must exist. List a step's `connections` in the order they happen: the viewer numbers them 1, 2, 3 on the map and in the step card.
- Add the actors as components of kind `user` (the person, an AI agent, a cron) so flows have a start.
