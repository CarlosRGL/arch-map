# Explain modes

Karpathy's ladder for understanding model output: plain writing, then diagrams, then web pages, then explainer videos. `arch-map` already gives the diagram and the web page. These modes add the other two rungs. They are options: with none requested, write the map as usual.

## `ste`: controlled writing

Write every `description` (project, component, tour step) and every tour `narration` in a simplified technical English modelled on ASD-STE100, the controlled language from aerospace maintenance manuals. Target "80% of the way": follow the rules below, but keep an unavoidable technical term rather than contort the sentence. If the user asks for `strict`, follow them to the letter.

Rules:
- One idea per sentence. 20 words maximum (25 for a pure description).
- Active voice, present tense. "The API saves the order." Not "The order is saved by the API."
- Plain verbs: use, make, send, get, save, start, stop. Not utilize, leverage, facilitate, orchestrate.
- One word for one meaning, and keep it everywhere. If the first mention is "job", it is "job" in every step. No elegant variation.
- Keep the articles (a, an, the). Do not drop them to sound terse.
- No stacked nouns of more than three words ("user session token refresh handler" becomes "the handler that refreshes the session token").
- No idioms, no metaphors, no jokes, no "simply", "just", "basically".
- Say what happens and what comes out. "The worker sends the email. The member gets a receipt."
- Name each technical term once, in a short sentence that defines it, the first time it appears.

Check before building: read each description aloud. A non-native reader must parse it in one pass. Split any sentence that holds two verbs about different subjects.

### Other languages

ASD-STE100 only exists for English. In another language, apply the same rules with that language's plain-language standard:
- French: FALC (Facile à lire et à comprendre). Short sentences, one idea each, active voice, common words, no figurative language, define each technical term once.
- Spanish: Lectura Fácil. Same principles: short sentences, direct vocabulary, no ambiguity, one term per concept.

Set `"lang"` in the JSON to match, and keep terms identical across the whole map.

## `video`: explainer from the tour

Goal: a narrated walkthrough that follows the tour, one scene per step. The agent does the creative work; the script only prepares the material.

1. Write a `narration` string on each tour step (optional field, see `schema.md`). It is spoken, so: short sentences, no file names, no parentheses, numbers spelled the way they are read. Without it the step `description` is used. Combine with `ste` for the clearest result.
2. Run `node <skill-dir>/scripts/narration.mjs .arch/architecture.json`. It writes `.arch/narration.md` (readable script) and `.arch/narration.json` (scenes: title, narration, on-screen components, numbered hops).
3. Build the video from `narration.json`, one scene per entry. Use the `remotion-best-practices` skill when it is installed. Show the components of the scene as nodes, draw each hop in order with its number and label, and keep the scene on screen as long as its narration lasts. Keep it in `.arch/video/`, outside the project's own source.
4. Audio: use a voice in the map's language (`lang`). Use the TTS the user names (for example ElevenLabs, with a key the user supplies). If none, use a free local option (macOS `say`, Piper) and tell the user which one you used. Never invent or hardcode a key.
5. Verify: render, extract one frame per scene, and check that no text is cut off and the narration length matches the scene length. Report the output path.

Ask once if the user wants only the script or the full video. The script alone is always cheap; a render takes real time.
