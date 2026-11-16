import { Problem, DiagnosticQuestion, LearningDNAProfile, SubmissionRecord, DailyTask, TeacherCohortMetric } from '@/types';

export const SAMPLE_PROBLEMS: Problem[] = [
  {
    id: 'p-1',
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: 'Easy',
    category: 'Arrays & Hash Tables',
    mode: 'normal',
    tags: ['Array', 'Hash Map', 'Two Pointers'],
    acceptanceRate: 84.5,
    description: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to \`target\`*.

You may assume that each input would have ***exactly one solution***, and you may not use the same element twice.

You can return the answer in any order.`,
    starterCode: {
      python: `def two_sum(nums: list[int], target: int) -> list[int]:
    # Your solution here
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []
`,
      javascript: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (seen.has(diff)) {
      return [seen.get(diff), i];
    }
    seen.set(nums[i], i);
  }
  return [];
}`,
      cpp: `#include <vector>
#include <unordered_map>

std::vector<int> twoSum(std::vector<int>& nums, int target) {
    std::unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); ++i) {
        int diff = target - nums[i];
        if (seen.count(diff)) {
            return {seen[diff], i};
        }
        seen[nums[i]] = i;
    }
    return {};
}`,
    },
    sampleTestCases: [
      { id: 'tc-1', input: 'nums = [2,7,11,15], target = 9', expectedOutput: '[0,1]', isSample: true, description: 'Basic pair at front' },
      { id: 'tc-2', input: 'nums = [3,2,4], target = 6', expectedOutput: '[1,2]', isSample: true, description: 'Pair in middle' },
      { id: 'tc-3', input: 'nums = [3,3], target = 6', expectedOutput: '[0,1]', isSample: true, description: 'Duplicate numbers' },
    ],
  },
  {
    id: 'p-2',
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    difficulty: 'Easy',
    category: 'Stack',
    mode: 'normal',
    tags: ['Stack', 'String'],
    acceptanceRate: 78.2,
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    starterCode: {
      python: `def is_valid(s: str) -> bool:
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return not stack
`,
      javascript: `function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const c of s) {
    if (c in map) {
      if (stack.pop() !== map[c]) return false;
    } else {
      stack.push(c);
    }
  }
  return stack.length === 0;
}`,
      cpp: `#include <string>
#include <stack>

bool isValid(std::string s) {
    std::stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '{' || c == '[') st.push(c);
        else {
            if (st.empty()) return false;
            if (c == ')' && st.top() != '(') return false;
            if (c == '}' && st.top() != '{') return false;
            if (c == ']' && st.top() != '[') return false;
            st.pop();
        }
    }
    return st.empty();
}`,
    },
    sampleTestCases: [
      { id: 'tc-1', input: 's = "()"', expectedOutput: 'true', isSample: true },
      { id: 'tc-2', input: 's = "()[]{}"', expectedOutput: 'true', isSample: true },
      { id: 'tc-3', input: 's = "(]"', expectedOutput: 'false', isSample: true },
    ],
  },
  {
    id: 'p-3',
    title: 'Off-by-One in Binary Search',
    slug: 'debug-binary-search',
    difficulty: 'Medium',
    category: 'Search & Pointers',
    mode: 'debugging',
    tags: ['Binary Search', 'Logic Bug', 'Off-by-One'],
    acceptanceRate: 58.1,
    description: `### 🐞 Bug Scenario: Infinite Loop on Target Missing
A student submitted the following implementation of Binary Search to find the index of \`target\` in a sorted list. When the target is larger than all elements in \`nums\`, the program enters an infinite loop or throws an \`IndexError\`.

**Your Goal**:
1. Inspect the code and identify the boundary conditions.
2. Fix the loop termination and pointer calculation to achieve $O(\\log n)$ runtime.
3. Verify that all edge test cases pass.`,
    starterCode: {
      python: `def binary_search(nums: list[int], target: int) -> int:
    left = 0
    right = len(nums) # BUG: should be len(nums) - 1 or adjusted in condition
    
    while left < right: # BUG: missing equality check for single element array
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid # BUG: leads to infinite loop when left == mid
        else:
            right = mid - 1
            
    return -1
`,
      javascript: `function binarySearch(nums, target) {
  let left = 0;
  let right = nums.length;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    else if (nums[mid] < target) left = mid;
    else right = mid - 1;
  }
  return -1;
}`,
      cpp: `int binarySearch(std::vector<int>& nums, int target) {
    int left = 0;
    int right = nums.size();
    while (left < right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;
        else if (nums[mid] < target) left = mid;
        else right = mid - 1;
    }
    return -1;
}`,
    },
    sampleTestCases: [
      { id: 'tc-1', input: 'nums = [-1,0,3,5,9,12], target = 9', expectedOutput: '4', isSample: true, description: 'Target exists in array' },
      { id: 'tc-2', input: 'nums = [-1,0,3,5,9,12], target = 2', expectedOutput: '-1', isSample: true, description: 'Target absent in array' },
      { id: 'tc-3', input: 'nums = [5], target = 5', expectedOutput: '0', isSample: true, description: 'Single element match' },
    ],
    bugScenario: {
      symptom: 'Timeout / Infinite loop when searching for missing target or rightmost element',
      failingInput: 'nums = [2, 5], target = 5',
      actualOutput: 'Time Limit Exceeded (CPU timeout)',
      expectedOutput: '1',
      buggyLinesHint: 'Lines 7 and 10: check the assignment of `left` and loop condition `while left <= right`.',
      hintTiers: [
        'Level 1: Notice what happens when `left` and `right` are adjacent and `nums[mid] < target`.',
        'Level 2: When `left = mid`, if `mid` equals `left`, the pointer never advances, causing an infinite loop.',
        'Level 3: Set `left = mid + 1` and change the loop condition to `while left <= right` with `right = len(nums) - 1`.',
      ],
    },
  },
  {
    id: 'p-4',
    title: 'Mutating List During Iteration',
    slug: 'debug-list-mutation',
    difficulty: 'Easy',
    category: 'State Mutation',
    mode: 'debugging',
    tags: ['List', 'Iteration', 'Side Effect'],
    acceptanceRate: 64.0,
    description: `### 🐞 Bug Scenario: Elements Skipped During Removal
The student wants to remove all even numbers from a list in-place. However, consecutive even numbers (e.g., \`[2, 4, 6]\`) leave elements behind because indices shift after each \`remove()\` call.

**Your Goal**:
Diagnose why elements are skipped and rewrite the filter correctly without index skipping.`,
    starterCode: {
      python: `def remove_evens(nums: list[int]) -> list[int]:
    # BUG: modifying array length while iterating forwards
    for num in nums:
        if num % 2 == 0:
            nums.remove(num)
    return nums
`,
      javascript: `function removeEvens(nums) {
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] % 2 === 0) {
      nums.splice(i, 1); // Skips next element
    }
  }
  return nums;
}`,
      cpp: `void removeEvens(std::vector<int>& nums) {
    for (int i = 0; i < nums.size(); ++i) {
        if (nums[i] % 2 == 0) {
            nums.erase(nums.begin() + i); // Shifts elements
        }
    }
}`,
    },
    sampleTestCases: [
      { id: 'tc-1', input: 'nums = [1, 2, 4, 3, 6]', expectedOutput: '[1, 3]', isSample: true, description: 'Consecutive evens' },
      { id: 'tc-2', input: 'nums = [2, 2, 2]', expectedOutput: '[]', isSample: true, description: 'All evens' },
      { id: 'tc-3', input: 'nums = [1, 3, 5]', expectedOutput: '[1, 3, 5]', isSample: true, description: 'No evens' },
    ],
    bugScenario: {
      symptom: 'Consecutive even numbers remain in the output array',
      failingInput: 'nums = [2, 4, 6]',
      actualOutput: '[4]',
      expectedOutput: '[]',
      buggyLinesHint: 'Modifying a collection while looping through it alters indices on subsequent iterations.',
      hintTiers: [
        'Level 1: Trace by hand: after index 0 is removed, what happens to index 1?',
        'Level 2: The remaining elements shift left, but the iterator steps to the next index, skipping the new item at index 0.',
        'Level 3: Iterate backwards or use a list comprehension / filter: `return [x for x in nums if x % 2 != 0]`.',
      ],
    },
  },
  {
    id: 'p-5',
    title: 'Longest Substring Without Repeating Characters',
    slug: 'longest-substring-without-repeating',
    difficulty: 'Medium',
    category: 'Sliding Window',
    mode: 'normal',
    tags: ['String', 'Sliding Window', 'Hash Map'],
    acceptanceRate: 61.3,
    description: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.`,
    starterCode: {
      python: `def length_of_longest_substring(s: str) -> int:
    char_index = {}
    max_len = 0
    left = 0
    for right, char in enumerate(s):
        if char in char_index and char_index[char] >= left:
            left = char_index[char] + 1
        char_index[char] = right
        max_len = max(max_len, right - left + 1)
    return max_len
`,
      javascript: `function lengthOfLongestSubstring(s) {
  const map = new Map();
  let max = 0, left = 0;
  for (let right = 0; right < s.length; right++) {
    if (map.has(s[right]) && map.get(s[right]) >= left) {
      left = map.get(s[right]) + 1;
    }
    map.set(s[right], right);
    max = Math.max(max, right - left + 1);
  }
  return max;
}`,
      cpp: `int lengthOfLongestSubstring(std::string s) {
    std::unordered_map<char, int> map;
    int maxLen = 0, left = 0;
    for (int right = 0; right < s.length(); ++right) {
        if (map.count(s[right]) && map[s[right]] >= left) {
            left = map[s[right]] + 1;
        }
        map[s[right]] = right;
        maxLen = std::max(maxLen, right - left + 1);
    }
    return maxLen;
}`,
    },
    sampleTestCases: [
      { id: 'tc-1', input: 's = "abcabcbb"', expectedOutput: '3', isSample: true, description: 'Answer is "abc"' },
      { id: 'tc-2', input: 's = "bbbbb"', expectedOutput: '1', isSample: true, description: 'Answer is "b"' },
      { id: 'tc-3', input: 's = "pwwkew"', expectedOutput: '3', isSample: true, description: 'Answer is "wke"' },
    ],
  },
];

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: 'dq-1',
    category: 'Bug Diagnosis',
    question: 'Consider the following Python snippet. What error will it raise when called with `find_average([])`?',
    codeSnippet: `def find_average(numbers):\n    total = sum(numbers)\n    return total / len(numbers)`,
    options: [
      { id: 'a', text: 'TypeError: unsupported operand type', isCorrect: false },
      { id: 'b', text: 'ZeroDivisionError: division by zero', isCorrect: true },
      { id: 'c', text: 'IndexError: list index out of range', isCorrect: false },
      { id: 'd', text: 'Returns 0.0 cleanly', isCorrect: false },
    ],
    explanation: 'When numbers is an empty list, `len(numbers)` is 0. Dividing any number by 0 raises a ZeroDivisionError.',
  },
  {
    id: 'dq-2',
    category: 'Algorithmic Logic',
    question: 'Which data structure allows checking whether an element exists in $O(1)$ average time complexity?',
    options: [
      { id: 'a', text: 'Array / List', isCorrect: false },
      { id: 'b', text: 'Hash Set / Hash Map', isCorrect: true },
      { id: 'c', text: 'Binary Search Tree', isCorrect: false },
      { id: 'd', text: 'Linked List', isCorrect: false },
    ],
    explanation: 'Hash sets and hash tables use hashing algorithms to compute an index directly, giving average O(1) lookup.',
  },
  {
    id: 'dq-3',
    category: 'Syntax & Types',
    question: 'In JavaScript / TypeScript, what is the output of `[1, 2, 10, 20].sort()` without a compare function?',
    options: [
      { id: 'a', text: '[1, 2, 10, 20]', isCorrect: false },
      { id: 'b', text: '[1, 10, 2, 20]', isCorrect: true },
      { id: 'c', text: '[20, 10, 2, 1]', isCorrect: false },
      { id: 'd', text: 'Throws TypeError', isCorrect: false },
    ],
    explanation: 'By default, Array.prototype.sort converts elements into strings and compares their UTF-16 code units, so "10" comes before "2".',
  },
  {
    id: 'dq-4',
    category: 'Time Complexity',
    question: 'What is the tightest worst-case time complexity of Mergesort on an array of length $N$?',
    options: [
      { id: 'a', text: 'O(N)', isCorrect: false },
      { id: 'b', text: 'O(N log N)', isCorrect: true },
      { id: 'c', text: 'O(N^2)', isCorrect: false },
      { id: 'd', text: 'O(log N)', isCorrect: false },
    ],
    explanation: 'Mergesort always divides the array in half (log N levels) and takes linear time O(N) to merge each level, guaranteeing O(N log N).',
  },
];

export const MOCK_DNA_PROFILE: LearningDNAProfile = {
  studentId: 'std-9402',
  studentName: 'Alex Rivera',
  overallMastery: 76,
  totalProblemsSolved: 48,
  totalBugsDiagnosed: 29,
  streakDays: 14,
  errorArchetypes: [
    { category: 'Off-by-One & Loop Bounds', frequency: 38, description: 'Tendency to miscalculate array boundary endpoints (< vs <=).', trend: 'improving' },
    { category: 'State Mutation in Loops', frequency: 26, description: 'Modifying arrays or maps during forward iteration.', trend: 'needs_attention' },
    { category: 'Unchecked Null / None References', frequency: 21, description: 'Missing early return guards on empty inputs.', trend: 'stable' },
    { category: 'Type Coercion Assumptions', frequency: 15, description: 'Assuming string concatenation behaves numerically.', trend: 'improving' },
  ],
  skillProficiency: [
    { skill: 'Arrays & Two Pointers', level: 88, status: 'Mastered' },
    { skill: 'Hash Maps & Sets', level: 82, status: 'Mastered' },
    { skill: 'Binary Search Logic', level: 64, status: 'Proficient' },
    { skill: 'Stack & Monotonic Deque', level: 59, status: 'Learning' },
    { skill: 'Recursion Base Guards', level: 45, status: 'Struggling' },
  ],
  recentGrowthAreas: [
    'Reduced loop bounds errors by 32% this week',
    'Successfully solved 5 consecutive debugging challenges on first attempt',
    'Mastered Hash Map lookups with sub-millisecond execution',
  ],
};

export const MOCK_DAILY_TASKS: DailyTask[] = [
  { id: 'dt-1', title: 'Warm-up: Off-by-one Pointer Diagnosis', type: 'debugging', estimatedMinutes: 12, difficulty: 'Easy', completed: true, targetSkill: 'Binary Search', href: '/workspace/debugging/p-3' },
  { id: 'dt-2', title: 'Core Challenge: Longest Substring Window', type: 'coding', estimatedMinutes: 25, difficulty: 'Medium', completed: false, targetSkill: 'Sliding Window', href: '/workspace/coding/p-5' },
  { id: 'dt-3', title: 'Conceptual Review: Recursive Call Stacks', type: 'concept', estimatedMinutes: 10, difficulty: 'Easy', completed: false, targetSkill: 'Recursion', href: '/analyzer' },
  { id: 'dt-4', title: 'AI Mentor Socratic Probe: Memory Leaks', type: 'quiz', estimatedMinutes: 8, difficulty: 'Medium', completed: false, targetSkill: 'State Mutation', href: '/mentor' },
];

export const MOCK_SUBMISSIONS: SubmissionRecord[] = [
  { id: 'sub-101', problemId: 'p-1', problemTitle: 'Two Sum', mode: 'normal', language: 'Python', status: 'Accepted', runtimeMs: 42, memoryMb: 15.2, submittedAt: '10 mins ago', passedCount: 5, totalCount: 5 },
  { id: 'sub-102', problemId: 'p-3', problemTitle: 'Off-by-One in Binary Search', mode: 'debugging', language: 'Python', status: 'Bug Found', runtimeMs: 38, memoryMb: 14.8, submittedAt: '1 hour ago', passedCount: 4, totalCount: 4 },
  { id: 'sub-103', problemId: 'p-4', problemTitle: 'Mutating List During Iteration', mode: 'debugging', language: 'Python', status: 'Wrong Answer', runtimeMs: 65, memoryMb: 16.1, submittedAt: 'Yesterday', passedCount: 2, totalCount: 4 },
  { id: 'sub-104', problemId: 'p-2', problemTitle: 'Valid Parentheses', mode: 'normal', language: 'JavaScript', status: 'Accepted', runtimeMs: 51, memoryMb: 18.0, submittedAt: '2 days ago', passedCount: 6, totalCount: 6 },
  { id: 'sub-105', problemId: 'p-5', problemTitle: 'Longest Substring Without Repeating', mode: 'normal', language: 'Python', status: 'Time Limit Exceeded', runtimeMs: 1200, memoryMb: 24.5, submittedAt: '3 days ago', passedCount: 3, totalCount: 8 },
];

export const MOCK_TEACHER_COHORT: TeacherCohortMetric = {
  id: 'cohort-cs102',
  courseName: 'CS 102: Data Structures & Debugging (Fall 2026)',
  totalStudents: 42,
  activeToday: 34,
  averageMastery: 72.8,
  stuckStudentsCount: 4,
  topClassErrors: [
    { errorType: 'IndexError / Loop Bounds', studentCount: 19 },
    { errorType: 'Recursion Depth Exceeded', studentCount: 14 },
    { errorType: 'Uncaught TypeError (None)', studentCount: 11 },
    { errorType: 'In-place List Mutation', studentCount: 9 },
  ],
  strugglingStudents: [
    { id: 's-1', name: 'Jordan Hayes', currentProblem: 'Off-by-One in Binary Search', timeSpentMinutes: 34, failedAttempts: 6, recommendedIntervention: 'Provide Tier 2 Socratic hint on loop mid-pointer advance' },
    { id: 's-2', name: 'Maya Lin', currentProblem: 'Mutating List During Iteration', timeSpentMinutes: 28, failedAttempts: 4, recommendedIntervention: 'Suggest review of iterator mutation and Python list slicing' },
    { id: 's-3', name: 'Devon Patel', currentProblem: 'Longest Substring Window', timeSpentMinutes: 25, failedAttempts: 5, recommendedIntervention: 'Recommend visual execution step trace in Analyzer' },
    { id: 's-4', name: 'Sophie Turner', currentProblem: 'Valid Parentheses', timeSpentMinutes: 21, failedAttempts: 3, recommendedIntervention: 'Check closing delimiter mapping parity' },
  ],
};
