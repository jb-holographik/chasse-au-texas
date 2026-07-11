# Slider infini à trois photos sans espaces vides

## Objectif

Les pages activités contenant exactement trois photos doivent afficher en
permanence une photo précédente et une photo suivante, sans espace vide, tout
en conservant un défilement infini fluide au clic et au glissement.

## Conception

Pour trois photos CMS `A B C`, le wrapper Swiper contiendra six slides :
`A B C A B C`.

- Les trois premières slides utilisent les frames CMS originales.
- Les trois suivantes sont des clones marqués comme buffers.
- Swiper utilise le loop natif avec `slidesPerView: 1.12` et
  `centeredSlides: true`.
- Les pages avec quatre photos ou plus conservent leur comportement actuel.
- Les pages avec une ou deux photos conservent leurs modes single/stack.

Cette séquence ne crée jamais deux images identiques côte à côte et fournit
suffisamment de slides à Swiper 14 pour son loop centré.

## Cycle de vie

Les slides buffers portent un attribut dédié. Lors de
`destroyActivitePhotos()` :

1. seules les frames originales sont replacées dans le conteneur Webflow ;
2. les clones buffers sont supprimés ;
3. une réinitialisation recrée exactement trois buffers, sans accumulation.

La déduplication ne repose pas sur l’URL : deux champs CMS peuvent
volontairement utiliser le même fichier.

## Vérification

Le test navigateur doit vérifier :

- trois photos CMS donnent six slides physiques ;
- l’ordre physique est `A B C A B C` ;
- aucune paire adjacente n’utilise deux fois la même position CMS ;
- le loop avant/arrière fonctionne au clic et au drag ;
- les côtés gauche et droit sont occupés dès l’initialisation et après chaque
  transition ;
- `destroy → init` restaure trois originales puis recrée six slides, sans
  accumulation ;
- les configurations de quatre à neuf photos restent inchangées ;
- desktop et viewport mobile sont couverts.
