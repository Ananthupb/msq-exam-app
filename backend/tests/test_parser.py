import pytest
from app.parsers.doc_parser import DocumentQuestionParser


def test_parse_standard_msq():
    sample_text = """
    1. Which of the following are operating systems?
    A. Windows
    B. Linux
    C. Chrome
    D. Ubuntu
    Answer: A, B, D
    Explanation: Windows, Linux, and Ubuntu are OSes. Chrome is a web browser.

    2. Which of the following are relational database management systems?
    A) PostgreSQL
    B) MySQL
    C) Redis
    D) Oracle Database
    Ans: A, B, D
    """
    parser = DocumentQuestionParser()
    questions = parser.generate_questions(sample_text)

    assert len(questions) == 2

    # Verify Question 1
    q1 = questions[0]
    assert "operating systems" in q1.question
    assert len(q1.options) == 4
    assert q1.correct_answers == ["A", "B", "D"]
    assert q1.type == "MSQ"
    assert q1.explanation is not None and "web browser" in q1.explanation

    # Verify Question 2
    q2 = questions[1]
    assert "relational database" in q2.question
    assert len(q2.options) == 4
    assert q2.correct_answers == ["A", "B", "D"]


def test_parse_parenthesis_options_and_mcq():
    sample_text = """
    Question 1: What is the primary function of DNS?
    (A) Resolves domain names to IP addresses
    (B) Encrypts HTTP traffic
    (C) Allocates dynamic IP addresses
    (D) Scans for network malware
    Answer: A
    Explanation: Domain Name System maps human-readable names to numerical IP addresses.
    """
    parser = DocumentQuestionParser()
    questions = parser.generate_questions(sample_text)

    assert len(questions) == 1
    q = questions[0]
    assert "DNS" in q.question
    assert len(q.options) == 4
    assert q.correct_answers == ["A"]
    assert q.type == "MCQ"
