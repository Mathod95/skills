---
name: learn-a-tech
description: Recherche la documentation officielle EN DIRECT d'une technologie (ex. Crossplane, Prometheus, Karpenter) et maintient un fichier de référence à jour dans references/<techno>.md. À utiliser quand l'utilisateur dit explicitement "learn-a-tech <techno>", ou demande d'apprendre/se documenter sur une techno avant de bosser dessus sur un projet. Ne jamais se fier à la mémoire d'entraînement pour une techno qui évolue vite, toujours vérifier contre la doc live.
---

Née d'un incident concret: sur le projet Backstage/Crossplane, `.m.` dans `iam.aws.m.upbound.io` a été pris pour une coquille et "corrigé" sans vérifier, alors que c'est un vrai mécanisme (managed resources namespaced, Crossplane v2). Ce skill existe pour que ça ne se reproduise pas: la règle centrale n'est pas "avoir un fichier de référence", c'est "vérifier en direct quand quelque chose surprend, jamais trancher depuis la mémoire ou une intuition".

Ce skill se met à jour en continu, comme n'importe quel autre: toute correction découverte en cours de route est répercutée dans le fichier de référence concerné, dans le même échange, sans attendre que l'utilisateur le demande.

## Déclencheur

- L'utilisateur dit "learn-a-tech <techno>" explicitement.
- L'utilisateur annonce qu'il va bosser sur une techno précise pour un projet ("on va bosser sur Prometheus", "on ajoute Karpenter") et qu'aucune recherche récente n'a déjà été faite dans la conversation.

## Étape 1 : vérifier l'existant avant de rechercher

Chercher `${CLAUDE_SKILL_DIR}/references/<techno>.md` (nom en kebab-case, ex. `crossplane.md`, `kube-prometheus-stack.md`).

- **Fichier absent** → aller à l'étape 2 (recherche complète).
- **Fichier présent** → lire l'en-tête "Vérifié le <date>".
  - Récent (quelques semaines, à l'appréciation vu le rythme de la techno) → utilisable tel quel, ne pas rechercher pour rien.
  - Ancien, ou sujet particulièrement mouvant (packages, versions, API en évolution) → étape 2 en mode ciblé: revérifier les points structurants plutôt que tout refaire de zéro.

## Étape 2 : recherche en direct

Toujours WebFetch/WebSearch sur la doc officielle du projet, jamais la mémoire d'entraînement pour trancher un fait technique précis (versions, noms de champs, API groups, statut d'une fonctionnalité).

Pour une techno avec une doc large (cas Crossplane: concepts, compositions/fonctions, providers, import/cycle de vie, opérations) : découper en plusieurs agents de recherche en parallèle, un par sous-thème, chacun avec pour consigne explicite de citer les URLs exactes lues et de donner un verdict explicite (confirmé / corrigé / faux) sur tout ce qui était déjà supposé savoir. C'est ce qui a marché pour la recherche Crossplane de ce projet.

Pour une vérification ciblée (un fait précis, une mise à jour de fichier existant) : une recherche directe suffit, pas besoin de sous-agents.

## Étape 3 : écrire/mettre à jour le fichier de référence

Fichier: `${CLAUDE_SKILL_DIR}/references/<techno>.md`. Structure:

```markdown
# Notes <Techno> — vérifié le <date>

## <Section thématique 1>
Faits confirmés, chacun idéalement rattaché à une source (URL doc officielle citée en bas de section ou en ligne).

## <Section thématique 2>
...

## Points d'attention / pièges
Comportements surprenants, différences avec ce qu'on pourrait supposer, erreurs déjà commises (comme le `.m.`).

## Liens utiles
Liste des URLs de doc officielle utilisées, pour retrouver la source rapidement la prochaine fois.

## Non confirmé / à vérifier
Tout ce qui reste incertain, une source secondaire seulement, ou une affirmation trouvée mais pas contre-vérifiée. Ne JAMAIS mélanger avec les faits confirmés plus haut.
```

Si le fichier existe déjà, ne pas l'écraser aveuglément: relire d'abord, fusionner les nouvelles informations, mettre à jour la date d'en-tête, et signaler explicitement à l'utilisateur ce qui a changé depuis la dernière version si quelque chose de significatif a bougé.

## Règle anti-staleness (la raison d'être de ce skill)

Un fichier de référence n'est jamais une excuse pour arrêter de vérifier. Avant d'affirmer avec confiance un fait technique qui:
- semble surprenant, inhabituel, ou "a l'air d'une erreur" (typo, incohérence de nommage, etc.),
- contredit ce que dit le fichier de référence,
- va être une base pour une décision ou du code que l'utilisateur va exécuter,

→ vérifier en direct contre la doc officielle avant de trancher, même si une intuition dit le contraire. Le réflexe fautif à éviter précisément: voir un truc inconnu et le qualifier de "coquille"/"erreur" sans chercher si c'est un mécanisme réel.

## Candidats de futurs skills

Pendant la recherche (étape 2), si un sous-thème rencontré est assez riche/procédural pour mériter son propre skill dédié (pas juste un fait à noter, une vraie logique de décision avec plusieurs étapes/pièges), le noter dans `${CLAUDE_SKILL_DIR}/candidate-skills.md`, format:

```markdown
- **<catégorie>/<nom-de-skill>** — <justification en une phrase>.
  Source: recherche <techno> du <date>, cf. references/<techno>.md section <section>.
```

Exemples illustratifs (pas des vraies entrées, juste pour montrer le niveau de richesse attendu):
- Crossplane: la gestion de `managementPolicies` (Observe → `*`, import de ressources existantes, orphelinage à la destruction d'un cluster) a assez de nuances pour devenir `crossplane/manage-lifecycle`, plutôt que de rester un simple fait dans `references/crossplane.md`.
- ArgoCD: "quand utiliser des sync-waves vs des hooks pre-sync/post-sync" a assez de logique de décision pour devenir `argocd/sync-ordering`.

Deux déclencheurs pour transformer un candidat en vrai skill, **toujours avec validation explicite de l'utilisateur, jamais de création automatique**:
- **Réactif**: l'utilisateur exprime un besoin qui correspond à un candidat déjà noté → le signaler, proposer de créer le skill, attendre confirmation.
- **Proactif**: en cours de tâche, remarquer qu'on est en train de faire quelque chose qui correspond à un candidat déjà noté → le signaler de soi-même, sans agir, attendre confirmation.

## Points d'attention

- Un fichier de référence par techno, jamais un fichier fourre-tout pour plusieurs technos, pour permettre une fraîcheur indépendante (Crossplane peut être à jour pendant que Prometheus est périmé).
- Ne jamais recopier tel quel un fichier de référence d'un autre projet/une autre source sans le faire passer par ce process, même s'il a l'air à jour.
- Les fichiers de `references/` sont globaux (attachés à ce skill, pas à un projet précis), volontairement, pour être réutilisables sur n'importe quel futur projet client. Les décisions propres à un projet précis (ex. "on utilise `.m.` sur CE projet parce que...") restent dans la doc du projet concerné (ex. `NOTES-<techno>.md` ou `docs/decisions.md` du repo), pas ici.

## Todo / à approfondir

- Pas encore d'optimisation de la `description` via le skill `skill-creator` (génération de cas de test should-trigger/should-not-trigger). À faire une fois que ce skill aura tourné plusieurs fois en conditions réelles, pas en théorie.
- Pas encore de règle numérique ferme pour "ancien" (durée exacte avant de considérer un fichier périmé). Pour l'instant, jugement au cas par cas selon la techno et ce qui est en jeu.
