# BRIEF DE REPRISE — 42 rue du Bac (nouvelle session, 2026-08-05 soir)
> Protocole d'exécution, pas une liste de suggestions. Lis-le en entier avant d'agir.
> Méthode : LOOPS (observer → produire → se critiquer → corriger), preuve pas promesse,
> chirurgical sur le code, autonome — ne question que les vrais arbitrages argent/légal.

## 1. Contexte
Site de vente immersif du bien **42 rue du Bac, Paris 7ᵉ** (marque SAS YP, fondateur solo Louison).
- Repo : `~/42-rue-du-bac` · branche de travail `renforcement-autonome-2026-07` · **`main` = prod GitHub Pages** → https://louchaumeau-maker.github.io/42-rue-du-bac/ (push main = déploiement, propagation 1-3 min).
- Convention : commits atomiques en français sur la branche, merge sur main APRÈS vérification, puis **ouvrir le lien en ligne et le parcourir** avant de dire « déployé ».
- Le brief produit précédent : `BRIEF-V3.md` (données officielles détaillées) — le compléter, ne pas le contredire.

## 2. Données VERROUILLÉES (ne jamais dévier)
- Prix : **1 995 000 €** (18 250 €/m² au sol). Positionnement : **« deux appartements réunissables »** — le mot « duplex » est interdit (aucun escalier intérieur, porte condamnée).
- 5ᵉ : Carrez 64,05 m² · DPE **D 187** · GES **A 5** · DDT 22/01/2024 (Accordiag).
- 6ᵉ : Carrez 37,47 m² · DPE **F 392** · GES **C 12** · DDT 26/04/2024 (Avenue du Diag). Les deux DPE s'affichent, pas d'omission du F.
- Totaux : 101,52 m² Carrez · 109,29 m² au sol · 5 lots (11+12 au 5ᵉ ; 153+154+155 au 6ᵉ, géomètre FLF juil. 2026). Scénarios : réunir, ou 4 studios (lots 11/12/153/154).
- **Fidélité absolue au bien réel** : aucun mur/fenêtre/porte/volume/vue inventé, dans AUCUN média. Chaque image ou clip généré est comparé à sa photo source ; chaque vidéo est auditée image par image avant intégration (extraire des planches ffmpeg `select/tile` et les LIRE).

## 3. État au moment de la passation (tout est commité et en ligne)
- Structure : hero → **Le film** (un seul film continu 34,4 s, bloc sticky sombre) → photos (8, chapitrées 5ᵉ/6ᵉ/immeuble) → projections → fiche (2 logements, 2 DPE) → plans géomètre SVG → contact. DA claire ivoire/encre/laiton, page ~9 950 px.
- Le film : descente satellite (Remotion, x1,58) → atterrissage cour (Veo) → séjour 5ᵉ → cuisine → chambre → bureau/toits → séjour 6ᵉ → chambre mansardée (Veo). Légendes synchronisées dans `js/main.js` (table CAPS), course scroll 300vh dans `css/main.css`.
- 8 clips Veo 3.1 image-to-video générés depuis les vraies photos, **sauvegardés dans `assets/video/_originaux/veo-clips/`** avec les scripts de montage `film.sh` (film complet) et `monter.sh`. Le clip c02 est coupé à 2,2 s (au-delà Veo perce un mur plein — défaut identifié et éliminé).
- Leads : formulaire → Supabase (projet Flowim `ialrthwythkfnjgmtqjo`, table `leads_42bac`, insert-only RLS).

## 4. CHANTIERS RESTANTS (ordre de priorité)
### A. Qualité vidéo — LE reproche principal de Louison
Les clips actuels sont en **720p upscalé** → qualité jugée insuffisante.
**Découverte clé : l'API Veo accepte `"resolution": "1080p"`** dans `parameters` (testé, accepté par `veo-3.1-generate-preview`). Le script `~/Outils/veo/veo_clip.py` ne le passe pas encore : l'ajouter.
1. Régénérer **UN** clip en 1080p, vérifier qualité + coût réel sur la console Google avant la série (budget total ~25 €, rechargé — NE PAS le cramer en doublons).
2. Régénérer les clips dans l'ordre d'importance : c01 (séjour entrée), c08 (cour), c05 (bureau→toits), c06 (6ᵉ), puis le reste si le budget suit. Mêmes prompts (dans l'historique des clips : fidélité stricte, « preserve the real architecture exactly as photographed »).
3. Auditer chaque clip image par image (planches ffmpeg). Rejeter toute hallucination (murs qui s'ouvrent, objets qui morphent).
4. Remonter avec `film.sh` (adapter les chemins), recadrage **uniforme** `crop=1232:693:24:13` avant `scale` — jamais de crop variable par clip (déformation). ffmpeg statique : `~/Outils/prospection/.venv` → `imageio_ffmpeg.get_ffmpeg_exe()` (pas de ffmpeg système, pas de `timeout`/`gtimeout` sur ce Mac).
5. La descente satellite (source `assets/video/_originaux/`, rendu Remotion `~/Desktop/Claude Code/video-studio`, compos `opener42/`) peut être re-rendue à plus haute qualité si elle jure face aux clips 1080p.
6. Incrémenter `?v=N` sur `film.mp4` et le poster (le cache Range mélange deux montages sinon).
7. **Piège vécu : `.gitignore` contient des règles sur `assets/video/`** — après tout ajout de média, vérifier `git ls-files assets/video/` ; un média non suivi = 404 silencieux en prod sous son poster.

### B. Aménagements virtuels (projections) — à refaire en mieux
Session **ChatGPT connectée dans Chrome** (utiliser claude-in-chrome, onglet chatgpt.com ouvert). Recette qui marche (mémoire) : coller l'image (osascript presse-papier + cmd+V, parfois 2×), prompt « CETTE MÊME pièce, conserve RIGOUREUSEMENT l'architecture, 16:9 », ~40 s, télécharger.
Alternative locale : `python3 ~/.claude/skills/nano-banana/nano.py --model nano-banana-2 --image <source>` (clé `~/.config/nano-banana/key`, rechargée).
- Direction déco validée : beige/bois/marbre discret ; cuisine ouverte avec comptoir au 5ᵉ ; 6ᵉ en deux lectures (chambre famille / studio locatif).
- Chaque staging : partir de la photo pro 1920, comparer côte à côte avec la source, rejeter si un volume/ouverture bouge. Formats site : webp q80, 960 + 1600/1920, `?v=N`.
- Remplacer les 4 projections actuelles + le curseur avant/après si mieux.

### C. Formulaire contact — retours exacts de Louison
1. Reformuler : PAS « recevoir le dossier complet » (le site EST le dossier). Remplacer par « Laissez vos coordonnées pour être recontacté » / bouton type « Être recontacté », et garder « Organiser une visite » + le téléphone direct.
2. **Notification email : quand quelqu'un soumet le formulaire, Louison doit recevoir un email sur `lou.chaumeau@gmail.com`.** Voie propre : Edge Function Supabase (projet `ialrthwythkfnjgmtqjo`) déclenchée à l'insert dans `leads_42bac` (webhook DB → fonction) qui envoie via Resend. Il faudra une `RESEND_API_KEY` : la demander à Louison (compte gratuit resend.com, 2 min) — c'est un des SEULS points où le solliciter. En attendant, préparer la fonction et le webhook.
3. Tester de bout en bout : soumission réelle → ligne en base → email reçu.

### D. QA finale avant chaque merge
- Vrai Chrome via claude-in-chrome (**le panneau preview Claude gèle en arrière-plan** — `visibilityState:hidden` fige IntersectionObserver/compositing ; mettre l'onglet au premier plan via osascript, `scrollBehavior='auto'`).
- Serveur local : preview_start config `42-rue-du-bac` (launch.json, npx http-server). Vérifier `curl | grep <marqueur>` que le serveur sert la version fraîche.
- Desktop + mobile (390 px), console sans erreur, images non cassées, vidéos qui jouent, formulaire OK.
- Ne jamais finir le film par un fondu au noir (bloc sticky : l'écran resterait noir).

## 5. Accès (tout est autorisé sur cette machine)
- Clé Gemini/Veo : `~/.config/nano-banana/key` (rechargée ~25 €). Veo ≈ 3 €/clip 8 s en 720p — vérifier le tarif 1080p sur le premier clip.
- `gh` authentifié (`louchaumeau-maker`), SSH ok. Supabase CLI/MCP dispo.
- Vault Obsidian : `~/Desktop/LouisonBrain` (entrée `HOME.md`) — y lire le contexte business avant de réinventer quoi que ce soit.
- Python : `~/Outils/prospection/.venv` (pymupdf, PIL, imageio-ffmpeg). Remotion : `~/Desktop/Claude Code/video-studio`.
- Contact : lou.chaumeau@gmail.com · +33 6 12 07 68 83 (celui affiché sur le site).

## 6. Compte rendu attendu en fin de passe
Lien en ligne vérifié · commit/branche · transformations · médias régénérés (et leur audit) · tests réels effectués · budget Veo consommé · limites restantes · max 5 décisions pour Louison.
