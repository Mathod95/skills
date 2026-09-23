# Notes Backstage — vérifié le 2026-09-23

Recherche menée sur la doc live https://backstage.io/docs et le repo backstage/backstage (master), en 5 passes parallèles par sous-thème. Version stable actuelle: **v1.55.1** (21/09/2026), next-line **v1.56.0-next.0** (22/09/2026).

## 1. Architecture, backend/frontend system

**Backend**: `@backstage/backend-defaults` / `createBackend()` reste le système par défaut et recommandé, stable, aucune instabilité signalée. `packages/backend/src/index.ts` généré par `create-app` (vérifié sur le template live):
```typescript
import { createBackend } from '@backstage/backend-defaults';
const backend = createBackend();
backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-notifications'));
backend.add(import('@backstage/plugin-techdocs-backend'));
backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'));
backend.add(import('@backstage/plugin-catalog-backend-module-logs'));
backend.add(import('@backstage/plugin-permission-backend'));
backend.add(import('@backstage/plugin-permission-backend-module-allow-all-policy'));
backend.add(import('@backstage/plugin-search-backend'));
backend.add(import('@backstage/plugin-search-backend-module-pg'));
backend.add(import('@backstage/plugin-search-backend-module-catalog'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs'));
backend.add(import('@backstage/plugin-kubernetes-backend'));
backend.add(import('@backstage/plugin-user-settings-backend'));
backend.add(import('@backstage/plugin-notifications-backend'));
backend.add(import('@backstage/plugin-signals-backend'));
backend.add(import('@backstage/plugin-mcp-actions-backend'));
backend.start();
```

**Frontend**: `createApp()` de `@backstage/frontend-defaults` est maintenant le **défaut réel de `create-app`** (confirmé via `packages/create-app/src/index.ts`: un flag `--legacy` existe désormais pour opter vers l'ANCIEN système, inversion complète par rapport à l'ancien flag `--next` qui servait à opter vers le nouveau).
```tsx
import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { navModule } from './modules/nav';
import { homeModule } from './modules/home';

export default createApp({
  features: [catalogPlugin, navModule, homeModule],
});
```
**Écart doc/réalité à noter**: la page prose `/docs/frontend-system/` dit toujours seulement "nous recommandons de migrer... sous un export `/alpha`", sans jamais affirmer explicitement que c'est stable/GA — alors que l'outil de scaffold en a déjà fait le défaut. Ne pas se fier uniquement au texte de la page pour juger de la maturité, l'outil est allé plus vite que la prose.

**Bootstrap**: `npx @backstage/create-app@latest`, Node 22 ou 24. **Yarn: écart doc/template détecté** — la page getting-started dit encore "4.4.1", mais le template généré pin réellement **4.13.0** (`.yarnrc.yml.hbs`, `package.json.hbs`). Se fier au template, pas à la prose, pour la version exacte.

**Layout monorepo**: `packages/app` (frontend) / `packages/backend` (backend, mount points séparés par plugin) — confirmé inchangé, aucune communication directe entre plugins backend, tout passe par HTTP/catalogue.

## 2. Software Catalog

Format inchangé: `apiVersion: backstage.io/v1alpha1` pour Component/API/Group/User/Resource/System/Domain/Location (Template reste à part, `v1beta2`, de longue date, pas un changement récent).

Kinds: **Component** (logiciel déployable), **System** (collection de Components/Resources exposant une capacité), **Resource** (infra runtime), **Group** (unité organisationnelle), **Domain** (regroupement métier de Systems). Relations: `ownedBy`, `partOf`, `dependsOn`/`dependencyOf`, `providesApi`/`consumesApi` — tout confirmé inchangé.

**Ingestion**: static `catalog.locations`, Location entities, et Discovery/Entity Providers coexistent toujours, aucune dépréciation. La doc positionne explicitement les Discovery Providers comme "le pattern d'intégration le plus courant" au-delà de quelques locations ajoutées à la main.
```yaml
catalog:
  providers:
    github:
      myProvider:
        organization: 'my-org'
        catalogPath: '/catalog-info.yaml'
        filters:
          branch: 'main'
          repository: '.*'
        schedule:
          frequency: { minutes: 35 }
          timeout: { minutes: 3 }
```
`validateLocationsExist: true` interdit les wildcards dans `catalogPath`, à savoir si on combine les deux.

**`catalog:register`**: toujours présent, deux formes d'input — `catalogInfoUrl` (+ `optional`) OU `repoContentsUrl` + `catalogInfoPath` (défaut `/catalog-info.yaml`) + `optional`. **Rough edge confirmé toujours ouvert**: race condition où l'entité n'est pas encore requêtable juste après l'action (issue #8597 et apparentées), un step suivant qui lit l'entité immédiatement peut 404.

**Pattern "repo d'inventaire privé"** (Discovery Provider + `catalogPath` en glob sur un repo dédié, un fichier par client): confirmé toujours pleinement supporté, aucune restriction trouvée.

## 3. Software Templates

`apiVersion: scaffolder.backstage.io/v1beta3`, inchangé. `spec.parameters` (JSON Schema + `ui:*`), `spec.steps[]` ({id, name, action, if, each, input}), `spec.output` — tout confirmé. Nouveau détail: `always()`/`failure()` disponibles pour contrôler l'exécution après un step en échec.

**Champ Secret** (`ui:field: Secret`): confirmé inchangé — masqué à la review, jamais persisté, consommé via `${{ secrets.x }}`.

**Moteur de templating**: officiellement nommé **"Nunjitsu"** dans la doc actuelle ("un sous-ensemble ciblé de la syntaxe Nunjucks"), pas juste "Nunjucks" tout court. Le mot-clé `not` n'y est pas disponible, préférer une négation/égalité façon JS.

**`fetch:template`**: `copyWithoutRender` (glob copié tel quel, chemin non templaté non plus) vs `copyWithoutTemplating` (contenu copié brut mais chemin templaté quand même) — deux mécanismes distincts, confirmés coexister (le premier n'est donc pas un simple renommage du second comme on aurait pu le supposer).

**`publish:gitlab` — correction importante**: `description` est un champ **top-level** de `input`, pas niché sous `settings` (vérifié sur le README actuel du module `scaffolder-backend-module-gitlab`):
```yaml
- id: publish
  action: publish:gitlab
  input:
    description: "..."
    repoUrl: ${{ parameters.repoUrl }}
    defaultBranch: main
```
`settings` existe mais sert à d'autres passthrough (topics, projectVariables...), pas à `description`. Cette info vient du README, pas du schéma zod brut — à revérifier sur `/create/actions` d'une instance réelle avant de s'y fier pour un template en prod, les exemples de doc peuvent dériver du schéma réel.

**Actions custom**: `createTemplateAction` de `@backstage/plugin-scaffolder-node`, schéma input/output désormais construit via un builder zod (`z => z.string({ description: ... })`) plutôt que du JSON Schema brut.

**Field extensions custom**: `FormFieldBlueprint`/`createFormField` de `@backstage/plugin-scaffolder-react/alpha`, confirmé toujours l'approche recommandée pour le nouveau frontend system.

**Point structurel**: la page "Builtin Actions" ne liste plus les schémas statiques par action, elle renvoie vers le registre live `/create/actions` d'une instance réelle. Toujours vérifier là plutôt que sur une page de doc statique avant de finaliser un template.

## 4. Intégrations, auth, config, déploiement

**GitHub/GitLab integrations**: forme inchangée. Confirmé au niveau code source (`getOctokitOptions`, `util.ts`): un `token` fourni au step court-circuite complètement `githubCredentialsProvider`/la config statique pour ce run — un token statique dans `integrations.github` n'est donc jamais requis.

**Guest auth**: inchangé, `dangerouslyAllowOutsideDevelopment` reste le flag qui force l'activation hors dev.

**GitHub OAuth, callback**: `http://localhost:7007/api/auth/github/handler/frame`, confirmé.

**Gotcha node_id vs id numérique, confirmé toujours vrai**: l'annotation `github.com/user-id` attend le `node_id` (GraphQL/global ID), pas le champ `id` numérique REST. Asymétrie avec GitLab, dont l'annotation équivalente utilise bien l'ID numérique — à ne pas confondre si on configure les deux providers.

**app-config.yaml layering**: confirmé inchangé, `app-config.yaml` → `app-config.{ENV}.yaml` → `app-config.local.yaml` → variantes ENV.local, puis `APP_CONFIG_*` en priorité maximale.

**Postgres**: `backend.database.client: pg` + bloc `connection`, inchangé. Noms de variables d'env exacts confirmés en direct (2026-09-23, cf. https://backstage.io/docs/tutorials/switching-sqlite-postgres/) pour le pattern `app-config.production.yaml` recommandé:
```yaml
backend:
  database:
    client: pg
    connection:
      host: ${POSTGRES_HOST}
      port: ${POSTGRES_PORT}
      user: ${POSTGRES_USER}
      password: ${POSTGRES_PASSWORD}
```
SSL: `PGSSLMODE` (env var, suit les sslmode standards Postgres) pour activer/désactiver, `connection.ssl.ca.$file: <path>` pour un CA custom. Pool de connexions ajustable via `knexConfig.pool` (`min`/`max`/`acquireTimeoutMillis`/`idleTimeoutMillis`).

**Kubernetes / health checks — nuance à ajouter**: le chart Helm officiel (github.com/backstage/charts) reste explicitement démo-only. Les endpoints de santé dépendent de la génération du backend: **nouveau backend system** → `/.backstage/health/v1/{readiness,liveness}` (confirmé) ; **backend legacy** → `/healthcheck` (toujours l'exemple montré dans la doc de déploiement K8s elle-même). Préciser sur quelle génération de backend on est avant de documenter l'un ou l'autre.

**TechDocs**: `builder: 'local'` + `generator.runIn: 'docker'` reste la combo par défaut de la doc "getting started", `runIn: 'local'` l'alternative sans Docker. La doc recommande explicitement de sortir de `builder: local` en production, de générer via CI/CD à la place.

## 5. Versioning

Cadence confirmée inchangée: main mensuelle (mardi avant le 3e mercredi), next hebdomadaire. Format `<major>.<minor>.<patch>` sans suivre semver au niveau ligne principale, packages `@backstage/*` individuels en semver propre sous la Skew Policy. `yarn backstage-cli versions:bump` confirmé toujours la commande courante. Nouveau backend system confirmé stable/recommandé production. Nouveau frontend system: churn d'écosystème toujours en cours (exports `/alpha`), cohérent avec le point 1.

## Points d'attention / pièges

- Yarn: la prose de la doc getting-started est en retard sur le template réel (4.4.1 annoncé, 4.13.0 réellement pinné). Toujours vérifier `package.json.hbs`/`.yarnrc.yml.hbs` du template plutôt que la page prose pour la version exacte.
- `publish:gitlab` : `description` est top-level, pas sous `settings` — vérifié README, pas le schéma zod brut, à confirmer sur `/create/actions` avant un usage en prod.
- Deux endpoints de health check possibles selon la génération du backend (`/.backstage/health/v1/*` vs `/healthcheck`), ne pas en documenter un seul sans préciser lequel s'applique.
- La page prose `/docs/frontend-system/` n'affirme jamais "stable/GA" alors que l'outil `create-app` en a déjà fait le défaut — écart doc/outil à garder en tête, ne pas juger la maturité sur la prose seule.

## Liens utiles

- Getting started: https://backstage.io/docs/getting-started/
- Backend system: https://backstage.io/docs/backend-system/
- Frontend system: https://backstage.io/docs/frontend-system/
- Software Catalog: https://backstage.io/docs/features/software-catalog/
- Descriptor format: https://backstage.io/docs/features/software-catalog/descriptor-format
- System model: https://backstage.io/docs/features/software-catalog/system-model
- External integrations / discovery: https://backstage.io/docs/features/software-catalog/external-integrations, https://backstage.io/docs/integrations/github/discovery
- Software Templates, writing templates, builtin actions: https://backstage.io/docs/features/software-templates/, https://backstage.io/docs/features/software-templates/writing-templates/, https://backstage.io/docs/features/software-templates/builtin-actions/
- Custom actions / field extensions: https://backstage.io/docs/features/software-templates/writing-custom-actions/, https://backstage.io/docs/features/software-templates/writing-custom-field-extensions/
- GitHub integration / auth: https://backstage.io/docs/integrations/github/locations/, https://backstage.io/docs/auth/github/provider/
- Guest auth: https://backstage.io/docs/auth/guest/provider/
- Config: https://backstage.io/docs/conf/
- Postgres: https://backstage.io/docs/tutorials/switching-sqlite-postgres/
- Déploiement K8s: https://backstage.io/docs/deployment/k8s/
- Chart Helm officiel: https://github.com/backstage/charts
- TechDocs: https://backstage.io/docs/features/techdocs/getting-started/
- Versioning: https://backstage.io/docs/overview/versioning-policy/
- Keeping updated: https://backstage.io/docs/getting-started/keeping-backstage-updated
- Releases GitHub: https://github.com/backstage/backstage/releases

## Non confirmé / à vérifier

- Schéma zod exact de `publish:gitlab` (source brute non récupérée, README seulement) — revérifier sur `/create/actions` d'une instance réelle avant un usage en prod.
- Support exact des opérateurs (`or`, ternaire) dans Nunjitsu — tester en dry-run plutôt que supposer.
- `$${VAR:-default}` (fallback de substitution d'env var) : forme non retrouvée explicitement mot pour mot dans la doc actuelle lors de cette passe, probablement toujours correcte mais pas re-confirmée à la lettre.
- Rôle exact du template `next-app` vu dans le repo create-app (dossier présent, pas exposé comme flag CLI documenté) — pas creusé.
