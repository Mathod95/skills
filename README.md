# Claude Skills & Notes

Skills Claude Code personnels, versionnés et rendus navigables via zensical (ce site).

## Structure du repo

```
.
├── README.md                          ce fichier, aussi la homepage du site
├── zensical.toml                      config du site
├── docs/
│   └── skills/
│       ├── research/                  copie de skills/research/, resynchronisée à la main
│       └── saltbox/                   copie de skills/saltbox/, resynchronisée à la main
└── skills/
    ├── saltbox/
    │   └── create-custom-role/
    │       ├── SKILL.md
    │       └── scripts/lint-role.sh
    └── research/
        └── learn-a-tech/
            ├── SKILL.md
            ├── candidate-skills.md
            ├── references/
            │   ├── crossplane.md
            │   └── backstage.md
            └── studycases/
                └── crossplane-m-suffix.md
```

`docs/skills/` est une **copie** de `skills/`, pas un symlink: zensical ne suit pas correctement les liens de navigation à travers un dossier symlinké sous `docs/` (limitation connue de l'outil, encore en version alpha). Après toute modification d'un skill listé dans `docs/`, resynchroniser avant de rebuild:

```bash
for s in research saltbox; do rm -rf docs/skills/$s && cp -r skills/$s docs/skills/$s; done
```

## Skills actuellement présents

### `research/learn-a-tech`

Recherche la documentation officielle **en direct** d'une technologie (jamais la mémoire d'entraînement pour trancher un fait technique précis) et maintient un fichier de référence à jour par techno dans `references/`. Contient aussi `candidate-skills.md`, un backlog des sous-thèmes assez riches pour mériter un jour leur propre skill dédié, jamais créé automatiquement, toujours proposé puis validé.

`references/<techno>.md` reste strictement généraliste (des faits, sourcés, jamais de narration). Un point spécifique/notable (une erreur commise, un raisonnement, un contexte précis) part dans un `studycases/<techno>-<sujet>.md` séparé plutôt que d'être mélangé à la référence.

Références actuellement présentes: `references/crossplane.md`, `references/backstage.md`, `references/saltbox.md`. Studycase: `studycases/crossplane-m-suffix.md`.

### `saltbox/create-custom-role`

Procédure pour créer ou revoir un rôle Ansible custom Saltbox (via saltbox_mod), avec la convention actuelle (vérifiée en direct contre `Sandbox/AGENTS.md`, jamais contre le template `helloworld`, obsolète). Fournit `scripts/lint-role.sh`, qui installe et lance `saltbox-lint` et `ansible-lint` comme la CI de Sandbox. Créé après validation explicite, à partir du candidat noté pendant la recherche `learn-a-tech saltbox`.

## Comment un skill est créé — cas d'usage concret

**1. Un besoin identifié en travaillant.** Une tâche répétée révèle un problème récurrent ou une manière de faire qui mérite d'être formalisée, pas juste corrigée une fois et oubliée.

**2. Distinguer ce qui relève d'un skill de ce qui n'en relève pas.** Un skill est procédural (guide une action répétable), pas un simple dépôt de faits. "Se souvenir de toute la doc d'une techno" n'est pas un skill, c'est un document de référence. Le skill, c'est le **processus** ("comment je recherche et maintiens une doc technique à jour"), qui peut ensuite produire et s'appuyer sur des fichiers de référence.

**3. Trancher la granularité avant d'écrire.** Est-ce que ce nouveau besoin partage assez de contexte avec un skill existant pour y rentrer, ou mérite-t-il d'être séparé ? Exemple: pour ArgoCD, "installer ArgoCD" et "créer une Application" partagent très peu de contexte et n'ont pas la même fréquence d'usage (une fois vs en permanence) — deux skills séparés ont plus de sens qu'un seul fourre-tout. À l'inverse, deux cas d'usage qui partagent presque tout leur contexte (même config, mêmes pièges) ont plutôt intérêt à rester dans un seul skill.

**4. Écrire le `SKILL.md`.** Frontmatter avec `name` et `description` (le champ qui pilote le déclenchement, donc décrit précisément quand l'utiliser, pas vaguement). Corps du fichier: déclencheur, étapes concrètes, règle(s) centrale(s), points d'attention, section "Todo" pour ce qui reste à approfondir sans l'inventer.

**5. Validation avant toute création, jamais automatique.** Même après avoir identifié qu'un sujet mériterait un skill, la création elle-même attend toujours une confirmation explicite. Un sous-thème repéré comme candidat (dans `candidate-skills.md`) n'est pas créé automatiquement, seulement proposé.

**6. Mise à jour continue, pas figé une fois pour toutes.** Toute correction ou tout apprentissage découvert en travaillant est répercuté dans le skill concerné directement, dans le même échange, sans attendre qu'on le demande.

## Process de gestion des skills à partir de maintenant

- Une techno nouvelle à apprendre → `learn-a-tech <techno>`, produit/actualise `references/<techno>.md`.
- Un sous-thème rencontré pendant cette recherche est assez riche pour devenir un skill → noté dans `candidate-skills.md`, jamais créé sans validation.
- Un besoin exprimé correspond à un candidat déjà noté → il est signalé, la création proposée, jamais automatique.
- Un skill est créé ou modifié → penser à resynchroniser `docs/skills/` avant de rebuild le site.
- `skill-creator` (fourni par Anthropic) reste disponible pour optimiser la `description` d'un skill une fois qu'il a tourné en conditions réelles, pas en théorie avant d'avoir des cas d'usage concrets.
