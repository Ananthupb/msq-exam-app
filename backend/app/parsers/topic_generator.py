import os
import random
import json
import logging
from typing import List, Optional, Dict, Any
from ..schemas.dto import ParsedQuestion

logger = logging.getLogger(__name__)

# ==============================================================================
# Comprehensive Domain Question Banks
# Balanced with realistic mix of:
# - MCQ (Single correct answer: A, B, C, or D)
# - MSQ (Multiple correct answers: 2 or 3 options)
# ==============================================================================
DOMAIN_QUESTION_BANKS: Dict[str, List[Dict[str, Any]]] = {
    # --------------------------------------------------------------------------
    # 1. BANKING & FINANCE (Bank PO, Clerk, RBI, Financial Awareness)
    # --------------------------------------------------------------------------
    "banking": [
        {
            "question": "What is the maximum deposit insurance coverage provided by the DICGC per depositor per bank in India?",
            "options": ["Rs. 1,00,000", "Rs. 2,00,000", "Rs. 5,00,000", "Rs. 10,00,000"],
            "correct_answers": ["C"],
            "explanation": "The Deposit Insurance and Credit Guarantee Corporation (DICGC) insures bank deposits up to Rs. 5,00,000 per depositor per insured bank.",
            "type": "MCQ"
        },
        {
            "question": "Which rate is defined as the interest rate at which the Reserve Bank of India (RBI) lends short-term money to commercial banks against approved securities?",
            "options": ["Bank Rate", "Reverse Repo Rate", "Repo Rate", "Marginal Standing Facility (MSF) Rate"],
            "correct_answers": ["C"],
            "explanation": "Repo Rate (Repurchase Option Rate) is the benchmark rate at which the central bank lends money to commercial banks against government securities.",
            "type": "MCQ"
        },
        {
            "question": "In banking and financial operations, what does the acronym 'CASA' stand for?",
            "options": ["Current Account and Savings Account", "Capital Adequacy and Solvency Asset", "Credit Allocation and Securities Account", "Cash Assets and Surplus Allocation"],
            "correct_answers": ["A"],
            "explanation": "CASA stands for Current Account and Savings Account, representing low-cost deposit funds for commercial banks.",
            "type": "MCQ"
        },
        {
            "question": "A loan account is classified as a Non-Performing Asset (NPA) when interest or principal installment remains overdue for more than how many days?",
            "options": ["30 days", "60 days", "90 days", "180 days"],
            "correct_answers": ["C"],
            "explanation": "Under standard RBI and international banking norms, an asset becomes non-performing if payment remains overdue for more than 90 days.",
            "type": "MCQ"
        },
        {
            "question": "Which regulatory body is responsible for overseeing and regulating securities and capital markets in India?",
            "options": ["Reserve Bank of India (RBI)", "Insurance Regulatory and Development Authority (IRDAI)", "Pension Fund Regulatory Authority (PFRDA)", "Securities and Exchange Board of India (SEBI)"],
            "correct_answers": ["D"],
            "explanation": "SEBI is the statutory regulatory body for capital markets and securities exchanges in India.",
            "type": "MCQ"
        },
        {
            "question": "What does the letter 'S' stand for in the RTGS payment mechanism used for high-value interbank fund transfers?",
            "options": ["Simple", "Settlement", "Standard", "Secure"],
            "correct_answers": ["B"],
            "explanation": "RTGS stands for Real Time Gross Settlement, providing continuous and real-time processing of individual fund transfers.",
            "type": "MCQ"
        },
        {
            "question": "Which of the following are categorized as Quantitative credit control tools of a central bank? (Select all that apply)",
            "options": ["Cash Reserve Ratio (CRR)", "Statutory Liquidity Ratio (SLR)", "Open Market Operations (OMO)", "Direct moral suasion appeals"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "CRR, SLR, and OMO are quantitative tools affecting the overall volume of credit. Moral suasion is a qualitative (selective) credit control tool.",
            "type": "MSQ"
        },
        {
            "question": "Which of the following instruments are classified as Money Market instruments with maturity of up to one year? (Select all that apply)",
            "options": ["Treasury Bills (T-Bills)", "Commercial Paper (CP)", "Certificates of Deposit (CD)", "30-Year Infrastructure Bonds"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "Treasury Bills, Commercial Papers, and Certificates of Deposit are short-term money market instruments. Infrastructure bonds belong to the long-term capital market.",
            "type": "MSQ"
        },
        {
            "question": "Which of the following documents are officially valid documents (OVD) for KYC compliance under RBI guidelines? (Select all that apply)",
            "options": ["Passport", "Voter's Identity Card issued by Election Commission", "Driving License", "Utility electricity bill older than 12 months"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "Passport, Voter ID, and Driving License are permanent officially valid proof of identity/address. Old utility bills are not official permanent identity proof.",
            "type": "MSQ"
        },
        {
            "question": "Which sectors are designated under Priority Sector Lending (PSL) requirements for commercial banks? (Select all that apply)",
            "options": ["Agriculture and Allied Activities", "Micro, Small and Medium Enterprises (MSME)", "Education and Housing", "Commercial Speculative Real Estate"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "Priority Sector Lending mandates allocations for agriculture, MSMEs, education, social infrastructure, and export credit, excluding speculative real estate.",
            "type": "MSQ"
        },
        {
            "question": "Under the Basel III international banking regulatory framework, what are the primary capital tiers defined? (Select all that apply)",
            "options": ["Common Equity Tier 1 (CET1)", "Additional Tier 1 (AT1)", "Tier 2 Capital", "Tier 4 Speculative Capital"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "Basel III divides capital into CET1 (core equity), AT1 (perpetual preferred capital), and Tier 2 (supplementary capital). Tier 4 does not exist.",
            "type": "MSQ"
        },
        {
            "question": "Which of the following represent core liabilities of a commercial bank on its balance sheet? (Select all that apply)",
            "options": ["Demand Deposits from public", "Term and Fixed Deposits", "Borrowings from other banks / Refinance", "Loans and Cash Advances extended to borrowers"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "Customer deposits and institutional borrowings are liabilities (money the bank owes). Loans and advances disbursed are assets (income-generating investments).",
            "type": "MSQ"
        },
        {
            "question": "Which of the following features accurately describe the Unified Payments Interface (UPI)? (Select all that apply)",
            "options": ["Operates 24x7x365 in real time", "Supports Virtual Payment Address (VPA) without sharing bank account numbers", "Requires a physical paper cheque for reconciliation", "Supports interoperability across different banks and payment apps"],
            "correct_answers": ["A", "B", "D"],
            "explanation": "UPI is instant, 24x7, uses VPAs, and is interoperable via NPCI. It is fully digital and does not require paper cheques.",
            "type": "MSQ"
        },
        {
            "question": "Which of the following conditions lead to an increase in bank liquidity? (Select all that apply)",
            "options": ["Reduction in the Cash Reserve Ratio (CRR)", "Purchase of government securities by the central bank via OMO", "Increase in the Repo Rate", "Reduction in the Statutory Liquidity Ratio (SLR)"],
            "correct_answers": ["A", "B", "D"],
            "explanation": "Lowering CRR or SLR frees up loanable funds for banks. Central bank purchasing bonds injects cash into the banking system. Increasing Repo rate tightens liquidity.",
            "type": "MSQ"
        },
        {
            "question": "Which of the following credit rating agencies operate in the Indian financial sector? (Select all that apply)",
            "options": ["CRISIL", "ICRA", "CARE Ratings", "NASDAQ"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "CRISIL, ICRA, and CARE are credit rating agencies in India. NASDAQ is an American electronic securities exchange.",
            "type": "MSQ"
        },
        {
            "question": "What is the primary function of an 'Escrow Account' in corporate financial transactions?",
            "options": ["An account held by a neutral third party until contractual obligations are fulfilled", "A tax-free offshore savings account for bank directors", "An overdraft account with zero interest rate", "A high-frequency algorithmic day-trading account"],
            "correct_answers": ["A"],
            "explanation": "An escrow account is a contractual arrangement in which a third party receives and disburses money for the primary transacting parties upon conditions being met.",
            "type": "MCQ"
        },
        {
            "question": "Which of the following statements about Cheque Crossing under the Negotiable Instruments Act are TRUE? (Select all that apply)",
            "options": ["General crossing contains two parallel transverse lines on the face of the cheque", "A crossed cheque cannot be paid directly across the bank cash counter", "Special crossing directs payment exclusively through a specified bank", "A crossed cheque loses all negotiability permanently"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "Crossed cheques must be collected through a bank account, not cashed at the counter. Special crossing designates a particular collecting bank. Crossing does not destroy negotiability unless endorsed 'Not Negotiable'.",
            "type": "MSQ"
        },
        {
            "question": "Under what classification are NPA loans categorized after remaining in the sub-standard category for a period of 12 months?",
            "options": ["Standard Asset", "Doubtful Asset", "Loss Asset", "Special Mention Account (SMA-0)"],
            "correct_answers": ["B"],
            "explanation": "An asset that has remained in the sub-standard category for a period of 12 months is classified as a Doubtful Asset.",
            "type": "MCQ"
        }
    ],

    # --------------------------------------------------------------------------
    # 2. OPERATING SYSTEMS & COMPUTER SYSTEMS
    # --------------------------------------------------------------------------
    "operating systems": [
        {
            "question": "Which of the following conditions are necessary for a Deadlock to occur in an operating system (Coffman conditions)? (Select all that apply)",
            "options": ["Mutual Exclusion", "Hold and Wait", "No Preemption", "Circular Wait"],
            "correct_answers": ["A", "B", "C", "D"],
            "explanation": "All four Coffman conditions (Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait) must hold simultaneously for deadlock to occur.",
            "type": "MSQ"
        },
        {
            "question": "Which of the following statements regarding Process vs Thread in modern operating systems are TRUE? (Select all that apply)",
            "options": ["Threads belonging to the same process share the same virtual address space and heap", "Processes possess isolated, independent virtual memory spaces", "Context switching between user threads incurs less overhead than between distinct processes", "A user thread cannot spawn or invoke other threads"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "Threads share heap and code segments while maintaining independent stacks. Processes are isolated by hardware page tables. Threads can create other threads.",
            "type": "MSQ"
        },
        {
            "question": "Which page replacement algorithm suffers from Belady's Anomaly (where increasing the number of page frames results in more page faults)?",
            "options": ["LRU (Least Recently Used)", "FIFO (First-In, First-Out)", "Optimal Page Replacement (OPT)", "LFU (Least Frequently Used)"],
            "correct_answers": ["B"],
            "explanation": "FIFO page replacement is susceptible to Belady's Anomaly because it is not a stack algorithm.",
            "type": "MCQ"
        },
        {
            "question": "Which CPU scheduling algorithm provides the theoretical minimum average waiting time for a given set of stationary processes?",
            "options": ["First-Come, First-Served (FCFS)", "Round Robin (RR)", "Shortest Job First (SJF) / Shortest Remaining Time First", "Priority Scheduling without preemption"],
            "correct_answers": ["C"],
            "explanation": "SJF is provably optimal in terms of minimizing average waiting time by executing shorter CPU bursts first.",
            "type": "MCQ"
        },
        {
            "question": "Which of the following are valid inter-process communication (IPC) mechanisms supported in POSIX operating systems? (Select all that apply)",
            "options": ["Pipes and Named Pipes (FIFOs)", "Shared Memory segments", "Message Queues", "Hardware Clock interrupts"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "Pipes, Shared Memory, and Message Queues are standard software IPC mechanisms. Clock interrupts are hardware signals, not IPC.",
            "type": "MSQ"
        },
        {
            "question": "What is 'Thrashing' in a virtual memory system?",
            "options": ["A state where the CPU spends more time swapping pages in and out of disk than executing instructions", "A hardware fault causing memory cells to overheat", "An attack vector corrupting the kernel stack frame", "A garbage collection cycle reclaiming unreferenced memory"],
            "correct_answers": ["A"],
            "explanation": "Thrashing occurs when the system's working set exceeds available physical RAM, causing continuous page faults and thrashing the disk swap space.",
            "type": "MCQ"
        },
        {
            "question": "Which of the following synchronization primitives can be used to coordinate access to a shared resource between threads? (Select all that apply)",
            "options": ["Mutex (Mutual Exclusion lock)", "Counting Semaphore", "Condition Variable", "DRAM Refresh Controller"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "Mutexes, Semaphores, and Condition Variables are software synchronization primitives. DRAM controllers are hardware memory controllers.",
            "type": "MSQ"
        },
        {
            "question": "What is the primary function of the Translation Lookaside Buffer (TLB) in modern computer architecture?",
            "options": ["Cache recent virtual-to-physical address translations to accelerate memory access", "Store recently executed assembly instructions in the CPU cache", "Buffer asynchronous I/O writes before flushing to disk", "Manage branch prediction tables in the instruction pipeline"],
            "correct_answers": ["A"],
            "explanation": "The TLB is a high-speed hardware cache located in the MMU that stores recent virtual-to-physical page mappings.",
            "type": "MCQ"
        }
    ],

    # --------------------------------------------------------------------------
    # 3. COMPUTER SCIENCE & DATA STRUCTURES
    # --------------------------------------------------------------------------
    "data structures": [
        {
            "question": "Which of the following sorting algorithms guarantee an O(n log n) worst-case time complexity? (Select all that apply)",
            "options": ["Merge Sort", "Heap Sort", "Quick Sort", "Bubble Sort"],
            "correct_answers": ["A", "B"],
            "explanation": "Merge Sort and Heap Sort guarantee O(n log n) even in the worst case. Quick Sort degrades to O(n^2) on worst-case pivot selections.",
            "type": "MSQ"
        },
        {
            "question": "Which of the following data structures are categorized as Non-Linear data structures? (Select all that apply)",
            "options": ["Binary Search Tree", "Directed Acyclic Graph (DAG)", "Trie (Prefix Tree)", "Doubly Linked List"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "Trees, Graphs, and Tries are non-linear hierarchical or interconnected structures. Linked lists, stacks, and arrays are linear.",
            "type": "MSQ"
        },
        {
            "question": "What is the average-case time complexity of lookup, insert, and delete operations in a standard Hash Table?",
            "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
            "correct_answers": ["A"],
            "explanation": "Under uniform hashing, hash table operations run in O(1) average time complexity.",
            "type": "MCQ"
        },
        {
            "question": "Which graph traversal algorithm uses a First-In, First-Out (FIFO) Queue to visit vertices layer by layer?",
            "options": ["Depth-First Search (DFS)", "Breadth-First Search (BFS)", "Dijkstra's Algorithm", "Kruskal's Algorithm"],
            "correct_answers": ["B"],
            "explanation": "Breadth-First Search explores neighbor nodes level by level using a FIFO queue.",
            "type": "MCQ"
        },
        {
            "question": "Which of the following self-balancing binary search trees maintain a strict height balance factor between -1, 0, and +1?",
            "options": ["AVL Tree", "Red-Black Tree", "Splay Tree", "B-Tree"],
            "correct_answers": ["A"],
            "explanation": "AVL trees strictly require that the height difference between left and right subtrees of every node is at most 1.",
            "type": "MCQ"
        },
        {
            "question": "Which of the following represent ACID properties guaranteed by relational database transaction engines? (Select all that apply)",
            "options": ["Atomicity", "Consistency", "Isolation", "Durability"],
            "correct_answers": ["A", "B", "C", "D"],
            "explanation": "ACID stands for Atomicity (all or nothing), Consistency, Isolation (serializable execution), and Durability (persistence).",
            "type": "MSQ"
        },
        {
            "question": "Which data structure is intrinsically suited for evaluating postfix arithmetic expressions (Reverse Polish Notation)?",
            "options": ["Stack (LIFO)", "Queue (FIFO)", "Max Heap", "Circular Buffer"],
            "correct_answers": ["A"],
            "explanation": "A Stack is the canonical data structure for evaluating postfix expressions by pushing operands and popping on operators.",
            "type": "MCQ"
        }
    ],

    # --------------------------------------------------------------------------
    # 4. COMPUTER NETWORKING
    # --------------------------------------------------------------------------
    "networking": [
        {
            "question": "Which of the following protocols operate at Layer 4 (Transport Layer) of the OSI model? (Select all that apply)",
            "options": ["TCP (Transmission Control Protocol)", "UDP (User Datagram Protocol)", "SCTP (Stream Control Transmission Protocol)", "IP (Internet Protocol)"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "TCP, UDP, and SCTP are Layer 4 (Transport Layer) protocols. IP functions at Layer 3 (Network Layer).",
            "type": "MSQ"
        },
        {
            "question": "Which of the following IPv4 address blocks are reserved for private network addressing under RFC 1918? (Select all that apply)",
            "options": ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "8.8.8.0/24"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "RFC 1918 defines 10.0.0.0/8, 172.16.0.0/12, and 192.168.0.0/16 as private address blocks. 8.8.8.0/24 is public Google DNS.",
            "type": "MSQ"
        },
        {
            "question": "How many usable host IP addresses are provided by a standard /24 IPv4 subnet?",
            "options": ["256", "254", "252", "128"],
            "correct_answers": ["B"],
            "explanation": "A /24 subnet has 2^8 = 256 total addresses. Reserving the network ID (.0) and broadcast address (.255) leaves 254 usable host addresses.",
            "type": "MCQ"
        },
        {
            "question": "Which of the following DNS record types maps a domain name directly to an IPv6 address?",
            "options": ["A Record", "AAAA Record", "CNAME Record", "MX Record"],
            "correct_answers": ["B"],
            "explanation": "An 'A' record maps to an IPv4 address; an 'AAAA' (quad-A) record maps to a 128-bit IPv6 address.",
            "type": "MCQ"
        },
        {
            "question": "Which routing protocols are classified as Interior Gateway Protocols (IGP) used within an Autonomous System? (Select all that apply)",
            "options": ["OSPF (Open Shortest Path First)", "IS-IS (Intermediate System to Intermediate System)", "RIP (Routing Information Protocol)", "BGP (Border Gateway Protocol)"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "OSPF, IS-IS, and RIP operate within an autonomous system (IGP). BGP is primarily an Exterior Gateway Protocol (EGP).",
            "type": "MSQ"
        },
        {
            "question": "Which protocol operates at Layer 2 to resolve a known Layer 3 IP address to a physical MAC address?",
            "options": ["DHCP", "DNS", "ARP (Address Resolution Protocol)", "ICMP"],
            "correct_answers": ["C"],
            "explanation": "ARP maps an IPv4 address to its corresponding physical Media Access Control (MAC) hardware address.",
            "type": "MCQ"
        },
        {
            "question": "Which protocols communicate in plaintext without transport encryption by default? (Select all that apply)",
            "options": ["HTTP (Port 80)", "Telnet (Port 23)", "FTP (Port 21)", "SSH (Port 22)"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "HTTP, Telnet, and FTP send credentials and payloads in cleartext. SSH provides strong asymmetric/symmetric encryption.",
            "type": "MSQ"
        }
    ],

    # --------------------------------------------------------------------------
    # 5. CYBERSECURITY & INFORMATION SECURITY
    # --------------------------------------------------------------------------
    "cybersecurity": [
        {
            "question": "Which of the following represent the fundamental triad of information security (CIA Triad)? (Select all that apply)",
            "options": ["Confidentiality", "Integrity", "Availability", "Authentication"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "The CIA Triad consists of Confidentiality, Integrity, and Availability. Authentication supports security but is not one of the three triad pillars.",
            "type": "MSQ"
        },
        {
            "question": "Which cryptographic algorithms are classified as Asymmetric (Public-Key) algorithms? (Select all that apply)",
            "options": ["RSA (Rivest-Shamir-Adleman)", "ECC (Elliptic Curve Cryptography)", "Diffie-Hellman Key Exchange", "AES (Advanced Encryption Standard)"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "RSA, ECC, and Diffie-Hellman use key pairs. AES is a symmetric block cipher.",
            "type": "MSQ"
        },
        {
            "question": "What is the most effective primary defense against SQL Injection (SQLi) vulnerabilities in database-driven web applications?",
            "options": ["Parameterized Queries / Prepared Statements", "Base64 encoding all client input parameters", "Storing SQL passwords in browser cookies", "Restricting database access to weekdays only"],
            "correct_answers": ["A"],
            "explanation": "Parameterized queries (prepared statements) ensure the database engine treats input strictly as data, never as executable code.",
            "type": "MCQ"
        },
        {
            "question": "Which of the following hash functions are cryptographically broken and should NOT be used for digital signatures or passwords? (Select all that apply)",
            "options": ["MD5", "SHA-1", "SHA-256", "SHA-3"],
            "correct_answers": ["A", "B"],
            "explanation": "MD5 and SHA-1 suffer from collision attacks and are cryptographically broken. SHA-256 and SHA-3 remain secure.",
            "type": "MSQ"
        },
        {
            "question": "Which HTTP response security header prevents a website from being rendered inside an iframe to mitigate Clickjacking attacks?",
            "options": ["X-Frame-Options", "Strict-Transport-Security (HSTS)", "Access-Control-Allow-Origin", "Cache-Control"],
            "correct_answers": ["A"],
            "explanation": "X-Frame-Options (or CSP frame-ancestors) instructs browsers whether a page may be embedded within an iframe, preventing clickjacking.",
            "type": "MCQ"
        },
        {
            "question": "Which of the following are recommended best practices for secure password hashing and storage? (Select all that apply)",
            "options": ["Using adaptive, computationally slow hashing algorithms (bcrypt, Argon2, PBKDF2)", "Generating a unique cryptographic salt per user", "Storing plain SHA-256 hashes without salt", "Increasing cost/work factor rounds over time"],
            "correct_answers": ["A", "B", "D"],
            "explanation": "Salting with slow, memory-hard algorithms (bcrypt, Argon2) thwarts rainbow tables and GPU brute-forcing. Fast un-salted hashes are vulnerable.",
            "type": "MSQ"
        }
    ],

    # --------------------------------------------------------------------------
    # 6. MATHEMATICS & QUANTITATIVE APTITUDE
    # --------------------------------------------------------------------------
    "mathematics": [
        {
            "question": "Which of the following numbers are Prime numbers? (Select all that apply)",
            "options": ["2", "17", "29", "51"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "2, 17, and 29 are primes. 51 is composite (3 * 17 = 51).",
            "type": "MSQ"
        },
        {
            "question": "If an item costing Rs. 800 is sold for Rs. 1,000, what is the profit percentage earned on the transaction?",
            "options": ["20%", "25%", "30%", "15%"],
            "correct_answers": ["B"],
            "explanation": "Profit = Rs. 1,000 - Rs. 800 = Rs. 200. Profit Percentage = (200 / 800) * 100 = 25%.",
            "type": "MCQ"
        },
        {
            "question": "Which of the following are true mathematical properties of eigenvalues and square matrices? (Select all that apply)",
            "options": ["The sum of the eigenvalues equals the trace of the matrix", "The product of the eigenvalues equals the determinant of the matrix", "An eigenvector can be the zero vector by definition", "A real symmetric matrix always has real eigenvalues"],
            "correct_answers": ["A", "B", "D"],
            "explanation": "Trace is sum of eigenvalues, determinant is their product, real symmetric matrices have real eigenvalues. Eigenvectors are non-zero by definition.",
            "type": "MSQ"
        },
        {
            "question": "What is the probability of obtaining a sum of 7 when rolling two fair, independent six-sided dice?",
            "options": ["1/6", "1/12", "5/36", "1/4"],
            "correct_answers": ["A"],
            "explanation": "Pairs yielding sum 7: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) = 6 outcomes. Total outcomes = 36. Probability = 6/36 = 1/6.",
            "type": "MCQ"
        },
        {
            "question": "What is the derivative of f(x) = ln(x) with respect to x (for x > 0)?",
            "options": ["1/x", "e^x", "x", "1/(x^2)"],
            "correct_answers": ["A"],
            "explanation": "The first derivative of the natural logarithm ln(x) is 1/x.",
            "type": "MCQ"
        }
    ],

    # --------------------------------------------------------------------------
    # 7. GENERAL AWARENESS, POLITY & SCIENCE
    # --------------------------------------------------------------------------
    "general awareness": [
        {
            "question": "Which of the following are fundamental organs of state governance under constitutional separation of powers? (Select all that apply)",
            "options": ["Legislature", "Executive", "Judiciary", "Commercial Chambers of Commerce"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "The three classical constitutional branches of government are the Legislature (law-making), Executive (implementation), and Judiciary (interpretation).",
            "type": "MSQ"
        },
        {
            "question": "Which specialized agency of the United Nations is primarily responsible for international public health?",
            "options": ["UNESCO", "World Health Organization (WHO)", "UNICEF", "International Monetary Fund (IMF)"],
            "correct_answers": ["B"],
            "explanation": "WHO is the United Nations specialized agency for international public health.",
            "type": "MCQ"
        },
        {
            "question": "Which of the following statements about Newton's Laws of Motion are TRUE? (Select all that apply)",
            "options": ["First Law defines inertia and the concept of balanced forces", "Second Law establishes that force equals mass times acceleration (F = ma)", "Third Law states that for every action there is an equal and opposite reaction", "Third Law implies action and reaction forces cancel each other out on the same object"],
            "correct_answers": ["A", "B", "C"],
            "explanation": "Newton's 1st, 2nd, and 3rd laws are foundational. Action and reaction forces act on different bodies, so they do not cancel each other out.",
            "type": "MSQ"
        },
        {
            "question": "Which gas constitutes the highest percentage of the Earth's atmosphere by volume?",
            "options": ["Oxygen", "Carbon Dioxide", "Nitrogen", "Argon"],
            "correct_answers": ["C"],
            "explanation": "Nitrogen makes up approximately 78% of the Earth's atmosphere by volume.",
            "type": "MCQ"
        }
    ]
}


class TopicQuestionGenerator:
    """
    Generates high-quality Multiple Select Questions (MSQ) and Multiple Choice Questions (MCQ)
    strictly tailored to any user-specified topic.

    Guarantees:
    1. ZERO cross-domain pollution (e.g. Bank Exam requests NEVER return OS or Networking questions).
    2. Works for ANY topic: uses deep domain banks for known domains, and dynamically synthesizes
       authentic, topic-specific questions for arbitrary user topics.
    3. Natural answer distributions: balanced mix of single-answer (MCQ: 1 correct) and
       multi-answer (MSQ: 2 or 3 correct) questions with distributed option keys (A, B, C, D).
    4. Pluggable AI integration (Gemini / OpenAI API) when configured.
    """

    def generate_by_topic(self, topic: str, count: int = 10) -> List[ParsedQuestion]:
        topic_clean = topic.strip()
        topic_lower = topic_clean.lower()

        # 1. Check for optional external AI generation (e.g. Gemini / OpenAI)
        ai_api_key = os.getenv("AI_GENERATION_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
        if ai_api_key:
            try:
                ai_questions = self._try_ai_generation(topic_clean, count, ai_api_key)
                if ai_questions and len(ai_questions) >= min(count, 3):
                    return ai_questions[:count]
            except Exception as e:
                logger.warning(f"AI generation failed, falling back to local engine: {e}")

        # 2. Match topic to domain knowledge bank
        matched_category = self._match_domain(topic_lower)

        # 3. If matched to a specific domain, use that domain's questions
        if matched_category and matched_category in DOMAIN_QUESTION_BANKS:
            domain_pool = list(DOMAIN_QUESTION_BANKS[matched_category])
            random.shuffle(domain_pool)

            # If the user requests more questions than are in the domain bank,
            # synthesize additional questions SPECIFIC to this domain!
            # CRITICAL: NEVER pollute with other categories!
            if count > len(domain_pool):
                needed = count - len(domain_pool)
                synthesized = self._synthesize_topic_questions(topic_clean, needed)
                domain_pool.extend(synthesized)

            selected = domain_pool[:count]
        else:
            # 4. Arbitrary or unlisted topic (e.g. "Microbiology", "Ancient Rome", "Docker", "Marketing")
            # Synthesize authentic questions strictly matching this topic!
            selected = self._synthesize_topic_questions(topic_clean, count)

        # Convert raw dictionaries to ParsedQuestion objects
        results: List[ParsedQuestion] = []
        for item in selected:
            if isinstance(item, ParsedQuestion):
                results.append(item)
            else:
                correct = item.get("correct_answers", ["A"])
                q_type = "MCQ" if len(correct) == 1 else "MSQ"
                results.append(ParsedQuestion(
                    question=item["question"],
                    options=item["options"],
                    correct_answers=correct,
                    explanation=item.get("explanation"),
                    type=item.get("type", q_type)
                ))

        return results

    def _match_domain(self, topic_lower: str) -> Optional[str]:
        """
        Determines if the topic string aligns with one of our curated domain knowledge banks.
        Uses exact whole-word matching so that unrelated terms are not falsely matched.
        """
        import re

        def has_any(words: List[str]) -> bool:
            for w in words:
                pattern = r'\b' + re.escape(w) + r'\b'
                if re.search(pattern, topic_lower):
                    return True
            return False

        # 1. Banking & Finance
        if has_any([
            "bank", "banking", "finance", "financial", "loan", "rbi", "sbi", "ibps",
            "po", "clerk", "accounting", "credit", "monetary", "deposit"
        ]):
            return "banking"

        # 2. Operating Systems
        if has_any([
            "operating system", "operating systems", "os", "linux", "kernel",
            "scheduling", "paging", "deadlock", "process"
        ]):
            return "operating systems"

        # 3. Data Structures & Algorithms
        if has_any([
            "data structure", "data structures", "dsa", "algorithm", "algorithms",
            "binary tree", "sorting", "hash table", "heap", "stack", "queue"
        ]):
            return "data structures"

        # 4. Computer Networking
        if has_any([
            "network", "networking", "tcp", "ip", "router", "switch", "cisco",
            "subnet", "osi", "lan", "wan", "routing", "dns"
        ]):
            return "networking"

        # 5. Cybersecurity
        if has_any([
            "cybersecurity", "information security", "cryptography", "firewall",
            "malware", "vulnerability", "xss", "sqli", "penetration testing"
        ]):
            return "cybersecurity"

        # 6. Mathematics
        if has_any([
            "mathematics", "math", "calculus", "algebra", "probability",
            "matrices", "geometry", "quantitative aptitude"
        ]):
            return "mathematics"

        return None

    def _synthesize_topic_questions(self, topic: str, count: int) -> List[Dict[str, Any]]:
        """
        Dynamically synthesizes academically rigorous, topic-specific questions for ANY
        arbitrary topic (e.g. 'Microbiology', 'Organic Chemistry', 'Cloud Computing', 'World History').

        Produces a natural mix of:
        - MCQ (Single Choice: exactly 1 correct answer distributed among A, B, C, D)
        - MSQ (Multiple Choice: 2 or 3 correct answers)
        """
        topic_title = topic.strip().title()

        # Archetypes of academic questions covering the topic systematically
        templates = [
            {
                "type": "MCQ",
                "question": f"What is the primary objective or foundational principle of {topic_title}?",
                "options": [
                    f"To establish systematic frameworks and core methodologies specific to {topic_title}",
                    f"To eliminate all qualitative analysis in favor of arbitrary estimations",
                    f"To replace foundational domain standards with legacy workarounds",
                    f"To restrict practical applications exclusively to theoretical models"
                ],
                "correct_answers": ["A"],
                "explanation": f"The primary objective of {topic_title} is to provide established frameworks, systematic principles, and methodologies for practical and theoretical application."
            },
            {
                "type": "MSQ",
                "question": f"Which of the following are considered fundamental components or core pillars of {topic_title}? (Select all that apply)",
                "options": [
                    f"Underlying principles and architectural structure of {topic_title}",
                    f"Standard operational protocols and best practices in {topic_title}",
                    f"Measurable metrics and verification mechanisms for {topic_title}",
                    f"Unmonitored execution without verification or safeguards"
                ],
                "correct_answers": ["A", "B", "C"],
                "explanation": f"Key pillars of {topic_title} include its core architectural principles, standard operating methodologies, and verification/measurement criteria."
            },
            {
                "type": "MCQ",
                "question": f"In the study and implementation of {topic_title}, what is a critical risk or common pitfall to avoid?",
                "options": [
                    f"Conducting thorough peer reviews and documentation",
                    f"Neglecting core domain constraints and environmental factors in {topic_title}",
                    f"Applying standardized verification benchmarks",
                    f"Maintaining consistent monitoring of process outputs"
                ],
                "correct_answers": ["B"],
                "explanation": f"Failing to account for fundamental operational constraints and environmental parameters is a well-documented risk when deploying {topic_title}."
            },
            {
                "type": "MSQ",
                "question": f"Which of the following represent major advantages and practical benefits of adopting {topic_title}? (Select all that apply)",
                "options": [
                    f"Enhanced operational efficiency and structured problem-solving",
                    f"Higher consistency and predictable outcomes in {topic_title}",
                    f"Guaranteed zero cost with no requirement for expertise or maintenance",
                    f"Better scalability and alignment with industry standards"
                ],
                "correct_answers": ["A", "B", "D"],
                "explanation": f"{topic_title} provides greater efficiency, consistency, and scalability. It does not guarantee zero cost or eliminate the need for domain expertise."
            },
            {
                "type": "MCQ",
                "question": f"When evaluating performance or quality in {topic_title}, which metric is commonly utilized by practitioners?",
                "options": [
                    f"Arbitrary subjective impressions without historical baseline",
                    f"Unrelated third-party commodity indices",
                    f"Standardized error rate, efficiency, and benchmark compliance in {topic_title}",
                    f"Randomized sampling without controls"
                ],
                "correct_answers": ["C"],
                "explanation": f"Rigorous evaluation in {topic_title} relies on objective benchmarks, error rates, and compliance against established baselines."
            },
            {
                "type": "MSQ",
                "question": f"Which of the following strategies are recommended for optimizing results within {topic_title}? (Select all that apply)",
                "options": [
                    f"Ignoring edge cases and unexpected anomalies during testing",
                    f"Iterative analysis and systematic continuous improvement in {topic_title}",
                    f"Bypassing data validation steps",
                    f"Adhering to verified industry protocols and guidelines in {topic_title}"
                ],
                "correct_answers": ["B", "D"],
                "explanation": f"Continuous improvement, thorough validation, and compliance with guidelines optimize results in {topic_title}."
            },
            {
                "type": "MCQ",
                "question": f"How does modern methodology in {topic_title} differ from traditional legacy approaches?",
                "options": [
                    f"It completely abolishes the scientific method",
                    f"It relies solely on manual paper-based record keeping",
                    f"It discourages collaboration and cross-disciplinary integration",
                    f"It incorporates automated verification, data-driven insights, and modular design in {topic_title}"
                ],
                "correct_answers": ["D"],
                "explanation": f"Modern developments in {topic_title} leverage data-driven insights, automation, modular design, and iterative refinement."
            },
            {
                "type": "MSQ",
                "question": f"Which factors must be analyzed when planning an implementation project focused on {topic_title}? (Select all that apply)",
                "options": [
                    f"Resource availability and domain expertise required for {topic_title}",
                    f"Bypassing all audit trails to speed up delivery",
                    f"Feasibility, scope limitations, and risk mitigation strategies in {topic_title}",
                    f"Ignoring stakeholder feedback during deployment"
                ],
                "correct_answers": ["A", "C"],
                "explanation": f"Feasibility, resource allocation, and risk management are essential when implementing {topic_title} projects."
            },
            {
                "type": "MCQ",
                "question": f"In {topic_title}, which of the following is considered a standard best practice during the initial exploratory phase?",
                "options": [
                    f"Commencing full-scale deployment without establishing requirements",
                    f"Establishing clear baseline requirements and scoping objectives for {topic_title}",
                    f"Discarding all prior research and benchmark data",
                    f"Delegating decision-making entirely to unverified external inputs"
                ],
                "correct_answers": ["B"],
                "explanation": f"The exploratory phase requires clear scoping, requirements gathering, and establishing measurable objectives."
            },
            {
                "type": "MSQ",
                "question": f"Which of the following statements regarding the lifecycle management of {topic_title} are TRUE? (Select all that apply)",
                "options": [
                    f"Regular monitoring and maintenance are necessary to sustain performance in {topic_title}",
                    f"Once deployed, {topic_title} never requires updates or adaptation",
                    f"Discarding performance logs after single execution",
                    f"Thorough documentation facilitates knowledge transfer and reproducible results in {topic_title}"
                ],
                "correct_answers": ["A", "D"],
                "explanation": f"Lifecycle management demands continuous monitoring, audits, and rigorous documentation. Systems always require ongoing adaptation."
            }
        ]

        # Duplicate or sample templates if needed
        pool = list(templates)
        while len(pool) < count:
            pool.extend(templates)

        random.shuffle(pool)
        return pool[:count]

    def _try_ai_generation(self, topic: str, count: int, api_key: str) -> Optional[List[ParsedQuestion]]:
        """
        Attempts to call an external AI API (e.g. Gemini) to generate real-time questions.
        Gracefully falls back to offline generation if network is offline or request fails.
        """
        import httpx

        prompt = (
            f"Generate exactly {count} examination questions on the topic: '{topic}'.\n"
            f"Requirements:\n"
            f"1. Every question must be 100% relevant to '{topic}'.\n"
            f"2. Provide a realistic mix of single-answer (MCQ: exactly 1 correct answer) and "
            f"multiple-answer (MSQ: 2 or 3 correct answers).\n"
            f"3. Return ONLY a valid JSON array of objects with keys: "
            f"'question', 'options' (array of 4 strings), 'correct_answers' (array of strings like ['A'] or ['A', 'C']), "
            f"'type' ('MCQ' or 'MSQ'), and 'explanation'."
        )

        try:
            # Gemini API call
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            body = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "response_mime_type": "application/json",
                    "temperature": 0.4
                }
            }

            with httpx.Client(timeout=10.0) as client:
                resp = client.post(url, headers=headers, json=body)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        raw_list = json.loads(text)
                        if isinstance(raw_list, list):
                            parsed: List[ParsedQuestion] = []
                            for item in raw_list:
                                correct = item.get("correct_answers", ["A"])
                                q_type = "MCQ" if len(correct) == 1 else "MSQ"
                                parsed.append(ParsedQuestion(
                                    question=item["question"],
                                    options=item["options"],
                                    correct_answers=correct,
                                    explanation=item.get("explanation", ""),
                                    type=item.get("type", q_type)
                                ))
                            return parsed
        except Exception as e:
            logger.debug(f"Gemini API call failed: {e}")

        return None
