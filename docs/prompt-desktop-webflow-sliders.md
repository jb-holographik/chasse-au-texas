# Prompt Desktop — Parité sliders activité via MCP Webflow

Copier-coller le bloc ci-dessous dans **Cursor Desktop** (avec MCP Webflow authentifié et Webflow Designer ouvert sur le site Chasse au Texas).

---

## Prompt à coller

```
## Mission

Configurer le site Webflow **Chasse au Texas** pour que le layout des sliders photo des pages **Activités** dans le Designer corresponde au site publié (Netlify + main.js), en utilisant **uniquement le MCP Webflow**.

## Contexte technique

- Repo : `jb-holographik/chasse-au-texas` (branche `main`, PR #15 mergée ou à merger)
- Le site publié gère les photos via `src/animations/activite-photos.js` :
  - **0–1 photo** → rien
  - **2 photos** → empilement (`is-stacked`, décalage ±1em)
  - **3+ photos** → slider Swiper (`is-swiper`, peek 1.12, bordure beige sur slide active, boutons prev/next injectés par JS)
- Dans le Designer Webflow, ce JS ne tourne pas → il faut du **CSS scopé `html.wf-design-mode`** + **visibilité conditionnelle CMS**.
- Fichiers Webflow exportés en lecture seule dans le repo (`index.html`, `src/styles/chasse-au-texas.webflow.css`) : **ne pas les modifier dans le repo**, tout se fait dans Webflow via MCP.

## Fichiers de référence dans le repo

- `docs/webflow-activite-images-designer.css` — CSS à injecter (≈5,6 Ko, < 10 000 chars)
- `docs/webflow-activite-images-layout.md` — guide détaillé
- `src/styles/style.css` — rendu publié (référence visuelle)
- Template CMS : page collection **Activités**, section `.section_activite` > `.activite_images` > `.activite_images-inner` > `.activite_images_img` (×10 slots)

## Prérequis

1. MCP Webflow connecté et authentifié dans Cursor Desktop
2. Webflow Designer ouvert sur le site cible (connexion Designer requise pour les outils `element_tool`, `style_tool`, etc.)
3. Appeler `webflow_guide_tool` en premier (bonnes pratiques MCP)

## Étapes à exécuter (dans l'ordre)

### Phase 1 — Découverte

1. `data_sites_tool` → `list_sites` : identifier le site **Chasse au Texas**
2. `data_scripts_tool` → `list_registered_scripts` + `list_applied_scripts` : vérifier si un script `activite-images-designer-css` existe déjà
3. `data_pages_tool` → `list_pages` : repérer le template CMS **Activités** (slug type `/activites/[slug]`)
4. `de_page_tool` : ouvrir ce template dans le Designer
5. `element_tool` : inspecter la structure `.activite_images` > `.activite_images-inner` > les 10 slots `.activite_images_img`
6. `data_cms_tool` → `get_collection_list` + `get_collection_details` : identifier le champ **multi-images** lié aux photos

### Phase 2 — Injecter le CSS Designer (MCP)

1. Lire `docs/webflow-activite-images-designer.css` dans le repo
2. Encapsuler le CSS dans une balise `<style>…</style>` pour le custom code
3. Si le script n'existe pas :
   - `data_scripts_tool` → `add_inline_site_script`
     - `displayName` : `activite-images-designer-css`
     - `version` : `1.0.0`
     - `location` : `header`
     - `sourceCode` : contenu `<style>…</style>` (sans balises `<script>`)
     - `canCopy` : `true`
4. Si un script similaire existe déjà : ne pas dupliquer — mettre à jour ou supprimer via `delete_all_site_scripts` **uniquement** après confirmation explicite de l'utilisateur

### Phase 3 — Visibilité conditionnelle CMS (Designer MCP)

Sur le template **Activités**, pour chaque slot `.activite_images_img` (1 à 10), configurer la visibilité conditionnelle via `element_tool` :

| Slot | Condition |
|------|-----------|
| Photo 1 | Toujours visible (ou multi-images ≥ 1) |
| Photo 2 | Multi-images **a au moins 2 éléments** |
| Photo 3 | Multi-images **a au moins 3 éléments** |
| Photo 4 | Multi-images **a au moins 4 éléments** |
| … | … |
| Photo 10 | Multi-images **a au moins 10 éléments** |

**Contraintes importantes :**
- Garder **un seul** `.activite_images-inner` (le JS fait `querySelector` sur le premier)
- Ne pas créer de second wrapper stack/slider en doublon
- Vérifier que chaque slot est bien lié au bon index du champ multi-images CMS

### Phase 4 — Boutons navigation décoratifs (Designer uniquement)

Dans `.activite_images-inner`, créer 2 **Div blocks** via `element_builder` si absents :

| Élément | Classes |
|---------|---------|
| Précédent | `activite_images-nav-designer` + `is-prev` |
| Suivant | `activite_images-nav-designer` + `is-next` |

Visibilité conditionnelle sur les deux : **multi-images a au moins 3 éléments**.

Ces boutons sont masqués sur le site publié par le CSS ; Swiper injecte les vrais boutons `.activite_images-prev` / `.activite_images-next`.

### Phase 5 — Vérification dans le Designer

Prévisualiser des items CMS dans le Designer :

1. **Item à 2 photos** → 2 images empilées, décalées ±1em, bordure beige
2. **Item à 3+ photos** → preview slider : slide centrale (2e enfant) avec bordure beige, peek latéral, boutons aux bords viewport (1em)
3. **Slots vides** → masqués (pas de placeholder visible)

Comparer visuellement avec le site publié (staging Netlify ou webflow.io).

### Phase 6 — Publication

1. Utiliser le skill `safe-publish` ou `data_sites_tool` → `publish_site`
2. Demander confirmation explicite avant de publier
3. Rapporter ce qui a été fait (scripts ajoutés, règles de visibilité, éléments créés)

## Critères de succès

- [ ] CSS `activite-images-designer-css` appliqué en head du site
- [ ] Visibilité conditionnelle configurée sur les 10 slots photo
- [ ] Boutons `activite_images-nav-designer` présents avec visibilité ≥ 3 photos
- [ ] Un seul `.activite_images-inner` sur le template
- [ ] Rendu Designer ≈ site publié pour 2 photos et 3+ photos
- [ ] Site publié inchangé (Swiper + Barba toujours fonctionnels)

## Ce qu'il ne faut PAS faire

- Ne pas modifier `index.html` ni `src/styles/chasse-au-texas.webflow.css` dans le repo
- Ne pas ajouter de boutons `.activite_images-prev` / `.activite_images-next` permanents (conflit avec Swiper)
- Ne pas supprimer tous les scripts du site sans confirmation
- Ne pas publier sans validation utilisateur

## En cas de blocage MCP

Si les outils Designer (`element_tool`, `element_builder`) échouent faute de connexion Designer :
1. Terminer au minimum la Phase 2 (CSS via `data_scripts_tool`)
2. Lister précisément les actions restantes à faire manuellement dans le Designer (visibilité + boutons décoratifs)
```

---

## Notes pour l'utilisateur

- Ce prompt suppose que la PR #15 (ou son contenu) est disponible sur `main`
- Le MCP Webflow requiert une session Designer active pour les modifications structurelles
- Le CSS seul (Phase 2) améliore déjà le rendu ; les phases 3–4 sont nécessaires pour un alignement complet
