# Notes Saltbox — vérifié le 2026-09-23

Recherche ciblée (pas une doc large): périmètre = déploiement de conteneurs custom (`advanced/your-own-containers/`) et création de rôles Ansible custom, pages directement liées.

## 1. Qu'est-ce que Saltbox

Framework d'auto-hébergement basé Docker, piloté par Ansible, avec reverse proxy Traefik et gestion DNS intégrés. Toute application est exposée en HTTPS via un sous-domaine (`appname.tondomaine.tld`), jamais en IP:port direct — les ports des conteneurs restent internes au réseau Docker `saltbox`.

## 2. Trois méthodes pour déployer une app hors catalogue Saltbox

Décrites sur `advanced/your-own-containers/`:

1. **Docker Compose + module "Traefik Template"** — méthode recommandée pour une app GUI/web service. Génère un compose pré-câblé avec Traefik.
2. **Docker CLI en fonction shell** — pour un utilitaire ligne de commande invoqué ponctuellement (fonction ajoutée à `.bashrc`/`.zshrc`, configurable via l'Inventory: `shell_bash_bashrc_block_custom` / `shell_zsh_zshrc_block_custom`). Pas pertinent pour une app web comme Backstage.
3. **Rôle Ansible custom via `saltbox_mod`** — pour une automatisation complète et réutilisable, nécessite d'être à l'aise avec YAML/Jinja2.

## 3. Module "Traefik Template" (méthode 1)

- Génération: `sb install generate-traefik-template`, répond aux prompts (domaine, nom d'app, chemin des données), le fichier sort par défaut en `/tmp/docker-compose.yml`.
- Déplacement conventionnel: `mkdir /opt/appname && mv /tmp/docker-compose.yml /opt/appname/compose.yaml`, puis édition manuelle (image/tag, env vars, chemins de volumes — attention, toutes les images n'utilisent pas `/config`).
- Structure générée: service avec `restart: unless-stopped`, `networks: [saltbox]`, labels Traefik (`traefik.enable=true`, routers HTTP+HTTPS, `traefik.http.services.<app>.loadbalancer.server.port`), certresolver `cfdns` (Cloudflare DNS) ou `httpresolver` (validation HTTP, nécessite `http_validation` activé dans `adv_settings.yml`).
- Middlewares chaînés possibles: `globalHeaders@file`, `redirect-to-https@docker`, `robotHeaders@file`, `cloudflarewarp@docker`, `authelia@docker` (authentification sur les routes principales, avec un routeur séparé pour les endpoints API qui doit bypasser Authelia).
- Prérequis DNS: un enregistrement A pour `appname.tondomaine.tld` doit exister avant.

## 4. Création d'un rôle custom via `saltbox_mod`

C'est le mécanisme le plus riche et le plus réutilisable (celui explicitement demandé pour d'autres projets futurs).

**Installation de saltbox_mod:**
- `sb install saltbox-mod`, ou manuellement `git clone https://github.com/saltyorg/saltbox_mod.git /opt/saltbox_mod`.

**Procédure officielle pour un rôle from scratch (6 étapes):**
1. `mkdir -p /opt/saltbox_mod/roles/newrole/{defaults,tasks}`
2. `touch /opt/saltbox_mod/roles/newrole/{defaults,tasks}/main.yml`
3. Remplir `defaults/main.yml` (variables) et `tasks/main.yml` (tâches).
4. (Legacy, déconseillé) variables custom dans `/opt/saltbox_mod/settings.yml` — le système d'Inventory est désormais préféré à cette méthode.
5. Enregistrer le rôle dans `/opt/saltbox_mod/saltbox_mod.yml`, sous `roles:` — ajouter: `- { role: newrole, tags: ['newrole'] }`
6. Déployer: `sb install mod-newrole` ou `sudo ansible-playbook saltbox_mod.yml --tags newrole`

Le rôle `pre_tasks` est obligatoire dans le playbook, ne jamais le retirer.

**ATTENTION, section historique (ancienne convention, périmée): le rôle template `helloworld`** (`saltbox_mod/roles/helloworld/`) date de février 2026 et ne doit PAS servir de modèle, voir la correction plus bas et prendre `Sandbox/AGENTS.md` et le rôle `authentik` mainline. Son contenu, vérifié verbatim, reste utile pour comprendre le mécanisme général (variables par familles, tasks partagées):

`defaults/main.yml` établit, par convention, pour chaque rôle `<role>`, les familles de variables suivantes (toutes préfixées `<role>_`):
- **Paths**: `<role>_paths_folder`, `<role>_paths_location` (= `{{ server_appdata_path }}/<role>_paths_folder`), `<role>_paths_folders_list`.
- **Web**: `<role>_web_subdomain` (défaut = nom du rôle), `<role>_web_domain` (= `{{ user.domain }}`), `<role>_web_port`, `<role>_web_url` (construit à partir des deux précédents).
- **DNS**: `<role>_dns_record`, `<role>_dns_zone`, `<role>_dns_proxy` (= `{{ dns.proxied }}`).
- **Traefik**: `<role>_traefik_sso_middleware` (= `{{ traefik_default_sso_middleware }}`, mettre à `""` si pas d'auth Authelia voulue), `<role>_traefik_middleware_default`, `<role>_traefik_middleware_custom`, `<role>_traefik_certresolver`, `<role>_traefik_enabled`, `<role>_traefik_api_enabled`, `<role>_traefik_api_endpoint`.
- **Docker**: `<role>_docker_container`, `<role>_docker_image_pull`, `<role>_docker_image_tag`, `<role>_docker_image`, `<role>_docker_ports(_default/_custom)`, `<role>_docker_envs(_default/_custom)` (combinées via le filtre Jinja `combine`), `<role>_docker_volumes(_default/_custom)`, `<role>_docker_devices(_default/_custom)`, `<role>_docker_hosts(_default/_custom)`, `<role>_docker_labels(_default/_custom)`, `<role>_docker_hostname`, `<role>_docker_networks_alias`, `<role>_docker_networks(_default/_custom)`, `<role>_docker_capabilities(_default/_custom)`, `<role>_docker_security_opts(_default/_custom)`, `<role>_docker_restart_policy` (= `unless-stopped`), `<role>_docker_state` (= `started`).

Pattern systématique: chaque variable "composée" (env, volumes, labels, etc.) existe en paire `_default` (fixée par le rôle, ne pas toucher) + `_custom` (vide par défaut, prévue pour surcharge côté utilisateur), combinées via `combine()` (dicts) ou `+` (listes).

**Documentation d'un rôle — pas de convention interne au rôle**: vérifié sur plusieurs rôles mainline (`postgres`, `sonarr`) et sur `helloworld`, aucun n'a de `README.md` dans son propre dossier (`defaults/` + `tasks/` seulement). La doc de chaque app mainline vit dans un repo séparé, `saltyorg/docs` (`docs/apps/<app>.md`), en partie auto-générée par un outil interne à l'équipe (`sb-docs`, sections marquées "DO NOT EDIT MANUALLY") — non applicable tel quel à un rôle custom. Le pattern éditorial qui s'en dégage et reste réutilisable pour documenter un rôle custom "à la main": **Overview** (quoi/pourquoi) → **Deployment** (commande d'install) → **Usage**/**Configuration** (accès, variables clés).

`tasks/main.yml` du template `helloworld` (verbatim, 4 tâches seulement, chacune déléguée à des tasks partagées Saltbox):
```yaml
- name: Add DNS record
  ansible.builtin.include_tasks: "{{ resources_tasks_path }}/dns/tasker.yml"
  vars:
    dns_record: "{{ lookup('vars', role_name + '_dns_record') }}"
    dns_zone: "{{ lookup('vars', role_name + '_dns_zone') }}"
    dns_proxy: "{{ lookup('vars', role_name + '_dns_proxy') }}"

- name: Remove existing Docker container
  ansible.builtin.include_tasks: "{{ resources_tasks_path }}/docker/remove_docker_container.yml"

- name: Create directories
  ansible.builtin.include_tasks: "{{ resources_tasks_path }}/directories/create_directories.yml"

- name: Create Docker container
  ansible.builtin.include_tasks: "{{ resources_tasks_path }}/docker/create_docker_container.yml"
```
Un rôle custom minimal n'a donc pas à réécrire la logique Docker/DNS/Traefik lui-même: il déclare des variables suivant la convention `<role>_*`, et délègue l'exécution à des tasks partagées (`resources_tasks_path`) fournies par Saltbox — c'est le vrai mécanisme d'intégration.

## 4bis. Rôle `postgres` natif de Saltbox (pour une app custom qui a besoin d'une BDD)

Découvert en écrivant un rôle custom réel pour une app nécessitant Postgres: **ne pas embarquer un conteneur Postgres fait main dans un rôle custom `saltbox_mod`**. Le repo principal `saltyorg/Saltbox` (distinct de `saltbox_mod`) fournit déjà un rôle `postgres` en catalogue, nettement plus riche que le pattern `<role>_*` simple du template `helloworld`: gestion de plusieurs instances nommées, persistance via bind-mount, et migration automatique sûre en cas de changement de version majeure de l'image (sauvegarde de l'ancien répertoire de données avant bascule, rollback si échec).

**Ajouter une instance dédiée** (dans l'Inventory, `host_vars/localhost.yml`):
```yaml
postgres_instances: ["postgres", "moninstance"]
```

**Configurer les identifiants de cette instance** (convention confirmée en direct: `<nom_instance>_<variable>`, PAS de suffixe `_role_` côté override malgré ce suffixe présent dans les defaults internes du rôle):
```yaml
moninstance_docker_env_password: "..."
moninstance_docker_env_user: "..."
moninstance_docker_env_db: "..."
```

**Connexion depuis une autre app**: hostname = nom de l'instance (ex. `moninstance`), port `5432` (interne au réseau `saltbox`, jamais exposé). Comme les deux rôles (celui de l'app custom et `postgres`) partagent le même Inventory host-level, une app custom peut référencer directement ces mêmes variables (`moninstance_docker_env_password`, etc.) dans ses propres `_docker_envs_default`, une seule source de vérité, pas de duplication de secret.

**Déploiement**: `sb install postgres` (recrée toutes les instances listées dans `postgres_instances`, pas seulement les nouvelles).

**Correction (vérifié le 2026-09-23): les deux conventions ne "coexistent" pas, l'ancienne est périmée.** Le template `helloworld` de `saltbox_mod` et celui de `Sandpit` (derniers commits février 2026, README de Sandpit: "DO NOT TRY TO USE THIS YET") suivent l'ancienne convention (`<role>_*`, `lookup('vars', role_name + ...)`, `dns.proxied`). Depuis la refonte documentée sur https://docs.saltbox.dev/saltbox/upgrade/role-refactor/, la convention en vigueur est `<role>_role_*` + `lookup('role_var', '_suffixe', role='<role>')` + `lookup('role_web', ...)` + `dns_proxied`, avec `main.yml` (boucle d'instances) et `main2.yml` si multi-instances. Ne jamais copier `helloworld` (saltbox_mod ou Sandpit) comme modèle.

**Sources faisant foi pour écrire un rôle actuel:**
- `saltyorg/Sandbox` (add-ons officiels, actif), guide de rédaction `AGENTS.md`: ordre des sections (Basics, Settings, Postgres, Redis, Paths, Web, DNS, Traefik, Ports, Docker, Dependencies), `role=` explicite dans chaque `role_var`, contrat Traefik API complet, pas de `_docker_state`, secrets persistés via `saltbox_facts`, linters `ansible-lint` et `saltbox-lint`.
- `saltyorg/Saltbox` (mainline, rôles en production), modèle d'une appli web avec base: `roles/authentik` (importe le rôle `postgres` depuis le rôle avec un toggle `_postgres_deploy`, instance `<app>-postgres`, healthcheck `pg_isready`, attente `healthy` avant de créer l'appli, secret via `saltbox_facts`). Le mainline n'a pas d'`AGENTS.md`.
- Un rôle qui a besoin d'une base la déploie donc lui-même (pas d'édition de `postgres_instances` dans l'Inventaire par l'utilisateur).

## 5. Système d'Inventory (config sans toucher aux rôles)

- Fichier central: `/srv/git/saltbox/inventories/host_vars/localhost.yml`.
- But: surcharger des variables de rôle sans éditer le rôle lui-même (évite les conflits lors des mises à jour Git de Saltbox).
- Convention `_default` (ne jamais surcharger directement, sinon perte de toute la base) vs `_custom` (prévue pour l'ajout utilisateur), ex.:
```yaml
sonarr_role_docker_image_tag: "nightly"
code_server_role_docker_volumes_custom:
  - "/srv:/host_srv"
  - "/home:/host_home"
```
- Portée: variable **role-scoped** (`sonarr_role_example_key`, s'applique à toutes les instances du rôle) vs **instance-scoped** (`sonarr4k_example_key`, une instance précise) — l'instance-scoped a précédence sur le role-scoped.
- Changements actifs seulement après ré-exécution de la commande d'install correspondante (pas de hot-reload).

## 6. Domaine et DNS

- Un domaine est obligatoire: toute app est en `https://appname.tondomaine.tld`, jamais accessible en IP:port direct.
- DNS: wildcard `*` recommandé (un seul enregistrement A couvre tous les sous-domaines) ou enregistrements A individuels par sous-domaine (obligatoire pour certains bundles comme Mediabox/Feederbox).
- Automatisation Cloudflare possible via `Global API Key + email compte` (préféré) ou un token scopé, configurés dans `/srv/git/saltbox/accounts.yml` — Saltbox crée alors les enregistrements DNS requis automatiquement à l'installation.
- TLDs incompatibles avec l'API DNS Cloudflare: `.cf`, `.ga`, `.gq`, `.ml`, `.tk`.

## Points d'attention / pièges

- Saltbox se présente et se documente avant tout comme un framework **media server / homelab** (exemples systématiques: Sonarr, Radarr, Plex, qBittorrent...), pas comme une plateforme pensée pour des outils d'entreprise — la doc elle-même ne couvre jamais ce cas d'usage. Confirmé malgré tout comme cible retenue par l'utilisateur (Portainer y est installé comme une app Saltbox parmi d'autres), donc pas un blocage, juste à garder en tête que rien dans la doc officielle ne valide ce type d'usage.
- Ne jamais embarquer un conteneur Postgres fait main dans un rôle custom: le rôle `postgres` natif de Saltbox (catalogue mainline, section 4bis) gère déjà ça correctement (instances multiples, persistance, migrations de version majeure sûres).
- Ne jamais surcharger une variable `_default` dans l'Inventory: ça remplace entièrement la valeur au lieu de l'étendre. Toujours utiliser le pendant `_custom`.
- Le rôle `pre_tasks` dans `saltbox_mod.yml` est obligatoire, ne pas le retirer en éditant le playbook pour ajouter un rôle custom.
- Le générateur "Traefik Template" (méthode 1) écrit toujours d'abord dans `/tmp/`, penser à le déplacer avant qu'il ne soit perdu/écrasé, et vérifier le chemin de volume réel attendu par l'image (pas toujours `/config`).
- Deux routeurs Traefik distincts sont nécessaires si l'app expose une API à part de son UI: l'UI passe par `authelia@docker`, l'API doit avoir son propre routeur qui bypass ce middleware.

## Liens utiles

- https://docs.saltbox.dev/advanced/your-own-containers/ (point d'entrée de cette recherche)
- https://docs.saltbox.dev/reference/modules/traefik_template/
- https://github.com/saltyorg/saltbox_mod (README + rôle template `roles/helloworld/`)
- https://raw.githubusercontent.com/saltyorg/saltbox_mod/master/roles/helloworld/defaults/main.yml
- https://raw.githubusercontent.com/saltyorg/saltbox_mod/master/roles/helloworld/tasks/main.yml
- https://docs.saltbox.dev/saltbox/inventory/
- https://docs.saltbox.dev/reference/domain/
- https://docs.saltbox.dev/apps/postgres/
- https://raw.githubusercontent.com/saltyorg/Saltbox/master/roles/postgres/defaults/main.yml
- https://raw.githubusercontent.com/saltyorg/Saltbox/master/roles/postgres/tasks/main.yml (+ main2.yml, logique de migration)

## Non confirmé / à vérifier

- Le contenu des pages `docs.saltbox.dev` a été lu via un outil de fetch qui résume/reformate le HTML (pas un accès brut), sauf les fichiers `helloworld` et `postgres` récupérés en brut (`raw.githubusercontent.com`), ceux-là vérifiés verbatim. Les structures YAML citées pour le module Traefik Template et l'Inventory sont donc des résumés fidèles mais pas des copies littérales garanties à 100% — à recroiser avec un `sb install` réel avant de s'appuyer dessus pour écrire un rôle en production.
- Méthode 2 (Docker CLI en fonction shell) non creusée en détail au-delà de l'exemple `yt-dlp` — hors périmètre pour une app web comme Backstage, non approfondie volontairement.
- Pas vérifié en conditions réelles (pas de host Saltbox disponible ici): tout ce qui précède est basé sur la doc et le code source des rôles, pas sur une exécution `sb install` effective. Le rôle `backstage` écrit dans `Mathod95/saltbox` suit cette convention mais n'a pas encore tourné sur un vrai host.
- Port exact du backend Backstage en prod (`7007` supposé, standard connu du nouveau backend system, mais pas re-vérifié contre une doc de déploiement dédiée lors de cette passe) et nom exact des secrets applicatifs (`backend.auth.keys`, client OAuth GitHub) — à confirmer une fois l'app-config réel du repo `Mathod95/backstage` écrit.
