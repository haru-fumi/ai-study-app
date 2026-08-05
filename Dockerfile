FROM python:3.12-slim

WORKDIR /app

# 依存関係のインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリのコピー
COPY app.py .
COPY templates ./templates
COPY static ./static

# データディレクトリ
RUN mkdir -p /data

# ポート公開
EXPOSE 5000

# 起動コマンド
CMD ["python", "app.py"]