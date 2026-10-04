# Assets 3D — KayKit (CC0)

Instruções para o Claude Code. Este documento **substitui a seção 5.1 do GAME_SPEC**. Os modelos são KayKit Adventurers 2.0 e KayKit Skeletons 1.1, ambos de Kay Lousberg, com licença CC0.

## Arquivos
| Arquivo | Papel |
|---|---|
| `public/models/heroes/knight.glb` | Cavaleiro: herói principal, ataca no toque |
| `public/models/heroes/mage.glb` | Companheiro(a) mágico(a) desbloqueado(a) na fase 5. Use "Mago" ou "Maga" conforme a aparência do modelo, de forma consistente em todos os textos |
| `public/models/weapons/sword_1handed.glb` | Espada do Cavaleiro: mão direita (`handslot.r`) |
| `public/models/weapons/shield_badge_color.glb` | Escudo do Cavaleiro: mão esquerda (`handslot.l`) |
| `public/models/weapons/staff.glb` | Cajado do Mago: mão direita (`handslot.r`) |
| `public/models/weapons/wand.glb`, `spellbook_open.glb` | Alternativas para o Mago (varinha + livro), sem uso por ora |
| `public/models/enemies/skeleton_minion.glb` | Inimigo comum (o mais frequente) |
| `public/models/enemies/skeleton_rogue.glb` | Inimigo comum |
| `public/models/enemies/skeleton_mage.glb` | Inimigo comum |
| `public/models/enemies/skeleton_warrior.glb` | Chefe (escala ×1.6, aura e nome em destaque) |
| `public/models/animations/rig_medium_general.glb` | Clipes de animação compartilhados por TODOS os personagens |
| `public/models/animations/rig_medium_movement.glb` | Clipes de movimento (opcional) |

## Fatos técnicos (já verificados)
- Heróis e inimigos usam o **mesmo esqueleto Rig_Medium (23 juntas, com os mesmos nomes de ossos)**. As texturas vêm embutidas nos GLBs, e as armas foram convertidas para GLB autocontido.
- Os personagens **não trazem animações** e **vêm sem armas**:
  - Carregue os clipes de `animations/` uma única vez e aplique-os ao `AnimationMixer` de cada personagem. A associação é feita pelo nome do osso.
  - Prenda as armas como filhas dos ossos `handslot.r` / `handslot.l` (ex.: `skeleton.getBoneByName('handslot.r').add(sword)`), sem alterar a posição/rotação local. Os slots já estão orientados para as armas do pack.
- Ossos disponíveis: root, hips, spine, chest, upperarm/lowerarm/wrist/hand/handslot (.l/.r), head, upperleg/lowerleg/foot/toes (.l/.r).
- Clipes em `rig_medium_general.glb`: Death_A, Death_A_Pose, Death_B, Death_B_Pose, Hit_A, Hit_B, Idle_A, Idle_B, Interact, PickUp, Spawn_Air, Spawn_Ground, T-Pose, Throw, Use_Item.
- **Não há clipe de ataque corpo a corpo neste pack.** Se no futuro for adicionado `public/models/animations/rig_medium_combat*.glb` (pack KayKit Character Animations), detecte-o automaticamente e use os clipes de ataque dele. Até lá, use o fallback descrito abaixo.

## Animações dos heróis
- **Cavaleiro parado:** `Idle_A`.
- **Cavaleiro atacando (fallback sem clipe de ataque):** combine um avanço procedural rápido do personagem em direção ao inimigo (~0.15 s ida, ~0.15 s volta) com uma rotação aditiva procedural nos ossos `upperarm.r`/`lowerarm.r` simulando um golpe de cima para baixo. Aplique essa rotação depois de `mixer.update()` no mesmo frame. Em toques rápidos, reinicie o golpe sem travar. Esse comportamento deve ficar isolado em `KnightAttack.ts`, para ser trocado facilmente por um clipe real.
- **Mago:** use `Idle_B` quando parado e `Throw` para lançar o projétil a cada 1,5 s. O projétil deve sair de `handslot.r` no frame em que o braço estiver à frente (~40% do clipe).
- **Chefe derrotado / level up:** opcionalmente, o Cavaleiro toca `Interact` ou `Use_Item` como comemoração.

## Animações dos inimigos
- **Entrada:** `Spawn_Ground` para comuns e `Spawn_Air` para o chefe, seguidas de Idle.
- **Parado:** `Idle_A`, ou `Idle_B` para variar.
- **Ao levar dano:** alterne entre `Hit_A` e `Hit_B` com crossfade de ~0.1 s, com limite de frequência para não reiniciar o clipe a cada toque.
- **Morte:** `Death_A` ou `Death_B` (aleatório), com clamp no último frame, seguidas do encolhimento + partículas do spec.

## Variações por zona
Aplique um tint/emissive leve nos inimigos conforme a zona e dê nomes diferentes. Exemplos: "Esqueleto da Floresta", "Esqueleto Gélido", "Esqueleto Vulcânico". Clone o material por instância.

## Créditos
Crie um `CREDITS.md` com: "3D characters, weapons and animations: Kay Lousberg — KayKit (www.kaylousberg.com), CC0".
