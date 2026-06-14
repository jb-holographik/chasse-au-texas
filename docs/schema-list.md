# Schémas JSON-LD — Chasse au Texas

Schémas corrigés à coller dans **Page Settings → Custom code → Head** (Webflow).

**Règles appliquées :**
- URLs absolues (`https://www.chasseautexas.com/...`)
- Pas de champs vides (`""`) — utiliser les bindings CMS Webflow ou retirer le champ
- Graphe `@graph` sur l'accueil avec `WebSite` + `Organization` + `WebPage`
- Pages CMS : lier chaque propriété au champ CMS correspondant

---

## Accueil (`index.html`)

Remplace le bloc `<script type="application/ld+json">` existant.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://www.chasseautexas.com/#website",
      "url": "https://www.chasseautexas.com",
      "name": "Chasse au Texas",
      "description": "Séjours cynégétiques au Texas — Équipé de lunette à vision thermique et autre équipements sophistiqués, parcourez des milliers d'hectares de terres sauvages et réalisez des tableaux de chasse impressionnants",
      "inLanguage": "fr",
      "publisher": {
        "@id": "https://www.chasseautexas.com/#organization"
      }
    },
    {
      "@type": "TravelAgency",
      "@id": "https://www.chasseautexas.com/#organization",
      "name": "ChasseAuTexas.com",
      "url": "https://www.chasseautexas.com",
      "description": "La première agence spécialisée dans le tourisme outdoor au Texas dédiée aux francophones",
      "areaServed": {
        "@type": "State",
        "name": "Texas",
        "containedInPlace": {
          "@type": "Country",
          "name": "United States"
        }
      },
      "sameAs": [
        "https://www.facebook.com/p/Chasse-au-Texas-61553358493936/",
        "https://www.instagram.com/chasseautexas_com"
      ]
    },
    {
      "@type": "WebPage",
      "@id": "https://www.chasseautexas.com/#webpage",
      "url": "https://www.chasseautexas.com",
      "name": "Chasse au Texas",
      "description": "Séjours cynégétiques au Texas — Équipé de lunette à vision thermique et autre équipements sophistiqués, parcourez des milliers d'hectares de terres sauvages et réalisez des tableaux de chasse impressionnants",
      "inLanguage": "fr",
      "isPartOf": {
        "@id": "https://www.chasseautexas.com/#website"
      },
      "about": {
        "@type": "TouristTrip",
        "name": "Chasse au Texas",
        "description": "Partez pour une aventure unique alliant chasse, pêche, tir sportif et découverte du Far West",
        "touristType": "Chasseurs et amateurs de plein air",
        "provider": {
          "@id": "https://www.chasseautexas.com/#organization"
        }
      }
    }
  ]
}
</script>
```

---

## Qui sommes-nous (`qui-sommes-nous.html`)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://www.chasseautexas.com/#website",
      "url": "https://www.chasseautexas.com",
      "name": "Chasse au Texas",
      "inLanguage": "fr",
      "publisher": {
        "@id": "https://www.chasseautexas.com/#organization"
      }
    },
    {
      "@type": "TravelAgency",
      "@id": "https://www.chasseautexas.com/#organization",
      "name": "ChasseAuTexas.com",
      "url": "https://www.chasseautexas.com",
      "description": "La première agence spécialisée dans le tourisme outdoor au Texas dédiée aux francophones",
      "areaServed": {
        "@type": "State",
        "name": "Texas"
      },
      "sameAs": [
        "https://www.facebook.com/p/Chasse-au-Texas-61553358493936/",
        "https://www.instagram.com/chasseautexas_com"
      ]
    },
    {
      "@type": "AboutPage",
      "@id": "https://www.chasseautexas.com/qui-sommes-nous#webpage",
      "url": "https://www.chasseautexas.com/qui-sommes-nous",
      "name": "Qui Sommes Nous",
      "description": "ChasseAuTexas.com est la première agence spécialisée dans le tourisme outdoor au Texas dédiée aux francophones. Organisez votre séjour dès maintenant.",
      "inLanguage": "fr",
      "isPartOf": {
        "@id": "https://www.chasseautexas.com/#website"
      },
      "about": {
        "@id": "https://www.chasseautexas.com/#organization"
      },
      "mainEntity": {
        "@id": "https://www.chasseautexas.com/#organization"
      }
    }
  ]
}
</script>
```

---

## Réservation (`reservation.html`)

Ajoute un `contactPoint` — remplace `email` et `telephone` par vos coordonnées réelles si disponibles.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://www.chasseautexas.com/#website",
      "url": "https://www.chasseautexas.com",
      "name": "Chasse au Texas",
      "inLanguage": "fr",
      "publisher": {
        "@id": "https://www.chasseautexas.com/#organization"
      }
    },
    {
      "@type": "TravelAgency",
      "@id": "https://www.chasseautexas.com/#organization",
      "name": "ChasseAuTexas.com",
      "url": "https://www.chasseautexas.com",
      "description": "La première agence spécialisée dans le tourisme outdoor au Texas dédiée aux francophones",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "availableLanguage": ["French"],
        "url": "https://www.chasseautexas.com/reservation"
      },
      "sameAs": [
        "https://www.facebook.com/p/Chasse-au-Texas-61553358493936/",
        "https://www.instagram.com/chasseautexas_com"
      ]
    },
    {
      "@type": "ContactPage",
      "@id": "https://www.chasseautexas.com/reservation#webpage",
      "url": "https://www.chasseautexas.com/reservation",
      "name": "Réservation",
      "description": "Page de réservation pour les activités de chasse, pêche, tir, tourisme et hébergement au Texas",
      "inLanguage": "fr",
      "isPartOf": {
        "@id": "https://www.chasseautexas.com/#website"
      },
      "mainEntity": {
        "@id": "https://www.chasseautexas.com/#organization"
      },
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Accueil",
            "item": "https://www.chasseautexas.com"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Réservation",
            "item": "https://www.chasseautexas.com/reservation"
          }
        ]
      }
    }
  ]
}
</script>
```

> **Optionnel** — si vous avez un email public, ajoutez dans `contactPoint` :
> `"email": "contact@chasseautexas.com"`

---

## Activité — template CMS (`activites.html`)

Remplace `Product` par `TouristTrip`. Lie chaque champ au CMS Webflow (exemples de bindings ci-dessous).

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://www.chasseautexas.com/#website",
      "url": "https://www.chasseautexas.com",
      "name": "Chasse au Texas",
      "inLanguage": "fr",
      "publisher": {
        "@id": "https://www.chasseautexas.com/#organization"
      }
    },
    {
      "@type": "TravelAgency",
      "@id": "https://www.chasseautexas.com/#organization",
      "name": "ChasseAuTexas.com",
      "url": "https://www.chasseautexas.com"
    },
    {
      "@type": "TouristTrip",
      "@id": "https://www.chasseautexas.com/activites/{{slug}}#touristtrip",
      "name": "{{name}}",
      "description": "{{description}}",
      "url": "https://www.chasseautexas.com/activites/{{slug}}",
      "image": "{{image.url}}",
      "inLanguage": "fr",
      "touristType": "{{category}}",
      "provider": {
        "@id": "https://www.chasseautexas.com/#organization"
      },
      "offers": {
        "@type": "Offer",
        "price": "{{price}}",
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock",
        "url": "https://www.chasseautexas.com/reservation"
      }
    }
  ]
}
</script>
```

**Bindings Webflow à configurer :**

| Propriété JSON-LD | Champ CMS suggéré |
|-------------------|-------------------|
| `{{name}}` | Name |
| `{{description}}` | Description courte ou meta description |
| `{{slug}}` | Slug |
| `{{image.url}}` | Image principale |
| `{{category}}` | Catégorie (Chasse, Pêche, etc.) |
| `{{price}}` | Prix (nombre, sans symbole) |

> Ne publiez pas une activité tant que `name`, `description` et `image` ne sont pas renseignés.

---

## Catégorie — template CMS (`categorie.html`)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://www.chasseautexas.com/#website",
      "url": "https://www.chasseautexas.com",
      "name": "Chasse au Texas",
      "inLanguage": "fr",
      "publisher": {
        "@id": "https://www.chasseautexas.com/#organization"
      }
    },
    {
      "@type": "TravelAgency",
      "@id": "https://www.chasseautexas.com/#organization",
      "name": "ChasseAuTexas.com",
      "url": "https://www.chasseautexas.com"
    },
    {
      "@type": "CollectionPage",
      "@id": "https://www.chasseautexas.com/categorie/{{slug}}#webpage",
      "url": "https://www.chasseautexas.com/categorie/{{slug}}",
      "name": "{{name}}",
      "description": "{{description}}",
      "inLanguage": "fr",
      "isPartOf": {
        "@id": "https://www.chasseautexas.com/#website"
      },
      "image": {
        "@type": "ImageObject",
        "url": "{{image.url}}",
        "caption": "{{name}}"
      },
      "datePublished": "{{created-on}}",
      "dateModified": "{{updated-on}}",
      "hasPart": [
        {
          "@type": "WebPage",
          "name": "{{activite-name}}",
          "url": "https://www.chasseautexas.com/activites/{{activite-slug}}"
        }
      ]
    }
  ]
}
</script>
```

**`hasPart` — liste des activités liées :**

Dans Webflow, utilisez une **Collection List** nested ou un champ multi-référence pour générer le tableau `hasPart`. Exemple avec une liste imbriquée :

```html
"hasPart": [
  <!-- Répéter pour chaque activité de la catégorie -->
  {
    "@type": "WebPage",
    "name": "Nom de l'activité",
    "url": "https://www.chasseautexas.com/activites/slug-activite"
  }
]
```

---

## Vérification

1. [Google Rich Results Test](https://search.google.com/test/rich-results)
2. [Schema Markup Validator](https://validator.schema.org/)
3. Vérifier qu'aucun champ ne reste vide après binding CMS
