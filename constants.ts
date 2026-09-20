import { Course } from './types';

export const MOCK_COURSES: Course[] = [
  {
    id: 'dsa-comprehensive',
    title: 'Comprehensive DSA & Problem Solving',
    description: 'Master Data Structures & Algorithms from foundational arrays to dynamic programming. Features real-time Judge0 sandbox validation and progressive problem unlocking.',
    level: 'Intermediate',
    thumbnail: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    tags: ['DSA', 'Judge0 Sandbox', 'Interview Prep', 'Algorithms'],
    assignedInstructorId: 'instructor_demo_uid',
    assignedInstructorName: 'Prof. Balaji Arumugam',
    assignedInstructorEmail: 'instructor@bitwise.com',
    
    modules: [
      {
        id: 'mod-arrays',
        title: 'Module 1: Arrays & Problem Fundamentals',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        lessons: [
          { 
            id: 'dsa-arr-1', 
            title: 'Array Fundamentals & Memory Layout', 
            duration: '10 min', 
            type: 'article', 
            
            content: `
              <h3>Understanding Contiguous Memory & Arrays</h3>
              <p>An array is a collection of items stored at contiguous memory locations. The idea is to declare multiple items of the same type together.</p>
              <div class="bg-blue-50 border-l-4 border-bitwise-600 p-4 my-4 rounded-r-lg">
                <p class="font-semibold text-bitwise-900">Key Properties:</p>
                <ul class="list-disc ml-5 text-slate-700 text-sm mt-1 space-y-1">
                  <li><strong>O(1)</strong> Random Access by index: <code>arr[i] = BaseAddress + i * sizeof(type)</code></li>
                  <li><strong>O(n)</strong> Insertion / Deletion at arbitrary positions</li>
                  <li>Cache locality optimization</li>
                </ul>
              </div>
              <p>Read through this conceptual guide, then proceed to the first coding challenge to test your problem solving skills!</p>
            `,
            language: 'javascript',
            codeSnippet: `// Array basics in JavaScript\nconst nums = [2, 7, 11, 15];\nconsole.log("First element:", nums[0]);\nconsole.log("Length:", nums.length);`
          },
          { 
            id: 'dsa-arr-prob-1', 
            title: 'Challenge 1: Two Sum Target', 
            duration: '25 min', 
            type: 'problem', 
            
            content: `
              <h3 class="font-bold text-xl text-slate-900 mb-2">Two Sum Target</h3>
              <p class="text-slate-700 leading-relaxed">
                Given an array of integers <code>nums</code> and an integer <code>target</code>, write a program that reads the input and prints the zero-based indices of the two numbers such that they add up to <code>target</code> in ascending order (separated by a space).
              </p>
            `,
            problem: {
              difficulty: 'Easy',
              points: 50,
              acceptanceRate: '88.4%',
              constraints: [
                '2 <= nums.length <= 10^4',
                '-10^9 <= nums[i] <= 10^9',
                '-10^9 <= target <= 10^9',
                'Exactly one valid answer exists.'
              ],
              examples: [
                {
                  input: "2 7 11 15\n9",
                  output: "0 1",
                  explanation: "Because nums[0] + nums[1] == 2 + 7 == 9, we print '0 1'."
                },
                {
                  input: "3 2 4\n6",
                  output: "1 2",
                  explanation: "nums[1] + nums[2] == 2 + 4 == 6, so print '1 2'."
                }
              ],
              hints: [
                'Can you use a Hash Map to store numbers and their indices to achieve O(n) time complexity?',
                'For each number x, check if (target - x) already exists in your map.'
              ],
              starterTemplates: {
                javascript: `const fs = require('fs');

function solve() {
  const input = fs.readFileSync(0, 'utf-8').trim();
  // TODO: Read array and target from input, then print 0-based indices separated by space
  
}

solve();`,
                python: `import sys

def solve():
    raw_input = sys.stdin.read().strip()
    # TODO: Read array and target from input, then print 0-based indices separated by space
    pass

if __name__ == '__main__':
    solve()`,
                java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // TODO: Read array and target from STDIN, then print 0-based indices separated by space
        
    }
}`,
                cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    // TODO: Read array and target from STDIN, then print 0-based indices separated by space
    return 0;
}`
              },
              testCases: [
                {
                  id: 'tc-two-sum-1',
                  input: "2 7 11 15\n9",
                  expectedOutput: "0 1",
                  explanation: "Sample 1: 2 + 7 = 9 (indices 0 and 1)"
                },
                {
                  id: 'tc-two-sum-2',
                  input: "3 2 4\n6",
                  expectedOutput: "1 2",
                  explanation: "Sample 2: 2 + 4 = 6 (indices 1 and 2)"
                },
                {
                  id: 'tc-two-sum-3',
                  input: "3 3\n6",
                  expectedOutput: "0 1",
                  isHidden: true,
                  explanation: "Hidden test case: duplicate numbers"
                },
                {
                  id: 'tc-two-sum-4',
                  input: "1 5 10 20 35 50\n55",
                  expectedOutput: "1 5",
                  isHidden: true,
                  explanation: "Hidden test case: large target with spread values"
                },
                {
                  id: 'tc-two-sum-5',
                  input: "-3 4 3 90\n0",
                  expectedOutput: "0 2",
                  isHidden: true,
                  explanation: "Hidden test case: negative and positive numbers summing to 0"
                },
                {
                  id: 'tc-two-sum-6',
                  input: "0 4 3 0\n0",
                  expectedOutput: "0 3",
                  isHidden: true,
                  explanation: "Hidden test case: zeros summing to 0"
                }
              ]
            }
          },
          {
            id: 'dsa-str-prob-1',
            title: 'Challenge 2: Valid Palindrome',
            duration: '20 min',
            type: 'problem',
            
            content: `
              <h3 class="font-bold text-xl text-slate-900 mb-2">Valid Palindrome</h3>
              <p class="text-slate-700 leading-relaxed">
                A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.
              </p>
              <p class="text-slate-700 mt-2">
                Print <code>true</code> if it is a palindrome, or <code>false</code> otherwise.
              </p>
            `,
            problem: {
              difficulty: 'Easy',
              points: 50,
              acceptanceRate: '79.2%',
              constraints: [
                '1 <= s.length <= 2 * 10^5',
                's consists only of printable ASCII characters.'
              ],
              examples: [
                {
                  input: "A man, a plan, a canal: Panama",
                  output: "true",
                  explanation: '"amanaplanacanalpanama" is a palindrome.'
                },
                {
                  input: "race a car",
                  output: "false",
                  explanation: '"raceacar" is not a palindrome.'
                }
              ],
              hints: [
                'Two-pointer approach: Compare characters from start and end moving inwards while skipping non-alphanumerics.'
              ],
              starterTemplates: {
                javascript: `const fs = require('fs');

function solve() {
  const s = fs.readFileSync(0, 'utf-8').replace(/\\r?\\n$/, '');
  // TODO: Check if 's' is a palindrome after removing non-alphanumeric characters and lowercase conversion
  // Print "true" or "false"
  
}

solve();`,
                python: `import sys

def solve():
    s = sys.stdin.read().rstrip('\\r\\n')
    # TODO: Check if 's' is a palindrome after removing non-alphanumeric characters and lowercase conversion
    # Print "true" or "false"
    pass

if __name__ == '__main__':
    solve()`,
                java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // TODO: Read string from STDIN, check if palindrome, and print "true" or "false"
        
    }
}`,
                cpp: `#include <iostream>
#include <string>
using namespace std;

int main() {
    // TODO: Read string from STDIN, check if palindrome, and print "true" or "false"
    return 0;
}`
              },
              testCases: [
                {
                  id: 'tc-palin-1',
                  input: "A man, a plan, a canal: Panama",
                  expectedOutput: "true",
                  explanation: 'Sample 1: "amanaplanacanalpanama" is a palindrome.'
                },
                {
                  id: 'tc-palin-2',
                  input: "race a car",
                  expectedOutput: "false",
                  explanation: 'Sample 2: "raceacar" is not a palindrome.'
                },
                {
                  id: 'tc-palin-3',
                  input: " ",
                  expectedOutput: "true",
                  explanation: 'Sample 3: An empty phrase after removing non-alphanumeric reads same forward/backward.'
                },
                {
                  id: 'tc-palin-4',
                  input: "0P",
                  expectedOutput: "false",
                  isHidden: true,
                  explanation: 'Hidden: alphanumeric single number and letter'
                },
                {
                  id: 'tc-palin-5',
                  input: "Was it a car or a cat I saw?",
                  expectedOutput: "true",
                  isHidden: true,
                  explanation: 'Hidden: sentence with punctuation'
                },
                {
                  id: 'tc-palin-6',
                  input: "ab_a",
                  expectedOutput: "true",
                  isHidden: true,
                  explanation: 'Hidden: underscores removed'
                },
                {
                  id: 'tc-palin-7',
                  input: "No 'x' in Nixon",
                  expectedOutput: "true",
                  isHidden: true,
                  explanation: 'Hidden: mixed quotes and casing'
                },
                {
                  id: 'tc-palin-8',
                  input: "12345",
                  expectedOutput: "false",
                  isHidden: true,
                  explanation: 'Hidden: numeric non-palindrome'
                }
              ]
            }
          }
        ]
      },
      {
        id: 'mod-pointers',
        title: 'Module 2: Two Pointers, Stacks & Binary Search',
        startDate: '2026-10-01',
        endDate: '2026-10-15',
        lessons: [
          {
            id: 'dsa-ptr-1',
            title: 'Kadane’s Algorithm & Subarray Patterns',
            duration: '15 min',
            type: 'article',
            
            content: `
              <h3>Kadane's Algorithm for Maximum Subarray</h3>
              <p>Kadane's algorithm is a dynamic programming technique that finds the contiguous subarray with maximum sum in linear time <code>O(n)</code>.</p>
              <div class="bg-amber-50 border-l-4 border-amber-500 p-4 my-4 rounded-r-lg">
                <p class="font-mono text-sm text-slate-800">
                  current_max = max(nums[i], current_max + nums[i])<br/>
                  global_max = max(global_max, current_max)
                </p>
              </div>
            `
          },
          {
            id: 'dsa-slid-1',
            title: 'Challenge 3: Maximum Subarray Sum',
            duration: '30 min',
            type: 'problem',
            
            content: `
              <h3 class="font-bold text-xl text-slate-900 mb-2">Maximum Subarray Sum</h3>
              <p class="text-slate-700 leading-relaxed">
                Given an integer array <code>nums</code>, find the subarray with the largest sum, and print its sum.
              </p>
            `,
            problem: {
              difficulty: 'Medium',
              points: 100,
              acceptanceRate: '67.5%',
              constraints: [
                '1 <= nums.length <= 10^5',
                '-10^4 <= nums[i] <= 10^4'
              ],
              examples: [
                {
                  input: "-2 1 -3 4 -1 2 1 -5 4",
                  output: "6",
                  explanation: "The subarray [4,-1,2,1] has the largest sum 6."
                },
                {
                  input: "5 4 -1 7 8",
                  output: "23",
                  explanation: "The entire array has the maximum sum 23."
                },
                {
                  input: "1",
                  output: "1",
                  explanation: "Single element max sum is 1."
                }
              ],
              hints: [
                'Maintain a running sum. If the running sum becomes negative, reset it to 0 or start a new subarray.'
              ],
              starterTemplates: {
                javascript: `const fs = require('fs');

function solve() {
  const input = fs.readFileSync(0, 'utf-8').trim();
  // TODO: Read array from input and calculate maximum subarray sum
  
}

solve();`,
                python: `import sys

def solve():
    raw_input = sys.stdin.read().strip()
    # TODO: Read array from input and calculate maximum subarray sum
    pass

if __name__ == '__main__':
    solve()`,
                java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // TODO: Read array from STDIN and print maximum subarray sum
        
    }
}`,
                cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    // TODO: Read array from STDIN and print maximum subarray sum
    return 0;
}`
              },
              testCases: [
                {
                  id: 'tc-maxsum-1',
                  input: "-2 1 -3 4 -1 2 1 -5 4",
                  expectedOutput: "6",
                  explanation: "Sample 1: [4, -1, 2, 1] sum = 6"
                },
                {
                  id: 'tc-maxsum-2',
                  input: "5 4 -1 7 8",
                  expectedOutput: "23",
                  explanation: "Sample 2: all positive and small negatives, sum = 23"
                },
                {
                  id: 'tc-maxsum-3',
                  input: "1",
                  expectedOutput: "1",
                  explanation: "Sample 3: single element"
                },
                {
                  id: 'tc-maxsum-4',
                  input: "-1 -2 -3 -4",
                  expectedOutput: "-1",
                  isHidden: true,
                  explanation: "Hidden: all negative numbers"
                },
                {
                  id: 'tc-maxsum-5',
                  input: "10 -5 20 -10 30",
                  expectedOutput: "45",
                  isHidden: true,
                  explanation: "Hidden: alternating peaks and valleys"
                },
                {
                  id: 'tc-maxsum-6',
                  input: "-5 -1 -8",
                  expectedOutput: "-1",
                  isHidden: true,
                  explanation: "Hidden: maximum is least negative element"
                },
                {
                  id: 'tc-maxsum-7',
                  input: "1 2 3 4 5",
                  expectedOutput: "15",
                  isHidden: true,
                  explanation: "Hidden: strictly increasing positive numbers"
                }
              ]
            }
          },
          {
            id: 'dsa-stack-prob-1',
            title: 'Challenge 4: Valid Parentheses',
            duration: '25 min',
            type: 'problem',
            
            content: `
              <h3 class="font-bold text-xl text-slate-900 mb-2">Valid Parentheses</h3>
              <p class="text-slate-700 leading-relaxed">
                Given a string <code>s</code> containing just the characters <code>'('</code>, <code>')'</code>, <code>'{'</code>, <code>'}'</code>, <code>'['</code> and <code>']'</code>, determine if the input string is valid.
              </p>
              <p class="text-slate-700 mt-2">
                An input string is valid if:
                <br/>1. Open brackets must be closed by the same type of brackets.
                <br/>2. Open brackets must be closed in the correct order.
                <br/>3. Every close bracket has a corresponding open bracket of the same type.
              </p>
              <p class="text-slate-700 mt-2">
                Print <code>true</code> if the string is valid, or <code>false</code> otherwise.
              </p>
            `,
            problem: {
              difficulty: 'Easy',
              points: 50,
              acceptanceRate: '84.3%',
              constraints: [
                '1 <= s.length <= 10^4',
                's consists of parentheses only \'()[]{}\'.'
              ],
              examples: [
                {
                  input: "()",
                  output: "true",
                  explanation: "Matching pair () is valid."
                },
                {
                  input: "()[]{}",
                  output: "true",
                  explanation: "All consecutive pairs match."
                },
                {
                  input: "(]",
                  output: "false",
                  explanation: "Parenthesis does not match square bracket."
                }
              ],
              hints: [
                'Use a Stack data structure (or array push/pop). Push opening brackets, and on closing brackets check if top of stack matches.'
              ],
              starterTemplates: {
                javascript: `const fs = require('fs');

function solve() {
  const s = fs.readFileSync(0, 'utf-8').trim();
  // TODO: Validate parentheses using a Stack and print "true" or "false"
  
}

solve();`,
                python: `import sys

def solve():
    s = sys.stdin.read().strip()
    # TODO: Validate parentheses using a Stack and print "true" or "false"
    pass

if __name__ == '__main__':
    solve()`,
                java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // TODO: Read string from STDIN, validate parentheses, and print "true" or "false"
        
    }
}`,
                cpp: `#include <iostream>
#include <stack>
#include <string>
using namespace std;

int main() {
    // TODO: Read string from STDIN, validate parentheses, and print "true" or "false"
    return 0;
}`
              },
              testCases: [
                {
                  id: 'tc-vp-1',
                  input: "()",
                  expectedOutput: "true",
                  explanation: "Sample 1: Single matched pair"
                },
                {
                  id: 'tc-vp-2',
                  input: "()[]{}",
                  expectedOutput: "true",
                  explanation: "Sample 2: Multiple consecutive pairs"
                },
                {
                  id: 'tc-vp-3',
                  input: "(]",
                  expectedOutput: "false",
                  explanation: "Sample 3: Mismatched bracket types"
                },
                {
                  id: 'tc-vp-4',
                  input: "([)]",
                  expectedOutput: "false",
                  isHidden: true,
                  explanation: "Hidden: Interleaved incorrect nesting"
                },
                {
                  id: 'tc-vp-5',
                  input: "{[]}",
                  expectedOutput: "true",
                  isHidden: true,
                  explanation: "Hidden: Correctly nested brackets"
                },
                {
                  id: 'tc-vp-6',
                  input: "[",
                  expectedOutput: "false",
                  isHidden: true,
                  explanation: "Hidden: Unclosed single opening bracket"
                },
                {
                  id: 'tc-vp-7',
                  input: "(([]){})",
                  expectedOutput: "true",
                  isHidden: true,
                  explanation: "Hidden: Complex nested and adjacent combination"
                }
              ]
            }
          },
          {
            id: 'dsa-binsearch-prob-1',
            title: 'Challenge 5: Binary Search in Sorted Array',
            duration: '25 min',
            type: 'problem',
            
            content: `
              <h3 class="font-bold text-xl text-slate-900 mb-2">Binary Search in Sorted Array</h3>
              <p class="text-slate-700 leading-relaxed">
                Given an array of integers <code>nums</code> which is sorted in ascending order, and an integer <code>target</code>, write a function to search <code>target</code> in <code>nums</code>. If <code>target</code> exists, then print its 0-based index. Otherwise, print <code>-1</code>.
              </p>
              <p class="text-slate-700 mt-2">
                Input format: First line contains space-separated sorted integers <code>nums</code>. Second line contains integer <code>target</code>.
              </p>
            `,
            problem: {
              difficulty: 'Easy',
              points: 50,
              acceptanceRate: '86.1%',
              constraints: [
                '1 <= nums.length <= 10^4',
                '-10^4 < nums[i], target < 10^4',
                'All integers in nums are unique.',
                'nums is sorted in ascending order.'
              ],
              examples: [
                {
                  input: "-1 0 3 5 9 12\n9",
                  output: "4",
                  explanation: "9 exists in nums and its index is 4."
                },
                {
                  input: "-1 0 3 5 9 12\n2",
                  output: "-1",
                  explanation: "2 does not exist in nums so print -1."
                }
              ],
              hints: [
                'Maintain low and high pointers. Calculate mid = low + Math.floor((high - low) / 2) to avoid overflow.'
              ],
              starterTemplates: {
                javascript: `const fs = require('fs');

function solve() {
  const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
  // TODO: Implement O(log n) Binary Search and print the index or -1
  
}

solve();`,
                python: `import sys

def solve():
    lines = sys.stdin.read().strip().split('\\n')
    # TODO: Implement O(log n) Binary Search and print the index or -1
    pass

if __name__ == '__main__':
    solve()`,
                java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // TODO: Read array and target from STDIN, perform binary search, and print index or -1
        
    }
}`,
                cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    // TODO: Read array and target from STDIN, perform binary search, and print index or -1
    return 0;
}`
              },
              testCases: [
                {
                  id: 'tc-bs-1',
                  input: "-1 0 3 5 9 12\n9",
                  expectedOutput: "4",
                  explanation: "Sample 1: Target 9 is at index 4"
                },
                {
                  id: 'tc-bs-2',
                  input: "-1 0 3 5 9 12\n2",
                  expectedOutput: "-1",
                  explanation: "Sample 2: Target 2 does not exist"
                },
                {
                  id: 'tc-bs-3',
                  input: "5\n5",
                  expectedOutput: "0",
                  explanation: "Sample 3: Single element target found"
                },
                {
                  id: 'tc-bs-4',
                  input: "1 3 5 7 9 11 13 15\n1",
                  expectedOutput: "0",
                  isHidden: true,
                  explanation: "Hidden: Target is the very first element"
                },
                {
                  id: 'tc-bs-5',
                  input: "1 3 5 7 9 11 13 15\n15",
                  expectedOutput: "7",
                  isHidden: true,
                  explanation: "Hidden: Target is the very last element"
                },
                {
                  id: 'tc-bs-6',
                  input: "2 4 6 8 10\n7",
                  expectedOutput: "-1",
                  isHidden: true,
                  explanation: "Hidden: Target in between elements"
                },
                {
                  id: 'tc-bs-7',
                  input: "10 20 30 40 50\n60",
                  expectedOutput: "-1",
                  isHidden: true,
                  explanation: "Hidden: Target larger than max element"
                }
              ]
            }
          }
        ]
      },
      {
        id: 'mod-dp',
        title: 'Module 3: Dynamic Programming Mastery',
        startDate: '2026-10-16',
        endDate: '2026-11-05',
        lessons: [
          {
            id: 'dsa-dp-1',
            title: 'Dynamic Programming: Memoization & Tabulation',
            duration: '20 min',
            type: 'article',
            
            content: `
              <h3>State Transitions & Overlapping Subproblems</h3>
              <p>Dynamic programming solves complex problems by breaking them down into simpler subproblems, solving each subproblem once, and storing their solutions.</p>
            `
          },
          {
            id: 'dsa-dp-prob-1',
            title: 'Challenge 4: Climbing Stairs',
            duration: '35 min',
            type: 'problem',
            
            content: `
              <h3 class="font-bold text-xl text-slate-900 mb-2">Climbing Stairs</h3>
              <p class="text-slate-700 leading-relaxed">
                You are climbing a staircase. It takes <code>n</code> steps to reach the top.
                Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?
              </p>
            `,
            problem: {
              difficulty: 'Easy',
              points: 50,
              acceptanceRate: '75.8%',
              constraints: [
                '1 <= n <= 45'
              ],
              examples: [
                {
                  input: "2",
                  output: "2",
                  explanation: "1 step + 1 step, or 2 steps."
                },
                {
                  input: "3",
                  output: "3",
                  explanation: "(1+1+1), (1+2), (2+1)"
                }
              ],
              hints: [
                'Notice that ways(n) = ways(n-1) + ways(n-2), which is identical to the Fibonacci sequence!'
              ],
              starterTemplates: {
                javascript: `const fs = require('fs');

function solve() {
  const n = parseInt(fs.readFileSync(0, 'utf-8').trim(), 10);
  // TODO: Calculate the number of distinct ways to climb n stairs
  
}

solve();`,
                python: `import sys

def solve():
    raw_input = sys.stdin.read().strip()
    # TODO: Calculate the number of distinct ways to climb n stairs
    pass

if __name__ == '__main__':
    solve()`,
                java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // TODO: Read integer n from STDIN and print distinct ways to climb
        
    }
}`,
                cpp: `#include <iostream>
using namespace std;

int main() {
    // TODO: Read integer n from STDIN and print distinct ways to climb
    return 0;
}`
              },
              testCases: [
                {
                  id: 'tc-stairs-1',
                  input: "2",
                  expectedOutput: "2",
                  explanation: "Sample 1: 1+1 or 2 steps"
                },
                {
                  id: 'tc-stairs-2',
                  input: "3",
                  expectedOutput: "3",
                  explanation: "Sample 2: 1+1+1, 1+2, 2+1 steps"
                },
                {
                  id: 'tc-stairs-3',
                  input: "1",
                  expectedOutput: "1",
                  explanation: "Sample 3: Only 1 way for 1 step"
                },
                {
                  id: 'tc-stairs-4',
                  input: "4",
                  expectedOutput: "5",
                  isHidden: true,
                  explanation: "Hidden: n = 4"
                },
                {
                  id: 'tc-stairs-5',
                  input: "5",
                  expectedOutput: "8",
                  isHidden: true,
                  explanation: "Hidden: n = 5"
                },
                {
                  id: 'tc-stairs-6',
                  input: "10",
                  expectedOutput: "89",
                  isHidden: true,
                  explanation: "Hidden: n = 10"
                },
                {
                  id: 'tc-stairs-7',
                  input: "20",
                  expectedOutput: "10946",
                  isHidden: true,
                  explanation: "Hidden: n = 20"
                },
                {
                  id: 'tc-stairs-8',
                  input: "35",
                  expectedOutput: "14930352",
                  isHidden: true,
                  explanation: "Hidden: n = 35 (large fibonacci)"
                }
              ]
            }
          },
          {
            id: 'dsa-dp-prob-2',
            title: 'Challenge 7: Coin Change Minimum Coins',
            duration: '35 min',
            type: 'problem',
            
            content: `
              <h3 class="font-bold text-xl text-slate-900 mb-2">Coin Change</h3>
              <p class="text-slate-700 leading-relaxed">
                You are given an integer array <code>coins</code> representing coins of different denominations and an integer <code>amount</code> representing a total amount of money.
              </p>
              <p class="text-slate-700 mt-2">
                Write a program to compute the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, print <code>-1</code>.
              </p>
              <p class="text-slate-700 mt-2">
                Input format: First line contains space-separated coin values. Second line contains the target amount.
              </p>
            `,
            problem: {
              difficulty: 'Medium',
              points: 100,
              acceptanceRate: '61.4%',
              constraints: [
                '1 <= coins.length <= 12',
                '1 <= coins[i] <= 2^31 - 1',
                '0 <= amount <= 10^4'
              ],
              examples: [
                {
                  input: "1 2 5\n11",
                  output: "3",
                  explanation: "11 = 5 + 5 + 1 (3 coins)"
                },
                {
                  input: "2\n3",
                  output: "-1",
                  explanation: "Cannot make 3 using only coins of 2."
                },
                {
                  input: "1\n0",
                  output: "0",
                  explanation: "0 amount requires 0 coins."
                }
              ],
              hints: [
                'Use dynamic programming table dp[i] where dp[i] is minimum coins to make amount i.',
                'Initialize dp array with Infinity, dp[0] = 0. For each coin c and i from c to amount: dp[i] = min(dp[i], dp[i-c] + 1).'
              ],
              starterTemplates: {
                javascript: `const fs = require('fs');

function solve() {
  const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\r?\\n/);
  // TODO: Compute the fewest coins to make amount and print the result or -1
  
}

solve();`,
                python: `import sys

def solve():
    lines = sys.stdin.read().strip().split('\\n')
    # TODO: Compute the fewest coins to make amount and print the result or -1
    pass

if __name__ == '__main__':
    solve()`,
                java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // TODO: Read coins and amount from STDIN, compute min coins and print result
        
    }
}`,
                cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    // TODO: Read coins and amount from STDIN, compute min coins and print result
    return 0;
}`
              },
              testCases: [
                {
                  id: 'tc-cc-1',
                  input: "1 2 5\n11",
                  expectedOutput: "3",
                  explanation: "Sample 1: 5 + 5 + 1 = 11 (3 coins)"
                },
                {
                  id: 'tc-cc-2',
                  input: "2\n3",
                  expectedOutput: "-1",
                  explanation: "Sample 2: Impossible"
                },
                {
                  id: 'tc-cc-3',
                  input: "1\n0",
                  expectedOutput: "0",
                  explanation: "Sample 3: Amount 0 requires 0 coins"
                },
                {
                  id: 'tc-cc-4',
                  input: "1 3 4 5\n7",
                  expectedOutput: "2",
                  isHidden: true,
                  explanation: "Hidden: Optimal is 3 + 4 = 7 (2 coins) vs 5 + 1 + 1 (3 coins)"
                },
                {
                  id: 'tc-cc-5',
                  input: "2 5 10 25\n30",
                  expectedOutput: "2",
                  isHidden: true,
                  explanation: "Hidden: 25 + 5 = 30 (2 coins)"
                },
                {
                  id: 'tc-cc-6',
                  input: "186 419 83 408\n6249",
                  expectedOutput: "20",
                  isHidden: true,
                  explanation: "Hidden: Large amount DP test"
                }
              ]
            }
          }
        ]
      }
    ]
  },
  {
    id: 'system-design-pro',
    title: 'Advanced System Design',
    description: 'Learn how to design scalable systems like Netflix, Uber, and Twitter. Essential for Senior Engineer interviews.',
    level: 'Advanced',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    tags: ['Architecture', 'Scalability', 'Backend'],
    
    modules: [
      {
        id: 'sd-m1',
        title: 'Scalability Fundamentals',
        lessons: [
          {
            id: 'sd-l1',
            title: 'Vertical vs Horizontal Scaling',
            duration: '20 min',
            type: 'article',
            
            content: '<h3>Scaling Strategies</h3><p>Vertical scaling means adding more power (CPU, RAM) to an existing machine. Horizontal scaling means adding more machines into your pool of resources.</p>'
          },
          {
            id: 'sd-l2',
            title: 'Load Balancers & Reverse Proxies',
            duration: '25 min',
            type: 'article',
            
            content: '<h3>Load Balancing</h3><p>A load balancer distributes incoming network traffic across multiple servers.</p>'
          }
        ]
      }
    ]
  },
  {
    id: 'java-mastery',
    title: 'Java Masterclass & Algorithms',
    description: 'Master Java from basic syntax to object-oriented programming, data structures, and algorithms.',
    level: 'Beginner',
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    tags: ['Java', 'Backend', 'OOP', 'Algorithms'],
    modules: [
      {
        id: 'java-m1',
        title: 'Java Basics & Logic',
        lessons: [
          { 
            id: 'java-l1', 
            title: 'Java Setup and Fundamentals', 
            duration: '10 min', 
            type: 'article', 
            
            language: 'java',
            content: `
              <h3 class="text-xl font-bold mb-2">Welcome to Java</h3>
              <p class="mb-4">Java is a high-level, class-based, object-oriented programming language.</p>
              <div class="bg-blue-50 p-4 rounded-lg mb-4 border-l-4 border-blue-500">
                <strong>JVM Architecture:</strong><br/>
                Code (.java) -> Compiler (javac) -> Bytecode (.class) -> JVM -> Machine Code
              </div>
            `,
            codeSnippet: `public class Main {
  public static void main(String[] args) {
    System.out.println("Hello from Bitwise Hub!");
  }
}`
          },
          {
            id: 'java-l2',
            title: 'Challenge: FizzBuzz Logic',
            duration: '20 min',
            type: 'problem',
            
            content: `
              <h3 class="font-bold text-xl text-slate-900 mb-2">FizzBuzz</h3>
              <p class="text-slate-700 leading-relaxed">
                Given an integer <code>n</code>, print numbers from 1 to n each on a new line. But for multiples of 3 print <code>Fizz</code>, for multiples of 5 print <code>Buzz</code>, and for multiples of both 3 and 5 print <code>FizzBuzz</code>.
              </p>
            `,
            problem: {
              difficulty: 'Easy',
              points: 40,
              acceptanceRate: '92.1%',
              constraints: ['1 <= n <= 100'],
              examples: [
                {
                  input: "5",
                  output: "1\n2\nFizz\n4\nBuzz",
                  explanation: "Multiples of 3 become Fizz, multiples of 5 become Buzz."
                }
              ],
              hints: ['Check if n % 15 == 0 first, then % 3 and % 5!'],
              starterTemplates: {
                java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // TODO: Read integer n from STDIN and output FizzBuzz from 1 to n
        
    }
}`,
                javascript: `const fs = require('fs');

function solve() {
  const input = fs.readFileSync(0, 'utf-8').trim();
  // TODO: Read integer n from STDIN and output FizzBuzz from 1 to n
  
}

solve();`,
                python: `import sys

def solve():
    raw_input = sys.stdin.read().strip()
    # TODO: Read integer n from STDIN and output FizzBuzz from 1 to n
    pass

if __name__ == '__main__':
    solve()`,
                cpp: `#include <iostream>
using namespace std;

int main() {
    // TODO: Read integer n from STDIN and output FizzBuzz from 1 to n
    return 0;
}`
              },
              testCases: [
                {
                  id: 'tc-fb-1',
                  input: "5",
                  expectedOutput: "1\n2\nFizz\n4\nBuzz",
                  explanation: "Sample 1: Numbers 1 to 5"
                },
                {
                  id: 'tc-fb-2',
                  input: "3",
                  expectedOutput: "1\n2\nFizz",
                  explanation: "Sample 2: Numbers 1 to 3"
                },
                {
                  id: 'tc-fb-3',
                  input: "1",
                  expectedOutput: "1",
                  isHidden: true,
                  explanation: "Hidden: Single number 1"
                },
                {
                  id: 'tc-fb-4',
                  input: "15",
                  expectedOutput: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
                  isHidden: true,
                  explanation: "Hidden: Includes 15 which prints FizzBuzz"
                },
                {
                  id: 'tc-fb-5',
                  input: "20",
                  expectedOutput: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n16\n17\nFizz\n19\nBuzz",
                  isHidden: true,
                  explanation: "Hidden: 20 numbers with multiple Fizz and Buzz"
                }
              ]
            }
          }
        ]
      }
    ]
  },
  {
    id: 'js-modern',
    title: 'Modern JavaScript & Web Development',
    description: 'Master modern ES6+, Async/Await, closures, array methods, and algorithmic patterns in JavaScript.',
    level: 'Intermediate',
    thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    tags: ['JavaScript', 'Web', 'Frontend', 'DSA'],
    modules: [
      {
        id: 'js-m1',
        title: 'ES6+ & Algorithmic Patterns',
        lessons: [
          {
            id: 'js-l1',
            title: 'Modern JS Fundamentals',
            duration: '15 min',
            type: 'article',
            
            language: 'javascript',
            content: '<p>Learn modern ES6 features including arrow functions, destructuring, and spread operators.</p>',
            codeSnippet: `const greet = (name) => \`Hello, \${name}!\`;\nconsole.log(greet("Developer"));`
          }
        ]
      }
    ]
  },
 {
  id: 'python-programming',
  title: 'Python Programming',
  description: 'Master Python fundamentals, control flow, data structures, built-in functions, file handling, searching, sorting, and algorithmic problem solving.',
  level: 'Beginner',
  thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  tags: ['Python', 'Basics', 'DSA', 'Scripting'],
  // isPro: false,

  modules: [

    // ============================================================
    // UNIT I
    // ============================================================
    {
      id: 'py-mod1',
      title: 'Unit I: Python Fundamentals and Problem Solving',

      lessons: [

        {
          id: 'py-l1',
          title: 'Introduction to Python',
          duration: '15 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn Python introduction, features, applications, and basic syntax. Resources: <a href="https://www.geeksforgeeks.org/python-introduction/" target="_blank">Python Introduction - GFG</a></p>',
          language: 'python',
          codeSnippet: '# Print Hello World\nprint("Hello World")'
        },

        {
          id: 'pr-py-l1',
          title: 'Print Hello Python',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Write a Python program that prints <code>Hello Python</code>.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '',
                expectedOutput: 'Hello Python',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '',
                expectedOutput: 'Hello Python',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'print("Hello Python")'
            },

            solutionCode: {
              python: 'print("Hello Python")'
            }
          }
        },

        {
          id: 'py-l1a',
          title: 'Data Types',
          duration: '15 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn integer, float, string, boolean, and other Python data types. Resources: <a href="https://www.geeksforgeeks.org/python-data-types/" target="_blank">Python Data Types - GFG</a></p>',
          language: 'python',
          codeSnippet: 'age = 20\nmarks = 85.5\nname = "Python"\npassed = True\n\nprint(age)\nprint(marks)\nprint(name)\nprint(type(age))'
        },

        {
          id: 'pr-py-l1a',
          title: 'Check Data Type',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read an integer and print its Python type.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '10',
                expectedOutput: '<class \'int\'>',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '25',
                expectedOutput: '<class \'int\'>',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'value = int(input())\nprint(type(value))'
            },

            solutionCode: {
              python: 'value = int(input())\nprint(type(value))'
            }
          }
        },

        {
          id: 'py-l1b',
          title: 'Constants',
          duration: '15 min',
          type: 'article',
          isPro: false,
          content: '<p>Understand constants and their use in Python programs. Resources: <a href="https://www.geeksforgeeks.org/python-constants/" target="_blank">Python Constant - GFG</a></p>',
          language: 'python',
          codeSnippet: 'PI = 3.14\nradius = 5\narea = PI * radius * radius\nprint(area)'
        },

        {
          id: 'pr-py-l1b',
          title: 'Calculate Circle Area',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read a radius and calculate the circle area using 3.14.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '5',
                expectedOutput: '78.5',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '2',
                expectedOutput: '12.56',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'radius = float(input())\nprint(3.14 * radius * radius)'
            },

            solutionCode: {
              python: 'radius = float(input())\nprint(3.14 * radius * radius)'
            }
          }
        },

        {
          id: 'py-l1c',
          title: 'Input and Output',
          duration: '15 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn how to read input and display output using input() and print(). Resources: <a href="https://www.geeksforgeeks.org/input-and-output-in-python/" target="_blank">Input and Output in Python - GFG</a></p>',
          language: 'python',
          codeSnippet: 'name = input()\nage = int(input())\nprint("Name:", name)\nprint("Age:", age)'
        },

        {
          id: 'pr-py-l1c',
          title: 'Read and Print Name',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read a name and print <code>Hello, name</code>.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: 'Arun',
                expectedOutput: 'Hello, Arun',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: 'Priya',
                expectedOutput: 'Hello, Priya',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'name = input()\nprint("Hello, " + name)'
            },

            solutionCode: {
              python: 'name = input()\nprint("Hello, " + name)'
            }
          }
        },

        {
          id: 'py-l1d',
          title: 'Variables',
          duration: '15 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn variable declaration, assignment, naming rules, and variable manipulation. Resources: <a href="https://www.geeksforgeeks.org/python-variables/" target="_blank">Variable in Programming - GFG</a></p>',
          language: 'python',
          codeSnippet: 'name = "Python"\nversion = 3.12\nprint(name)\nprint(version)'
        },

        {
          id: 'pr-py-l1d',
          title: 'Store a Variable',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read an integer, store it in a variable, and print it.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '25',
                expectedOutput: '25',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '100',
                expectedOutput: '100',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'value = int(input())\nprint(value)'
            },

            solutionCode: {
              python: 'value = int(input())\nprint(value)'
            }
          }
        },

        {
          id: 'py-l1e',
          title: 'Operators',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn arithmetic, relational, logical, assignment, and other Python operators. Resources: <a href="https://www.geeksforgeeks.org/python-operators/" target="_blank">Python Operators - GFG</a></p>',
          language: 'python',
          codeSnippet: 'a = 10\nb = 3\n\nprint(a + b)\nprint(a - b)\nprint(a * b)\nprint(a / b)\nprint(a % b)\nprint(a // b)'
        },

        {
          id: 'pr-py-l1e',
          title: 'Basic Arithmetic',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read two integers and print their sum.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '10 20',
                expectedOutput: '30',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '7 8',
                expectedOutput: '15',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'a, b = map(int, input().split())\nprint(a + b)'
            },

            solutionCode: {
              python: 'a, b = map(int, input().split())\nprint(a + b)'
            }
          }
        },

        {
          id: 'py-l1f',
          title: 'Expressions',
          duration: '15 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn Python expressions, evaluation, and operator precedence. Resources: <a href="https://www.geeksforgeeks.org/python-expressions/" target="_blank">Expressions in Python - GFG</a></p>',
          language: 'python',
          codeSnippet: 'a = 10\nb = 20\nc = 30\naverage = (a + b + c) / 3\nprint(average)'
        },

        {
          id: 'pr-py-l1f',
          title: 'Average of Three Numbers',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read three numbers and print their average.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '10 20 30',
                expectedOutput: '20.0',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '5 10 15',
                expectedOutput: '10.0',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'a, b, c = map(int, input().split())\nprint((a + b + c) / 3)'
            },

            solutionCode: {
              python: 'a, b, c = map(int, input().split())\nprint((a + b + c) / 3)'
            }
          }
        },

        {
          id: 'py-l1g',
          title: 'Strings and String Operations',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn strings, indexing, concatenation, slicing, and common string operations. Resources: <a href="https://www.geeksforgeeks.org/python-strings/" target="_blank">Python Strings - GFG</a></p>',
          language: 'python',
          codeSnippet: 'text = "Hello Python"\nprint(text[0])\nprint(text[0:5])\nprint(text + " Programming")'
        },

        {
          id: 'pr-py-l1g',
          title: 'Reverse a String',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read a string and print it in reverse.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: 'python',
                expectedOutput: 'nohtyp',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: 'hello',
                expectedOutput: 'olleh',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'text = input()\nprint(text[::-1])'
            },

            solutionCode: {
              python: 'text = input()\nprint(text[::-1])'
            }
          }
        },

        {
          id: 'py-l1h',
          title: 'Basic String Methods',
          duration: '15 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn common Python string methods such as upper(), lower(), count(), replace(), and strip(). Resources: <a href="https://www.geeksforgeeks.org/python-string-methods/" target="_blank">Python String Methods - GFG</a></p>',
          language: 'python',
          codeSnippet: 'text = "Hello Python"\nprint(text.upper())\nprint(text.lower())\nprint(text.count("o"))'
        },

        {
          id: 'pr-py-l1h',
          title: 'Convert String Case',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read a string and print it in uppercase.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: 'python',
                expectedOutput: 'PYTHON',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: 'Hello World',
                expectedOutput: 'HELLO WORLD',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'text = input()\nprint(text.upper())'
            },

            solutionCode: {
              python: 'text = input()\nprint(text.upper())'
            }
          }
        },

        {
          id: 'py-l1i',
          title: 'Comments',
          duration: '10 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn single-line and multi-line comments in Python. Resources: <a href="https://www.geeksforgeeks.org/python-comments/" target="_blank">Python Comments - GFG</a></p>',
          language: 'python',
          codeSnippet: '# This is a single-line comment\nprint("Hello")'
        },

        {
          id: 'pr-py-l1i',
          title: 'Add a Comment',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Write a program that contains a comment and prints <code>Learning Python</code>.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '',
                expectedOutput: 'Learning Python',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '',
                expectedOutput: 'Learning Python',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: '# This is a comment\nprint("Learning Python")'
            },

            solutionCode: {
              python: '# This is a comment\nprint("Learning Python")'
            }
          }
        },

        {
          id: 'py-p1',
          title: 'Hello World and Variables',
          duration: '20 min',
          type: 'problem',
          isPro: false,
          content: '<p>Write a Python program that demonstrates basic output and variables.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 10,

            testCases: [
              {
                id: 'tc1',
                input: '',
                expectedOutput: 'Hello Python',
                explanation: 'Print the required message.'
              },
              {
                id: 'tc2',
                input: '',
                expectedOutput: 'Hello Python',
                explanation: 'Verify exact output formatting.'
              },
              {
                id: 'tc3',
                input: '',
                expectedOutput: 'Hello Python',
                explanation: 'Check basic Python execution.'
              },
              {
                id: 'tc4',
                input: '',
                expectedOutput: 'Hello Python',
                explanation: 'Check output without extra spaces.'
              }
            ],

            starterTemplates: {
              python: '# Write your code\nprint("Hello Python")'
            },

            solutionCode: {
              python: 'print("Hello Python")'
            }
          }
        },

        {
          id: 'py-p1b',
          title: 'Odd or Even Number',
          duration: '20 min',
          type: 'problem',
          isPro: false,
          content: '<p>Check whether a number is odd or even.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 10,

            testCases: [
              {
                id: 'tc1',
                input: '10',
                expectedOutput: 'Even',
                explanation: '10 is divisible by 2.'
              },
              {
                id: 'tc2',
                input: '7',
                expectedOutput: 'Odd',
                explanation: '7 is not divisible by 2.'
              },
              {
                id: 'tc3',
                input: '0',
                expectedOutput: 'Even',
                explanation: 'Zero is even.'
              },
              {
                id: 'tc4',
                input: '-5',
                expectedOutput: 'Odd',
                explanation: 'Negative odd numbers remain odd.'
              },
              {
                id: 'tc5',
                input: '24',
                expectedOutput: 'Even',
                explanation: '24 is divisible by 2.'
              }
            ],

            starterTemplates: {
              python: 'n = int(input())\n# Check odd or even'
            },

            solutionCode: {
              python: 'n = int(input())\nprint("Even" if n % 2 == 0 else "Odd")'
            }
          }
        },

        {
          id: 'py-p1c',
          title: 'Largest of Two Numbers',
          duration: '20 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read two numbers and print the larger number.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 10,

            testCases: [
              {
                id: 'tc1',
                input: '10 20',
                expectedOutput: '20',
                explanation: '20 is larger.'
              },
              {
                id: 'tc2',
                input: '50 30',
                expectedOutput: '50',
                explanation: '50 is larger.'
              },
              {
                id: 'tc3',
                input: '-5 -2',
                expectedOutput: '-2',
                explanation: '-2 is larger.'
              },
              {
                id: 'tc4',
                input: '7 7',
                expectedOutput: '7',
                explanation: 'Both numbers are equal.'
              },
              {
                id: 'tc5',
                input: '100 1',
                expectedOutput: '100',
                explanation: '100 is larger.'
              }
            ],

            starterTemplates: {
              python: 'a, b = map(int, input().split())\n# Find the larger number'
            },

            solutionCode: {
              python: 'a, b = map(int, input().split())\nprint(max(a, b))'
            }
          }
        }
      ]
    },

    // ============================================================
    // UNIT II
    // ============================================================
    {
      id: 'py-mod2',
      title: 'Unit II: Data Types, Expressions, Statements, Control Flow and Functions',

      lessons: [

        {
          id: 'py-l2',
          title: 'Control Flow',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn conditional statements and control flow in Python.</p>',
          language: 'python',
          codeSnippet: 'n = 10\nif n > 0:\n    print("Positive")'
        },

        {
          id: 'pr-py-l2',
          title: 'Control Flow Practice',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read an integer and print <code>Positive</code>, <code>Negative</code>, or <code>Zero</code>.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '5',
                expectedOutput: 'Positive',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '0',
                expectedOutput: 'Zero',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'n = int(input())\n# Check the value'
            },

            solutionCode: {
              python: 'n = int(input())\nif n > 0:\n    print("Positive")\nelif n < 0:\n    print("Negative")\nelse:\n    print("Zero")'
            }
          }
        },

        {
          id: 'py-l2a',
          title: 'While Loop',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn how while loops work and how to use them for repeated execution.</p>',
          language: 'python',
          codeSnippet: 'i = 1\nwhile i <= 5:\n    print(i)\n    i += 1'
        },

        {
          id: 'pr-py-l2a',
          title: 'While Loop Counter',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Use a while loop to print numbers from 1 to n.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '5',
                expectedOutput: '1\n2\n3\n4\n5',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '3',
                expectedOutput: '1\n2\n3',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'n = int(input())\ni = 1\nwhile i <= n:\n    # Print the current number\n    i += 1'
            },

            solutionCode: {
              python: 'n = int(input())\ni = 1\nwhile i <= n:\n    print(i)\n    i += 1'
            }
          }
        },

        {
          id: 'py-l2b',
          title: 'For Loop',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn for loops, range(), and iteration over sequences.</p>',
          language: 'python',
          codeSnippet: 'for i in range(1, 6):\n    print(i)'
        },

        {
          id: 'pr-py-l2b',
          title: 'For Loop Sum',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Use a for loop to calculate the sum from 1 to n.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '5',
                expectedOutput: '15',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '4',
                expectedOutput: '10',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'n = int(input())\ntotal = 0\nfor i in range(1, n + 1):\n    # Add i to total\n    pass\nprint(total)'
            },

            solutionCode: {
              python: 'n = int(input())\ntotal = 0\nfor i in range(1, n + 1):\n    total += i\nprint(total)'
            }
          }
        },

        {
          id: 'py-l2c',
          title: 'Break Statement',
          duration: '15 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn how the break statement exits a loop early.</p>',
          language: 'python',
          codeSnippet: 'for i in range(10):\n    if i == 5:\n        break\n    print(i)'
        },

        {
          id: 'pr-py-l2c',
          title: 'Stop at Five',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Print numbers starting from 1 and stop when the number reaches 5.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '8',
                expectedOutput: '1\n2\n3\n4\n5',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '3',
                expectedOutput: '1\n2\n3',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'for i in range(1, 9):\n    # Use break when i reaches 5\n    print(i)'
            },

            solutionCode: {
              python: 'for i in range(1, 9):\n    print(i)\n    if i == 5:\n        break'
            }
          }
        },

        {
          id: 'py-l2d',
          title: 'Continue Statement',
          duration: '15 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn how continue skips the current iteration of a loop.</p>',
          language: 'python',
          codeSnippet: 'for i in range(1, 6):\n    if i == 3:\n        continue\n    print(i)'
        },

        {
          id: 'pr-py-l2d',
          title: 'Skip Even Numbers',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Print odd numbers from 1 to n using continue.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '7',
                expectedOutput: '1\n3\n5\n7',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '5',
                expectedOutput: '1\n3\n5',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'n = int(input())\nfor i in range(1, n + 1):\n    # Skip even numbers\n    print(i)'
            },

            solutionCode: {
              python: 'n = int(input())\nfor i in range(1, n + 1):\n    if i % 2 == 0:\n        continue\n    print(i)'
            }
          }
        },

        {
          id: 'py-l2e',
          title: 'Pass Statement',
          duration: '15 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn the pass statement and when it is useful as a placeholder.</p>',
          language: 'python',
          codeSnippet: 'for i in range(5):\n    if i == 2:\n        pass\n    print(i)'
        },

        {
          id: 'pr-py-l2e',
          title: 'Pass in a Loop',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Use pass for the value 3 and print all numbers from 1 to 5.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '',
                expectedOutput: '1\n2\n3\n4\n5',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '',
                expectedOutput: '1\n2\n3\n4\n5',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'for i in range(1, 6):\n    if i == 3:\n        pass\n    print(i)'
            },

            solutionCode: {
              python: 'for i in range(1, 6):\n    if i == 3:\n        pass\n    print(i)'
            }
          }
        },

        {
          id: 'py-l2f',
          title: 'Function Definition and Calling',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn how to define functions and call them in Python.</p>',
          language: 'python',
          codeSnippet: 'def greet():\n    print("Hello")\n\ngreet()'
        },

        {
          id: 'pr-py-l2f',
          title: 'Call a Function',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Define a function <code>greet()</code> that prints <code>Hello Function</code>.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '',
                expectedOutput: 'Hello Function',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '',
                expectedOutput: 'Hello Function',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'def greet():\n    # Print the required message\n    pass\n\ngreet()'
            },

            solutionCode: {
              python: 'def greet():\n    print("Hello Function")\ngreet()'
            }
          }
        },

        {
          id: 'py-l2g',
          title: 'Parameters and Arguments',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn function parameters, arguments, default arguments, and passing values to functions.</p>',
          language: 'python',
          codeSnippet: 'def greet(name):\n    print("Hello", name)\n\ngreet("Arun")'
        },

        {
          id: 'pr-py-l2g',
          title: 'Function Parameter',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Define a function that receives a name and prints <code>Hello name</code>.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: 'Arun',
                expectedOutput: 'Hello Arun',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: 'Priya',
                expectedOutput: 'Hello Priya',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'def greet(name):\n    # Print greeting\n    pass\n\ngreet(input())'
            },

            solutionCode: {
              python: 'def greet(name):\n    print("Hello " + name)\ngreet(input())'
            }
          }
        },

        {
          id: 'py-l2h',
          title: 'Return Values',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn how functions return values using the return statement.</p>',
          language: 'python',
          codeSnippet: 'def add(a, b):\n    return a + b\n\nprint(add(10, 20))'
        },

        {
          id: 'pr-py-l2h',
          title: 'Return a Value',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Create a function that returns the square of a number.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '6',
                expectedOutput: '36',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '9',
                expectedOutput: '81',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'def square(n):\n    # Return the square\n    pass\n\nprint(square(int(input())))'
            },

            solutionCode: {
              python: 'def square(n):\n    return n * n\nprint(square(int(input())))'
            }
          }
        },

        {
          id: 'py-l2i',
          title: 'Recursion',
          duration: '25 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn recursion, base cases, recursive calls, and recursive problem solving.</p>',
          language: 'python',
          codeSnippet: 'def factorial(n):\n    if n == 0:\n        return 1\n    return n * factorial(n - 1)'
        },

        {
          id: 'pr-py-l2i',
          title: 'Recursive Countdown',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Use recursion to print numbers from n down to 1.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '4',
                expectedOutput: '4\n3\n2\n1',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '3',
                expectedOutput: '3\n2\n1',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'def countdown(n):\n    if n == 0:\n        return\n    # Print n and call recursively\n    pass\n\ncountdown(int(input()))'
            },

            solutionCode: {
              python: 'def countdown(n):\n    if n == 0:\n        return\n    print(n)\n    countdown(n - 1)\ncountdown(int(input()))'
            }
          }
        },

        {
          id: 'py-p2',
          title: 'Largest of Three Numbers',
          duration: '20 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read three numbers and print the largest number.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 10,

            testCases: [
              {
                id: 'tc1',
                input: '10 20 30',
                expectedOutput: '30',
                explanation: '30 is the largest.'
              },
              {
                id: 'tc2',
                input: '50 20 40',
                expectedOutput: '50',
                explanation: '50 is the largest.'
              },
              {
                id: 'tc3',
                input: '-1 -5 -3',
                expectedOutput: '-1',
                explanation: '-1 is the largest.'
              },
              {
                id: 'tc4',
                input: '7 7 5',
                expectedOutput: '7',
                explanation: 'Two values are equal and largest.'
              },
              {
                id: 'tc5',
                input: '100 1 50',
                expectedOutput: '100',
                explanation: '100 is the largest.'
              }
            ],

            starterTemplates: {
              python: 'a, b, c = map(int, input().split())\n# Find the largest'
            },

            solutionCode: {
              python: 'a, b, c = map(int, input().split())\nprint(max(a, b, c))'
            }
          }
        },

        {
          id: 'py-p2b',
          title: 'Factorial Using Recursion',
          duration: '25 min',
          type: 'problem',
          isPro: false,
          content: '<p>Calculate the factorial of a number using recursion.</p>',
          language: 'python',

          problem: {
            difficulty: 'Medium',
            points: 20,

            testCases: [
              {
                id: 'tc1',
                input: '5',
                expectedOutput: '120',
                explanation: '5 factorial is 120.'
              },
              {
                id: 'tc2',
                input: '3',
                expectedOutput: '6',
                explanation: '3 factorial is 6.'
              }
            ],

            starterTemplates: {
              python: 'def factorial(n):\n    # Write recursive solution\n    pass\n\nprint(factorial(int(input())))'
            },

            solutionCode: {
              python: 'def factorial(n):\n    if n == 0:\n        return 1\n    return n * factorial(n - 1)\n\nprint(factorial(int(input())))'
            }
          }
        }
      ]
    },

    // ============================================================
    // UNIT III
    // ============================================================
    {
      id: 'py-mod3',
      title: 'Unit III: Lists, Tuples, Dictionary, File Handling and Data Structures',

      lessons: [

        {
          id: 'py-l3',
          title: 'Data Structures',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn the basic data structures available in Python.</p>',
          language: 'python',
          codeSnippet: 'nums = [1, 2, 3]\nprint(nums)'
        },

        {
          id: 'pr-py-l3',
          title: 'Data Structures Practice',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read three integers into a list and print the list.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '1 2 3',
                expectedOutput: '[1, 2, 3]',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '4 5 6',
                expectedOutput: '[4, 5, 6]',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'nums = list(map(int, input().split()))\nprint(nums)'
            },

            solutionCode: {
              python: 'nums = list(map(int, input().split()))\nprint(nums)'
            }
          }
        },

        {
          id: 'py-l3a',
          title: 'Arrays and Lists',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn arrays and lists in Python, including creation, indexing, and traversal.</p>',
          language: 'python',
          codeSnippet: 'nums = [10, 20, 30, 40]\nprint(nums[0])\nfor n in nums:\n    print(n)'
        },

        {
          id: 'pr-py-l3a',
          title: 'List Maximum',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read numbers into a list and print the maximum value.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '4 8 2 6',
                expectedOutput: '8',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '1 2 9',
                expectedOutput: '9',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'nums = list(map(int, input().split()))\n# Find maximum'
            },

            solutionCode: {
              python: 'nums = list(map(int, input().split()))\nprint(max(nums))'
            }
          }
        },

        {
          id: 'py-l3b',
          title: 'Basic List Operations',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn common list operations including append, remove, pop, sort, and extend. Resources: <a href="https://www.geeksforgeeks.org/python-list-methods/" target="_blank">Python List Methods - GFG</a></p>',
          language: 'python',
          codeSnippet: 'nums = [10, 20, 30]\nnums.append(40)\nprint(nums)'
        },

        {
          id: 'pr-py-l3b',
          title: 'List Sum',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read a list of integers and print their sum.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '1 2 3 4',
                expectedOutput: '10',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '5 5 5',
                expectedOutput: '15',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'nums = list(map(int, input().split()))\n# Calculate sum'
            },

            solutionCode: {
              python: 'nums = list(map(int, input().split()))\nprint(sum(nums))'
            }
          }
        },

        {
          id: 'py-l3c',
          title: 'Insertion and Deletion',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn how to insert and delete elements from Python lists.</p>',
          language: 'python',
          codeSnippet: 'nums = [10, 20, 30]\nnums.insert(1, 15)\nnums.remove(30)\nprint(nums)'
        },

        {
          id: 'pr-py-l3c',
          title: 'Insert Into a List',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read three integers, insert 10 at the beginning, and print the list.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '1 2 3',
                expectedOutput: '[10, 1, 2, 3]',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '7 8',
                expectedOutput: '[10, 7, 8]',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'nums = list(map(int, input().split()))\n# Insert 10 at the beginning'
            },

            solutionCode: {
              python: 'nums = list(map(int, input().split()))\nnums.insert(0, 10)\nprint(nums)'
            }
          }
        },

        {
          id: 'py-l3d',
          title: 'Tuples and Dictionaries',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn tuples and dictionaries, including creation, access, and modification. Resources: <a href="https://www.geeksforgeeks.org/python-dictionary/" target="_blank">Python Dictionary - GFG</a></p>',
          language: 'python',
          codeSnippet: 'student = {\n    "name": "Arun",\n    "mark": 90\n}\nprint(student["name"])'
        },

        {
          id: 'pr-py-l3d',
          title: 'Dictionary Value',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read a name and mark, store them in a dictionary, and print the mark.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: 'Arun 90',
                expectedOutput: '90',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: 'Priya 75',
                expectedOutput: '75',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'name, mark = input().split()\nstudent = {"name": name, "mark": int(mark)}\nprint(student["mark"])'
            },

            solutionCode: {
              python: 'name, mark = input().split()\nstudent = {"name": name, "mark": int(mark)}\nprint(student["mark"])'
            }
          }
        },

        {
          id: 'py-l3e',
          title: 'Stacks and Queues',
          duration: '25 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn stack and queue implementation using Python lists. Resources: <a href="https://www.geeksforgeeks.org/implement-stack-using-queues/" target="_blank">Implement Stack using Queues - GFG</a></p>',
          language: 'python',
          codeSnippet: '# Stack using list\nstack = []\nstack.append(10)\nstack.append(20)\nprint(stack.pop())\n\n# Queue using list\nqueue = []\nqueue.append(10)\nqueue.append(20)\nprint(queue.pop(0))'
        },

        {
          id: 'pr-py-l3e',
          title: 'Stack Pop',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Create a stack, push 10 and 20, then print the popped value.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '',
                expectedOutput: '20',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '',
                expectedOutput: '20',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'stack = []\n# Push values and pop the top value'
            },

            solutionCode: {
              python: 'stack = []\nstack.append(10)\nstack.append(20)\nprint(stack.pop())'
            }
          }
        },

        {
          id: 'py-l3f',
          title: 'Introduction to Trees and Graphs',
          duration: '25 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn the basics of trees, graphs, binary trees, and adjacency lists. Resources: <a href="https://www.geeksforgeeks.org/introduction-to-graph-data-structure-and-algorithms/" target="_blank">Introduction to Graph Data Structure - GFG</a></p>',
          language: 'python',
          codeSnippet: '# Simple graph using adjacency list\ngraph = {\n    0: [1, 2],\n    1: [0, 2],\n    2: [0, 1]\n}\nprint(graph)'
        },

        {
          id: 'pr-py-l3f',
          title: 'Graph Neighbors',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Create the given graph and print the neighbors of node 0.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '',
                expectedOutput: '[1, 2]',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '',
                expectedOutput: '[1, 2]',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'graph = {0: [1, 2], 1: [0], 2: [0]}\nprint(graph[0])'
            },

            solutionCode: {
              python: 'graph = {0: [1, 2], 1: [0], 2: [0]}\nprint(graph[0])'
            }
          }
        },

        {
          id: 'py-l3g',
          title: 'File Handling',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn how to create, write, read, and manage files in Python. Resources: <a href="https://www.geeksforgeeks.org/file-handling-python/" target="_blank">File Handling - GFG</a></p>',
          language: 'python',
          codeSnippet: 'with open("test.txt", "w") as f:\n    f.write("Hello Python")'
        },

        {
          id: 'pr-py-l3g',
          title: 'Write a File',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Create a file named <code>test.txt</code>, write <code>Hello Python</code>, read it, and print the content.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '',
                expectedOutput: 'Hello Python',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '',
                expectedOutput: 'Hello Python',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'with open("test.txt", "w") as f:\n    # Write the required text\n    pass'
            },

            solutionCode: {
              python: 'with open("test.txt", "w") as f:\n    f.write("Hello Python")\nwith open("test.txt", "r") as f:\n    print(f.read())'
            }
          }
        },

        {
          id: 'py-p3',
          title: 'List Operations Problem',
          duration: '25 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read a list of numbers and find the maximum element.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 15,

            testCases: [
              {
                id: 'tc1',
                input: '1 2 3 4 5',
                expectedOutput: '5',
                explanation: '5 is the maximum.'
              },
              {
                id: 'tc2',
                input: '10 5 20 3',
                expectedOutput: '20',
                explanation: '20 is the maximum.'
              },
              {
                id: 'tc3',
                input: '-10 -5 -20',
                expectedOutput: '-5',
                explanation: '-5 is the maximum.'
              },
              {
                id: 'tc4',
                input: '100',
                expectedOutput: '100',
                explanation: 'A single-element list has that element as maximum.'
              },
              {
                id: 'tc5',
                input: '7 7 7 7',
                expectedOutput: '7',
                explanation: 'All elements are equal.'
              }
            ],

            starterTemplates: {
              python: 'nums = list(map(int, input().split()))\n# find max'
            },

            solutionCode: {
              python: 'nums = list(map(int, input().split()))\nprint(max(nums))'
            }
          }
        },

        {
          id: 'py-p3b',
          title: 'Stack Using List',
          duration: '25 min',
          type: 'problem',
          isPro: false,
          content: '<p>Implement basic stack operations using a Python list.</p>',
          language: 'python',

          problem: {
            difficulty: 'Medium',
            points: 20,

            testCases: [
              {
                id: 'tc1',
                input: '3\nPUSH 10\nPUSH 20\nPOP',
                expectedOutput: '20',
                explanation: '20 is the top element.'
              },
              {
                id: 'tc2',
                input: '4\nPUSH 5\nPUSH 15\nPOP\nPOP',
                expectedOutput: '15\n5',
                explanation: 'Elements are removed in LIFO order.'
              }
            ],

            starterTemplates: {
              python: 'n = int(input())\nstack = []\nfor _ in range(n):\n    command = input().split()\n    # Implement stack operations'
            },

            solutionCode: {
              python: 'n = int(input())\nstack = []\nfor _ in range(n):\n    command = input().split()\n    if command[0] == "PUSH":\n        stack.append(int(command[1]))\n    elif command[0] == "POP":\n        print(stack.pop())'
            }
          }
        }
      ]
    },

    // ============================================================
    // UNIT IV
    // ============================================================
    {
      id: 'py-mod4',
      title: 'Unit IV: Python Built-in Functions',

      lessons: [

        {
          id: 'py-l4',
          title: 'Python Built-in Functions',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn useful Python built-in functions for solving programming problems.</p>',
          language: 'python',
          codeSnippet: 'numbers = [10, 20, 30]\nprint(len(numbers))\nprint(max(numbers))\nprint(sum(numbers))'
        },

        {
          id: 'pr-py-l4',
          title: 'Built-in Function Practice',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read two integers and print the larger value using a built-in function.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '10 25',
                expectedOutput: '25',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '30 12',
                expectedOutput: '30',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'a, b = map(int, input().split())\n# Use a built-in function'
            },

            solutionCode: {
              python: 'a, b = map(int, input().split())\nprint(max(a, b))'
            }
          }
        },

        {
          id: 'py-l4a',
          title: 'Input and Output Functions',
          duration: '15 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn input(), print(), and formatting techniques for Python programs.</p>',
          language: 'python',
          codeSnippet: 'name = input()\nprint("Hello", name)'
        },

        {
          id: 'pr-py-l4a',
          title: 'Use Input Function',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read an integer using input() and print it.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '42',
                expectedOutput: '42',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '99',
                expectedOutput: '99',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'value = input()\nprint(value)'
            },

            solutionCode: {
              python: 'value = input()\nprint(value)'
            }
          }
        },

        {
          id: 'py-l4b',
          title: 'Type Conversion Functions',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn int(), float(), str(), bool(), and other type conversion functions.</p>',
          language: 'python',
          codeSnippet: 'value = "25"\nnumber = int(value)\nprint(number + 5)'
        },

        {
          id: 'pr-py-l4b',
          title: 'Convert to Integer',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read two numeric strings and print their integer sum.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '10 20',
                expectedOutput: '30',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '5 7',
                expectedOutput: '12',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'a, b = input().split()\n# Convert the values to integers'
            },

            solutionCode: {
              python: 'a, b = input().split()\nprint(int(a) + int(b))'
            }
          }
        },

        {
          id: 'py-l4c',
          title: 'Mathematical Functions',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn mathematical built-in functions such as abs(), pow(), round(), min(), and max().</p>',
          language: 'python',
          codeSnippet: 'print(abs(-10))\nprint(pow(2, 3))\nprint(round(3.14159, 2))'
        },

        {
          id: 'pr-py-l4c',
          title: 'Use Math Functions',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read a number and print its absolute value.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '-15',
                expectedOutput: '15',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '20',
                expectedOutput: '20',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'value = int(input())\n# Find absolute value'
            },

            solutionCode: {
              python: 'value = int(input())\nprint(abs(value))'
            }
          }
        },

        {
          id: 'py-l4d',
          title: 'Collection Functions',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn built-in functions that work with collections, including len(), sorted(), sum(), min(), and max().</p>',
          language: 'python',
          codeSnippet: 'nums = [5, 2, 8, 1]\nprint(len(nums))\nprint(sorted(nums))'
        },

        {
          id: 'pr-py-l4d',
          title: 'Use Collection Functions',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read numbers and print the number of elements.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '10 20 30 40',
                expectedOutput: '4',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '1 2',
                expectedOutput: '2',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'nums = input().split()\n# Find the number of elements'
            },

            solutionCode: {
              python: 'nums = input().split()\nprint(len(nums))'
            }
          }
        },

        {
          id: 'py-l4e',
          title: 'File Handling Functions',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn functions and methods used to open, read, write, and manage files.</p>',
          language: 'python',
          codeSnippet: 'with open("data.txt", "w") as f:\n    f.write("Python")'
        },

        {
          id: 'pr-py-l4e',
          title: 'Read File Content',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Create a file with <code>Python</code>, read it, and print the content.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '',
                expectedOutput: 'Python',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '',
                expectedOutput: 'Python',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'with open("test.txt", "w") as f:\n    f.write("Python")\n# Read and print the file'
            },

            solutionCode: {
              python: 'with open("test.txt", "w") as f:\n    f.write("Python")\nwith open("test.txt", "r") as f:\n    print(f.read())'
            }
          }
        },

        {
          id: 'py-l4f',
          title: 'Exception Handling',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn try, except, else, finally, and how to handle runtime errors.</p>',
          language: 'python',
          codeSnippet: 'try:\n    value = int(input())\n    print(value)\nexcept ValueError:\n    print("Invalid input")'
        },

        {
          id: 'pr-py-l4f',
          title: 'Handle Division Error',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read two integers and print their division. If the divisor is zero, print <code>Cannot divide</code>.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '10 0',
                expectedOutput: 'Cannot divide',
                explanation: 'The divisor is zero.'
              },
              {
                id: 'tc2',
                input: '20 4',
                expectedOutput: '5.0',
                explanation: 'Normal division is performed.'
              }
            ],

            starterTemplates: {
              python: 'a, b = map(int, input().split())\ntry:\n    # Perform division\n    pass\nexcept ZeroDivisionError:\n    print("Cannot divide")'
            },

            solutionCode: {
              python: 'a, b = map(int, input().split())\ntry:\n    print(a / b)\nexcept ZeroDivisionError:\n    print("Cannot divide")'
            }
          }
        },

        {
          id: 'py-p4',
          title: 'Use Built-ins to Solve',
          duration: '25 min',
          type: 'problem',
          isPro: false,
          content: '<p>Use Python built-in functions to solve a collection-based problem.</p>',
          language: 'python',

          problem: {
            difficulty: 'Medium',
            points: 20,

            testCases: [
              {
                id: 'tc1',
                input: '5 10 20 30 40',
                expectedOutput: '5',
                explanation: 'Find the minimum value.'
              },
              {
                id: 'tc2',
                input: '8 3 6 2',
                expectedOutput: '2',
                explanation: 'Find the minimum value.'
              }
            ],

            starterTemplates: {
              python: 'nums = list(map(int, input().split()))\n# Use built-in functions'
            },

            solutionCode: {
              python: 'nums = list(map(int, input().split()))\nprint(min(nums))'
            }
          }
        }
      ]
    },

    // ============================================================
    // UNIT V
    // ============================================================
    {
      id: 'py-mod5',
      title: 'Unit V: Searching and Sorting',

      lessons: [

        {
          id: 'py-l5',
          title: 'Searching and Sorting',
          duration: '20 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn fundamental searching and sorting algorithms and how they are used to solve programming problems.</p>',
          language: 'python',
          codeSnippet: 'nums = [5, 2, 8, 1]\nnums.sort()\nprint(nums)'
        },

        {
          id: 'pr-py-l5',
          title: 'Searching and Sorting Practice',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read numbers and print them in ascending order.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '3 1 2',
                expectedOutput: '1 2 3',
                explanation: 'Check the basic case.'
              },
              {
                id: 'tc2',
                input: '4 2 1',
                expectedOutput: '1 2 4',
                explanation: 'Check another valid input.'
              }
            ],

            starterTemplates: {
              python: 'nums = list(map(int, input().split()))\n# Sort the numbers\nprint(*nums)'
            },

            solutionCode: {
              python: 'nums = list(map(int, input().split()))\nnums.sort()\nprint(*nums)'
            }
          }
        },

        {
          id: 'py-l5a',
          title: 'Binary Search',
          duration: '25 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn binary search on sorted arrays and understand its O(log n) time complexity.</p>',
          language: 'python',
          codeSnippet: 'nums = [1, 3, 5, 7, 9]\ntarget = 7\nleft, right = 0, len(nums) - 1\nwhile left <= right:\n    mid = (left + right) // 2\n    if nums[mid] == target:\n        print(mid)\n        break'
        },

        {
          id: 'pr-py-l5a',
          title: 'Binary Search Index',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read a sorted list and a target, then print the target index or -1.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '1 3 5 7 9\n7',
                expectedOutput: '3',
                explanation: 'The target 7 is at index 3.'
              },
              {
                id: 'tc2',
                input: '2 4 6 8 10\n6',
                expectedOutput: '2',
                explanation: 'The target 6 is at index 2.'
              }
            ],

            starterTemplates: {
              python: 'nums = list(map(int, input().split()))\ntarget = int(input())\n# Implement binary search'
            },

            solutionCode: {
              python: 'nums = list(map(int, input().split()))\ntarget = int(input())\nleft, right = 0, len(nums) - 1\nwhile left <= right:\n    mid = (left + right) // 2\n    if nums[mid] == target:\n        print(mid)\n        break\n    if nums[mid] < target:\n        left = mid + 1\n    else:\n        right = mid - 1\nelse:\n    print(-1)'
            }
          }
        },

        {
          id: 'py-l5b',
          title: 'Bubble Sort',
          duration: '25 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn bubble sort, adjacent comparisons, swapping, and O(n²) time complexity.</p>',
          language: 'python',
          codeSnippet: 'arr = [5, 2, 4, 1]\nfor i in range(len(arr)):\n    for j in range(0, len(arr) - i - 1):\n        if arr[j] > arr[j + 1]:\n            arr[j], arr[j + 1] = arr[j + 1], arr[j]\nprint(arr)'
        },

        {
          id: 'pr-py-l5b',
          title: 'Bubble Sort',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read numbers and sort them using bubble sort.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '5 2 4 1',
                expectedOutput: '1 2 4 5',
                explanation: 'Sort the numbers in ascending order.'
              },
              {
                id: 'tc2',
                input: '4 3 2 1',
                expectedOutput: '1 2 3 4',
                explanation: 'Sort the numbers in ascending order.'
              }
            ],

            starterTemplates: {
              python: 'arr = list(map(int, input().split()))\n# Implement bubble sort\nprint(*arr)'
            },

            solutionCode: {
              python: 'arr = list(map(int, input().split()))\nfor i in range(len(arr)):\n    for j in range(0, len(arr) - i - 1):\n        if arr[j] > arr[j + 1]:\n            arr[j], arr[j + 1] = arr[j + 1], arr[j]\nprint(*arr)'
            }
          }
        },

        {
          id: 'py-l5c',
          title: 'Selection Sort',
          duration: '25 min',
          type: 'article',
          isPro: false,
          content: '<p>Learn selection sort, finding the minimum element, swapping, and O(n²) time complexity.</p>',
          language: 'python',
          codeSnippet: 'arr = [5, 2, 4, 1]\nfor i in range(len(arr)):\n    min_index = i\n    for j in range(i + 1, len(arr)):\n        if arr[j] < arr[min_index]:\n            min_index = j\n    arr[i], arr[min_index] = arr[min_index], arr[i]\nprint(*arr)'
        },

        {
          id: 'pr-py-l5c',
          title: 'Selection Sort',
          duration: '15 min',
          type: 'problem',
          isPro: false,
          content: '<p>Read numbers and sort them using selection sort.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 5,

            testCases: [
              {
                id: 'tc1',
                input: '5 2 4 1',
                expectedOutput: '1 2 4 5',
                explanation: 'Sort the numbers in ascending order.'
              },
              {
                id: 'tc2',
                input: '9 7 8 6',
                expectedOutput: '6 7 8 9',
                explanation: 'Sort the numbers in ascending order.'
              }
            ],

            starterTemplates: {
              python: 'arr = list(map(int, input().split()))\n# Implement selection sort\nprint(*arr)'
            },

            solutionCode: {
              python: 'arr = list(map(int, input().split()))\nfor i in range(len(arr)):\n    min_index = i\n    for j in range(i + 1, len(arr)):\n        if arr[j] < arr[min_index]:\n            min_index = j\n    arr[i], arr[min_index] = arr[min_index], arr[i]\nprint(*arr)'
            }
          }
        },

        {
          id: 'py-p5',
          title: 'Linear Search Problem',
          duration: '25 min',
          type: 'problem',
          isPro: false,
          content: '<p>Search for a target element in a list using linear search.</p>',
          language: 'python',

          problem: {
            difficulty: 'Easy',
            points: 15,

            testCases: [
              {
                id: 'tc1',
                input: '10 20 30 40\n30',
                expectedOutput: '2',
                explanation: '30 is at index 2.'
              },
              {
                id: 'tc2',
                input: '5 8 2 9\n9',
                expectedOutput: '3',
                explanation: '9 is at index 3.'
              }
            ],

            starterTemplates: {
              python: 'nums = list(map(int, input().split()))\ntarget = int(input())\n# Implement linear search'
            },

            solutionCode: {
              python: 'nums = list(map(int, input().split()))\ntarget = int(input())\nfor i, value in enumerate(nums):\n    if value == target:\n        print(i)\n        break\nelse:\n    print(-1)'
            }
          }
        },

        {
          id: 'py-p5b',
          title: 'Binary Search Problem',
          duration: '25 min',
          type: 'problem',
          isPro: false,
          content: '<p>Search for a target element in a sorted list using binary search.</p>',
          language: 'python',

          problem: {
            difficulty: 'Medium',
            points: 20,

            testCases: [
              {
                id: 'tc1',
                input: '1 3 5 7 9 11\n7',
                expectedOutput: '3',
                explanation: '7 is at index 3.'
              },
              {
                id: 'tc2',
                input: '2 4 6 8 10\n8',
                expectedOutput: '3',
                explanation: '8 is at index 3.'
              }
            ],

            starterTemplates: {
              python: 'nums = list(map(int, input().split()))\ntarget = int(input())\n# Implement binary search'
            },

            solutionCode: {
              python: 'nums = list(map(int, input().split()))\ntarget = int(input())\nleft, right = 0, len(nums) - 1\nwhile left <= right:\n    mid = (left + right) // 2\n    if nums[mid] == target:\n        print(mid)\n        break\n    elif nums[mid] < target:\n        left = mid + 1\n    else:\n        right = mid - 1\nelse:\n    print(-1)'
            }
          }
        },

        {
          id: 'py-p5c',
          title: 'Bubble Sort Problem',
          duration: '25 min',
          type: 'problem',
          isPro: false,
          content: '<p>Sort an array of numbers using bubble sort.</p>',
          language: 'python',

          problem: {
            difficulty: 'Medium',
            points: 20,

            testCases: [
              {
                id: 'tc1',
                input: '5 2 4 1',
                expectedOutput: '1 2 4 5',
                explanation: 'The sorted array is 1 2 4 5.'
              },
              {
                id: 'tc2',
                input: '4 3 2 1',
                expectedOutput: '1 2 3 4',
                explanation: 'The sorted array is 1 2 3 4.'
              }
            ],

            starterTemplates: {
              python: 'arr = list(map(int, input().split()))\n# Implement bubble sort'
            },

            solutionCode: {
              python: 'arr = list(map(int, input().split()))\nfor i in range(len(arr)):\n    for j in range(0, len(arr) - i - 1):\n        if arr[j] > arr[j + 1]:\n            arr[j], arr[j + 1] = arr[j + 1], arr[j]\nprint(*arr)'
            }
          }
        },

        {
          id: 'py-p5d',
          title: 'Selection Sort Problem',
          duration: '25 min',
          type: 'problem',
          isPro: false,
          content: '<p>Sort an array of numbers using selection sort.</p>',
          language: 'python',

          problem: {
            difficulty: 'Medium',
            points: 20,

            testCases: [
              {
                id: 'tc1',
                input: '5 2 4 1',
                expectedOutput: '1 2 4 5',
                explanation: 'The sorted array is 1 2 4 5.'
              },
              {
                id: 'tc2',
                input: '9 7 8 6',
                expectedOutput: '6 7 8 9',
                explanation: 'The sorted array is 6 7 8 9.'
              }
            ],

            starterTemplates: {
              python: 'arr = list(map(int, input().split()))\n# Implement selection sort'
            },

            solutionCode: {
              python: 'arr = list(map(int, input().split()))\nfor i in range(len(arr)):\n    min_index = i\n    for j in range(i + 1, len(arr)):\n        if arr[j] < arr[min_index]:\n            min_index = j\n    arr[i], arr[min_index] = arr[min_index], arr[i]\nprint(*arr)'
            }
          }
        }
      ]
    }
  ],
  practiceProblems: [
    {
      id: 'py-practice-hello-input',
      title: 'Echo a Greeting',
      duration: '15 min',
      type: 'problem',
      isPractice: true,
      topic: 'Input and Output',
      language: 'python',
      content: '<p>Read a name and print <code>Hello, name!</code>.</p>',
      problem: {
        difficulty: 'Easy',
        points: 10,
        testCases: [
          { id: 'tc-hello-1', input: 'Anita', expectedOutput: 'Hello, Anita!' },
          { id: 'tc-hello-2', input: 'Rahul', expectedOutput: 'Hello, Rahul!' }
        ],
        starterTemplates: { python: 'name = input().strip()\n# Print the greeting' },
        solutionCode: { python: 'name = input().strip()\nprint(f"Hello, {name}!")' }
      }
    },
    {
      id: 'py-practice-temperature',
      title: 'Temperature Classifier',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Conditionals',
      language: 'python',
      content: '<p>Read a temperature in Celsius. Print <code>Cold</code> below 20, <code>Warm</code> from 20 through 30, and <code>Hot</code> above 30.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-temp-1', input: '15', expectedOutput: 'Cold' },
          { id: 'tc-temp-2', input: '25', expectedOutput: 'Warm' },
          { id: 'tc-temp-3', input: '35', expectedOutput: 'Hot', isHidden: true }
        ],
        starterTemplates: { python: 'temperature = int(input())\n# Classify the temperature' },
        solutionCode: { python: 'temperature = int(input())\nif temperature < 20:\n    print("Cold")\nelif temperature <= 30:\n    print("Warm")\nelse:\n    print("Hot")' }
      }
    },
    {
      id: 'py-practice-factorial',
      title: 'Factorial with Iteration',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Loops and Iteration',
      language: 'python',
      content: '<p>Read a non-negative integer <code>n</code> and print its factorial using a loop.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-factorial-1', input: '0', expectedOutput: '1' },
          { id: 'tc-factorial-2', input: '5', expectedOutput: '120' },
          { id: 'tc-factorial-3', input: '7', expectedOutput: '5040', isHidden: true }
        ],
        starterTemplates: { python: 'n = int(input())\n# Calculate n! using iteration' },
        solutionCode: { python: 'n = int(input())\nresult = 1\nfor value in range(2, n + 1):\n    result *= value\nprint(result)' }
      }
    },
    {
      id: 'py-practice-fibonacci',
      title: 'Fibonacci Sequence',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Loops and Iteration',
      language: 'python',
      content: '<p>Read <code>n</code> and print the first <code>n</code> Fibonacci numbers, starting with 0, separated by spaces.</p>',
      problem: {
        difficulty: 'Medium',
        points: 20,
        testCases: [
          { id: 'tc-fib-1', input: '1', expectedOutput: '0' },
          { id: 'tc-fib-2', input: '6', expectedOutput: '0 1 1 2 3 5' },
          { id: 'tc-fib-3', input: '8', expectedOutput: '0 1 1 2 3 5 8 13', isHidden: true }
        ],
        starterTemplates: { python: 'n = int(input())\n# Generate and print the first n Fibonacci numbers' },
        solutionCode: { python: 'n = int(input())\na, b = 0, 1\nsequence = []\nfor _ in range(n):\n    sequence.append(str(a))\n    a, b = b, a + b\nprint(" ".join(sequence))' }
      }
    },
    {
      id: 'py-practice-palindrome',
      title: 'Palindrome Checker',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Strings',
      language: 'python',
      content: '<p>Print <code>YES</code> if the input word reads the same forwards and backwards, ignoring letter case; otherwise print <code>NO</code>.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-palindrome-1', input: 'Level', expectedOutput: 'YES' },
          { id: 'tc-palindrome-2', input: 'Python', expectedOutput: 'NO' },
          { id: 'tc-palindrome-3', input: 'Madam', expectedOutput: 'YES', isHidden: true }
        ],
        starterTemplates: { python: 'word = input().strip()\n# Check whether word is a palindrome' },
        solutionCode: { python: 'word = input().strip().lower()\nprint("YES" if word == word[::-1] else "NO")' }
      }
    },
    {
      id: 'py-practice-vowel-count',
      title: 'Count Vowels',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Strings',
      language: 'python',
      content: '<p>Read a line of text and print the number of vowels in it. Count both uppercase and lowercase vowels.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-vowels-1', input: 'Hello World', expectedOutput: '3' },
          { id: 'tc-vowels-2', input: 'PYTHON', expectedOutput: '1' },
          { id: 'tc-vowels-3', input: 'rhythm', expectedOutput: '0', isHidden: true }
        ],
        starterTemplates: { python: 'text = input()\n# Count vowels in text' },
        solutionCode: { python: 'text = input()\nprint(sum(1 for character in text.lower() if character in "aeiou"))' }
      }
    },
    {
      id: 'py-practice-list-stats',
      title: 'List Statistics',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Lists',
      language: 'python',
      content: '<p>Read a space-separated list of integers and print the minimum, maximum, and sum on one line.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-list-stats-1', input: '4 8 1 6', expectedOutput: '1 8 19' },
          { id: 'tc-list-stats-2', input: '-3 0 7 -1', expectedOutput: '-3 7 3' },
          { id: 'tc-list-stats-3', input: '5', expectedOutput: '5 5 5', isHidden: true }
        ],
        starterTemplates: { python: 'numbers = list(map(int, input().split()))\n# Print minimum, maximum, and sum' },
        solutionCode: { python: 'numbers = list(map(int, input().split()))\nprint(min(numbers), max(numbers), sum(numbers))' }
      }
    },
    {
      id: 'py-practice-frequency',
      title: 'Most Frequent Number',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Dictionaries',
      language: 'python',
      content: '<p>Read integers and print the number that occurs most often. If there is a tie, print the smaller number.</p>',
      problem: {
        difficulty: 'Medium',
        points: 25,
        testCases: [
          { id: 'tc-frequency-1', input: '4 2 4 3 2 4', expectedOutput: '4' },
          { id: 'tc-frequency-2', input: '5 1 2 1 2', expectedOutput: '1' },
          { id: 'tc-frequency-3', input: '7 7 8 8 9', expectedOutput: '7', isHidden: true }
        ],
        starterTemplates: { python: 'numbers = list(map(int, input().split()))\n# Count values and print the most frequent one' },
        solutionCode: { python: 'numbers = list(map(int, input().split()))\ncounts = {}\nfor number in numbers:\n    counts[number] = counts.get(number, 0) + 1\nprint(min(counts, key=lambda number: (-counts[number], number)))' }
      }
    },
    {
      id: 'py-practice-function-gcd',
      title: 'Greatest Common Divisor',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Functions',
      language: 'python',
      content: '<p>Write a function that returns the greatest common divisor of two positive integers and print the result.</p>',
      problem: {
        difficulty: 'Medium',
        points: 20,
        testCases: [
          { id: 'tc-gcd-1', input: '48 18', expectedOutput: '6' },
          { id: 'tc-gcd-2', input: '17 5', expectedOutput: '1' },
          { id: 'tc-gcd-3', input: '100 40', expectedOutput: '20', isHidden: true }
        ],
        starterTemplates: { python: 'a, b = map(int, input().split())\n\ndef gcd(first, second):\n    # Return the greatest common divisor\n    pass\n\nprint(gcd(a, b))' },
        solutionCode: { python: 'a, b = map(int, input().split())\n\ndef gcd(first, second):\n    while second:\n        first, second = second, first % second\n    return first\n\nprint(gcd(a, b))' }
      }
    },
    {
      id: 'py-practice-linear-search',
      title: 'First Matching Position',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Searching',
      language: 'python',
      content: '<p>Read a list and a target on the next line. Print the first zero-based index of the target, or <code>-1</code> if it is absent.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-search-1', input: '10 20 30 20\n20', expectedOutput: '1' },
          { id: 'tc-search-2', input: '5 8 2 9\n7', expectedOutput: '-1' },
          { id: 'tc-search-3', input: '4 4 4\n4', expectedOutput: '0', isHidden: true }
        ],
        starterTemplates: { python: 'numbers = list(map(int, input().split()))\ntarget = int(input())\n# Find the first matching index' },
        solutionCode: { python: 'numbers = list(map(int, input().split()))\ntarget = int(input())\nprint(next((index for index, value in enumerate(numbers) if value == target), -1))' }
      }
    },
    {
      id: 'py-practice-binary-search',
      title: 'Binary Search Index',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Searching',
      language: 'python',
      content: '<p>Given a sorted list and a target, use binary search to print the target index or <code>-1</code> when it is absent.</p>',
      problem: {
        difficulty: 'Medium',
        points: 25,
        testCases: [
          { id: 'tc-binary-1', input: '1 3 5 7 9\n7', expectedOutput: '3' },
          { id: 'tc-binary-2', input: '2 4 6 8 10\n1', expectedOutput: '-1' },
          { id: 'tc-binary-3', input: '-5 -2 0 4 9\n-5', expectedOutput: '0', isHidden: true }
        ],
        starterTemplates: { python: 'numbers = list(map(int, input().split()))\ntarget = int(input())\n# Implement binary search' },
        solutionCode: { python: 'numbers = list(map(int, input().split()))\ntarget = int(input())\nleft, right = 0, len(numbers) - 1\nanswer = -1\nwhile left <= right:\n    middle = (left + right) // 2\n    if numbers[middle] == target:\n        answer = middle\n        break\n    if numbers[middle] < target:\n        left = middle + 1\n    else:\n        right = middle - 1\nprint(answer)' }
      }
    },
    {
      id: 'py-practice-insertion-sort',
      title: 'Insertion Sort',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Sorting',
      language: 'python',
      content: '<p>Sort the input list in ascending order using insertion sort and print the result.</p>',
      problem: {
        difficulty: 'Medium',
        points: 25,
        testCases: [
          { id: 'tc-insertion-1', input: '5 2 4 1', expectedOutput: '1 2 4 5' },
          { id: 'tc-insertion-2', input: '3 -1 3 0', expectedOutput: '-1 0 3 3' },
          { id: 'tc-insertion-3', input: '9 7 8 6', expectedOutput: '6 7 8 9', isHidden: true }
        ],
        starterTemplates: { python: 'numbers = list(map(int, input().split()))\n# Implement insertion sort\nprint(*numbers)' },
        solutionCode: { python: 'numbers = list(map(int, input().split()))\nfor index in range(1, len(numbers)):\n    current = numbers[index]\n    position = index - 1\n    while position >= 0 and numbers[position] > current:\n        numbers[position + 1] = numbers[position]\n        position -= 1\n    numbers[position + 1] = current\nprint(*numbers)' }
      }
    },
    {
      id: 'py-practice-recursive-sum',
      title: 'Recursive Sum of Digits',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Recursion',
      language: 'python',
      content: '<p>Use a recursive function to return the sum of the digits of a non-negative integer.</p>',
      problem: {
        difficulty: 'Medium',
        points: 20,
        testCases: [
          { id: 'tc-recursive-sum-1', input: '12345', expectedOutput: '15' },
          { id: 'tc-recursive-sum-2', input: '0', expectedOutput: '0' },
          { id: 'tc-recursive-sum-3', input: '908', expectedOutput: '17', isHidden: true }
        ],
        starterTemplates: { python: 'number = int(input())\n\ndef digit_sum(value):\n    # Return the sum of all digits recursively\n    pass\n\nprint(digit_sum(number))' },
        solutionCode: { python: 'number = int(input())\n\ndef digit_sum(value):\n    if value < 10:\n        return value\n    return value % 10 + digit_sum(value // 10)\n\nprint(digit_sum(number))' }
      }
    },
    {
      id: 'py-practice-safe-division',
      title: 'Safe Division',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Exception Handling',
      language: 'python',
      content: '<p>Read two integers. Print the quotient to two decimal places, or print <code>Cannot divide</code> when the divisor is zero.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-division-1', input: '10 4', expectedOutput: '2.50' },
          { id: 'tc-division-2', input: '7 0', expectedOutput: 'Cannot divide' },
          { id: 'tc-division-3', input: '-9 2', expectedOutput: '-4.50', isHidden: true }
        ],
        starterTemplates: { python: 'numerator, denominator = map(int, input().split())\n# Handle division by zero and format the quotient' },
        solutionCode: { python: 'numerator, denominator = map(int, input().split())\ntry:\n    print(f"{numerator / denominator:.2f}")\nexcept ZeroDivisionError:\n    print("Cannot divide")' }
      }
    },
    {
      id: 'py-practice-stack',
      title: 'Stack Operations',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Stacks and Queues',
      language: 'python',
      content: '<p>Process space-separated commands on a stack. Each command is <code>push X</code> or <code>pop</code>. Print every popped value; print <code>EMPTY</code> for an empty pop.</p>',
      problem: {
        difficulty: 'Medium',
        points: 25,
        testCases: [
          { id: 'tc-stack-1', input: 'push 4\npush 7\npop\npop', expectedOutput: '7\n4' },
          { id: 'tc-stack-2', input: 'pop\npush 9\npop', expectedOutput: 'EMPTY\n9' },
          { id: 'tc-stack-3', input: 'push 1\npush 2\npop\npush 3\npop', expectedOutput: '2\n3', isHidden: true }
        ],
        starterTemplates: { python: 'import sys\ncommands = sys.stdin.read().splitlines()\nstack = []\n# Process each command and print pop results' },
        solutionCode: { python: 'import sys\nstack = []\nresults = []\nfor command in sys.stdin.read().splitlines():\n    parts = command.split()\n    if parts[0] == "push":\n        stack.append(int(parts[1]))\n    elif stack:\n        results.append(str(stack.pop()))\n    else:\n        results.append("EMPTY")\nprint("\\n".join(results))' }
      }
    },
    {
      id: 'py-practice-graph-neighbors',
      title: 'List Graph Neighbors',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Graphs',
      language: 'python',
      content: '<p>Read undirected graph edges followed by a vertex. Print the sorted list of vertices directly connected to the requested vertex.</p>',
      problem: {
        difficulty: 'Medium',
        points: 25,
        testCases: [
          { id: 'tc-graph-1', input: '1-2\n2-3\n1-4\n?\n1', expectedOutput: '2 4' },
          { id: 'tc-graph-2', input: 'A-B\nB-C\nC-D\n?\nC', expectedOutput: 'B D' },
          { id: 'tc-graph-3', input: '1-2\n3-4\n?\n1', expectedOutput: '2', isHidden: true }
        ],
        starterTemplates: { python: 'import sys\nlines = sys.stdin.read().splitlines()\n# Build an adjacency map from edge lines and print the requested neighbors' },
        solutionCode: { python: 'import sys\nlines = sys.stdin.read().splitlines()\nadjacency = {}\nquery = lines[-1]\nfor line in lines[:-1]:\n    if line == "?":\n        continue\n    first, second = line.split("-")\n    adjacency.setdefault(first, set()).add(second)\n    adjacency.setdefault(second, set()).add(first)\nprint(" ".join(sorted(adjacency.get(query, set()))))' }
      }
    },
    {
      id: 'py-practice-more-sum-two',
      title: 'Add Two Numbers',
      duration: '15 min',
      type: 'problem',
      isPractice: true,
      topic: 'Input and Output',
      language: 'python',
      content: '<p>Read two integers and print their sum.</p>',
      problem: {
        difficulty: 'Easy',
        points: 10,
        testCases: [
          { id: 'tc-more-sum-two-1', input: '3 8', expectedOutput: '11' },
          { id: 'tc-more-sum-two-2', input: '-2 5', expectedOutput: '3' },
          { id: 'tc-more-sum-two-3', input: '10 20', expectedOutput: '30', isHidden: true }
        ],
        starterTemplates: { python: 'a, b = map(int, input().split())\n# Print the sum' },
        solutionCode: { python: 'a, b = map(int, input().split())\nprint(a + b)' }
      }
    },
    {
      id: 'py-practice-more-rectangle-area',
      title: 'Rectangle Area',
      duration: '15 min',
      type: 'problem',
      isPractice: true,
      topic: 'Input and Output',
      language: 'python',
      content: '<p>Read the length and width of a rectangle and print its area.</p>',
      problem: {
        difficulty: 'Easy',
        points: 10,
        testCases: [
          { id: 'tc-more-rectangle-area-1', input: '4 6', expectedOutput: '24' },
          { id: 'tc-more-rectangle-area-2', input: '3 5', expectedOutput: '15' },
          { id: 'tc-more-rectangle-area-3', input: '10 2', expectedOutput: '20', isHidden: true }
        ],
        starterTemplates: { python: 'length, width = map(int, input().split())\n# Print the rectangle area' },
        solutionCode: { python: 'length, width = map(int, input().split())\nprint(length * width)' }
      }
    },
    {
      id: 'py-practice-more-celsius',
      title: 'Celsius to Fahrenheit',
      duration: '15 min',
      type: 'problem',
      isPractice: true,
      topic: 'Input and Output',
      language: 'python',
      content: '<p>Convert a Celsius temperature to Fahrenheit and print two decimal places.</p>',
      problem: {
        difficulty: 'Easy',
        points: 10,
        testCases: [
          { id: 'tc-more-celsius-1', input: '0', expectedOutput: '32.00' },
          { id: 'tc-more-celsius-2', input: '100', expectedOutput: '212.00' },
          { id: 'tc-more-celsius-3', input: '-40', expectedOutput: '-40.00', isHidden: true }
        ],
        starterTemplates: { python: 'celsius = float(input())\n# Convert and format Fahrenheit' },
        solutionCode: { python: 'celsius = float(input())\nprint(f"{celsius * 9 / 5 + 32:.2f}")' }
      }
    },
    {
      id: 'py-practice-more-average',
      title: 'Average of Three',
      duration: '15 min',
      type: 'problem',
      isPractice: true,
      topic: 'Input and Output',
      language: 'python',
      content: '<p>Read three numbers and print their average to two decimal places.</p>',
      problem: {
        difficulty: 'Easy',
        points: 10,
        testCases: [
          { id: 'tc-more-average-1', input: '3 6 9', expectedOutput: '6.00' },
          { id: 'tc-more-average-2', input: '1 2 4', expectedOutput: '2.33' },
          { id: 'tc-more-average-3', input: '10 10 11', expectedOutput: '10.33', isHidden: true }
        ],
        starterTemplates: { python: 'values = list(map(float, input().split()))\n# Print the average' },
        solutionCode: { python: 'values = list(map(float, input().split()))\nprint(f"{sum(values) / 3:.2f}")' }
      }
    },
    {
      id: 'py-practice-more-even-odd',
      title: 'Even or Odd',
      duration: '15 min',
      type: 'problem',
      isPractice: true,
      topic: 'Conditionals',
      language: 'python',
      content: '<p>Print <code>Even</code> or <code>Odd</code> for the given integer.</p>',
      problem: {
        difficulty: 'Easy',
        points: 10,
        testCases: [
          { id: 'tc-more-even-odd-1', input: '8', expectedOutput: 'Even' },
          { id: 'tc-more-even-odd-2', input: '-3', expectedOutput: 'Odd' },
          { id: 'tc-more-even-odd-3', input: '0', expectedOutput: 'Even', isHidden: true }
        ],
        starterTemplates: { python: 'number = int(input())\n# Decide whether number is even or odd' },
        solutionCode: { python: 'number = int(input())\nprint("Even" if number % 2 == 0 else "Odd")' }
      }
    },
    {
      id: 'py-practice-more-largest',
      title: 'Largest of Three',
      duration: '15 min',
      type: 'problem',
      isPractice: true,
      topic: 'Conditionals',
      language: 'python',
      content: '<p>Read three integers and print the largest value.</p>',
      problem: {
        difficulty: 'Easy',
        points: 10,
        testCases: [
          { id: 'tc-more-largest-1', input: '3 9 5', expectedOutput: '9' },
          { id: 'tc-more-largest-2', input: '-1 -4 -2', expectedOutput: '-1' },
          { id: 'tc-more-largest-3', input: '7 7 2', expectedOutput: '7', isHidden: true }
        ],
        starterTemplates: { python: 'numbers = list(map(int, input().split()))\n# Print the largest number' },
        solutionCode: { python: 'numbers = list(map(int, input().split()))\nprint(max(numbers))' }
      }
    },
    {
      id: 'py-practice-more-leap-year',
      title: 'Leap Year Check',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Conditionals',
      language: 'python',
      content: '<p>Print <code>Leap</code> when a year is a leap year; otherwise print <code>Not Leap</code>.</p>',
      problem: {
        difficulty: 'Medium',
        points: 15,
        testCases: [
          { id: 'tc-more-leap-year-1', input: '2024', expectedOutput: 'Leap' },
          { id: 'tc-more-leap-year-2', input: '1900', expectedOutput: 'Not Leap' },
          { id: 'tc-more-leap-year-3', input: '2000', expectedOutput: 'Leap', isHidden: true }
        ],
        starterTemplates: { python: 'year = int(input())\n# Check the leap-year rules' },
        solutionCode: { python: 'year = int(input())\nleap = year % 400 == 0 or (year % 4 == 0 and year % 100 != 0)\nprint("Leap" if leap else "Not Leap")' }
      }
    },
    {
      id: 'py-practice-more-sign',
      title: 'Number Sign',
      duration: '15 min',
      type: 'problem',
      isPractice: true,
      topic: 'Conditionals',
      language: 'python',
      content: '<p>Print whether an integer is <code>Positive</code>, <code>Negative</code>, or <code>Zero</code>.</p>',
      problem: {
        difficulty: 'Easy',
        points: 10,
        testCases: [
          { id: 'tc-more-sign-1', input: '-5', expectedOutput: 'Negative' },
          { id: 'tc-more-sign-2', input: '0', expectedOutput: 'Zero' },
          { id: 'tc-more-sign-3', input: '12', expectedOutput: 'Positive', isHidden: true }
        ],
        starterTemplates: { python: 'number = int(input())\n# Classify the sign' },
        solutionCode: { python: 'number = int(input())\nif number > 0:\n    print("Positive")\nelif number < 0:\n    print("Negative")\nelse:\n    print("Zero")' }
      }
    },
    {
      id: 'py-practice-more-sum-range',
      title: 'Sum from One to N',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Loops and Iteration',
      language: 'python',
      content: '<p>Use a loop to print the sum of all integers from 1 through <code>n</code>.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-more-sum-range-1', input: '5', expectedOutput: '15' },
          { id: 'tc-more-sum-range-2', input: '1', expectedOutput: '1' },
          { id: 'tc-more-sum-range-3', input: '10', expectedOutput: '55', isHidden: true }
        ],
        starterTemplates: { python: 'n = int(input())\ntotal = 0\n# Add each value from 1 through n' },
        solutionCode: { python: 'n = int(input())\ntotal = 0\nfor value in range(1, n + 1):\n    total += value\nprint(total)' }
      }
    },
    {
      id: 'py-practice-more-multiples',
      title: 'Print Multiples',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Loops and Iteration',
      language: 'python',
      content: '<p>Read a number and a count, then print that many positive multiples.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-more-multiples-1', input: '4 3', expectedOutput: '4 8 12' },
          { id: 'tc-more-multiples-2', input: '2 5', expectedOutput: '2 4 6 8 10' },
          { id: 'tc-more-multiples-3', input: '7 1', expectedOutput: '7', isHidden: true }
        ],
        starterTemplates: { python: 'number, count = map(int, input().split())\n# Build the multiples' },
        solutionCode: { python: 'number, count = map(int, input().split())\nprint(*[number * value for value in range(1, count + 1)])' }
      }
    },
    {
      id: 'py-practice-more-digit-count',
      title: 'Count Digits',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Loops and Iteration',
      language: 'python',
      content: '<p>Use a loop to count the digits in an integer.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-more-digit-count-1', input: '0', expectedOutput: '1' },
          { id: 'tc-more-digit-count-2', input: '12345', expectedOutput: '5' },
          { id: 'tc-more-digit-count-3', input: '-908', expectedOutput: '3', isHidden: true }
        ],
        starterTemplates: { python: 'number = int(input())\n# Count digits with iteration' },
        solutionCode: { python: 'number = abs(int(input()))\ncount = 1 if number == 0 else 0\nwhile number:\n    count += 1\n    number //= 10\nprint(count)' }
      }
    },
    {
      id: 'py-practice-more-reverse-number',
      title: 'Reverse an Integer',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Loops and Iteration',
      language: 'python',
      content: '<p>Reverse the digits of the given integer and print the result.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-more-reverse-number-1', input: '1234', expectedOutput: '4321' },
          { id: 'tc-more-reverse-number-2', input: '500', expectedOutput: '5' },
          { id: 'tc-more-reverse-number-3', input: '-82', expectedOutput: '-28', isHidden: true }
        ],
        starterTemplates: { python: 'number = int(input())\n# Reverse the digits' },
        solutionCode: { python: 'number = int(input())\nsign = -1 if number < 0 else 1\nprint(sign * int(str(abs(number))[::-1]))' }
      }
    },
    {
      id: 'py-practice-more-reverse-text',
      title: 'Reverse Text',
      duration: '15 min',
      type: 'problem',
      isPractice: true,
      topic: 'Strings',
      language: 'python',
      content: '<p>Read a word and print it backwards.</p>',
      problem: {
        difficulty: 'Easy',
        points: 10,
        testCases: [
          { id: 'tc-more-reverse-text-1', input: 'hello', expectedOutput: 'olleh' },
          { id: 'tc-more-reverse-text-2', input: 'Python', expectedOutput: 'nohtyP' },
          { id: 'tc-more-reverse-text-3', input: 'a', expectedOutput: 'a', isHidden: true }
        ],
        starterTemplates: { python: 'text = input().strip()\n# Print the reversed text' },
        solutionCode: { python: 'text = input().strip()\nprint(text[::-1])' }
      }
    },
    {
      id: 'py-practice-more-word-count',
      title: 'Count Words',
      duration: '15 min',
      type: 'problem',
      isPractice: true,
      topic: 'Strings',
      language: 'python',
      content: '<p>Read a line and print the number of whitespace-separated words.</p>',
      problem: {
        difficulty: 'Easy',
        points: 10,
        testCases: [
          { id: 'tc-more-word-count-1', input: 'one two three', expectedOutput: '3' },
          { id: 'tc-more-word-count-2', input: 'Python is fun', expectedOutput: '3' },
          { id: 'tc-more-word-count-3', input: 'single', expectedOutput: '1', isHidden: true }
        ],
        starterTemplates: { python: 'text = input()\n# Count the words' },
        solutionCode: { python: 'text = input()\nprint(len(text.split()))' }
      }
    },
    {
      id: 'py-practice-more-remove-spaces',
      title: 'Remove Spaces',
      duration: '15 min',
      type: 'problem',
      isPractice: true,
      topic: 'Strings',
      language: 'python',
      content: '<p>Print the input line with all space characters removed.</p>',
      problem: {
        difficulty: 'Easy',
        points: 10,
        testCases: [
          { id: 'tc-more-remove-spaces-1', input: 'a b c', expectedOutput: 'abc' },
          { id: 'tc-more-remove-spaces-2', input: 'hello world', expectedOutput: 'helloworld' },
          { id: 'tc-more-remove-spaces-3', input: ' spaced text ', expectedOutput: 'spacedtext', isHidden: true }
        ],
        starterTemplates: { python: 'text = input()\n# Remove spaces and print the result' },
        solutionCode: { python: 'text = input()\nprint(text.replace(" ", ""))' }
      }
    },
    {
      id: 'py-practice-more-first-unique',
      title: 'First Unique Character',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Strings',
      language: 'python',
      content: '<p>Print the first character that appears exactly once in the word.</p>',
      problem: {
        difficulty: 'Medium',
        points: 20,
        testCases: [
          { id: 'tc-more-first-unique-1', input: 'swiss', expectedOutput: 'w' },
          { id: 'tc-more-first-unique-2', input: 'aabbc', expectedOutput: 'c' },
          { id: 'tc-more-first-unique-3', input: 'level', expectedOutput: 'v', isHidden: true }
        ],
        starterTemplates: { python: 'text = input().strip()\n# Find the first unique character' },
        solutionCode: { python: 'text = input().strip()\nfor character in text:\n    if text.count(character) == 1:\n        print(character)\n        break' }
      }
    },
    {
      id: 'py-practice-more-second-largest',
      title: 'Second Largest Distinct',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Lists',
      language: 'python',
      content: '<p>Print the second largest distinct value in the list.</p>',
      problem: {
        difficulty: 'Medium',
        points: 20,
        testCases: [
          { id: 'tc-more-second-largest-1', input: '4 1 7 3', expectedOutput: '4' },
          { id: 'tc-more-second-largest-2', input: '5 5 2 9', expectedOutput: '5' },
          { id: 'tc-more-second-largest-3', input: '-1 -5 -3 -2', expectedOutput: '-2', isHidden: true }
        ],
        starterTemplates: { python: 'numbers = list(map(int, input().split()))\n# Find the second largest distinct value' },
        solutionCode: { python: 'numbers = list(map(int, input().split()))\nprint(sorted(set(numbers))[-2])' }
      }
    },
    {
      id: 'py-practice-more-rotate-list',
      title: 'Rotate a List Right',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Lists',
      language: 'python',
      content: '<p>Rotate the list to the right by <code>k</code> positions.</p>',
      problem: {
        difficulty: 'Medium',
        points: 20,
        testCases: [
          { id: 'tc-more-rotate-list-1', input: '1 2 3 4\n1', expectedOutput: '4 1 2 3' },
          { id: 'tc-more-rotate-list-2', input: '5 6 7\n2', expectedOutput: '6 7 5' },
          { id: 'tc-more-rotate-list-3', input: '9 8\n4', expectedOutput: '9 8', isHidden: true }
        ],
        starterTemplates: { python: 'numbers = list(map(int, input().split()))\nk = int(input())\n# Rotate and print the list' },
        solutionCode: { python: 'numbers = list(map(int, input().split()))\nk = int(input()) % len(numbers)\nrotated = numbers[-k:] + numbers[:-k] if k else numbers\nprint(*rotated)' }
      }
    },
    {
      id: 'py-practice-more-unique-list',
      title: 'Keep First Occurrences',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Lists',
      language: 'python',
      content: '<p>Remove duplicate values while preserving the original order.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-more-unique-list-1', input: '1 2 1 3 2', expectedOutput: '1 2 3' },
          { id: 'tc-more-unique-list-2', input: '4 4 4', expectedOutput: '4' },
          { id: 'tc-more-unique-list-3', input: '-1 0 -1 2', expectedOutput: '-1 0 2', isHidden: true }
        ],
        starterTemplates: { python: 'numbers = list(map(int, input().split()))\n# Keep each value only once' },
        solutionCode: { python: 'numbers = list(map(int, input().split()))\nseen = set()\nunique = []\nfor number in numbers:\n    if number not in seen:\n        seen.add(number)\n        unique.append(number)\nprint(*unique)' }
      }
    },
    {
      id: 'py-practice-more-dot-product',
      title: 'List Dot Product',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Lists',
      language: 'python',
      content: '<p>Read two equal-length lists and print their dot product.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-more-dot-product-1', input: '1 2 3\n4 5 6', expectedOutput: '32' },
          { id: 'tc-more-dot-product-2', input: '2 0 -1\n3 4 5', expectedOutput: '1' },
          { id: 'tc-more-dot-product-3', input: '7\n6', expectedOutput: '42', isHidden: true }
        ],
        starterTemplates: { python: 'first = list(map(int, input().split()))\nsecond = list(map(int, input().split()))\n# Print the dot product' },
        solutionCode: { python: 'first = list(map(int, input().split()))\nsecond = list(map(int, input().split()))\nprint(sum(a * b for a, b in zip(first, second)))' }
      }
    },
    {
      id: 'py-practice-more-word-frequency',
      title: 'Count a Word',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Dictionaries',
      language: 'python',
      content: '<p>Count how many times the target word occurs in the first input line.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-more-word-frequency-1', input: 'red blue red\nred', expectedOutput: '2' },
          { id: 'tc-more-word-frequency-2', input: 'cat dog\nbird', expectedOutput: '0' },
          { id: 'tc-more-word-frequency-3', input: 'a a b a\na', expectedOutput: '3', isHidden: true }
        ],
        starterTemplates: { python: 'words = input().split()\ntarget = input().strip()\n# Count target with a dictionary' },
        solutionCode: { python: 'words = input().split()\ntarget = input().strip()\ncounts = {}\nfor word in words:\n    counts[word] = counts.get(word, 0) + 1\nprint(counts.get(target, 0))' }
      }
    },
    {
      id: 'py-practice-more-sum-key-values',
      title: 'Sum Key Values',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Dictionaries',
      language: 'python',
      content: '<p>Read space-separated <code>key:value</code> pairs and print the sum of all values.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-more-sum-key-values-1', input: 'a:3 b:5 c:2', expectedOutput: '10' },
          { id: 'tc-more-sum-key-values-2', input: 'x:-2 y:7', expectedOutput: '5' },
          { id: 'tc-more-sum-key-values-3', input: 'only:9', expectedOutput: '9', isHidden: true }
        ],
        starterTemplates: { python: 'pairs = input().split()\n# Parse the key:value pairs' },
        solutionCode: { python: 'pairs = input().split()\nvalues = {}\nfor pair in pairs:\n    key, value = pair.split(":")\n    values[key] = int(value)\nprint(sum(values.values()))' }
      }
    },
    {
      id: 'py-practice-more-grade-counts',
      title: 'Count Grades',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Dictionaries',
      language: 'python',
      content: '<p>Count each grade and print counts alphabetically as <code>grade=count</code>.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-more-grade-counts-1', input: 'A B A C B A', expectedOutput: 'A=3 B=2 C=1' },
          { id: 'tc-more-grade-counts-2', input: 'B B C', expectedOutput: 'B=2 C=1' },
          { id: 'tc-more-grade-counts-3', input: 'D', expectedOutput: 'D=1', isHidden: true }
        ],
        starterTemplates: { python: 'grades = input().split()\n# Count grades in a dictionary' },
        solutionCode: { python: 'grades = input().split()\ncounts = {}\nfor grade in grades:\n    counts[grade] = counts.get(grade, 0) + 1\nprint(" ".join(f"{grade}={counts[grade]}" for grade in sorted(counts)))' }
      }
    },
    {
      id: 'py-practice-more-letter-histogram',
      title: 'Letter Histogram',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Dictionaries',
      language: 'python',
      content: '<p>Count letters in a word and print the entries alphabetically as <code>letter:count</code>.</p>',
      problem: {
        difficulty: 'Medium',
        points: 20,
        testCases: [
          { id: 'tc-more-letter-histogram-1', input: 'banana', expectedOutput: 'a:3 b:1 n:2' },
          { id: 'tc-more-letter-histogram-2', input: 'book', expectedOutput: 'b:1 k:1 o:2' },
          { id: 'tc-more-letter-histogram-3', input: 'z', expectedOutput: 'z:1', isHidden: true }
        ],
        starterTemplates: { python: 'word = input().strip()\n# Build a letter-count dictionary' },
        solutionCode: { python: 'word = input().strip()\ncounts = {}\nfor letter in word:\n    counts[letter] = counts.get(letter, 0) + 1\nprint(" ".join(f"{letter}:{counts[letter]}" for letter in sorted(counts)))' }
      }
    },
    {
      id: 'py-practice-more-power-function',
      title: 'Power Function',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Functions',
      language: 'python',
      content: '<p>Define a function that returns the first number raised to the second number.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-more-power-function-1', input: '2 5', expectedOutput: '32' },
          { id: 'tc-more-power-function-2', input: '7 0', expectedOutput: '1' },
          { id: 'tc-more-power-function-3', input: '3 4', expectedOutput: '81', isHidden: true }
        ],
        starterTemplates: { python: 'base, exponent = map(int, input().split())\n\ndef power(number, count):\n    # Return number raised to count\n    pass\n\nprint(power(base, exponent))' },
        solutionCode: { python: 'base, exponent = map(int, input().split())\n\ndef power(number, count):\n    result = 1\n    for _ in range(count):\n        result *= number\n    return result\n\nprint(power(base, exponent))' }
      }
    },
    {
      id: 'py-practice-more-prime-function',
      title: 'Prime Predicate',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Functions',
      language: 'python',
      content: '<p>Define a function that prints whether an integer is prime.</p>',
      problem: {
        difficulty: 'Medium',
        points: 20,
        testCases: [
          { id: 'tc-more-prime-function-1', input: '2', expectedOutput: 'Prime' },
          { id: 'tc-more-prime-function-2', input: '15', expectedOutput: 'Not Prime' },
          { id: 'tc-more-prime-function-3', input: '1', expectedOutput: 'Not Prime', isHidden: true }
        ],
        starterTemplates: { python: 'number = int(input())\n\ndef is_prime(value):\n    # Return True when value is prime\n    pass\n\nprint("Prime" if is_prime(number) else "Not Prime")' },
        solutionCode: { python: 'number = int(input())\n\ndef is_prime(value):\n    if value < 2:\n        return False\n    for divisor in range(2, int(value ** 0.5) + 1):\n        if value % divisor == 0:\n            return False\n    return True\n\nprint("Prime" if is_prime(number) else "Not Prime")' }
      }
    },
    {
      id: 'py-practice-more-lcm-function',
      title: 'Least Common Multiple',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Functions',
      language: 'python',
      content: '<p>Use helper functions to print the least common multiple of two positive integers.</p>',
      problem: {
        difficulty: 'Medium',
        points: 20,
        testCases: [
          { id: 'tc-more-lcm-function-1', input: '4 6', expectedOutput: '12' },
          { id: 'tc-more-lcm-function-2', input: '5 7', expectedOutput: '35' },
          { id: 'tc-more-lcm-function-3', input: '12 8', expectedOutput: '24', isHidden: true }
        ],
        starterTemplates: { python: 'a, b = map(int, input().split())\n\ndef lcm(first, second):\n    # Return the least common multiple\n    pass\n\nprint(lcm(a, b))' },
        solutionCode: { python: 'a, b = map(int, input().split())\n\ndef gcd(first, second):\n    while second:\n        first, second = second, first % second\n    return first\n\ndef lcm(first, second):\n    return first * second // gcd(first, second)\n\nprint(lcm(a, b))' }
      }
    },
    {
      id: 'py-practice-more-positive-count',
      title: 'Count Positive Values',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Functions',
      language: 'python',
      content: '<p>Define a function that counts positive values in a list.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-more-positive-count-1', input: '-2 0 4 5', expectedOutput: '2' },
          { id: 'tc-more-positive-count-2', input: '-1 -3', expectedOutput: '0' },
          { id: 'tc-more-positive-count-3', input: '7 8 9', expectedOutput: '3', isHidden: true }
        ],
        starterTemplates: { python: 'numbers = list(map(int, input().split()))\n\ndef count_positive(values):\n    # Count values greater than zero\n    pass\n\nprint(count_positive(numbers))' },
        solutionCode: { python: 'numbers = list(map(int, input().split()))\n\ndef count_positive(values):\n    return sum(value > 0 for value in values)\n\nprint(count_positive(numbers))' }
      }
    },
    {
      id: 'py-practice-more-count-search',
      title: 'Count Target Occurrences',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Searching',
      language: 'python',
      content: '<p>Print how many times the target occurs in the list.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-more-count-search-1', input: '1 2 2 3\n2', expectedOutput: '2' },
          { id: 'tc-more-count-search-2', input: '4 5 6\n1', expectedOutput: '0' },
          { id: 'tc-more-count-search-3', input: '7 7 7\n7', expectedOutput: '3', isHidden: true }
        ],
        starterTemplates: { python: 'numbers = list(map(int, input().split()))\ntarget = int(input())\n# Count target occurrences' },
        solutionCode: { python: 'numbers = list(map(int, input().split()))\ntarget = int(input())\nprint(numbers.count(target))' }
      }
    },
    {
      id: 'py-practice-more-last-search',
      title: 'Last Matching Position',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Searching',
      language: 'python',
      content: '<p>Print the last zero-based index of the target, or <code>-1</code> if absent.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-more-last-search-1', input: '4 2 4 2\n2', expectedOutput: '3' },
          { id: 'tc-more-last-search-2', input: '5 6 7\n1', expectedOutput: '-1' },
          { id: 'tc-more-last-search-3', input: '9 9 8\n9', expectedOutput: '1', isHidden: true }
        ],
        starterTemplates: { python: 'numbers = list(map(int, input().split()))\ntarget = int(input())\n# Find the last matching index' },
        solutionCode: { python: 'numbers = list(map(int, input().split()))\ntarget = int(input())\nanswer = -1\nfor index, value in enumerate(numbers):\n    if value == target:\n        answer = index\nprint(answer)' }
      }
    },
    {
      id: 'py-practice-more-lower-bound',
      title: 'Lower Bound Search',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Searching',
      language: 'python',
      content: '<p>In a sorted list, print the first index whose value is at least the target, or <code>-1</code>.</p>',
      problem: {
        difficulty: 'Medium',
        points: 20,
        testCases: [
          { id: 'tc-more-lower-bound-1', input: '1 3 5 7\n4', expectedOutput: '2' },
          { id: 'tc-more-lower-bound-2', input: '2 4 6\n8', expectedOutput: '-1' },
          { id: 'tc-more-lower-bound-3', input: '-3 -1 2\n-3', expectedOutput: '0', isHidden: true }
        ],
        starterTemplates: { python: 'numbers = list(map(int, input().split()))\ntarget = int(input())\n# Implement lower-bound search' },
        solutionCode: { python: 'numbers = list(map(int, input().split()))\ntarget = int(input())\nleft, right = 0, len(numbers)\nwhile left < right:\n    middle = (left + right) // 2\n    if numbers[middle] < target:\n        left = middle + 1\n    else:\n        right = middle\nprint(left if left < len(numbers) else -1)' }
      }
    },
    {
      id: 'py-practice-more-pair-search',
      title: 'Pair Sum Exists',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Searching',
      language: 'python',
      content: '<p>Print <code>YES</code> if two different values in the list add to the target.</p>',
      problem: {
        difficulty: 'Medium',
        points: 20,
        testCases: [
          { id: 'tc-more-pair-search-1', input: '2 7 11 15\n9', expectedOutput: 'YES' },
          { id: 'tc-more-pair-search-2', input: '1 2 4\n8', expectedOutput: 'NO' },
          { id: 'tc-more-pair-search-3', input: '3 3\n6', expectedOutput: 'YES', isHidden: true }
        ],
        starterTemplates: { python: 'numbers = list(map(int, input().split()))\ntarget = int(input())\n# Search for a pair with the target sum' },
        solutionCode: { python: 'numbers = list(map(int, input().split()))\ntarget = int(input())\nseen = set()\nfound = False\nfor number in numbers:\n    if target - number in seen:\n        found = True\n        break\n    seen.add(number)\nprint("YES" if found else "NO")' }
      }
    },
    {
      id: 'py-practice-more-bubble-sort',
      title: 'Bubble Sort',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Sorting',
      language: 'python',
      content: '<p>Sort the numbers in ascending order using bubble sort.</p>',
      problem: {
        difficulty: 'Medium',
        points: 20,
        testCases: [
          { id: 'tc-more-bubble-sort-1', input: '5 1 4 2', expectedOutput: '1 2 4 5' },
          { id: 'tc-more-bubble-sort-2', input: '3 -1 0', expectedOutput: '-1 0 3' },
          { id: 'tc-more-bubble-sort-3', input: '8 8 2', expectedOutput: '2 8 8', isHidden: true }
        ],
        starterTemplates: { python: 'numbers = list(map(int, input().split()))\n# Implement bubble sort\nprint(*numbers)' },
        solutionCode: { python: 'numbers = list(map(int, input().split()))\nfor end in range(len(numbers) - 1, 0, -1):\n    for index in range(end):\n        if numbers[index] > numbers[index + 1]:\n            numbers[index], numbers[index + 1] = numbers[index + 1], numbers[index]\nprint(*numbers)' }
      }
    },
    {
      id: 'py-practice-more-absolute-sort',
      title: 'Sort by Absolute Value',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Sorting',
      language: 'python',
      content: '<p>Sort integers by their absolute value in ascending order.</p>',
      problem: {
        difficulty: 'Medium',
        points: 20,
        testCases: [
          { id: 'tc-more-absolute-sort-1', input: '-5 2 -1 4', expectedOutput: '-1 2 4 -5' },
          { id: 'tc-more-absolute-sort-2', input: '3 -3 1', expectedOutput: '1 3 -3' },
          { id: 'tc-more-absolute-sort-3', input: '-10 0 2', expectedOutput: '0 2 -10', isHidden: true }
        ],
        starterTemplates: { python: 'numbers = list(map(int, input().split()))\n# Sort by absolute value' },
        solutionCode: { python: 'numbers = list(map(int, input().split()))\nnumbers.sort(key=abs)\nprint(*numbers)' }
      }
    },
    {
      id: 'py-practice-more-word-sort',
      title: 'Alphabetical Word Sort',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Sorting',
      language: 'python',
      content: '<p>Print the input words in alphabetical order.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-more-word-sort-1', input: 'pear apple orange', expectedOutput: 'apple orange pear' },
          { id: 'tc-more-word-sort-2', input: 'zebra ant yak', expectedOutput: 'ant yak zebra' },
          { id: 'tc-more-word-sort-3', input: 'same same', expectedOutput: 'same same', isHidden: true }
        ],
        starterTemplates: { python: 'words = input().split()\n# Sort and print the words' },
        solutionCode: { python: 'words = input().split()\nprint(*sorted(words))' }
      }
    },
    {
      id: 'py-practice-more-unique-sort',
      title: 'Sorted Unique Values',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Sorting',
      language: 'python',
      content: '<p>Print the distinct input values in ascending order.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-more-unique-sort-1', input: '4 1 4 2 1', expectedOutput: '1 2 4' },
          { id: 'tc-more-unique-sort-2', input: '3 3 3', expectedOutput: '3' },
          { id: 'tc-more-unique-sort-3', input: '-2 0 -2 1', expectedOutput: '-2 0 1', isHidden: true }
        ],
        starterTemplates: { python: 'numbers = list(map(int, input().split()))\n# Print sorted distinct values' },
        solutionCode: { python: 'numbers = list(map(int, input().split()))\nprint(*sorted(set(numbers)))' }
      }
    },
    {
      id: 'py-practice-more-recursive-factorial',
      title: 'Recursive Factorial',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Recursion',
      language: 'python',
      content: '<p>Use recursion to calculate the factorial of a non-negative integer.</p>',
      problem: {
        difficulty: 'Medium',
        points: 20,
        testCases: [
          { id: 'tc-more-recursive-factorial-1', input: '0', expectedOutput: '1' },
          { id: 'tc-more-recursive-factorial-2', input: '5', expectedOutput: '120' },
          { id: 'tc-more-recursive-factorial-3', input: '6', expectedOutput: '720', isHidden: true }
        ],
        starterTemplates: { python: 'n = int(input())\n\ndef factorial(value):\n    # Return the factorial recursively\n    pass\n\nprint(factorial(n))' },
        solutionCode: { python: 'n = int(input())\n\ndef factorial(value):\n    if value <= 1:\n        return 1\n    return value * factorial(value - 1)\n\nprint(factorial(n))' }
      }
    },
    {
      id: 'py-practice-more-recursive-fibonacci',
      title: 'Recursive Fibonacci',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Recursion',
      language: 'python',
      content: '<p>Use recursion to print the Fibonacci number at zero-based index <code>n</code>.</p>',
      problem: {
        difficulty: 'Medium',
        points: 20,
        testCases: [
          { id: 'tc-more-recursive-fibonacci-1', input: '0', expectedOutput: '0' },
          { id: 'tc-more-recursive-fibonacci-2', input: '6', expectedOutput: '8' },
          { id: 'tc-more-recursive-fibonacci-3', input: '8', expectedOutput: '21', isHidden: true }
        ],
        starterTemplates: { python: 'n = int(input())\n\ndef fibonacci(index):\n    # Return the Fibonacci value recursively\n    pass\n\nprint(fibonacci(n))' },
        solutionCode: { python: 'n = int(input())\n\ndef fibonacci(index):\n    if index < 2:\n        return index\n    return fibonacci(index - 1) + fibonacci(index - 2)\n\nprint(fibonacci(n))' }
      }
    },
    {
      id: 'py-practice-more-recursive-reverse',
      title: 'Recursive String Reverse',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Recursion',
      language: 'python',
      content: '<p>Reverse a word using a recursive function.</p>',
      problem: {
        difficulty: 'Medium',
        points: 20,
        testCases: [
          { id: 'tc-more-recursive-reverse-1', input: 'code', expectedOutput: 'edoc' },
          { id: 'tc-more-recursive-reverse-2', input: 'a', expectedOutput: 'a' },
          { id: 'tc-more-recursive-reverse-3', input: 'recursion', expectedOutput: 'noisrucer', isHidden: true }
        ],
        starterTemplates: { python: 'text = input().strip()\n\ndef reverse(value):\n    # Reverse value recursively\n    pass\n\nprint(reverse(text))' },
        solutionCode: { python: 'text = input().strip()\n\ndef reverse(value):\n    if len(value) <= 1:\n        return value\n    return reverse(value[1:]) + value[0]\n\nprint(reverse(text))' }
      }
    },
    {
      id: 'py-practice-more-recursive-gcd',
      title: 'Recursive GCD',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Recursion',
      language: 'python',
      content: '<p>Use the recursive Euclidean algorithm to find the greatest common divisor.</p>',
      problem: {
        difficulty: 'Medium',
        points: 20,
        testCases: [
          { id: 'tc-more-recursive-gcd-1', input: '48 18', expectedOutput: '6' },
          { id: 'tc-more-recursive-gcd-2', input: '17 5', expectedOutput: '1' },
          { id: 'tc-more-recursive-gcd-3', input: '81 27', expectedOutput: '27', isHidden: true }
        ],
        starterTemplates: { python: 'a, b = map(int, input().split())\n\ndef gcd(first, second):\n    # Return the GCD recursively\n    pass\n\nprint(gcd(a, b))' },
        solutionCode: { python: 'a, b = map(int, input().split())\n\ndef gcd(first, second):\n    return first if second == 0 else gcd(second, first % second)\n\nprint(gcd(a, b))' }
      }
    },
    {
      id: 'py-practice-more-parse-integer',
      title: 'Parse an Integer',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Exception Handling',
      language: 'python',
      content: '<p>Print the integer when conversion succeeds; otherwise print <code>Invalid</code>.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-more-parse-integer-1', input: '42', expectedOutput: '42' },
          { id: 'tc-more-parse-integer-2', input: '-7', expectedOutput: '-7' },
          { id: 'tc-more-parse-integer-3', input: 'abc', expectedOutput: 'Invalid', isHidden: true }
        ],
        starterTemplates: { python: 'text = input().strip()\n# Convert text safely' },
        solutionCode: { python: 'text = input().strip()\ntry:\n    print(int(text))\nexcept ValueError:\n    print("Invalid")' }
      }
    },
    {
      id: 'py-practice-more-safe-index',
      title: 'Safe List Index',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Exception Handling',
      language: 'python',
      content: '<p>Print the value at the requested index, or <code>Invalid</code> when the index is unusable.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-more-safe-index-1', input: '10 20 30\n1', expectedOutput: '20' },
          { id: 'tc-more-safe-index-2', input: '5 6\n4', expectedOutput: 'Invalid' },
          { id: 'tc-more-safe-index-3', input: '8 9\nx', expectedOutput: 'Invalid', isHidden: true }
        ],
        starterTemplates: { python: 'numbers = list(map(int, input().split()))\nindex_text = input().strip()\n# Read the index with exception handling' },
        solutionCode: { python: 'numbers = list(map(int, input().split()))\nindex_text = input().strip()\ntry:\n    print(numbers[int(index_text)])\nexcept (ValueError, IndexError):\n    print("Invalid")' }
      }
    },
    {
      id: 'py-practice-more-positive-input',
      title: 'Validate Positive Input',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Exception Handling',
      language: 'python',
      content: '<p>Print a positive integer, or <code>Invalid</code> for bad or non-positive input.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-more-positive-input-1', input: '8', expectedOutput: '8' },
          { id: 'tc-more-positive-input-2', input: '0', expectedOutput: 'Invalid' },
          { id: 'tc-more-positive-input-3', input: 'nine', expectedOutput: 'Invalid', isHidden: true }
        ],
        starterTemplates: { python: 'text = input().strip()\n# Parse and validate a positive integer' },
        solutionCode: { python: 'text = input().strip()\ntry:\n    value = int(text)\n    print(value if value > 0 else "Invalid")\nexcept ValueError:\n    print("Invalid")' }
      }
    },
    {
      id: 'py-practice-more-safe-quotient',
      title: 'Safe Quotient',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Exception Handling',
      language: 'python',
      content: '<p>Print a quotient to two decimals, or <code>Invalid</code> for bad input or division by zero.</p>',
      problem: {
        difficulty: 'Medium',
        points: 20,
        testCases: [
          { id: 'tc-more-safe-quotient-1', input: '8 2', expectedOutput: '4.00' },
          { id: 'tc-more-safe-quotient-2', input: '5 0', expectedOutput: 'Invalid' },
          { id: 'tc-more-safe-quotient-3', input: 'x 3', expectedOutput: 'Invalid', isHidden: true }
        ],
        starterTemplates: { python: 'parts = input().split()\n# Parse and divide safely' },
        solutionCode: { python: 'parts = input().split()\ntry:\n    first, second = map(float, parts)\n    print(f"{first / second:.2f}")\nexcept (ValueError, ZeroDivisionError):\n    print("Invalid")' }
      }
    },
    {
      id: 'py-practice-more-queue-commands',
      title: 'Queue Operations',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Stacks and Queues',
      language: 'python',
      content: '<p>Process <code>enqueue X</code> and <code>dequeue</code> commands, printing dequeued values or <code>EMPTY</code>.</p>',
      problem: {
        difficulty: 'Medium',
        points: 25,
        testCases: [
          { id: 'tc-more-queue-commands-1', input: 'enqueue 4\nenqueue 7\ndequeue\ndequeue', expectedOutput: '4\n7' },
          { id: 'tc-more-queue-commands-2', input: 'dequeue\nenqueue 9\ndequeue', expectedOutput: 'EMPTY\n9' },
          { id: 'tc-more-queue-commands-3', input: 'enqueue 1\nenqueue 2\ndequeue\nenqueue 3\ndequeue', expectedOutput: '1\n2', isHidden: true }
        ],
        starterTemplates: { python: 'import sys\nqueue = []\n# Process queue commands from standard input' },
        solutionCode: { python: 'import sys\nqueue = []\nresults = []\nfor command in sys.stdin.read().splitlines():\n    parts = command.split()\n    if parts[0] == "enqueue":\n        queue.append(int(parts[1]))\n    elif queue:\n        results.append(str(queue.pop(0)))\n    else:\n        results.append("EMPTY")\nprint("\\n".join(results))' }
      }
    },
    {
      id: 'py-practice-more-brackets',
      title: 'Balanced Brackets',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Stacks and Queues',
      language: 'python',
      content: '<p>Use a stack to print <code>Balanced</code> when brackets are correctly nested.</p>',
      problem: {
        difficulty: 'Medium',
        points: 25,
        testCases: [
          { id: 'tc-more-brackets-1', input: '([]{})', expectedOutput: 'Balanced' },
          { id: 'tc-more-brackets-2', input: '([)]', expectedOutput: 'Unbalanced' },
          { id: 'tc-more-brackets-3', input: '((()))', expectedOutput: 'Balanced', isHidden: true }
        ],
        starterTemplates: { python: 'text = input().strip()\n# Check bracket nesting with a stack' },
        solutionCode: { python: 'text = input().strip()\nstack = []\npairs = {")": "(", "]": "[", "}": "{"}\nfor character in text:\n    if character in "([{":\n        stack.append(character)\n    elif character in pairs and (not stack or stack.pop() != pairs[character]):\n        print("Unbalanced")\n        break\nelse:\n    print("Balanced" if not stack else "Unbalanced")' }
      }
    },
    {
      id: 'py-practice-more-stack-peek',
      title: 'Stack Peek Commands',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Stacks and Queues',
      language: 'python',
      content: '<p>Process <code>push X</code> and <code>peek</code> commands, printing the top value or <code>EMPTY</code>.</p>',
      problem: {
        difficulty: 'Medium',
        points: 25,
        testCases: [
          { id: 'tc-more-stack-peek-1', input: 'push 4\npush 7\npeek\npeek', expectedOutput: '7\n7' },
          { id: 'tc-more-stack-peek-2', input: 'peek\npush 9\npeek', expectedOutput: 'EMPTY\n9' },
          { id: 'tc-more-stack-peek-3', input: 'push 1\npush 2\npeek', expectedOutput: '2', isHidden: true }
        ],
        starterTemplates: { python: 'import sys\nstack = []\n# Process push and peek commands' },
        solutionCode: { python: 'import sys\nstack = []\nresults = []\nfor command in sys.stdin.read().splitlines():\n    parts = command.split()\n    if parts[0] == "push":\n        stack.append(int(parts[1]))\n    else:\n        results.append(str(stack[-1]) if stack else "EMPTY")\nprint("\\n".join(results))' }
      }
    },
    {
      id: 'py-practice-more-stack-reverse',
      title: 'Reverse with a Stack',
      duration: '20 min',
      type: 'problem',
      isPractice: true,
      topic: 'Stacks and Queues',
      language: 'python',
      content: '<p>Use a stack to reverse the characters in a word.</p>',
      problem: {
        difficulty: 'Easy',
        points: 15,
        testCases: [
          { id: 'tc-more-stack-reverse-1', input: 'hello', expectedOutput: 'olleh' },
          { id: 'tc-more-stack-reverse-2', input: 'stack', expectedOutput: 'kcats' },
          { id: 'tc-more-stack-reverse-3', input: 'a', expectedOutput: 'a', isHidden: true }
        ],
        starterTemplates: { python: 'text = input().strip()\nstack = []\n# Push characters, then pop them to reverse the word' },
        solutionCode: { python: 'text = input().strip()\nstack = list(text)\nresult = []\nwhile stack:\n    result.append(stack.pop())\nprint("".join(result))' }
      }
    },
    {
      id: 'py-practice-more-graph-degree',
      title: 'Graph Vertex Degree',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Graphs',
      language: 'python',
      content: '<p>Read undirected edges, then print the degree of the requested vertex after the <code>?</code> line.</p>',
      problem: {
        difficulty: 'Easy',
        points: 20,
        testCases: [
          { id: 'tc-more-graph-degree-1', input: 'A-B\nA-C\nB-D\n?\nA', expectedOutput: '2' },
          { id: 'tc-more-graph-degree-2', input: '1-2\n2-3\n?\n2', expectedOutput: '2' },
          { id: 'tc-more-graph-degree-3', input: 'x-y\n?\nx', expectedOutput: '1', isHidden: true }
        ],
        starterTemplates: { python: 'import sys\nlines = sys.stdin.read().splitlines()\n# Build the undirected graph and count neighbors' },
        solutionCode: { python: 'import sys\nlines = sys.stdin.read().splitlines()\nquery = lines[-1]\nadjacency = {}\nfor line in lines[:-1]:\n    if line == "?":\n        continue\n    first, second = line.split("-")\n    adjacency.setdefault(first, set()).add(second)\n    adjacency.setdefault(second, set()).add(first)\nprint(len(adjacency.get(query, set())))' }
      }
    },
    {
      id: 'py-practice-more-graph-bfs',
      title: 'Breadth First Traversal',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Graphs',
      language: 'python',
      content: '<p>Perform a breadth-first traversal from the vertex after the <code>?</code> line.</p>',
      problem: {
        difficulty: 'Medium',
        points: 25,
        testCases: [
          { id: 'tc-more-graph-bfs-1', input: 'A-B\nA-C\nB-D\n?\nA', expectedOutput: 'A B C D' },
          { id: 'tc-more-graph-bfs-2', input: '1-2\n2-3\n3-4\n?\n2', expectedOutput: '2 1 3 4' },
          { id: 'tc-more-graph-bfs-3', input: 'x-y\nx-z\n?\nx', expectedOutput: 'x y z', isHidden: true }
        ],
        starterTemplates: { python: 'import sys\nlines = sys.stdin.read().splitlines()\n# Build adjacency and traverse with a queue' },
        solutionCode: { python: 'import sys\nfrom collections import deque\nlines = sys.stdin.read().splitlines()\nsource = lines[-1]\nadjacency = {}\nfor line in lines[:-1]:\n    if line == "?":\n        continue\n    first, second = line.split("-")\n    adjacency.setdefault(first, set()).add(second)\n    adjacency.setdefault(second, set()).add(first)\nqueue = deque([source])\nseen = {source}\norder = []\nwhile queue:\n    vertex = queue.popleft()\n    order.append(vertex)\n    for neighbor in sorted(adjacency.get(vertex, set())):\n        if neighbor not in seen:\n            seen.add(neighbor)\n            queue.append(neighbor)\nprint(" ".join(order))' }
      }
    },
    {
      id: 'py-practice-more-graph-path',
      title: 'Graph Path Check',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Graphs',
      language: 'python',
      content: '<p>Print <code>YES</code> when a path connects the two requested vertices.</p>',
      problem: {
        difficulty: 'Medium',
        points: 25,
        testCases: [
          { id: 'tc-more-graph-path-1', input: 'A-B\nB-C\n?\nA C', expectedOutput: 'YES' },
          { id: 'tc-more-graph-path-2', input: '1-2\n3-4\n?\n1 4', expectedOutput: 'NO' },
          { id: 'tc-more-graph-path-3', input: 'x-y\n?\nx y', expectedOutput: 'YES', isHidden: true }
        ],
        starterTemplates: { python: 'import sys\nlines = sys.stdin.read().splitlines()\n# Search the graph for a path between the requested vertices' },
        solutionCode: { python: 'import sys\nlines = sys.stdin.read().splitlines()\nsource, target = lines[-1].split()\nadjacency = {}\nfor line in lines[:-1]:\n    if line == "?":\n        continue\n    first, second = line.split("-")\n    adjacency.setdefault(first, set()).add(second)\n    adjacency.setdefault(second, set()).add(first)\nstack = [source]\nseen = {source}\nwhile stack:\n    vertex = stack.pop()\n    for neighbor in adjacency.get(vertex, set()):\n        if neighbor not in seen:\n            seen.add(neighbor)\n            stack.append(neighbor)\nprint("YES" if target in seen else "NO")' }
      }
    },
    {
      id: 'py-practice-more-graph-components',
      title: 'Count Graph Components',
      duration: '25 min',
      type: 'problem',
      isPractice: true,
      topic: 'Graphs',
      language: 'python',
      content: '<p>Read undirected edges followed by <code>?</code> and print the number of connected components.</p>',
      problem: {
        difficulty: 'Medium',
        points: 25,
        testCases: [
          { id: 'tc-more-graph-components-1', input: 'A-B\nB-C\nD-E\n?\n', expectedOutput: '2' },
          { id: 'tc-more-graph-components-2', input: '1-2\n3-4\n5-6\n?\n', expectedOutput: '3' },
          { id: 'tc-more-graph-components-3', input: 'x-y\n?\n', expectedOutput: '1', isHidden: true }
        ],
        starterTemplates: { python: 'import sys\nlines = sys.stdin.read().splitlines()\n# Build the graph and count connected components' },
        solutionCode: { python: 'import sys\nlines = sys.stdin.read().splitlines()\nadjacency = {}\nfor line in lines:\n    if line == "?":\n        break\n    first, second = line.split("-")\n    adjacency.setdefault(first, set()).add(second)\n    adjacency.setdefault(second, set()).add(first)\nseen = set()\ncomponents = 0\nfor vertex in adjacency:\n    if vertex not in seen:\n        components += 1\n        stack = [vertex]\n        seen.add(vertex)\n        while stack:\n            current = stack.pop()\n            for neighbor in adjacency[current]:\n                if neighbor not in seen:\n                    seen.add(neighbor)\n                    stack.append(neighbor)\nprint(components)' }
      }
    }
  ]
}
];
