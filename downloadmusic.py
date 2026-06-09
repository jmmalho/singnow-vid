import os
import shutil
import subprocess
from yt_dlp import YoutubeDL


def garantir_ffmpeg():
    if shutil.which("ffmpeg") is None:
        raise RuntimeError(
            "FFmpeg não está instalado.\n"
            "No Mac instala com:\n"
            "brew install ffmpeg"
        )


def baixar_audio(video_id):
    home_dir = os.path.expanduser("~")
    pasta_destino = os.path.join(home_dir, "Documents", "singnow_downloads")
    os.makedirs(pasta_destino, exist_ok=True)

    video_url = f"https://www.youtube.com/watch?v={video_id}"

    ydl_opts = {
        "outtmpl": os.path.join(pasta_destino, "raw_audio_%(id)s.%(ext)s"),

        # Melhor áudio disponível
        "format": "bestaudio/best",

        "noplaylist": True,
        "quiet": False,
        "no_warnings": False,
    }

    print("A baixar áudio...")

    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(video_url, download=True)

        if "requested_downloads" in info and info["requested_downloads"]:
            ficheiro = info["requested_downloads"][0].get("filepath")
        else:
            ficheiro = ydl.prepare_filename(info)

    if not ficheiro or not os.path.exists(ficheiro):
        for nome in os.listdir(pasta_destino):
            if nome.startswith(f"raw_audio_{video_id}."):
                ficheiro = os.path.join(pasta_destino, nome)
                break

    if not ficheiro or not os.path.exists(ficheiro):
        raise RuntimeError("Não consegui encontrar o áudio descarregado.")

    print(f"\nDownload concluído:\n{ficheiro}")
    return ficheiro, pasta_destino


def converter_para_mp3(ficheiro_input, pasta_destino, nome_saida):
    garantir_ffmpeg()

    ficheiro_saida = os.path.join(pasta_destino, nome_saida)

    comando = [
        "ffmpeg",
        "-y",
        "-i", ficheiro_input,

        # MP3 compatível e leve
        "-vn",
        "-c:a", "libmp3lame",
        "-b:a", "192k",
        "-ar", "44100",
        "-ac", "2",

        ficheiro_saida
    ]

    print("\nA converter para MP3...")
    subprocess.run(comando, check=True)

    print(f"\nMP3 final pronto:\n{ficheiro_saida}")
    return ficheiro_saida


def baixar_e_converter_mp3(video_id, nome_saida="song.mp3"):
    ficheiro_original, pasta_destino = baixar_audio(video_id)
    ficheiro_final = converter_para_mp3(
        ficheiro_original,
        pasta_destino,
        nome_saida
    )

    print("\nDone.")
    print("Ficheiro para usar na SingNow:")
    print(ficheiro_final)


if __name__ == "__main__":
    # Mete aqui o ID do YouTube
    video_id = "u_dOfihl2s0"

    # Nome final do ficheiro
    baixar_e_converter_mp3(video_id, "vagabundo.mp3")