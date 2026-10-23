# Desenvolvimento

Kotlin, Jetpack Compose (Material 3), Media3 (ExoPlayer + MediaSessionService) e Room.
`minSdk` 26 (Android 8.0), `targetSdk` 37.

## Estrutura

```
app/src/main/java/brunoxnr/simplemusicplayer/
├── data/        Leitura do MediaStore, modelos, agrupamento e banco Room
├── playback/    Serviço de reprodução e conexão da interface com o player
└── ui/          Telas Compose, componentes e tema
```

## Build

Abra a pasta do repositório no Android Studio e use **Run**. Pelo terminal:

```sh
./gradlew installDebug        # instala no aparelho/emulador conectado
./gradlew testDebugUnitTest   # testes unitários
./gradlew lintDebug           # análise estática
./gradlew bundleRelease       # AAB para a Play Store (assinado se houver keystore.properties)
```

O build de debug instala como um app separado, **SimpleMP Dev** (pacote `brunoxnr.simplemusicplayer.dev`),
para conviver com a versão da Play Store no mesmo aparelho.

Sem Java no PATH, aponte `JAVA_HOME` para o JDK do Android Studio
(`C:\Program Files\Android\Android Studio\jbr`).

## Assinatura de release

O build de release lê a chave de upload de um `keystore.properties` na raiz do repositório. Esse arquivo
e o `.jks` ficam fora do git. Sem eles, o AAB sai sem assinatura.

```properties
storeFile=../keys/upload-keystore.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

O caminho de `storeFile` é relativo à raiz do repositório (ou absoluto).
