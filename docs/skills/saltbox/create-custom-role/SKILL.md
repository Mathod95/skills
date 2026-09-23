---
name: create-custom-role
description: Crée ou revoit un rôle Ansible custom pour Saltbox (déployer une app Docker hors catalogue via saltbox_mod, avec ou sans base de données). À utiliser quand l'utilisateur demande de créer, porter, corriger ou vérifier un rôle Saltbox custom. Ne jamais partir du template helloworld ni de la mémoire, la convention Saltbox a changé en 2026, toujours vérifier contre le guide Sandbox/AGENTS.md en direct.
---

La règle centrale: **la convention des rôles Saltbox a fait l'objet d'une refonte, le template `helloworld` (saltbox_mod et Sandpit) est obsolète.** Ne jamais écrire un rôle de mémoire ni en copiant `helloworld`. Toujours repartir des sources actuelles, listées ci-dessous, et valider avec les deux linters avant de dire qu'un rôle est correct.

Contexte détaillé et sources: `${CLAUDE_SKILL_DIR}/../../research/learn-a-tech/references/saltbox.md`. Ce skill est la procédure, la référence contient les faits.

## Déclencheur

- "crée / écris / porte un rôle Saltbox pour <app>".
- "vérifie / corrige ce rôle Saltbox" (rôle existant, ex. un ancien rôle à mettre à jour).

## Étape 0 : relire les sources faisant foi (toujours, en direct)

1. Guide de rédaction: `curl -s https://raw.githubusercontent.com/saltyorg/Sandbox/master/AGENTS.md`. Le lire en entier, il évolue (la convention a changé en 2026). Il prime sur tout ce qui est écrit ici.
2. Choisir 1 à 2 **rôles modèles actuels comparables** à l'app à écrire, dans `saltyorg/Sandbox` (181 rôles, le plus grand corpus) ou `saltyorg/Saltbox` (rôles en production). Pas de `helloworld`, pas de rôle marqué deprecated, migration ou `No CI`. Exemples: appli web avec Postgres → `authentik` (Saltbox), `linkwarden`, `n8n` (Sandbox); avec Redis → `paperless_ngx`; TimescaleDB → `tracearr`.
3. Vérifier la collision de nom: aucun rôle ni tag du même nom dans Sandbox ni Saltbox (`curl -s https://api.github.com/repos/saltyorg/<Saltbox|Sandbox>/contents/roles`).
4. Ne jamais contribuer sans demande: un dépôt de rôles perso reste perso.

## Étape 1 : décider de la forme

- Appli simple (un conteneur, un port web): structure `defaults/main.yml` + `tasks/main.yml`.
- Multi-instances: `<role>_instances`, boucle dans `tasks/main.yml`, travail par instance dans `tasks/main2.yml`.
- Appli avec base: **le rôle déploie lui-même la base** via `include_role` (`postgres`, `redis`, `mariadb`, `timescaledb` du dépôt principal), avec un toggle `<role>_role_postgres_deploy`. Ne jamais demander à l'utilisateur d'éditer `postgres_instances` dans l'Inventory, ne jamais embarquer un conteneur Postgres fait main.
- Vérifier d'abord si l'app n'existe pas déjà dans Sandbox: la réutiliser telle quelle (copie fidèle, attribution) plutôt que la réécrire.

## Étape 2 : `defaults/main.yml`

Règles vérifiées (voir `AGENTS.md` pour le détail complet):
- Variables `<role>_name` puis `<role>_role_*`, jamais `<role>_*` nu. Toute lecture par `lookup('role_var', '_suffixe', role='<role>')` avec `role=` **explicite**.
- Ordre des sections: Basics, Settings, Postgres/Redis (sections nommées ainsi), Paths, Web, DNS, Traefik, (Ports), Docker, Dependencies.
- Web: `lookup('role_web', role='<role>', scheme='https')`. DNS: `dns_proxied` (pas `dns.proxied`, ancien).
- Traefik: contrat API **complet** (`middleware_default_api` = `traefik_default_middleware_api`, `middleware_custom_api`, `api_enabled`, `api_endpoint`).
- Docker: container, image (repo + tag + composée), hostname, networks (`docker_networks_common + default + custom`), restart policy. Pas de `_docker_state`, pas de sections vides (volumes, ports, etc. seulement si utilisés). Une appli sans état n'a pas de volumes, c'est normal.
- Envs: `_docker_envs_default` + `_docker_envs_custom` combinés, `_custom` est la dernière couche d'override et ne sert jamais à calculer un défaut.
- Dependencies: `_depends_on` (noms de conteneurs), `_depends_on_delay: "0"`, `_depends_on_healthchecks: "false"` (valeurs constatées dans les rôles avec base).
- En-tête standard (titre, auteur, URL, GPL) sur chaque fichier source, commentaires en ASCII, en anglais.
- Secrets générés: `saltbox_facts` (persisté, stable entre les runs), exposés par une variable de rôle dont le défaut est le fact, et **validés** (non vide, format) avant la création du conteneur.

## Étape 3 : `tasks/main.yml`

Enchaînement le plus courant (115 rôles web sur 180): DNS, suppression du conteneur, création des dossiers, création du conteneur, via `resources_tasks_path` (`dns/tasker.yml`, `docker/remove_docker_container.yml`, `directories/create_directories.yml`, `docker/create_docker_container.yml`). Avec une base: supprimer le conteneur de l'appli **avant** d'importer le rôle de base, importer la base (image, chemin, db, utilisateur et mot de passe passés en variables `postgres_role_*`, healthcheck `pg_isready`), DNS, créer le conteneur. `include_tasks`/`include_role` uniquement, jamais d'import statique. Les lookups des tâches DNS s'écrivent `lookup('role_var', '_dns_record')` sans `role=`.

## Étape 4 : valider (obligatoire, pas de "ça devrait marcher")

```bash
${CLAUDE_SKILL_DIR}/scripts/lint-role.sh <repo> roles/<role>
```

Le script installe au premier lancement (utilisateur, sans sudo) `saltbox-lint` (binaire Go officiel, checksum vérifié) et `ansible-lint` (versions du dépôt Saltbox), puis lance les deux avec la configuration de Sandbox. Attendu: `saltbox-lint: clean` et `Passed: 0 failure(s)`. Corriger les vraies remarques; une erreur `unknown-module` ou `role not found` vient de l'environnement (collection ou chemin), pas du rôle.

Ce que le lint ne prouve pas: un run réel. Sans hôte Saltbox de test, le dire explicitement ("vérifié statiquement, pas exécuté").

## Étape 5 : documenter et livrer

- `README.md` dans le rôle (Overview, Requirements, Deployment, Usage, Configuration, persistance des données), en anglais si le rôle est partagé. Saltbox n'a pas de README dans les rôles (leur doc est générée ailleurs), c'est un choix de l'utilisateur.
- Enregistrer le rôle: ligne `- { role: <role>, tags: ['<tag>'] }` dans `saltbox_mod.yml` (tags en kebab-case, `pre_tasks` obligatoire).
- Process hôte: voir la section "Déploiement sur l'hôte" du README du dépôt de rôles. Toujours rappeler les prérequis (Authelia si le middleware SSO est activé, image publique ou `docker login`).

## Points d'attention appris

- L'ancienne convention est encore présente dans `saltbox_mod/helloworld` et `Sandpit` (figés depuis février 2026, Sandpit dit "DO NOT TRY TO USE THIS YET"). Le mécanisme `saltbox_mod` reste valide (son `ansible.cfg` charge les plugins actuels: `role_var`, `role_web`, `saltbox_facts`), seul le template est périmé.
- Le guide (`AGENTS.md`) parle du linter Go, la CI de Sandbox lançait encore le linter Python: lancer le Go.
- **Les linters ne vérifient pas que les plugins existent sur l'hôte.** Constaté au premier vrai run: `The lookup plugin 'role_web' was not found`, parce que l'hôte avait un Saltbox antérieur au 2026-08-24 (date d'ajout de `role_web`, alors que `role_var` et `docker_vars` existaient déjà). Les deux linters étaient pourtant propres. Un rôle écrit dans la convention actuelle exige un Saltbox à jour: indiquer `sb update` dans les prérequis et, en cas d'erreur de plugin, suspecter d'abord la version de Saltbox de l'hôte (les rôles Sandbox comme `tracearr` ont la même contrainte).
- **Le rôle installe et met à jour, il ne configure jamais l'application.** URLs publiques, authentification, titre, options fonctionnelles: tout ça vit dans la config de l'appli (son propre dépôt/image), pour que la même image reste déployable ailleurs (Kubernetes, etc.). Le rôle ne passe que le câblage d'infrastructure que l'appli attend déjà (ex. variables de connexion à la base). Ne pas contourner un manque de config applicative par des variables d'environnement `APP_CONFIG_*` ou équivalent dans le rôle, ni par une consigne d'Inventory dans le README: signaler à l'utilisateur que la config est à corriger dans le dépôt de l'appli. Erreur commise une fois: injecter les `baseUrl` de Backstage depuis le rôle.
- Une image applicative stock peut ne pas fonctionner en production sans configuration (ex. Backstage: `guest` désactivé quand `NODE_ENV=production`, `baseUrl` en `localhost`). Le dire à l'utilisateur, la correction va dans le dépôt de l'appli, pas dans le rôle.
- Un mot de passe de base laissé vide retombe sur le défaut du rôle `postgres` (`password4321`), acceptable en réseau interne mais un secret généré via `saltbox_facts` est plus sûr (précédent: `teslamate`).

## Todo / à approfondir

- Rien testé sur un hôte réel dans ce skill: à compléter avec les vrais retours du premier `sb install mod-<role>`.
- Le détail de `sb install mod-<tag>` (résolution des tags saltbox_mod) vient du README de saltbox_mod, pas vérifié dans le binaire `sb`.
