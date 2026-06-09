const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SONGS_DIR = path.join(ROOT, "api", "songs");
const OUTPUT_FILE = path.join(ROOT, "api", "songs.json");

function exists(filePath) {
  return fs.existsSync(filePath);
}

function slugToTitle(slug) {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    });
}

function parseFolderName(folderName) {
  if (folderName.includes(" - ")) {
    const parts = folderName.split(" - ");
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(" - ").trim()
    };
  }

  return {
    artist: "SingNow",
    title: slugToTitle(folderName)
  };
}

function makeId(folderName) {
  return folderName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findFirst(folderPath, names) {
  for (const name of names) {
    const filePath = path.join(folderPath, name);
    if (exists(filePath)) return name;
  }

  return "";
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.warn("⚠️ JSON inválido:", filePath);
    console.warn(err.message);
    return {};
  }
}

function readOptionalSongJson(folderPath) {
  const songJsonPath = path.join(folderPath, "song.json");
  if (!exists(songJsonPath)) return {};
  return readJson(songJsonPath);
}

function keepNumber(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
}

function normalizeSong(folderName, folderPath) {
  const folderUrl = "api/songs/" + encodeURIComponent(folderName).replace(/%20/g, "%20");
  const parsed = parseFolderName(folderName);
  const custom = readOptionalSongJson(folderPath);

  const audioFile = findFirst(folderPath, [
    "song.mp3",
    "song.wav",
    "song.m4a",
    "audio.mp3",
    "instrumental.mp3"
  ]);

  const lyricsFile = findFirst(folderPath, [
    "lyrics.json",
    "letra.json"
  ]);

  const coverFile = findFirst(folderPath, [
    "cover.jpg",
    "cover.jpeg",
    "cover.png",
    "capa.jpg",
    "capa.jpeg",
    "capa.png"
  ]);

  const backgroundImageFile = findFirst(folderPath, [
    "background.jpg",
    "background.jpeg",
    "background.png",
    "bg.jpg",
    "bg.jpeg",
    "bg.png",
    "fundo.jpg",
    "fundo.jpeg",
    "fundo.png"
  ]);

  const backgroundVideoFile = findFirst(folderPath, [
    "background.mp4",
    "bg.mp4",
    "fundo.mp4",
    "video.mp4"
  ]);

  if (!audioFile && !custom.audio) {
    console.warn("⚠️ Sem song.mp3/audio em:", folderName);
  }

  if (!lyricsFile && !custom.lyrics) {
    console.warn("⚠️ Sem lyrics.json em:", folderName);
  }

  // Começa com TODOS os campos do song.json.
  // Isto é o fix importante: não perde genre, releaseDate, startPreview, delay, menuPreviewWait, etc.
  const song = Object.assign({}, custom);

  song.id = custom.id || makeId(folderName);
  song.title = custom.title || parsed.title;
  song.artist = custom.artist || parsed.artist;
  song.category = custom.category || "Karaoke";

  song.cover =
    custom.cover ||
    (coverFile ? `${folderUrl}/${coverFile}` : "assets/covers/default-cover.jpg");

  song.backgroundImage =
    custom.backgroundImage ||
    (backgroundImageFile ? `${folderUrl}/${backgroundImageFile}` : "assets/videos/default-background.jpg");

  song.backgroundVideo =
    custom.backgroundVideo ||
    (backgroundVideoFile ? `${folderUrl}/${backgroundVideoFile}` : "");

  song.audio =
    custom.audio ||
    (audioFile ? `${folderUrl}/${audioFile}` : "");

  song.lyrics =
    custom.lyrics ||
    (lyricsFile ? `${folderUrl}/${lyricsFile}` : "");

  // Compatibilidade com nomes antigos que já usaste.
  // Agora a app usa "delay" e "menuPreviewWait".
  if (song.delay === undefined && song.previewVideoOffset !== undefined) {
    song.delay = keepNumber(song.previewVideoOffset, 0);
  }

  if (song.menuPreviewWait === undefined && song.previewDelay !== undefined) {
    // Se estiver em segundos tipo 0.9, converte para ms.
    const previewDelay = keepNumber(song.previewDelay, 900);
    song.menuPreviewWait = previewDelay < 20 ? Math.round(previewDelay * 1000) : previewDelay;
  }

  if (song.menuPreviewWait === undefined) {
    song.menuPreviewWait = 900;
  }

  if (song.delay === undefined) {
    song.delay = 0;
  }

  if (song.previewVolume === undefined) {
    song.previewVolume = 0.45;
  }

  // Campos opcionais recomendados, só ficam se existirem no song.json:
  // genre, releaseDate, album, language, duration, explicit, difficulty, mood,
  // startPreview, previewStart, previewVideo, previewAudio, tags, etc.

  return song;
}

function generate() {
  if (!exists(SONGS_DIR)) {
    console.error("❌ Pasta não encontrada:", SONGS_DIR);
    console.log("Cria a pasta api/songs primeiro.");
    process.exit(1);
  }

  const folders = fs
    .readdirSync(SONGS_DIR)
    .filter(function (item) {
      return fs.statSync(path.join(SONGS_DIR, item)).isDirectory();
    });

  const songs = [];

  folders.forEach(function (folderName) {
    const folderPath = path.join(SONGS_DIR, folderName);
    const song = normalizeSong(folderName, folderPath);
    songs.push(song);
  });

  songs.sort(function (a, b) {
    return String(a.title || "").localeCompare(String(b.title || ""));
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(songs, null, 2), "utf8");

  console.log("✅ songs.json criado com sucesso!");
  console.log("🎵 Músicas:", songs.length);
  console.log("📄 Ficheiro:", OUTPUT_FILE);
  console.log("");
  console.log("Campos preservados do song.json: genre, releaseDate, startPreview, delay, menuPreviewWait, previewVolume, etc.");
}

generate();
