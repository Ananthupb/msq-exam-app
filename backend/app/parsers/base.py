from abc import ABC, abstractmethod
from typing import List
from ..schemas.dto import ParsedQuestion


class QuestionGenerator(ABC):
    """
    Abstract base class for extracting or generating questions from document text.
    
    Implementations:
    - DocumentQuestionParser: Rule-based regex/heuristic extraction (Initial MVP)
    - AIQuestionGenerator (Future): LLM-based extraction and generation from raw study materials
    """

    @abstractmethod
    def generate_questions(self, text: str) -> List[ParsedQuestion]:
        """
        Extract or generate a list of parsed questions from document text.
        
        :param text: Raw text extracted from document
        :return: List of ParsedQuestion instances
        """
        pass
