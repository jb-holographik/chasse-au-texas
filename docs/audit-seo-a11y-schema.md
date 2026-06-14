# Audit SEO, accessibilité et schémas — Chasse au Texas

Audit réalisé sur la page d'accueil staging : https://chasse-au-texas.webflow.io/

## Scores Lighthouse (desktop)

| Catégorie | Score |
|-----------|-------|
| SEO | 100 |
| Best Practices | 100 |
| Accessibility | 91 |

---

## Accessibilité — corrections à appliquer dans Webflow

### Priorité haute

1. **`lang="fr"` manquant sur `<html>`**
   - Page Settings → Custom code ou langue du site → ajouter `lang="fr"` sur l'élément racine.

2. **`label-content-name-mismatch` sur les banners**
   - Chaque banner utilise `aria-label="Découvrez nos activités"` alors que le texte visible est « Chasse », « Pêche », etc.
   - **Option A :** retirer `aria-label` et laisser le titre visible nommer le lien.
   - **Option B :** aria-label dynamique par CMS, ex. `aria-label="Chasse — découvrir nos activités"`.

### Priorité moyenne

3. **Contraste insuffisant sur `.footer-label`**
   - Couleur actuelle : `#7a7265` sur `#070707` (ratio 4.24:1, minimum 4.5:1).
   - Éclaircir le token `--_semantics---color--fg--muted` ou la classe `.footer-label`.

4. **Images banner sans texte alternatif**
   - Renseigner `alt` descriptif par catégorie via le CMS (ex. « Sanglier nocturne au Texas »).

5. **Champ message réservation**
   - Remplacer l'input `#message` (`type="text"`) par un **Textarea** pour un comportement multi-lignes natif.

### Priorité basse

6. **Liens footer incorrects**
   - « Réservation » pointe vers `index.html` au lieu de `/reservation`.

7. **Skip link absent**
   - Ajouter un lien « Aller au contenu » en tête de page ciblant `main`.

8. **`aria-current="page"` en double**
   - Footer accueil : Accueil et Réservation ont tous deux `w--current` / `aria-current="page"`.

---

## SEO — qualité (score déjà 100)

- Ajouter `lang="fr"` (signal linguistique).
- Corriger les liens footer incohérents.
- LCP : `loading="eager"` + `fetchpriority="high"` uniquement sur la première image above-the-fold.

---

## Schémas JSON-LD — analyse par page

| Page | Type | Problèmes | Recommandation |
|------|------|-----------|----------------|
| Accueil | `WebPage` + `TouristTrip` | Pas de `WebSite`/`Organization` racine | Ajouter graphe `WebSite` avec `publisher` |
| Qui-sommes-nous | `AboutPage` + `TravelAgency` | URLs relatives | URLs absolues `https://www.chasseautexas.com/...` |
| Réservation | `ContactPage` + breadcrumb | Pas de `contactPoint` | Ajouter email/téléphone si disponibles |
| Activités | `Product` + `Offer` | Champs CMS vides | Préférer `TouristTrip` ou `Service` ; remplir name, description, image, price |
| Catégorie | `CollectionPage` | Champs vides | Remplir via CMS ; ajouter `hasPart` listant les activités |

**Règle :** un schéma avec des champs vides (`""`) est pire qu'un schéma absent. Lier tous les champs JSON-LD aux champs CMS.

---

## Actions Webflow requises (hors code agent)

- [ ] `data-barba="wrapper"` sur `.page-wrapper`
- [ ] `data-barba="container"` sur `main.main-wrapper`
- [ ] `lang="fr"` sur `<html>`
- [ ] Corriger aria-labels banners
- [ ] Textarea pour le message réservation
- [ ] Liens footer et schémas JSON-LD CMS

---

## Vérification post-corrections

1. [Google Rich Results Test](https://search.google.com/test/rich-results)
2. Lighthouse a11y sur staging
3. Parcours clavier : nav, formulaire, banners
