import sqlite3

def run_migration():
    conn = sqlite3.connect("msq_exam.db")
    cursor = conn.cursor()

    # 1. questions table
    cols_q = [c[1] for c in cursor.execute("PRAGMA table_info(questions)").fetchall()]
    if "owner_id" not in cols_q:
        cursor.execute("ALTER TABLE questions ADD COLUMN owner_id INTEGER")
        print("Added questions.owner_id")
    if "source_type" not in cols_q:
        cursor.execute("ALTER TABLE questions ADD COLUMN source_type TEXT DEFAULT 'admin'")
        print("Added questions.source_type")
    if "source_filename" not in cols_q:
        cursor.execute("ALTER TABLE questions ADD COLUMN source_filename TEXT")
        print("Added questions.source_filename")

    # 2. exams table
    cols_e = [c[1] for c in cursor.execute("PRAGMA table_info(exams)").fetchall()]
    if "owner_id" not in cols_e:
        cursor.execute("ALTER TABLE exams ADD COLUMN owner_id INTEGER")
        print("Added exams.owner_id")
    if "is_practice" not in cols_e:
        cursor.execute("ALTER TABLE exams ADD COLUMN is_practice INTEGER DEFAULT 0")
        print("Added exams.is_practice")

    # 3. exam_attempts table
    cols_a = [c[1] for c in cursor.execute("PRAGMA table_info(exam_attempts)").fetchall()]
    if "user_id" not in cols_a:
        cursor.execute("ALTER TABLE exam_attempts ADD COLUMN user_id INTEGER")
        print("Added exam_attempts.user_id")
    if "started_at" not in cols_a:
        cursor.execute("ALTER TABLE exam_attempts ADD COLUMN started_at TEXT")
        print("Added exam_attempts.started_at")
    if "expires_at" not in cols_a:
        cursor.execute("ALTER TABLE exam_attempts ADD COLUMN expires_at TEXT")
        print("Added exam_attempts.expires_at")
    if "submitted_at" not in cols_a:
        cursor.execute("ALTER TABLE exam_attempts ADD COLUMN submitted_at TEXT")
        print("Added exam_attempts.submitted_at")
    if "status" not in cols_a:
        cursor.execute("ALTER TABLE exam_attempts ADD COLUMN status TEXT DEFAULT 'completed'")
        print("Added exam_attempts.status")
    if "current_question" not in cols_a:
        cursor.execute("ALTER TABLE exam_attempts ADD COLUMN current_question INTEGER DEFAULT 0")
        print("Added exam_attempts.current_question")
    if "current_answers" not in cols_a:
        cursor.execute("ALTER TABLE exam_attempts ADD COLUMN current_answers TEXT DEFAULT '{}'")
        print("Added exam_attempts.current_answers")

    conn.commit()
    conn.close()
    print("Database migration completed successfully!")

if __name__ == "__main__":
    run_migration()
