# Candidats de futurs skills

Backlog des sous-thèmes rencontrés pendant des recherches `learn-a-tech`, assez riches/procéduraux pour mériter un skill dédié plus tard. Jamais créés automatiquement, toujours proposés puis validés avec l'utilisateur avant création (voir `SKILL.md`, section "Candidats de futurs skills").

Format d'entrée:
```markdown
- **<catégorie>/<nom-de-skill>** — <justification en une phrase>.
  Source: recherche <techno> du <date>, cf. references/<techno>.md section <section>.
```

## Candidats identifiés

- **crossplane/manage-lifecycle** — gestion de `managementPolicies` (bascule Observe → `*`, import de ressources existantes via `crossplane.io/external-name`, orphelinage automatique à la destruction brutale d'un cluster). Assez de nuances et d'étapes pour mériter un skill dédié plutôt que de rester juste un fait dans les notes.
  Source: recherche crossplane du 2026-09-22, cf. references/crossplane.md section 4.

- **saltbox/create-custom-role** — création d'un rôle Ansible custom via `saltbox_mod` pour déployer une app hors catalogue Saltbox: structure de dossiers, convention de variables `<role>_*_default`/`_custom` (paths/web/dns/traefik/docker), copie du template `helloworld`, enregistrement dans `saltbox_mod.yml`, délégation aux tasks partagées (`resources_tasks_path`) plutôt que réécrire la logique Docker/DNS/Traefik. Plusieurs étapes et pièges réels (ne jamais surcharger une variable `_default`, rôle `pre_tasks` obligatoire), explicitement signalé par l'utilisateur comme réutilisable pour de futurs projets, pas juste ce cas Backstage.
  Source: recherche saltbox du 2026-09-23, cf. references/saltbox.md section 4.
