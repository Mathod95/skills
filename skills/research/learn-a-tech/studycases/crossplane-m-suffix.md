# Studycase — `.m.` pris pour une coquille dans un nom d'API Crossplane

## Contexte

En travaillant sur des manifestes Crossplane pour AWS, un `apiVersion` du type `iam.aws.m.upbound.io/v1beta1` a été rencontré (au lieu du plus familier `iam.aws.upbound.io/v1beta1`). Sur le moment, le `.m.` supplémentaire a été interprété comme une coquille de nommage — quelque chose à "corriger" en le retirant, sans vérifier davantage.

## Ce qui s'est réellement passé

Le fichier a été modifié pour retirer le `.m.`, présenté comme une correction. L'utilisateur a corrigé: `.m.` est un mécanisme réel et documenté (voir `references/crossplane.md`, section 1 — "managed resources namespaced", Crossplane v2). Une recherche en direct sur la doc officielle (`docs.crossplane.io`) et le marketplace Upbound a confirmé que les deux groupes d'API (`iam.aws.upbound.io` et `iam.aws.m.upbound.io`) existent bel et bien, dans le même package, pour deux scopes différents (cluster vs namespace).

## Pourquoi l'erreur s'est produite

Le nommage `.m.` est inhabituel — il ne suit pas un pattern immédiatement reconnaissable pour quelqu'un qui n'a pas suivi de près l'évolution de Crossplane v2. Face à quelque chose d'inconnu, le réflexe a été de le traiter comme une anomalie à corriger plutôt que comme un fait à vérifier. Aucune recherche n'a été faite avant d'agir.

## Ce qu'on en retient

C'est précisément l'incident qui a motivé la création du skill `learn-a-tech`: la règle centrale ("vérifier en direct face à un truc surprenant, jamais trancher depuis une intuition") vient directement de cette expérience. Un nommage inhabituel, une incohérence apparente, un comportement qui ne correspond pas à ce qu'on croit savoir — dans tous ces cas, la vérification en direct doit précéder toute correction, jamais l'inverse.

## Portée

Ce studycase est spécifique à cet incident précis (Crossplane, `.m.`, ce projet). Le fait général sur `.m.` lui-même vit dans `references/crossplane.md`, réutilisable sans ce contexte narratif. La leçon générale (vérifier avant de corriger) vit dans `SKILL.md`, formulée sans dépendre de cet exemple précis.
