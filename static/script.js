// フォーム送信処理
document.getElementById("record-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const subject = document.getElementById("subject").value.trim();
    const minutes = document.getElementById("minutes").value;

    const messageEl = document.getElementById("message");
    messageEl.className = "message";

    try {
        const response = await fetch("/api/records", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ subject, minutes }),
        });

        const data = await response.json();

        if (response.ok) {
            messageEl.textContent = data.message;
            messageEl.className = "message success";
            document.getElementById("record-form").reset();
            loadSummary();
        } else {
            messageEl.textContent = data.error;
            messageEl.className = "message error";
        }
    } catch (error) {
        messageEl.textContent = "通信エラーが発生しました";
        messageEl.className = "message error";
    }

    // 3秒後にメッセージを消す
    setTimeout(() => {
        messageEl.className = "message";
    }, 3000);
});

// 集計データの読み込み
async function loadSummary() {
    try {
        const response = await fetch("/api/summary");
        const data = await response.json();

        // 合計学習時間
        const totalEl = document.getElementById("total");
        totalEl.textContent = formatMinutes(data.total_minutes);

        // 科目ごとの集計
        renderSubjectSummary(data.subject_totals);

        // 日ごとの集計
        renderBarChart("daily-summary", data.daily, "label", "minutes");

        // 週ごとの集計
        renderBarChart("weekly-summary", data.weekly, "start", "minutes", "end");
    } catch (error) {
        console.error("集計データの取得に失敗しました:", error);
    }
}

// 分を「X時間Y分」形式に変換
function formatMinutes(minutes) {
    if (minutes === 0) return "0分";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}分`;
    if (mins === 0) return `${hours}時間`;
    return `${hours}時間${mins}分`;
}

// 科目ごとの集計を表示
function renderSubjectSummary(subjectTotals) {
    const container = document.getElementById("subject-summary");
    const entries = Object.entries(subjectTotals);

    if (entries.length === 0) {
        container.innerHTML = '<p class="empty">記録がありません</p>';
        return;
    }

    // 学習時間の多い順にソート
    entries.sort((a, b) => b[1] - a[1]);

    container.innerHTML = entries
        .map(
            ([subject, minutes]) => `
            <div class="subject-item">
                <span class="subject-name">${escapeHtml(subject)}</span>
                <span class="subject-time">${formatMinutes(minutes)}</span>
            </div>
        `
        )
        .join("");
}

// バーチャートを表示
function renderBarChart(containerId, data, labelKey, valueKey, subLabelKey) {
    const container = document.getElementById(containerId);

    if (data.every((d) => d[valueKey] === 0)) {
        container.innerHTML = '<p class="empty">記録がありません</p>';
        return;
    }

    const maxValue = Math.max(...data.map((d) => d[valueKey]));

    container.innerHTML = data
        .map((d) => {
            const width = d[valueKey] > 0 ? Math.max((d[valueKey] / maxValue) * 100, 2) : 0;
            const label = subLabelKey
                ? `${d[labelKey]}〜${d[subLabelKey]}`
                : d[labelKey];
            return `
            <div class="bar-row">
                <div class="bar-label">${label}</div>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${width}%"></div>
                </div>
                <div class="bar-value">${formatMinutes(d[valueKey])}</div>
            </div>
        `;
        })
        .join("");
}

// HTMLエスケープ
function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// 初期表示
loadSummary();