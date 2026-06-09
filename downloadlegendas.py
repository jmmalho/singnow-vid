from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import SRTFormatter

# O ID do teu vídeo já está aqui configurado
video_id = "Qi07O6mFF_Y"  

try:
    # 1. Criar a instância da API (obrigatório nas versões novas)
    ytt_api = YouTubeTranscriptApi()

    # 2. Procurar a legenda usando o método .fetch() que o teu Python reconheceu
    transcript = ytt_api.fetch(video_id, languages=['pt', 'en'])

    # 3. Transforma o resultado no formato SRT
    formatter = SRTFormatter()
    srt_formatted_transcript = formatter.format_transcript(transcript)

    # 4. Guarda o ficheiro .srt
    nome_ficheiro = f"legendas_{video_id}.srt"
    with open(nome_ficheiro, 'w', encoding='utf-8') as f:
        f.write(srt_formatted_transcript)

    print(f"Sucesso! Legendas guardadas em '{nome_ficheiro}'")

except Exception as e:
    print(f"Ocorreu um erro: {e}")