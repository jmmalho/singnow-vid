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


def baixar_video_ate_1080p(video_id):
    home_dir = os.path.expanduser("~")
    pasta_destino = os.path.join(home_dir, "Documents", "singnow_downloads")
    os.makedirs(pasta_destino, exist_ok=True)

    video_url = f"https://www.youtube.com/watch?v={video_id}"

    ydl_opts = {
        # Guarda ficheiro bruto
        "outtmpl": os.path.join(pasta_destino, "raw_%(id)s.%(ext)s"),

        # Só vídeo, até 1080p
        # Preferência por H.264/AVC quando disponível
        "format": (
            "bestvideo[height<=1080][vcodec^=avc1]/"
            "bestvideo[height<=1080]/"
            "bestvideo"
        ),

        "noplaylist": True,
        "quiet": False,
        "no_warnings": False,
    }

    print("A baixar vídeo até 1080p, sem áudio...")

    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(video_url, download=True)

        if "requested_downloads" in info and info["requested_downloads"]:
            ficheiro = info["requested_downloads"][0].get("filepath")
        else:
            ficheiro = ydl.prepare_filename(info)

    if not ficheiro or not os.path.exists(ficheiro):
        for nome in os.listdir(pasta_destino):
            if nome.startswith(f"raw_{video_id}."):
                ficheiro = os.path.join(pasta_destino, nome)
                break

    if not ficheiro or not os.path.exists(ficheiro):
        raise RuntimeError("Não consegui encontrar o vídeo descarregado.")

    print(f"\nDownload concluído:\n{ficheiro}")
    return ficheiro, pasta_destino


def converter_para_webos_tv(ficheiro_input, pasta_destino, nome_saida):
    garantir_ffmpeg()

    ficheiro_saida = os.path.join(pasta_destino, nome_saida)

    comando = [
        "ffmpeg",
        "-y",
        "-i", ficheiro_input,

        # Máximo 1080p, mantém proporção
        "-vf", "scale='min(1920,iw)':-2",

        # 30fps para compatibilidade e ficheiro mais leve
        "-r", "30",

        # Sem áudio
        "-an",

        # Codec compatível com LG webOS
        "-c:v", "libx264",
        "-profile:v", "main",
        "-level", "4.1",
        "-pix_fmt", "yuv420p",

        # Tamanho/qualidade
        "-preset", "medium",
        "-crf", "28",

        # Faz o vídeo começar mais rápido em streaming
        "-movflags", "+faststart",

        ficheiro_saida
    ]

    print("\nA converter para MP4 H.264 compatível com LG webOS TV...")
    subprocess.run(comando, check=True)

    print(f"\nVídeo final pronto:\n{ficheiro_saida}")
    return ficheiro_saida


def baixar_e_converter(video_id, nome_saida="video_webos_tv.mp4"):
    ficheiro_original, pasta_destino = baixar_video_ate_1080p(video_id)
    ficheiro_final = converter_para_webos_tv(
        ficheiro_original,
        pasta_destino,
        nome_saida
    )

    print("\nDone.")
    print("Ficheiro para usar na SingNow:")
    print(ficheiro_final)


if __name__ == "__main__":
    # Mete aqui o ID do YouTube
    video_id = "ge3IhQKLU2Y"

    # Nome final do ficheiro
    baixar_e_converter(video_id, "fastfoward.mp4")