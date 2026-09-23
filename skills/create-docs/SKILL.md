---
name: create-docs
description: Gère le cycle de vie d'un site de documentation zensical sur un projet. Deux cas d'usage - (1) scaffold initial quand l'utilisateur demande de rédiger de la documentation sur un projet sans structure zensical (pas de zensical.toml), (2) sur un projet déjà scaffoldé, à utiliser à chaque fois que l'utilisateur demande de toucher à la doc: vérifier si la version de zensical installée est à jour et proposer l'upgrade si une nouvelle version est disponible.
---

Source: doc officielle zensical (https://zensical.org/docs/), vérifiée le 2026-09-02.

Ce skill se met à jour en continu: toute nouvelle découverte pendant son usage (erreur rencontrée, comportement réel différent de la doc, décision prise avec l'utilisateur) doit être répercutée directement dans ce fichier, dans le même échange, sans attendre que l'utilisateur le demande.

## Cas 1: aucune structure zensical (scaffold initial)

1. Vérifier qu'il n'existe pas déjà un `zensical.toml` ou un `mkdocs.yml` dans le projet (ne pas rescaffolder par-dessus une config existante).
2. Proposer le plan à l'utilisateur avant de toucher au disque (quels fichiers vont être créés) et attendre sa validation.
3. Installer zensical dans un environnement virtuel Python:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install zensical
   ```
   Si la création du venv échoue avec une erreur `ensurepip is not available` (paquet `python3-venv` absent du système), proposer à l'utilisateur d'installer le paquet correspondant à la version affichée dans l'erreur (ex. `sudo apt install python3.13-venv`) avant de continuer. C'est une modification système, jamais l'exécuter sans confirmation explicite.
4. Scaffolder le site à la racine du projet:
   ```bash
   zensical new .
   ```
   Génère:
   ```
   .
   ├─ .github/workflows/
   │  └─ docs.yml
   ├─ docs/
   │  ├─ index.md
   │  └─ markdown.md
   └─ zensical.toml
   ```
   Le déclencheur du workflow généré (`on: push: branches: [master, main]`) n'a **aucun filtre de chemin** par défaut: il se déclenche sur n'importe quel push sur la branche par défaut, même si rien dans `docs/` n'a changé. Ajouter un filtre `paths:` (syntaxe GitHub Actions, à ne pas confondre avec `changes:` qui est la syntaxe équivalente côté GitLab CI), sous `push:`, au même niveau que `branches:`:
   ```yaml
   on:
     push:
       branches:
         - master
         - main
       paths:
         - 'docs/**'
         - 'zensical.toml'
         - '.github/workflows/docs.yml'
   ```
5. Compléter la section `[project]` de `zensical.toml`:
   - `site_name`: dérivé du nom du repo (champ obligatoire, seul champ requis par zensical).
   - `site_url`: dérivé du nom du repo. Pour un repo hébergé sur GitHub avec Pages, format `https://<user-github>.github.io/<repo>/`. Pour un autre hébergeur (ex. GitLab Pages), adapter au format réel de publication, ne pas réutiliser le format GitHub par défaut.
   - `site_description`: laissé commenté sauf si l'utilisateur en fournit une explicitement, ne jamais l'inventer.
   - `site_author`: nom de l'utilisateur (voir CLAUDE.md global/projet si disponible), à confirmer si absent.
   - `copyright`, `repo_url`, `repo_name`, `edit_uri`: à remplir aussi (pas seulement les 4 champs ci-dessus), dérivés du remote git du projet (`git remote -v`) et de sa branche par défaut.
6. Appliquer les overrides de features listés dans `${CLAUDE_SKILL_DIR}/overrides.toml` (activer celles de `enable`, désactiver/commenter celles de `disable`, dans la section `[project.theme] features` du `zensical.toml` généré à l'étape 4). Ne jamais remplacer le fichier généré par un template figé, seulement appliquer ce delta ciblé sur le fichier frais, pour ne pas masquer une feature ajoutée entre-temps par une nouvelle version de zensical. Si `enable`/`disable` sont vides, ne rien faire à cette étape.
7. Installer les personnalisations standards du skill (celles que l'utilisateur veut sur tous ses projets zensical, pas seulement celui-ci). Deux mécanismes distincts, ne jamais les confondre (voir "Points d'attention" pour la différence):
   - **Assets JS/CSS** (comportement/style ajouté côté navigateur, après le rendu): chaque dossier sous `${CLAUDE_SKILL_DIR}/assets/<nom-script>/` contient une paire `.js`/`.css` à copier vers `docs/javascripts/` et `docs/stylesheets/` du nouveau projet, avec les entrées correspondantes ajoutées dans `zensical.toml` (`extra_css`, `extra_javascript`). Liste actuelle: `toggle-sidebar` (bascule nav/sommaire via bouton + raccourcis clavier `b`/`m`/`t`).
   - **Overrides de template** (structure HTML modifiée côté build, avant le rendu): `${CLAUDE_SKILL_DIR}/assets/overrides/` contient l'arborescence à copier telle quelle vers `overrides/` à la racine du nouveau projet, en s'assurant que `custom_dir = "overrides"` est actif dans `[project.theme]` de `zensical.toml`. Liste actuelle: `partials/toc.html` (titre "On this page" du sommaire rendu cliquable, pour remonter en haut de page depuis n'importe quelle ancre).
   Ces deux listes s'enrichissent au fil de ce qu'on construit et valide ensemble, jamais en anticipant quelque chose de pas encore écrit.
8. Vérifier en local:
   ```bash
   zensical serve
   ```
   Sert sur `localhost:8000` par défaut, rechargement automatique sur modification. Lancer en arrière-plan (c'est un serveur, pas une commande ponctuelle) et vérifier avec `curl` plutôt que `--open`: dans un environnement sans navigateur accessible (ex. WSL/session distante), `--open` ne peut rien ouvrir. Créé aussi au passage `.cache/` et `site/` à la racine (pas seulement `zensical build`), à couvrir par le `.gitignore` de l'étape 10.
9. Build de contrôle si besoin:
   ```bash
   zensical build
   ```
   Sortie dans le dossier configuré par `site_dir` (par défaut `site`). Ne jamais ajouter `--clean` par défaut, ce flag vide le cache et ralentit chaque build, à réserver au dépannage (voir "Points d'attention").
10. Créer ou compléter le `.gitignore` à la racine du projet, avec au minimum:
   ```
   .venv/
   .cache/
   site/
   ```
   Si un `.gitignore` existe déjà, ne jamais l'écraser: le lire d'abord, puis n'ajouter que les entrées manquantes parmi celles-ci, en préservant tout le reste de son contenu.

## Cas 2: projet déjà scaffoldé (zensical.toml présent)

Avant de travailler sur la doc (rédaction, modification), vérifier que la version locale de zensical est à jour:

1. Dans le venv du projet (l'activer d'abord si besoin: `source .venv/bin/activate`):
   ```bash
   pip list --outdated
   ```
   Si `zensical` apparaît dans la liste, une version plus récente est disponible sur PyPI que celle installée localement.
2. Si une mise à jour existe, la signaler à l'utilisateur (version actuelle vs disponible). Zensical est encore en version `0.0.x` (alpha), donc rien n'est garanti stable même entre versions mineures, consulter le changelog (https://github.com/zensical/zensical/releases ou équivalent) avant de proposer la mise à jour. Proposer ensuite:
   ```bash
   pip install --upgrade --force-reinstall zensical
   ```
   (commande officielle, `--force-reinstall` inclus, voir https://zensical.org/docs/upgrade/#how-to-upgrade-with-pip). Ne jamais l'exécuter sans validation explicite, se contenter de proposer.
   Vérifier ensuite la version effectivement installée:
   ```bash
   pip show zensical
   ```
3. Continuer ensuite la tâche de doc demandée (rédaction/modification), que la mise à jour ait été acceptée ou non.

## Points d'attention

- **Assets JS/CSS vs overrides de template, ne jamais confondre**: `extra_javascript`/`extra_css` ajoutent du comportement/style **côté navigateur**, après que la page a déjà été générée et chargée (ex. `toggle-sidebar`, qui manipule le DOM une fois la page rendue). Un override sous `overrides/` (avec `custom_dir` actif) modifie directement le **template HTML côté build** (MiniJinja), avant que le HTML parte vers le navigateur, donc change la structure même de ce qui est généré (ex. `overrides/partials/toc.html`, qui rend le titre du sommaire cliquable en changeant le HTML émis). Les vrais templates par défaut de zensical, pour vérifier avant de recopier un override d'un autre projet plutôt que de faire confiance à l'ancien, sont installés dans le venv: `<venv>/lib/python*/site-packages/zensical/templates/`.
- **Icônes SVG custom façon Lucide (contour, pas remplies) dans un bouton `.md-header__button`/`.md-icon`**: le thème force `fill: currentcolor` sur tout `svg` sous `.md-icon` (règle CSS générée, vérifiée dans `site/assets/stylesheets/modern/main.*.min.css`), ce qui écrase l'attribut inline `fill="none"` d'un SVG stroke-only et le fait apparaître rempli en plein (fond moche). Le thème prévoit déjà le contournement: ajouter `class="lucide"` sur le `<svg>` active la règle `.md-icon svg.lucide{fill:#0000;stroke:currentcolor}` qui rétablit un rendu en contour. Toujours ajouter cette classe pour une icône custom de ce style, sinon le rendu est cassé silencieusement (pas d'erreur, juste un visuel faux).

- Le workflow généré (`.github/workflows/docs.yml`) suppose une publication via GitHub Pages. Si le dépôt est hébergé ailleurs (ex. GitLab), l'adapter au système de CI/publication réel de ce dépôt, à construire à partir de la doc officielle zensical, jamais en copiant la config d'un autre projet existant sans la revalider.
- Prérequis GitHub Pages avant le premier push: dans les settings du repo GitHub, `Settings > Pages > Build and deployment > Source` doit être réglé sur **GitHub Actions** (pas "Deploy from a branch"), sinon le workflow échoue dès l'étape `actions/configure-pages@v6`, avant même le checkout du code (toutes les étapes suivantes passent en "skipped"). Signaler ce prérequis à l'utilisateur juste après avoir généré le scaffold, avant qu'il ne push.
- `--clean` (sur `zensical build`) n'est **jamais** un réflexe par défaut en local: à utiliser seulement en dépannage, si le site rendu ne reflète pas ce qui a été écrit (contenu visiblement obsolète/incohérent), ou après une mise à jour de la version de zensical (source: doc officielle, "if unexpected output occurs after upgrading, run `zensical build --clean`"). En CI en revanche, c'est le comportement par défaut généré par `zensical new .` (le workflow `.github/workflows/docs.yml` l'utilise nativement) et la doc officielle recommande explicitement de ne pas mettre en cache le build sur CI pour l'instant ("At the moment, we do not recommend using caches on CI systems"), donc ne pas retirer `--clean` de ce workflow généré, la logique locale (éviter `--clean` pour profiter du cache) ne s'y applique pas.
- Ne jamais s'appuyer sur la configuration d'un autre projet existant (ex. le dépôt `docs/` d'openclassrooms) comme base ou référence de bonne pratique pour ce skill. Chaque projet scaffoldé via ce skill repart d'une installation fraîche, construite uniquement à partir de la doc officielle zensical et des choix explicites de l'utilisateur. Consulter un autre projet pour information reste possible, mais jamais pour en reprendre la config telle quelle.
- Une fois le scaffold en place, revenir au besoin initial de l'utilisateur (rédiger le contenu de la doc), le scaffold n'est qu'un préalable.
- **Zensical accepte aussi `mkdocs.yml`, pas seulement `zensical.toml`**: rencontré sur un projet où la doc tourne dans un conteneur Docker (`docker run zensical/zensical build`/`serve`, pas de venv Python), avec seulement `mkdocs.yml` à la racine du dossier monté (thème `zensical`, aucun `zensical.toml`). La version installée (`zensical --version` → `0.0.57`) lit ce `mkdocs.yml` sans problème (`zensical build` → "No issues found"). Ne pas supposer que l'absence de `zensical.toml` signifie automatiquement "config manquante" ou "version trop récente qui exige le nouveau format": vérifier d'abord avec un `docker run --rm -v <dossier>:/docs -w /docs zensical/zensical build` isolé avant de conclure à un problème de format de config.
- **Conteneur Docker `zensical-preview` bloqué en boucle `Restarting` avec `Error: No config file found in the current folder.` après un redémarrage d'hôte, alors que le `mkdocs.yml` est bien présent et valide**: diagnostic confirmé en isolant la variable avec un `docker run --rm` ponctuel (même image, mêmes volumes) qui, lui, fonctionne parfaitement (`build`/`serve` réussissent). La cause n'est donc ni l'image ni le fichier de config, mais un état interne corrompu du conteneur existant (probablement son cache `.cache/` embarqué ou une couche de filesystem désynchronisée après l'arrêt/redémarrage de l'environnement hôte). Fix vérifié: `docker rm -f <conteneur>` puis le recréer à l'identique (`docker inspect <conteneur> --format '{{json .HostConfig.PortBindings}}'`/`.RestartPolicy`/`.Config.Cmd`/`.Mounts` pour récupérer les paramètres exacts avant suppression, si le conteneur n'est pas géré par un `docker-compose.yml` versionné). Ne pas perdre de temps à déboguer l'état interne d'un conteneur de preview jetable, le recréer directement.

## Todo / à approfondir

- **Activer GitHub Pages automatiquement (sans passage manuel dans Settings)**: faisable via l'API GitHub, `POST /repos/{owner}/{repo}/pages` avec `{"build_type": "workflow", "source": {"branch": "<branche par défaut>"}}` (endpoint confirmé, doc officielle GitHub REST API Pages). Réserve importante: nécessite un Personal Access Token (scope `repo`) d'un admin du repo, le `GITHUB_TOKEN` intégré au workflow ne semble pas suffire pour cet appel d'après la doc. Revient donc à remplacer un clic dans Settings > Pages par la création et la fourniture d'un token, un vrai secret à gérer en plus, pas une simplification évidente. À implémenter seulement si l'utilisateur juge que l'automatisation vaut la gestion du token.
- **Domaine personnalisé (GitHub Pages)**: possible sans modifier le workflow généré, celui-ci uploade déjà tout `site/` comme artefact Pages. Piste non vérifiée empiriquement: déposer un fichier `CNAME` (contenant le nom de domaine) dans le dossier source `docs/`, en supposant qu'il soit copié tel quel vers `site/` au build (comportement standard des générateurs type mkdocs, pas confirmé spécifiquement pour zensical). Nécessite aussi de renseigner le domaine dans `Settings > Pages > Custom domain` côté GitHub (réglage séparé du pipeline). À tester sur un vrai projet avec un domaine avant d'ajouter ça comme étape ferme du "Cas 1".
