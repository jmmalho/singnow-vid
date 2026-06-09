# SingNow Site/API

Faz upload desta pasta para o Netlify ou outro alojamento estático.

Endpoint principal:

```txt
/api/songs.json
```

Cada música usa caminhos relativos ao root do site:

```json
{
  "cover": "assets/covers/minha-musica.png",
  "backgroundImage": "assets/videos/fundo.jpg",
  "backgroundVideo": "assets/videos/fundo.mp4",
  "audio": "assets/audio/instrumental.mp3",
  "lyrics": "api/songs/minha-musica/lyrics.json"
}
```

Formato das letras:

```json
[
  { "time": 0.0, "text": "Primeira linha" },
  { "time": 4.2, "text": "Segunda linha" }
]
```
