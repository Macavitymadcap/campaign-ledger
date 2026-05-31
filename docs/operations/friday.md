You’re actually in a good place: the app already has the import paths for exactly this. I’d split the setup into three tracks: **rules content**, **player/GM accounts**, and **hosted table readiness**.

**1. Get it running locally first**

From `/Users/dank/Code/personal/web/campaign-ledger`:

```bash
bun install
bun run seed
bun run import:rules:srd
bun run dev
```

Then open `http://localhost:3000`.

Local dev logins:

```text
admin@example.local / password123
gm@example.local / password123
lynott@example.local / password123
mira@example.local / password123
```

Use this local version as your rehearsal space before touching the hosted app.

**2. Put owned/private rules outside git**

For the Markdown/text files you have extracted from owned books, do not commit them into the repo. Put them somewhere private, ideally mirroring the hosted path:

```text
/data/private-rules/ocr-markdown
```

For a local dry run you can use something like:

```text
/Users/dank/private-rules/ocr-markdown
```

Then convert the Markdown/text exports into the app’s private-rule YAML format:

```bash
bun run import:rules:ocr -- --input-dir /Users/dank/private-rules/ocr-markdown --output-dir /Users/dank/private-rules
```

The converter recognises book-ish files such as `phb.md`, `dmg.md`, `mm.md`, `xgte.md`, `tcoe.md`, and `mpmm.md`. It can handle things like classes, races/species, equipment, tables, feats, magic items, and reference rules. Spells and monster stat blocks are deliberately more cautious, so expect to hand-review or add separate YAML for those.

**3. Import private rules locally**

Once the YAML exists:

```bash
bun run import:rules:private -- /Users/dank/private-rules
bun run rules:coverage:rovnost -- /Users/dank/private-rules
```

For Lynott/table readiness, the checklist expects coverage for things like Artificer, Artillerist, infusions, Hobgoblin traits, PHB spells/cantrips, and Absorb Elements from XGtE.

Useful docs already in the repo:

- [Private rules schema](/Users/dank/Code/personal/web/campaign-ledger/docs/rules/private-rules/README.md)
- [Private rules importer](/Users/dank/Code/personal/web/campaign-ledger/docs/rules/private-rules/importer.md)
- [Rovnost checklist](/Users/dank/Code/personal/web/campaign-ledger/docs/rules/private-rules/rovnost-operator-checklist.md)

**4. Prepare the real players**

Hosted player setup is operator-mediated:

1. Sign in as admin.
2. Open `/admin`.
3. Create invite links for each real player and the GM.
4. Send those links privately.
5. Wait for everyone to accept and set passwords.
6. Then load character shells with a private `friday-players.yml` file.

The player handoff file lives outside git and looks like the example in:

[Hosted Friday Player Runbook](/Users/dank/Code/personal/web/campaign-ledger/docs/operations/hosted-friday-player-runbook.md)

That file is where you define each player’s character name, species, background, class, level, HP, abilities, saves, skills, AC sources, equipment, resources, notes, and faction.

**5. Host it for the table**

The current supported hosted path is Railway with SQLite on a persistent volume.

The key Railway settings are:

```text
DB_PATH=/data/character-sheet.sqlite3
CAMPAIGN_LEDGER_ASSET_ROOT=/data/assets
HOSTED_BACKUP_DIR=/data/backups
HOSTED_PERSISTENCE_MODE=sqlite-volume
ACCOUNT_DELIVERY_MODE=operator
PUBLIC_BASE_URL=https://your-railway-url.example
SESSION_SECRET=<long random secret>
```

Then, on the empty hosted volume, run once:

```bash
bun run hosted:data -- prepare
```

After deploy:

```bash
bun run hosted:check -- https://your-railway-url.example
```

Before importing private rules or real players on hosted, take a backup:

```bash
bun run hosted:data -- backup
```

Then import private rules on hosted:

```bash
PRIVATE_RULES_BACKUP_CONFIRMED=1 bun run import:rules:private -- /data/private-rules
bun run rules:coverage:rovnost -- /data/private-rules
```

Then import real players/characters:

```bash
HOSTED_PLAYERS_BACKUP_CONFIRMED=1 bun run hosted:players
```

**6. Final table check**

Before session day, do this:

1. GM signs in and opens `/campaigns/rovnost-shadows`.
2. GM checks `/campaigns/rovnost-shadows/characters`.
3. GM opens every player sheet and spot-checks HP, AC, abilities, skills, equipment, resources, notes, and rule links.
4. GM checks `/campaigns/rovnost-shadows/preview/player`.
5. Each player signs in and opens their own sheet.
6. Each player adds missing table details in Equipment, Skills, Background, and Notes.
7. Check public rules: `/rules/spell/bless`.
8. Check protected routing by signing out and trying a sheet URL.

The short version: **convert your extracted Markdown to private YAML, import it locally, verify coverage, then repeat on Railway after backup; separately invite users first, then load character shells.**