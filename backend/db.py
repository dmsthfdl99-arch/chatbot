import os
import sqlite3

DB_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    os.getenv("DB_NAME", "chat.db")
)

def get_conn() -> sqlite3.Connection:
    """SQLite 커넥션을 생성하고 Row 팩토리 및 안전 PRAGMA를 설정합니다."""
    conn = sqlite3.connect(DB_PATH, timeout=10, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 10000")
    return conn


def init_db() -> None:
    """필요한 데이터베이스 테이블(세션, 메시지)을 초기화합니다."""
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL DEFAULT '새 대화',
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
                role TEXT NOT NULL,
                text TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            )
        """)
        conn.commit()


def create_session(title: str = "새 대화") -> int:
    """새로운 대화 세션을 생성하고 생성된 세션 ID를 반환합니다."""
    with get_conn() as conn:
        cur = conn.execute("INSERT INTO sessions (title) VALUES (?)", (title,))
        conn.commit()
        return cur.lastrowid


def read_sessions() -> list[dict]:
    """모든 대화 세션 목록을 최신 생성 순으로 조회합니다."""
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM sessions ORDER BY created_at DESC").fetchall()
        return [dict(row) for row in rows]


def create_message(session_id: int, role: str, text: str) -> int:
    """특정 세션에 사용자 또는 챗봇 메시지를 저장합니다."""
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO messages (session_id, role, text) VALUES (?, ?, ?)",
            (session_id, role, text),
        )
        conn.commit()
        return cur.lastrowid


def read_messages(session_id: int) -> list[dict]:
    """특정 세션의 모든 메시지를 시간순으로 조회합니다."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC",
            (session_id,)
        ).fetchall()
        return [dict(row) for row in rows]


def count_messages(session_id: int) -> int:
    """특정 세션에 저장된 메시지 개수를 확인합니다."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM messages WHERE session_id = ?",
            (session_id,)
        ).fetchone()
        return row["n"] if row else 0


def update_session(session_id: int, title: str) -> int:
    """세션의 제목을 업데이트합니다."""
    with get_conn() as conn:
        conn.execute("UPDATE sessions SET title = ? WHERE id = ?", (title, session_id))
        conn.commit()
        return session_id


def delete_session(session_id: int) -> int:
    """세션을 삭제합니다 (연관된 대화 메시지도 CASCADE로 함께 삭제됩니다)."""
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()
        return cur.rowcount