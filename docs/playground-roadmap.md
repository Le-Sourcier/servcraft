# ServCraft Playground - Roadmap

## Vision
Un sandbox sécurisé et limité permettant aux utilisateurs de tester ServCraft directement dans le navigateur sans installation locale.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Playground Frontend                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Code Editor   │  │   Output Panel  │  │   Module Picker │  │
│  │   (Monaco)      │  │   (Terminal)    │  │   (Checkboxes)  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Rate Limiting  │  │  Auth/Throttle  │  │  Request Queue  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Sandbox Executor                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Docker Container                       │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │    │
│  │  │ Node.js     │  │ ServCraft   │  │ Resource    │      │    │
│  │  │ Runtime     │  │ CLI         │  │ Limits      │      │    │
│  │  │ (5s timeout)│  │ (sandboxed) │  │ (50MB RAM)  │      │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Contraintes de Sécurité

| Limite | Valeur | Description |
|--------|--------|-------------|
| Timeout | 5-10s | Temps max d'exécution |
| RAM | 50MB | Mémoire maximale |
| CPU | 10% | Limite CPU |
| Network | ❌ | Pas d'accès réseau externe |
| Disk I/O | 10MB | Écriture max sur disque |
| Sessions | 10/min/IP | Rate limiting |

## Plan d'Implémentation

### Phase 1: Backend API
- [ ] Créer l'API d'exécution de code (`/api/playground/execute`)
- [ ] Implémenter l'exécuteur Docker sandbox
- [ ] Ajouter les limites de ressources (timeout, RAM)
- [ ] Implémenter le rate limiting
- [ ] Logger les sessions pour modération

### Phase 2: Frontend UI
- [ ] Créer la page `/playground`
- [ ] Intégrer Monaco Editor pour l'édition de code
- [ ] Créer le panel de sélection de modules
- [ ] Implémenter le terminal de sortie
- [ ] Ajouter les animations et transitions

### Phase 3: Intégration
- [ ] Ajouter le lien dans la sidebar docs
- [ ] Ajouter le lien dans la navbar
- [ ] Créer des templates prédéfinis (Hello World, API basique, etc.)
- [ ] Tester sur mobile

## Endpoints API

```
POST /api/playground/execute
{
  "code": "console.log('Hello');",
  "modules": ["auth", "users"],
  "timeout": 5000
}

Response:
{
  "success": true,
  "output": "Hello\n",
  "executionTime": 45,
  "logs": []
}
```

## Templates Prédéfinis

1. **Hello World** - Afficher "Hello ServCraft!"
2. **API Basique** - Route GET /users
3. **Auth** - Login/register avec JWT
4. **Database** - CRUD avec Prisma

## Livrables

- Page `/playground` fonctionnelle
- API backend pour l'exécution
- Documentation d'utilisation
- Monitoring des performances

## Notes Techniques

- Utiliser Docker pour l'isolation
- Images Docker légères (alpine)
- Nettoyage automatique des containers
- Stockage temporaire des sessions (Redis/DB)
