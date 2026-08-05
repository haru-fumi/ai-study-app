import os
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

DB_PATH = os.environ.get("DB_PATH", "/data/study.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS study_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject TEXT NOT NULL,
            minutes INTEGER NOT NULL,
            studied_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/records", methods=["POST"])
def add_record():
    data = request.get_json()
    subject = data.get("subject", "").strip()
    minutes = data.get("minutes")

    if not subject:
        return jsonify({"error": "科目を入力してください"}), 400

    try:
        minutes = int(minutes)
    except (TypeError, ValueError):
        return jsonify({"error": "学習時間は数値で入力してください"}), 400

    if minutes <= 0:
        return jsonify({"error": "学習時間は1分以上で入力してください"}), 400

    studied_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_db()
    conn.execute(
        "INSERT INTO study_records (subject, minutes, studied_at) VALUES (?, ?, ?)",
        (subject, minutes, studied_at),
    )
    conn.commit()
    conn.close()

    return jsonify({"message": "記録を追加しました"}), 201


@app.route("/api/summary")
def get_summary():
    conn = get_db()

    # 全記録
    records = conn.execute(
        "SELECT subject, minutes, studied_at FROM study_records ORDER BY studied_at"
    ).fetchall()

    # 合計学習時間
    total_minutes = sum(r["minutes"] for r in records)

    # 科目ごとの集計
    subject_totals = {}
    for r in records:
        subject_totals[r["subject"]] = subject_totals.get(r["subject"], 0) + r["minutes"]

    # 日ごとの集計（直近7日間）
    today = datetime.now().date()
    daily = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_minutes = sum(
            r["minutes"]
            for r in records
            if datetime.strptime(r["studied_at"], "%Y-%m-%d %H:%M:%S").date() == day
        )
        daily.append(
            {
                "date": day.strftime("%Y-%m-%d"),
                "label": day.strftime("%m/%d"),
                "minutes": day_minutes,
            }
        )

    # 週ごとの集計（直近4週間）
    weekly = []
    for i in range(3, -1, -1):
        # 週の開始日（月曜日）
        week_start = today - timedelta(days=today.weekday() + i * 7)
        week_end = week_start + timedelta(days=6)
        week_minutes = 0
        for r in records:
            r_date = datetime.strptime(r["studied_at"], "%Y-%m-%d %H:%M:%S").date()
            if week_start <= r_date <= week_end:
                week_minutes += r["minutes"]
        weekly.append(
            {
                "start": week_start.strftime("%m/%d"),
                "end": week_end.strftime("%m/%d"),
                "minutes": week_minutes,
            }
        )

    conn.close()

    return jsonify(
        {
            "total_minutes": total_minutes,
            "subject_totals": subject_totals,
            "daily": daily,
            "weekly": weekly,
        }
    )


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)