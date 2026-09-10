import re
from typing import List, Optional, Tuple
from .base import QuestionGenerator
from ..schemas.dto import ParsedQuestion


class DocumentQuestionParser(QuestionGenerator):
    """
    Heuristic rule-based question parser that detects questions,
    options, and answers from structured document text.
    """

    # Matches question starts, e.g.:
    # "1. ", "1) ", "Q1. ", "Question 1: ", "Question 1. "
    QUESTION_START_PATTERN = re.compile(
        r"(?:^|\n)\s*(?:Q(?:uestion)?\s*)?(\d+)[\.\:\)]\s*",
        re.IGNORECASE
    )

    # Matches option lines, e.g.:
    # "A. ", "A) ", "(A) ", "[A] ", "a. ", "a) "
    OPTION_LINE_PATTERN = re.compile(
        r"^(?:\(|\[)?([A-Ha-h])(?:\)|\.|\:\s|\])\s*(.+)$",
        re.MULTILINE
    )

    # Matches answer declaration lines, e.g.:
    # "Answer: A, B, D", "Ans: A, C", "Correct Answers: [A, B]", "Correct: B and D"
    ANSWER_PATTERN = re.compile(
        r"(?:Answer|Answers|Ans|Correct\s*Answer|Correct\s*Answers|Correct\s*Option|Key)\s*[\:\-]\s*([^\n\r]+)",
        re.IGNORECASE
    )

    # Matches explanation declaration lines
    EXPLANATION_PATTERN = re.compile(
        r"(?:Explanation|Rationale|Note|Solution)\s*[\:\-]\s*(.+)",
        re.IGNORECASE | re.DOTALL
    )

    def generate_questions(self, text: str) -> List[ParsedQuestion]:
        """Parses questions from text and returns a list of ParsedQuestion objects."""
        if not text or not text.strip():
            return []

        cleaned_text = self._preprocess_text(text)
        raw_blocks = self._split_into_question_blocks(cleaned_text)

        parsed_questions: List[ParsedQuestion] = []

        for block in raw_blocks:
            parsed = self._parse_single_block(block)
            if parsed and len(parsed.options) >= 2:
                parsed_questions.append(parsed)

        return parsed_questions

    def _preprocess_text(self, text: str) -> str:
        """Normalizes newlines and spaces."""
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        # Replace non-breaking spaces and special unicode spaces
        text = re.sub(r"[\u00A0\u2000-\u200B\u202F\u205F]", " ", text)
        return text

    def _split_into_question_blocks(self, text: str) -> List[str]:
        """
        Splits text into chunks by question number indicators.
        """
        matches = list(self.QUESTION_START_PATTERN.finditer(text))
        if not matches:
            # Fallback: check if blocks are separated by double newlines
            paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
            return paragraphs

        blocks: List[str] = []
        for i, match in enumerate(matches):
            start = match.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            block = text[start:end].strip()
            if block:
                blocks.append(block)

        return blocks

    def _parse_single_block(self, block: str) -> Optional[ParsedQuestion]:
        """Parses a single raw block into question, options, answers, and explanation."""
        # 1. Extract and separate explanation if present
        explanation: Optional[str] = None
        exp_match = self.EXPLANATION_PATTERN.search(block)
        if exp_match:
            explanation = exp_match.group(1).strip()
            # Trim the block to everything before the explanation
            block = block[:exp_match.start()].strip()

        # 2. Extract and separate answer if present
        correct_answers: List[str] = []
        ans_match = self.ANSWER_PATTERN.search(block)
        if ans_match:
            ans_raw = ans_match.group(1).strip()
            correct_answers = self._extract_answer_letters(ans_raw)
            # Trim the block to everything before the answer line
            block = block[:ans_match.start()].strip()

        # 3. Separate question text from options
        lines = block.split("\n")
        question_lines: List[str] = []
        options: List[str] = []
        option_letters: List[str] = []

        in_options = False
        current_option_text: List[str] = []

        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue

            opt_match = self.OPTION_LINE_PATTERN.match(line_str)
            if opt_match:
                in_options = True
                if current_option_text and option_letters:
                    options.append(" ".join(current_option_text).strip())
                    current_option_text = []

                letter = opt_match.group(1).upper()
                option_letters.append(letter)
                current_option_text.append(opt_match.group(2).strip())
            else:
                if in_options:
                    # Continuation of current option line
                    current_option_text.append(line_str)
                else:
                    question_lines.append(line_str)

        if current_option_text and option_letters:
            options.append(" ".join(current_option_text).strip())

        # If standard line matching didn't yield at least 2 options, try inline options pattern
        # e.g.: "A) Windows B) Linux C) Chrome D) Ubuntu"
        if len(options) < 2:
            alt_q, alt_options, alt_letters = self._try_inline_options("\n".join(question_lines))
            if len(alt_options) >= 2:
                question_lines = [alt_q]
                options = alt_options
                option_letters = alt_letters

        # Clean question text (strip leading "1. ", "Question 1:", etc.)
        raw_question = " ".join(question_lines).strip()
        cleaned_question = re.sub(r"^(?:Q(?:uestion)?\s*)?\d+[\.\:\)]\s*", "", raw_question, flags=re.IGNORECASE).strip()

        if not cleaned_question:
            return None

        # Clean up correct answers
        # If answers were extracted as option texts rather than letters, map them
        valid_answers = self._normalize_correct_answers(correct_answers, options, option_letters)

        # Determine type
        q_type = "MSQ" if len(valid_answers) > 1 else ("MCQ" if len(valid_answers) == 1 else "MSQ")

        return ParsedQuestion(
            question=cleaned_question,
            options=options,
            correct_answers=valid_answers,
            explanation=explanation,
            type=q_type
        )

    def _extract_answer_letters(self, raw_ans: str) -> List[str]:
        """
        Extracts letters from answer strings such as:
        "A, B, D", "A and C", "[B, D]", "A,C,D", "(A), (B)"
        """
        # Find all isolated single letters A-H
        letters = re.findall(r"\b([A-Ha-h])\b", raw_ans)
        if not letters:
            # Check for patterns like [A,B] or A/B
            letters = re.findall(r"([A-Ha-h])", raw_ans)
        
        seen = set()
        result = []
        for l in letters:
            upper = l.upper()
            if upper not in seen:
                seen.add(upper)
                result.append(upper)
        return result

    def _try_inline_options(self, text: str) -> Tuple[str, List[str], List[str]]:
        """Handles inline options like: 'Which is an OS? A. Windows B. Linux C. Chrome D. Ubuntu'"""
        pattern = re.compile(r"(?:\b|\s)([A-D])[\.\)]\s+([^\b]+?)(?=(?:\s+[A-D][\.\)])|$)")
        matches = list(pattern.finditer(text))
        if len(matches) >= 2:
            q_text = text[:matches[0].start()].strip()
            options = [m.group(2).strip() for m in matches]
            letters = [m.group(1).upper() for m in matches]
            return q_text, options, letters
        return text, [], []

    def _normalize_correct_answers(
        self,
        extracted_answers: List[str],
        options: List[str],
        option_letters: List[str]
    ) -> List[str]:
        """
        Validates that extracted answer letters correspond to valid option indices (e.g. A, B, C).
        """
        num_opts = len(options)
        valid_letters = [chr(ord('A') + i) for i in range(num_opts)]
        filtered = [ans for ans in extracted_answers if ans in valid_letters]
        return filtered
