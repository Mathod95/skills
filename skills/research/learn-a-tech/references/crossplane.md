# Notes Crossplane — vérifié le 2026-09-22

Recherche menée sur la doc live https://docs.crossplane.io/latest/ (Crossplane 2.4.1), après une erreur initiale (`iam.aws.m.upbound.io` pris pour une coquille alors que c'est un vrai mécanisme). Voir "Points d'attention" pour le détail de cette erreur, c'est l'origine directe de ce skill.

## 1. Le `.m.` : namespaced Managed Resources

`.m.` = **"modern namespaced managed resources"**, confirmé sur le guide officiel "Upgrade to Crossplane v2". Crossplane v2 rend les ressources managées *namespaced* (comme un objet Kubernetes classique) au lieu de cluster-scoped uniquement comme en v1. Pour ne pas casser l'existant, chaque provider Upbound génère **deux groupes d'API pour chaque ressource, dans le même package**:

- `ec2.aws.upbound.io/v1beta1` (legacy, cluster-scoped)
- `ec2.aws.m.upbound.io/v1beta1` (modern, namespaced)

Idem pour IAM (`iam.aws.upbound.io` / `iam.aws.m.upbound.io`) et EKS (`eks.aws.upbound.io` / `eks.aws.m.upbound.io`), et pour toutes les autres familles Upbound (ex. Datadog: `datadog.upbound.io` / `datadog.m.upbound.io`).

**Package**: pas de package séparé pour "modern". Les deux groupes vivent dans le même package de service (`provider-aws-ec2`, `provider-aws-iam`, `provider-aws-eks`), sous la famille `provider-family-aws` (fournit les CRD `ProviderConfig`/`ClusterProviderConfig` et le câblage des credentials, pas de ressources en propre). Versions vérifiées en direct sur le marketplace au moment de la recherche: `provider-family-aws:v2.8.1`, `provider-aws-ec2:v2.8.1`, `provider-aws-iam:v2.8.1`, `provider-aws-eks:v2.8.1` — **revérifier la version exacte avant de pinner**, ces packages sortent souvent.

**Coexistence, pas dépréciation**: les deux générations sont prévues pour coexister durablement, ce n'est pas legacy vs qualité inférieure, c'est un choix de scope (cluster vs namespace). Précondition: les ressources `.m.` ne fonctionnent que sur un cluster Crossplane **v2** (v1 = legacy uniquement disponible).

**Recommandation générale**: partir sur `.m.` par défaut pour tout nouveau manifeste sur un cluster v2, ça donne du vrai RBAC Kubernetes natif par namespace gratuitement, c'est explicitement l'intention de la doc v2 ("Namespaces enable fine grained access control over who can create what MRs").

## 2. Concepts core (XRD, XR, MR, Claims) — v2.4

- **Claims sont mortes pour le modèle v2-natif.** Une XRD écrite en `apiextensions.crossplane.io/v1` obtient implicitement `scope: LegacyCluster` (compat v1, seul mode qui supporte encore les Claims). Une XRD écrite en `apiextensions.crossplane.io/v2` ne peut être que `Namespaced` ou `Cluster`, jamais de Claims possible, point final.
- `spec.scope` sur une XRD accepte exactement 3 valeurs: `Namespaced` (défaut v2, recommandé: "Most XRDs should use Namespaced scope... better security isolation"), `Cluster` (réservé aux ressources de niveau plateforme type RBAC), `LegacyCluster` (compat v1 avec Claims).
- XRD minimale v2 (vérifiée sur la doc):
```yaml
apiVersion: apiextensions.crossplane.io/v2
kind: CompositeResourceDefinition
metadata:
  name: mydatabases.example.org
spec:
  scope: Namespaced
  group: example.org
  names:
    kind: XMyDatabase
    plural: mydatabases
  versions:
  - name: v1alpha1
    served: true
    referenceable: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              region: {type: string}
```
- XR côté utilisateur final (namespaced, sans Claim, appliqué directement dans un namespace):
```yaml
apiVersion: example.org/v1alpha1
kind: MyDatabase
metadata:
  namespace: default
  name: my-composite-resource
spec:
  region: us-east-1
  crossplane:
    compositionRef:
      name: my-composition
    compositionUpdatePolicy: Automatic
```
Toute la mécanique Crossplane (`compositionRef`, `compositionSelector`, `resourceRefs`...) est passée sous un bloc imbriqué `spec.crossplane` sur les XR namespaced/cluster v2, séparé du schéma métier. Les XR `LegacyCluster` gardent l'ancienne forme plate (pas de `spec.crossplane`).
- Migration v1→v2: pas d'outillage automatique pour migrer les XR/MR cluster-scoped existants vers le modèle namespaced, migration manuelle attendue. Upgrade séquentiel obligatoire (v1.19→v1.20→v2.0→v2.x).

## 3. Compositions et fonctions

- **Patch & Transform natif (`spec.resources` sans fonction)**: déprécié depuis la **v1.17** (pas "envisagé", déjà fait), gelé en maintenance sécurité uniquement, mais pas supprimé. `mode: Pipeline` + fonctions est la seule voie activement maintenue. Outil de migration: `crossplane beta convert` (legacy → Pipeline).
- **XR imbriqués (composition de compositions) avec `function-patch-and-transform`**: fonctionnent. Le bug qui l'empêchait (issue #4715) a été corrigé en **v1.14** (2024). Mécanisme (pas de tutoriel dédié trouvé sur la doc, confirmé via l'issue/PR): dans `input.resources[].base` d'un step `function-patch-and-transform`, on met le GVK d'une autre XR au lieu d'une Managed Resource, et les patches `FromCompositeFieldPath`/`ToCompositeFieldPath` classiques font le lien parent/enfant. À valider concrètement avec `crossplane composition render` avant de compter dessus en prod.
- **Sélecteurs natifs (`*Ref`/`*Selector`, `matchLabels`/`matchControllerRef`)**: confirmés indépendants du mode de Composition, fonctionnent au niveau Managed Resource directement. "Si un champ de référence est renseigné, le sélecteur correspondant est ignoré." Combiner `matchControllerRef` + `matchLabels` garantit un match unique.
- **Paysage des fonctions Composition** (page officielle "work in progress", peu détaillée):
  - `function-patch-and-transform`: successeur direct du P&T natif.
  - `function-go-templating`: composition via templates Go (façon chart Helm).
  - `function-kcl`: logique de composition en KCL (DSL de config).
  - `function-auto-ready`: marque automatiquement les ressources composées comme Ready.
  - `function-extra-resources`: récupère d'autres ressources du cluster (pas composées par cette XR) via `matchLabels`. Une source secondaire la dit "dépréciée en v2", non confirmé officiellement.
- **`crossplane composition render`** (ex `crossplane beta render`, plus en beta): teste une Composition en local. Composition doit être en `mode: Pipeline`. `crossplane composition render <xr.yaml> <composition.yaml> [<functions.yaml>]`, tourne via Docker par défaut (`--crossplane-binary` pour l'éviter).

## 4. Import de ressources existantes et cycle de vie

- **Mécanisme d'import confirmé** (annotation `crossplane.io/external-name` + `managementPolicies`), mais l'exemple officiel est sur GCP (`DatabaseInstance`), aucun exemple ni caveat AWS-spécifique dans la doc officielle.
```yaml
# Étape 1 : observation seule
apiVersion: sql.gcp.upbound.io/v1beta1
kind: DatabaseInstance
metadata:
  name: my-imported-database
  annotations:
    crossplane.io/external-name: my-external-database
spec:
  managementPolicies: ["Observe"]
  forProvider:
    region: "us-central1"
---
# Étape 2 : après vérification de status.atProvider, contrôle actif
spec:
  managementPolicies: ["*"]
  forProvider:
    databaseVersion: POSTGRES_14
    region: us-central1
```
Valeurs possibles de `managementPolicies`: `*` (défaut, contrôle complet), `Create`, `Delete`, `LateInitialize`, `Observe`, `Update` (tableau, combinable).
- **Aucun outil officiel de bulk-import.** Une CLI a été proposée (issue crossplane-cli#66) mais jamais livrée, le repo est archivé depuis 2021.
- **`deletionPolicy` confirmé supprimé** de la doc v2.4 (absent de la page Managed Resources actuelle). `managementPolicies` est le seul mécanisme de cycle de vie documenté désormais. Migration recommandée: `deletionPolicy: Orphan` → `managementPolicies: ["Create","Observe","Update","LateInitialize"]` (sans `Delete`/`*`).
- **Orphelinage à la destruction brutale d'un cluster confirmé**: la suppression d'une ressource cloud ne passe que par la boucle de réconciliation de suppression pilotée par finalizer. Si le cluster/etcd est juste rasé (pas de `kubectl delete` propre), cette boucle ne tourne jamais, donc aucun appel de suppression n'est jamais envoyé au cloud.

## 5. RBAC, multi-tenant, opérations

- **Pas de guide officiel dédié "restreindre qui peut créer quelle XR"** en v2.4, mais la doc affirme explicitement que le namespace est le mécanisme d'isolation voulu: "Most XRDs should use Namespaced scope. This provides better security isolation." et "Namespaces enable fine grained access control over who can create what MRs." → RBAC Kubernetes standard (Role/RoleBinding par namespace) sur le Kind namespaced de l'XRD, pas de mécanisme Crossplane-spécifique nécessaire.
- **RBAC Manager** (composant Crossplane séparé): crée automatiquement 3 ClusterRoles agrégés (`crossplane-admin`, `crossplane-edit`, `crossplane-view`) pour gérer qui administre Crossplane lui-même, pas pour du per-tenant.
- **Pas de guide multi-tenant officiel en v2** (`/latest/guides/multi-tenant/` = 404). Il existait en v1.20 mais était bâti autour des Claims (supprimées en v2), jamais porté vers v2.
- **Pas de guide production/best-practices dédié.** HA mentionnée brièvement (leader election requise pour plusieurs pods Crossplane), resources requests/limits seulement dans les defaults du chart Helm.
- **Métriques**: `/latest/guides/metrics/`, Prometheus sur `:8080/metrics` via `--set metrics.enabled=true` côté Helm. Couvre readiness des MR, drift, temps de reconciliation, ouvertures de circuit-breaker.
- **Upgrade**: toujours une version mineure à la fois, dernier patch de chaque mineure (`v1.18→v1.19→v1.20→v2.0`).
- **Guide dédié ArgoCD**: `/latest/guides/configuring-crossplane-with-argocd/` existe, pas encore lu en détail.
- **Outils de debug CLI**:
  - `crossplane trace` (ex `crossplane beta trace`): affiche l'arbre XR → ressources composées avec statut Ready/Synced (`crossplane resource trace <kind> <name>`, `-w` pour suivre en continu, `-o dot` pour Graphviz).
  - Page troubleshooting officielle: condition `Responsive` à surveiller (passe à `False` en cas de thrashing/circuit-breaker), retrait de finalizer à la main pour débloquer une suppression bloquée (`kubectl patch ... -p '{"metadata":{"finalizers":[]}}'`) — ne supprime pas la ressource cloud sous-jacente.

## Points d'attention / pièges

- **L'erreur d'origine de ce skill**: `iam.aws.m.upbound.io` a été pris pour une coquille de nommage sans vérifier, alors que `.m.` est un vrai mécanisme documenté (managed resources namespaced v2). Réflexe à éviter: qualifier un truc inconnu/inhabituel d'"erreur" sans chercher.
- Modéliser un XR imbriqué vs une Composition qui applique des Managed Resources brutes: ce sont deux mécanismes différents, ne pas les confondre (le premier compose d'autres XR, le second compose des ressources cloud directement).
- `function-extra-resources` "dépréciée en v2" n'est affirmé que par une source secondaire, non confirmé officiellement — à revérifier avant de s'appuyer dessus.

## Liens utiles

- Upgrade to Crossplane v2 (définition de `.m.`) : https://docs.crossplane.io/latest/guides/upgrade-to-crossplane-v2/
- What's New in v2 : https://docs.crossplane.io/latest/whats-new/
- Composite Resource Definitions : https://docs.crossplane.io/latest/composition/composite-resource-definitions/
- Composite Resources : https://docs.crossplane.io/latest/composition/composite-resources/
- Compositions : https://docs.crossplane.io/latest/composition/compositions/
- Function Patch and Transform : https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Managed Resources : https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Packages / Functions : https://docs.crossplane.io/latest/packages/functions/
- Import Existing Resources : https://docs.crossplane.io/latest/guides/import-existing-resources/
- Troubleshoot Crossplane : https://docs.crossplane.io/latest/guides/troubleshoot-crossplane/
- Metrics : https://docs.crossplane.io/latest/guides/metrics/
- Upgrade Crossplane (routine) : https://docs.crossplane.io/latest/guides/upgrade-crossplane/
- Configuring Crossplane with ArgoCD (à lire) : https://docs.crossplane.io/latest/guides/configuring-crossplane-with-argocd/
- CLI command reference (render, trace) : https://docs.crossplane.io/latest/cli/command-reference/
- Marketplace provider-family-aws : https://marketplace.upbound.io/providers/upbound/provider-family-aws/latest
- Marketplace provider-aws-ec2 : https://marketplace.upbound.io/providers/upbound/provider-aws-ec2/latest
- Marketplace provider-aws-iam : https://marketplace.upbound.io/providers/upbound/provider-aws-iam/latest
- Marketplace provider-aws-eks : https://marketplace.upbound.io/providers/upbound/provider-aws-eks/latest
- Multi-tenant guide v1.20 (historique, non porté en v2) : https://docs.crossplane.io/v1.20/guides/multi-tenant/

## Non confirmé / à vérifier

- Coverage exacte `.m.` pour chaque type de ressource AWS au-delà de VPC/Subnet/IGW/RouteTable/SecurityGroup/Role/Cluster, pas de matrice officielle de complétude publiée.
- `function-extra-resources` "dépréciée en v2" : affirmation d'une source secondaire seulement.
- Mécanisme exact des XR imbriqués : confirmé via issue/PR GitHub, pas de tutoriel doc dédié trouvé, à valider avec `crossplane composition render` avant de s'appuyer dessus en prod.
- Version exacte courante de `provider-family-aws`/`provider-aws-ec2`/`provider-aws-iam`/`provider-aws-eks` à revérifier avant de pinner (ça bouge vite).
