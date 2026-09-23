# Claude Skills & Notes

Repo perso qui versionne mes skills Claude Code (`~/.claude/skills/`), pour ne pas les perdre si cette machine lâche, et pour les retrouver identiques sur n'importe quel autre poste. Rendu navigable via zensical (ce site).

## Structure du repo

```
.
├── README.md                          ce fichier, aussi la homepage du site
├── zensical.toml                      config du site
├── docs/
│   └── skills/
│       ├── create-docs -> ../../skills/create-docs      (symlink)
│       └── research -> ../../skills/research            (symlink)
└── skills/
    ├── create-docs/
    │   ├── SKILL.md
    │   ├── overrides.toml
    │   └── assets/
    └── research/
        └── learn-a-tech/
            ├── SKILL.md
            ├── candidate-skills.md
            └── references/
                └── crossplane.md
```

`docs/skills/*` sont des symlinks vers `skills/*`, pas des copies: le contenu affiché sur le site est toujours exactement ce qui est réellement chargé par Claude Code, jamais désynchronisé.

## Ce qui n'est jamais versionné ici

Ce repo a sa racine dans `~/.claude/`, qui contient aussi des données sensibles propres à Claude Code (identifiants de connexion, historique de sessions, transcripts de conversations). Le `.gitignore` de ce repo exclut explicitement tout ce qui n'est pas `skills/` (hors `synced/`, géré par Anthropic), `docs/`, `zensical.toml`, `overrides/`, `.github/` et ce README. En cas de doute avant un commit, mieux vaut vérifier `git status` que supposer.

## Skills actuellement présents

### `create-docs`

Gère le cycle de vie d'un site de documentation zensical: scaffold initial sur un projet qui n'en a pas encore, et sur un projet déjà scaffoldé, vérification de la version zensical avant de toucher à la doc. C'est ce skill qui a servi à construire ce site-ci.

### `research/learn-a-tech`

Recherche la documentation officielle **en direct** d'une technologie (jamais la mémoire d'entraînement) et maintient un fichier de référence à jour par techno dans `references/`. Contient aussi `candidate-skills.md`, un backlog des sous-thèmes assez riches pour mériter un jour leur propre skill dédié.

Né d'un incident concret: `iam.aws.m.upbound.io` avait été pris pour une coquille alors que `.m.` est un vrai mécanisme Crossplane (managed resources namespaced, v2). La règle centrale du skill: face à un truc surprenant, vérifier en direct, jamais trancher depuis une intuition.

Référence actuellement présente: `references/crossplane.md`.

## Comment un skill est créé — cas d'usage concret

Exemple réel: la naissance de `research/learn-a-tech` lui-même.

**1. Un besoin identifié en travaillant.** Sur un projet client (cockpit Backstage/Crossplane), une affirmation technique s'est révélée fausse (`.m.` pris pour une coquille sans vérifier). Ce n'était pas une erreur isolée à corriger et oublier, c'était un problème récurrent à éviter pour de bon.

**2. Distinguer ce qui relève d'un skill de ce qui n'en relève pas.** Un skill est procédural (guide une action répétable), pas un simple dépôt de faits. "Se souvenir de toute la doc Crossplane" n'est pas un skill, c'est un document de référence. Le skill, c'est le **processus** ("comment je recherche et maintiens une doc technique à jour"), qui peut ensuite produire et s'appuyer sur des fichiers de référence.

**3. Trancher la granularité avant d'écrire.** Est-ce que ce nouveau besoin partage assez de contexte avec un skill existant pour y rentrer, ou mérite-t-il d'être séparé ? Deux exemples opposés rencontrés en pratique:
   - `create-docs` gère à la fois le scaffold initial d'un site zensical et sa maintenance: les deux cas partagent presque tout le même contexte (le même `zensical.toml`, les mêmes pièges), donc un seul skill.
   - Pour ArgoCD, "installer ArgoCD" et "créer une Application" partagent très peu de contexte et n'ont pas la même fréquence d'usage (une fois vs en permanence): deux skills séparés auraient plus de sens plutôt qu'un seul fourre-tout.

**4. Écrire le `SKILL.md`.** Frontmatter avec `name` et `description` (le champ qui pilote le déclenchement, donc décrit précisément quand l'utiliser, pas vaguement). Corps du fichier: déclencheur, étapes concrètes, règle centrale (ici: vérifier en direct plutôt que de faire confiance à un fichier périmé ou à une intuition), points d'attention, section "Todo" pour ce qui reste à approfondir sans l'inventer.

**5. Validation avant toute création, jamais automatique.** Même après avoir identifié qu'un sujet mériterait un skill, la création elle-même attend toujours une confirmation explicite. C'est vrai pour la création initiale d'un skill, et c'est vrai pour les candidats identifiés a posteriori dans `candidate-skills.md`: être repéré comme candidat ne veut pas dire être créé, seulement proposé.

**6. Mise à jour continue, pas figé une fois pour toutes.** Toute correction ou tout apprentissage découvert en travaillant est répercuté dans le skill concerné directement, dans le même échange, sans attendre qu'on le demande.

## Process de gestion des skills à partir de maintenant

- Une techno nouvelle à apprendre → `learn-a-tech <techno>`, produit/actualise `references/<techno>.md`.
- Un sous-thème rencontré pendant cette recherche est assez riche pour devenir un skill → noté dans `candidate-skills.md`, jamais créé sans validation.
- Un besoin exprimé correspond à un candidat déjà noté → il est signalé, la création proposée, jamais automatique.
- Un nouveau skill est créé → penser à vérifier qu'il apparaît bien dans ce repo (`skills/<catégorie>/<nom>/`) et reste accessible depuis le site.
- `skill-creator` (fourni par Anthropic, dans `synced/`) reste disponible pour optimiser la `description` d'un skill une fois qu'il a tourné en conditions réelles, pas en théorie avant d'avoir des cas d'usage concrets.
