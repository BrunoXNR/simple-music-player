# Simple Music Player

Player de MP3 para Android, simples e bem feito: toca as músicas salvas no aparelho, sem anúncios
e sem acesso à internet.

## Funcionalidades

- Biblioteca lida automaticamente do aparelho (MediaStore), com busca, ordenação e filtros por
  favoritas, pastas, álbuns e artistas
- Reprodução em segundo plano com controles na notificação, tela de bloqueio, fones e Bluetooth
- Retoma a última fila e posição, inclusive pelo botão play do fone com o app fechado
- Fila editável (tocar a seguir, adicionar, reordenar, remover), aleatório e repetição
- Favoritos e playlists salvos localmente

## Stack

Kotlin, Jetpack Compose (Material 3), Media3 (ExoPlayer + MediaSessionService) e Room.
`minSdk` 26 (Android 8.0), `targetSdk` 37.

## Estrutura

```
app/src/main/java/brunoxnr/simplemusicplayer/
├── data/        Leitura do MediaStore, modelos, agrupamento e banco Room
├── playback/    Serviço de reprodução e conexão da interface com o player
└── ui/          Telas Compose, componentes e tema
```

## Desenvolvimento

Abra a pasta do repositório no Android Studio e use **Run**. Pelo terminal:

```sh
./gradlew installDebug        # instala no aparelho/emulador conectado
./gradlew testDebugUnitTest   # testes unitários
./gradlew lintDebug           # análise estática
./gradlew assembleRelease     # APK de release (ainda sem assinatura)
```

Sem Java no PATH, aponte `JAVA_HOME` para o JDK do Android Studio
(`C:\Program Files\Android\Android Studio\jbr`).
