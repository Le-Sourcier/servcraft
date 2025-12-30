# Playground Cleanup Scripts

## cleanup-playground-containers.sh

Script autonome pour nettoyer les conteneurs Docker du playground expirés.

### Fonctionnalités

- Nettoie les conteneurs de plus de 40 minutes (30 min + 10 min extension)
- Supprime les volumes Docker associés
- Nettoie les volumes orphelins (sans conteneur)
- Logs détaillés avec timestamps
- Peut tourner indépendamment du serveur Next.js

### Installation en production

#### 1. Rendre le script exécutable

```bash
chmod +x /path/to/servcraft_docs/scripts/cleanup-playground-containers.sh
```

#### 2. Tester manuellement

```bash
./scripts/cleanup-playground-containers.sh
```

#### 3. Configurer le cron

Éditer la crontab :

```bash
crontab -e
```

Ajouter une de ces lignes :

**Option 1 - Toutes les 5 minutes (recommandé en dev):**
```cron
*/5 * * * * /path/to/servcraft_docs/scripts/cleanup-playground-containers.sh >> /var/log/playground-cleanup.log 2>&1
```

**Option 2 - Toutes les 10 minutes (recommandé en production):**
```cron
*/10 * * * * /path/to/servcraft_docs/scripts/cleanup-playground-containers.sh >> /var/log/playground-cleanup.log 2>&1
```

**Option 3 - Toutes les heures (si peu d'utilisation):**
```cron
0 * * * * /path/to/servcraft_docs/scripts/cleanup-playground-containers.sh >> /var/log/playground-cleanup.log 2>&1
```

#### 4. Vérifier les logs

```bash
tail -f /var/log/playground-cleanup.log
```

### Surveillance des ressources

Pour surveiller l'utilisation des conteneurs playground :

```bash
# Voir tous les conteneurs playground actifs
docker ps --filter "name=servcraft-playground-"

# Voir l'utilisation mémoire/CPU
docker stats --filter "name=servcraft-playground-"

# Voir tous les volumes playground
docker volume ls --filter "name=servcraft-vol-"

# Calculer l'espace disque utilisé par les volumes
docker volume ls --filter "name=servcraft-vol-" -q | xargs docker volume inspect --format '{{ .Name }}: {{ .Mountpoint }}' | while read vol; do du -sh $(echo $vol | cut -d: -f2); done
```

### Notes importantes

- Le script utilise la date de création Docker pour calculer l'âge (pas les métadonnées Node.js)
- Fonctionne indépendamment de l'état du serveur Next.js
- Safe : ne touche que les conteneurs avec le préfixe `servcraft-playground-`
- Les volumes orphelins sont aussi nettoyés pour éviter l'accumulation

### Architecture de nettoyage

```
┌─────────────────────────────────────────────────────────────┐
│                  Nettoyage Multi-Couches                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Timer JavaScript (en mémoire)                            │
│     └─> Nettoie après 30-40 min si serveur actif            │
│                                                               │
│  2. Worker périodique (Node.js)                              │
│     └─> Vérifie toutes les 5 min depuis le serveur          │
│                                                               │
│  3. Script Cron (indépendant)                                │
│     └─> Vérifie toutes les 5-10 min via crontab             │
│                                                               │
│  4. Flag --rm Docker                                          │
│     └─> Auto-suppression si arrêt du conteneur              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

Cette architecture garantit qu'aucun conteneur ne reste actif plus de 40 minutes, même en cas de crash serveur ou de pic de 1M d'utilisateurs.
