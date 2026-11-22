# emersondosanjos.github.io

Bilingual (English default + Portuguese `/pt/`) personal research and engineering site of **Emerson Barbosa dos Anjos**: thermal engineering, fluid mechanics, energy systems, hydrogen technologies, open science, and applied AI / 3D CAD / VR workflows. Built with [Astro](https://astro.build) and deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Structure & languages

- **Shared views:** `src/views/` (`HomeView.astro`, `ResearchView.astro`, `PublicationsView.astro`, `OpenScienceView.astro`, `AiView.astro`, `CvView.astro`)
- **English routes (default):** `src/pages/` (`/`, `/research/`, `/publications/`, `/open-science/`, `/ai/`, `/cv/`)
- **Portuguese routes:** `src/pages/pt/` (`/pt/`, `/pt/research/`, `/pt/publications/`, `/pt/open-science/`, `/pt/ai/`, `/pt/cv/`)
- **Translations & UI copy:** `src/lib/i18n.ts`

## Updating content

Publications, research lines, projects, awards, education, tools and institutional emails are driven by `src/data/works.json`.

- **A paper is accepted:** change its `status` to `published`, and add `venue`, `authors`, `doi` and, when they exist, `github` and `zenodo` links.
- **New paper or tool:** add an entry to `works` or `tools` with its `year` and `line` (`reforming`, `droplets`, `desalination`, `electrolysis`, `recovery`).
- **Embargo rule:** papers under review or in preparation list only topic and status. Results, figures and data stay off the site until publication.
- **CV portrait photo:** stored at `public/portrait.jpg` and displayed inside a circular frame on `/cv/` and `/pt/cv/`.

## Local preview

```sh
npm install
npm run dev
```

Content is licensed CC BY 4.0. Fonts: Playpen Sans, Funnel Sans and Martian Mono (SIL Open Font License), self-hosted through Fontsource.
