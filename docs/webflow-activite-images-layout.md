# Sliders activité — parité Designer Webflow / site publié

## Contexte

Sur le site publié, `main.js` applique :

| Nombre de photos CMS | Comportement | Classe JS |
|---|---|---|
| 0–1 | Aucun slider | — |
| 2 | Empilement cliquable | `is-stacked` |
| 3+ | Slider Swiper (peek, bordure beige sur la slide active) | `is-swiper` |

Dans le Designer Webflow, ce JS ne tourne pas : sans CSS dédié, toutes les vignettes s’affichent en flex (layout par défaut de `.activite_images-inner`).

## Étape 1 — Custom code (CSS Designer)

1. Ouvrir **Site settings → Custom code → Head code**
2. Coller le contenu de [`webflow-activite-images-designer.css`](./webflow-activite-images-designer.css) dans une balise `<style>…</style>`
3. Enregistrer

Ce CSS ne s’applique que dans le Designer (`html.wf-design-mode`). Le site publié reste inchangé.

## Étape 2 — Visibilité conditionnelle CMS (template Activités)

Garder **un seul** `.activite_images-inner` (important : le JS ne cible que le premier).

Sur chaque slot `.activite_images_img` du template CMS :

| Élément | Règle de visibilité conditionnelle |
|---|---|
| Photo 1 | Toujours visible (ou : champ multi-images **a au moins 1 élément**) |
| Photo 2 | Multi-images **a au moins 2 éléments** |
| Photo 3 | Multi-images **a au moins 3 éléments** |
| Photo 4 | Multi-images **a au moins 4 éléments** |
| … | … |
| Photo 10 | Multi-images **a au moins 10 éléments** |

> Webflow retire du DOM les slots masqués par la visibilité conditionnelle. Le CSS Designer détecte le mode via la présence ou l’absence du **3e slot** :
> - **2 photos** → pas de 3e enfant → layout empilé
> - **3+ photos** → 3e enfant présent → preview slider

### Liaison CMS des images

Pour chaque slot, lier l’image au champ multi-images de la collection (index 1, 2, 3… selon le slot).

## Étape 3 — Boutons navigation (Designer uniquement)

Dans `.activite_images-inner`, ajouter deux **Div blocks** décoratifs :

| Élément | Classes |
|---|---|
| Bouton précédent | `activite_images-nav-designer` `is-prev` |
| Bouton suivant | `activite_images-nav-designer` `is-next` |

Visibilité conditionnelle sur les deux : **multi-images a au moins 3 éléments**.

Ces éléments sont masqués sur le site publié. Sur le live, Swiper injecte ses propres boutons `.activite_images-prev` / `.activite_images-next`.

## Étape 4 — Vérification

Dans le Designer, prévisualiser des items CMS :

1. **Item à 2 photos** → deux images décalées de ±1em, bordure beige sur les deux
2. **Item à 3+ photos** → slide centrale avec bordure beige, peek latéral, boutons aux bords du viewport
3. **Preview / site publié** → comportement Swiper inchangé (navigation Barba, loop, etc.)

## Application via MCP Webflow (quand connecté)

Une fois le MCP Webflow authentifié dans Cursor :

```text
data_scripts_tool → add_inline_site_script
  displayName: activite-images-designer-css
  location: header
  sourceCode: <contenu du fichier CSS sans balises script>
```

Puis publier le site.

## Fichiers liés dans le repo

- CSS Designer : `docs/webflow-activite-images-designer.css`
- CSS site publié : `src/styles/style.css` (classes `is-stacked` / `is-swiper`)
- Logique JS : `src/animations/activite-photos.js`
