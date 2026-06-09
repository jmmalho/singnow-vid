const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SONGS_DIR = path.join(ROOT, "api", "songs");
const OUTPUT_FILE = path.join(ROOT, "api", "songs.json");

function exists(filePath) {
  return fs.existsSync(filePath);
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
  // Exemplo: "ONEPACT - 100" => artist: ONEPACT, title: 100
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

function readOptionalSongJson(folderPath) {
  const songJsonPath = path.join(folderPath, "song.json");

  if (!exists(songJsonPath)) return {};

  return readJson(songJsonPath);
}

function numberOrDefault(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;

  const parsed = Number(value);

  return Number.isNaN(parsed) ? fallback : parsed;
}

function buildFolderUrl(folderName) {
  // Mantém espaços seguros em URL.
  return "api/songs/" + encodeURIComponent(folderName).replace(/%20/g, "%20");
}

function normalizeSong(folderName, folderPath) {
  const folderUrl = buildFolderUrl(folderName);
  const parsed = parseFolderName(folderName);
  const custom = readOptionalSongJson(folderPath);

  const audioFile = findFirst(folderPath, [
    "song.mp3",
    "song.wav",
    "song.m4a",
    "audio.mp3",
    "audio.wav",
    "instrumental.mp3",
    "instrumental.wav"
  ]);

  const lyricsFile = findFirst(folderPath, [
    "lyrics.json",
    "letra.json",
    "legendas.json"
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
    "video.mp4",
    "preview.mp4"
  ]);

  const bandLogoFile = findFirst(folderPath, [
    "band-logo.png",
    "band-logo.jpg",
    "artist-logo.png",
    "artist-logo.jpg",
    "logo.png",
    "logo.jpg"
  ]);

  if (!audioFile && !custom.audio) {
    console.warn("⚠️ Sem áudio em:", folderName);
  }

  if (!lyricsFile && !custom.lyrics) {
    console.warn("⚠️ Sem lyrics.json em:", folderName);
  }

  // FIX MAIS IMPORTANTE:
  // Começa por copiar TODOS os campos do song.json.
  // Assim NUNCA perdes campos novos:
  // genre, releaseDate, startPreview, delay, lyricsAdjustment, bandLogo, mood, difficulty, tags, etc.
  const song = Object.assign({}, custom);

  // Campos obrigatórios/base com fallback automático.
  song.id = custom.id || makeId(folderName);
  song.title = custom.title || parsed.title;
  song.artist = custom.artist || parsed.artist;
  song.category = custom.category || custom.genre || "Karaoke";

  // Assets automáticos só são preenchidos se não estiverem definidos no song.json.
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

  // Logotipo da banda/artista.
  // Podes pôr no song.json como bandLogo/artistLogo/logo
  // ou meter ficheiro logo.png/band-logo.png na pasta da música.
  if (!song.bandLogo && !song.artistLogo && !song.logo && bandLogoFile) {
    song.bandLogo = `${folderUrl}/${bandLogoFile}`;
  }

  // Compatibilidade com nomes antigos que usaste antes.
  if (song.delay === undefined && song.previewVideoOffset !== undefined) {
    song.delay = numberOrDefault(song.previewVideoOffset, 0);
  }

  if (song.menuPreviewWait === undefined && song.previewDelay !== undefined) {
    const previewDelay = numberOrDefault(song.previewDelay, 900);

    // Se vier tipo 0.9, assume segundos e converte para ms.
    // Se vier 900, assume ms.
    song.menuPreviewWait = previewDelay < 20
      ? Math.round(previewDelay * 1000)
      : previewDelay;
  }

  // Defaults úteis para a app.
  if (song.startPreview === undefined && song.previewStart !== undefined) {
    song.startPreview = song.previewStart;
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

  if (song.lyricsAdjustment === undefined) {
    song.lyricsAdjustment = 0;
  }

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
  console.log("✅ Este gerador preserva TODOS os campos do song.json.");
  console.log("Exemplos preservados: genre, releaseDate, startPreview, delay, lyricsAdjustment, bandLogo, tags, mood, difficulty...");
}

generate();
