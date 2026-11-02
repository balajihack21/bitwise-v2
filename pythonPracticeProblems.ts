import { PracticeProblem } from './types';

type PracticeProblemSpec = {
  title: string;
  topic: string;
  difficulty: 'Easy' | 'Medium';
  prompt: string;
  starter: string;
  solution: string;
  tests: [string, string, boolean?][];
};

const specs: PracticeProblemSpec[] = [
  {
    title: 'Sum of Digits',
    topic: 'Input and Output',
    difficulty: 'Easy',
    prompt: 'Read an integer and print the sum of its digits. Ignore a leading minus sign.',
    starter: 'n = int(input())\n# Add the digits of the integer',
    solution: 'n = int(input())\nprint(sum(int(digit) for digit in str(abs(n))))',
    tests: [['508', '13'], ['-902', '11'], ['0', '0', true]]
  },
  {
    title: 'Convert Seconds to Time',
    topic: 'Input and Output',
    difficulty: 'Easy',
    prompt: 'Read a non-negative number of seconds and print the equivalent time as HH:MM:SS. Hours may exceed 23.',
    starter: 'seconds = int(input())\n# Convert seconds to HH:MM:SS',
    solution: 'seconds = int(input())\nhours, remainder = divmod(seconds, 3600)\nminutes, seconds = divmod(remainder, 60)\nprint(f"{hours:02d}:{minutes:02d}:{seconds:02d}")',
    tests: [['3661', '01:01:01'], ['59', '00:00:59'], ['90061', '25:01:01', true]]
  },
  {
    title: 'Swap Two Values',
    topic: 'Input and Output',
    difficulty: 'Easy',
    prompt: 'Read two integers on one line and print them in reverse order, separated by one space.',
    starter: 'a, b = map(int, input().split())\n# Print b followed by a',
    solution: 'a, b = map(int, input().split())\nprint(b, a)',
    tests: [['4 9', '9 4'], ['-2 7', '7 -2'], ['5 5', '5 5', true]]
  },
  {
    title: 'Leap Year Check',
    topic: 'Conditionals',
    difficulty: 'Easy',
    prompt: 'Read a year and print YES if it is a leap year in the Gregorian calendar, otherwise print NO.',
    starter: 'year = int(input())\n# Apply the leap-year rules',
    solution: 'year = int(input())\nprint("YES" if year % 400 == 0 or (year % 4 == 0 and year % 100 != 0) else "NO")',
    tests: [['2000', 'YES'], ['1900', 'NO'], ['2024', 'YES', true]]
  },
  {
    title: 'Triangle Type',
    topic: 'Conditionals',
    difficulty: 'Easy',
    prompt: 'Read three side lengths. Print INVALID if they cannot form a triangle; otherwise print EQUILATERAL, ISOSCELES, or SCALENE.',
    starter: 'a, b, c = map(int, input().split())\n# Validate the sides and determine the triangle type',
    solution: 'a, b, c = map(int, input().split())\nif min(a, b, c) <= 0 or a + b <= c or a + c <= b or b + c <= a:\n    print("INVALID")\nelif a == b == c:\n    print("EQUILATERAL")\nelif a == b or a == c or b == c:\n    print("ISOSCELES")\nelse:\n    print("SCALENE")',
    tests: [['3 3 3', 'EQUILATERAL'], ['3 4 5', 'SCALENE'], ['1 2 3', 'INVALID', true]]
  },
  {
    title: 'Letter Grade',
    topic: 'Conditionals',
    difficulty: 'Easy',
    prompt: 'Read a score from 0 to 100. Print A for 90+, B for 80-89, C for 70-79, D for 60-69, and F otherwise.',
    starter: 'score = int(input())\n# Select the grade for this score',
    solution: 'score = int(input())\nif score >= 90:\n    print("A")\nelif score >= 80:\n    print("B")\nelif score >= 70:\n    print("C")\nelif score >= 60:\n    print("D")\nelse:\n    print("F")',
    tests: [['91', 'A'], ['80', 'B'], ['59', 'F', true]]
  },
  {
    title: 'Count Multiples',
    topic: 'Loops and Iteration',
    difficulty: 'Easy',
    prompt: 'Read positive integers n and k. Count how many integers from 1 through n are divisible by k.',
    starter: 'n, k = map(int, input().split())\n# Count multiples of k from 1 through n',
    solution: 'n, k = map(int, input().split())\nprint(n // k)',
    tests: [['10 3', '3'], ['12 4', '3'], ['7 8', '0', true]]
  },
  {
    title: 'Prime Number Test',
    topic: 'Loops and Iteration',
    difficulty: 'Easy',
    prompt: 'Read an integer n and print YES if n is prime, otherwise print NO.',
    starter: 'n = int(input())\n# Check whether n has any divisor other than 1 and itself',
    solution: 'n = int(input())\nprime = n >= 2\nfor divisor in range(2, int(n ** 0.5) + 1):\n    if n % divisor == 0:\n        prime = False\n        break\nprint("YES" if prime else "NO")',
    tests: [['2', 'YES'], ['21', 'NO'], ['1', 'NO', true]]
  },
  {
    title: 'Greatest Common Divisor',
    topic: 'Loops and Iteration',
    difficulty: 'Easy',
    prompt: 'Read two non-negative integers and print their greatest common divisor.',
    starter: 'a, b = map(int, input().split())\n# Use the Euclidean algorithm',
    solution: 'a, b = map(int, input().split())\nwhile b:\n    a, b = b, a % b\nprint(a)',
    tests: [['18 24', '6'], ['7 13', '1'], ['0 9', '9', true]]
  },
  {
    title: 'Multiplication Table Values',
    topic: 'Loops and Iteration',
    difficulty: 'Easy',
    prompt: 'Read an integer n and print n multiplied by each integer from 1 through 10, separated by spaces.',
    starter: 'n = int(input())\n# Print the first ten multiples of n',
    solution: 'n = int(input())\nprint(*[n * factor for factor in range(1, 11)])',
    tests: [['3', '3 6 9 12 15 18 21 24 27 30'], ['0', '0 0 0 0 0 0 0 0 0 0'], ['-2', '-2 -4 -6 -8 -10 -12 -14 -16 -18 -20', true]]
  },
  {
    title: 'Count Vowels',
    topic: 'Strings',
    difficulty: 'Easy',
    prompt: 'Read one line and print the number of English vowels (a, e, i, o, u), ignoring letter case.',
    starter: 'text = input()\n# Count the vowels in the line',
    solution: 'text = input()\nprint(sum(character.lower() in "aeiou" for character in text))',
    tests: [['Education', '5'], ['rhythm', '0'], ['AEIOU!', '5', true]]
  },
  {
    title: 'First Non-Repeating Character',
    topic: 'Strings',
    difficulty: 'Medium',
    prompt: 'Read a string and print its first character that occurs exactly once. Print NONE if every character repeats.',
    starter: 'text = input()\n# Find the first character with frequency one',
    solution: 'from collections import Counter\ntext = input()\ncounts = Counter(text)\nprint(next((character for character in text if counts[character] == 1), "NONE"))',
    tests: [['swiss', 'w'], ['aabb', 'NONE'], ['level', 'v', true]]
  },
  {
    title: 'Run-Length Encode',
    topic: 'Strings',
    difficulty: 'Medium',
    prompt: 'Compress each consecutive run of identical characters as the character followed by its count. The input is non-empty.',
    starter: 'text = input()\n# Encode each consecutive run',
    solution: 'text = input()\nparts = []\ncount = 1\nfor index in range(1, len(text) + 1):\n    if index < len(text) and text[index] == text[index - 1]:\n        count += 1\n    else:\n        parts.append(text[index - 1] + str(count))\n        count = 1\nprint("".join(parts))',
    tests: [['aaabbc', 'a3b2c1'], ['xyz', 'x1y1z1'], ['aaaa', 'a4', true]]
  },
  {
    title: 'Anagram Check',
    topic: 'Strings',
    difficulty: 'Easy',
    prompt: 'Read two lines. Print YES if they contain the same letters after ignoring spaces and letter case; otherwise print NO.',
    starter: 'first = input()\nsecond = input()\n# Compare the letter frequencies',
    solution: 'from collections import Counter\nfirst = "".join(input().lower().split())\nsecond = "".join(input().lower().split())\nprint("YES" if Counter(first) == Counter(second) else "NO")',
    tests: [['Dormitory\nDirty room', 'YES'], ['hello\nworld', 'NO'], ['Listen\nSilent', 'YES', true]]
  },
  {
    title: 'Second Largest Distinct Value',
    topic: 'Lists',
    difficulty: 'Easy',
    prompt: 'Read a list of integers on one line and print the second-largest distinct value. Print NONE if it does not exist.',
    starter: 'values = list(map(int, input().split()))\n# Find the second-largest distinct value',
    solution: 'values = sorted(set(map(int, input().split())))\nprint(values[-2] if len(values) >= 2 else "NONE")',
    tests: [['4 1 7 7 3', '4'], ['5 5 5', 'NONE'], ['-4 -1 -9', '-4', true]]
  },
  {
    title: 'Move Zeros to the End',
    topic: 'Lists',
    difficulty: 'Easy',
    prompt: 'Read integers on one line. Print all non-zero values in their original order, followed by all zeros.',
    starter: 'values = list(map(int, input().split()))\n# Keep the relative order while moving zeros',
    solution: 'values = list(map(int, input().split()))\nnonzero = [value for value in values if value != 0]\nprint(*(nonzero + [0] * (len(values) - len(nonzero))))',
    tests: [['0 1 0 3 12', '1 3 12 0 0'], ['0 0 0', '0 0 0'], ['4 -1 2', '4 -1 2', true]]
  },
  {
    title: 'Prefix Sums',
    topic: 'Lists',
    difficulty: 'Easy',
    prompt: 'Read integers on one line and print the running prefix sums, separated by spaces.',
    starter: 'values = list(map(int, input().split()))\n# Build the running sums',
    solution: 'values = list(map(int, input().split()))\nrunning = 0\nresult = []\nfor value in values:\n    running += value\n    result.append(running)\nprint(*result)',
    tests: [['2 1 3', '2 3 6'], ['5', '5'], ['1 -2 4', '1 -1 3', true]]
  },
  {
    title: 'Maximum Subarray Sum',
    topic: 'Lists',
    difficulty: 'Medium',
    prompt: 'Read a non-empty list of integers and print the largest sum of any contiguous subarray.',
    starter: 'values = list(map(int, input().split()))\n# Find the maximum contiguous subarray sum',
    solution: 'values = list(map(int, input().split()))\ncurrent = best = values[0]\nfor value in values[1:]:\n    current = max(value, current + value)\n    best = max(best, current)\nprint(best)',
    tests: [['-2 1 -3 4 -1 2 1 -5 4', '6'], ['-4 -2 -7', '-2'], ['5 -1 5', '9', true]]
  },
  {
    title: 'Word Frequency Report',
    topic: 'Dictionaries',
    difficulty: 'Easy',
    prompt: 'Read one line of space-separated words and print each distinct word and its count in alphabetical order, one per line.',
    starter: 'from collections import Counter\nwords = input().split()\n# Print sorted word counts',
    solution: 'from collections import Counter\nfor word, count in sorted(Counter(input().split()).items()):\n    print(word, count)',
    tests: [['pear apple pear', 'apple 1\npear 2'], ['cat cat dog', 'cat 2\ndog 1'], ['z a z', 'a 1\nz 2', true]]
  },
  {
    title: 'Most Frequent Word',
    topic: 'Dictionaries',
    difficulty: 'Easy',
    prompt: 'Read one line of words and print the most frequent word. If tied, print the alphabetically earliest word.',
    starter: 'from collections import Counter\nwords = input().split()\n# Choose the most frequent word, breaking ties alphabetically',
    solution: 'from collections import Counter\ncounts = Counter(input().split())\nprint(min(counts, key=lambda word: (-counts[word], word)))',
    tests: [['red blue red', 'red'], ['pear apple', 'apple'], ['b a b a', 'a', true]]
  },
  {
    title: 'Combine Inventory Counts',
    topic: 'Dictionaries',
    difficulty: 'Medium',
    prompt: 'Read two lines of space-separated key:value pairs. Add the values for matching keys and print key:value pairs sorted by key.',
    starter: '# Read two inventory lines and combine matching keys',
    solution: 'totals = {}\nfor line in [input(), input()]:\n    for item in line.split():\n        key, value = item.split(":")\n        totals[key] = totals.get(key, 0) + int(value)\nprint(" ".join(f"{key}:{totals[key]}" for key in sorted(totals)))',
    tests: [['apple:2 pear:1\napple:3', 'apple:5 pear:1'], ['x:4\nx:6', 'x:10'], ['b:2 a:1\na:4 c:3', 'a:5 b:2 c:3', true]]
  },
  {
    title: 'Celsius to Fahrenheit',
    topic: 'Functions',
    difficulty: 'Easy',
    prompt: 'Read a temperature in Celsius and print its Fahrenheit equivalent to exactly two decimal places.',
    starter: 'celsius = float(input())\n# Convert Celsius to Fahrenheit',
    solution: 'celsius = float(input())\nprint(f"{celsius * 9 / 5 + 32:.2f}")',
    tests: [['0', '32.00'], ['100', '212.00'], ['-40', '-40.00', true]]
  },
  {
    title: 'Simple Interest',
    topic: 'Functions',
    difficulty: 'Easy',
    prompt: 'Read principal, annual rate (as a percentage), and time in years. Print simple interest to two decimal places.',
    starter: 'principal, rate, years = map(float, input().split())\n# Calculate simple interest',
    solution: 'principal, rate, years = map(float, input().split())\nprint(f"{principal * rate * years / 100:.2f}")',
    tests: [['1000 5 2', '100.00'], ['500 0 3', '0.00'], ['1200 2.5 4', '120.00', true]]
  },
  {
    title: 'Digital Root',
    topic: 'Functions',
    difficulty: 'Easy',
    prompt: 'Repeatedly sum the digits of a non-negative integer until one digit remains, then print it.',
    starter: 'n = int(input())\n# Repeatedly reduce n to one digit',
    solution: 'n = int(input())\nwhile n >= 10:\n    n = sum(int(digit) for digit in str(n))\nprint(n)',
    tests: [['9875', '2'], ['0', '0'], ['9', '9', true]]
  },
  {
    title: 'Linear Search Index',
    topic: 'Searching',
    difficulty: 'Easy',
    prompt: 'Read a list of integers on the first line and a target on the second. Print its first zero-based index, or -1 if absent.',
    starter: 'values = list(map(int, input().split()))\ntarget = int(input())\n# Find the first matching index',
    solution: 'values = list(map(int, input().split()))\ntarget = int(input())\nprint(next((index for index, value in enumerate(values) if value == target), -1))',
    tests: [['4 7 2 7\n7', '1'], ['1 2 3\n9', '-1'], ['5 5 1\n5', '0', true]]
  },
  {
    title: 'Lower Bound Position',
    topic: 'Searching',
    difficulty: 'Medium',
    prompt: 'Given a sorted list and a target, print the first index whose value is greater than or equal to the target, or the list length if none exists.',
    starter: 'values = list(map(int, input().split()))\ntarget = int(input())\n# Use binary search to find the lower bound',
    solution: 'values = list(map(int, input().split()))\ntarget = int(input())\nleft, right = 0, len(values)\nwhile left < right:\n    middle = (left + right) // 2\n    if values[middle] < target:\n        left = middle + 1\n    else:\n        right = middle\nprint(left)',
    tests: [['1 2 2 4\n2', '1'], ['1 3 5\n4', '2'], ['2 4 6\n9', '3', true]]
  },
  {
    title: 'Count Target Occurrences',
    topic: 'Searching',
    difficulty: 'Easy',
    prompt: 'Read a list of integers on the first line and a target on the second. Print how many times the target occurs.',
    starter: 'values = list(map(int, input().split()))\ntarget = int(input())\n# Count matching values',
    solution: 'values = list(map(int, input().split()))\ntarget = int(input())\nprint(values.count(target))',
    tests: [['1 2 2 2 5\n2', '3'], ['1 3 5\n2', '0'], ['7 7 7\n7', '3', true]]
  },
  {
    title: 'Sort Words Alphabetically',
    topic: 'Sorting',
    difficulty: 'Easy',
    prompt: 'Read words on one line and print them in case-insensitive alphabetical order, separated by spaces.',
    starter: 'words = input().split()\n# Sort without treating uppercase letters as earlier',
    solution: 'words = input().split()\nprint(*sorted(words, key=str.lower))',
    tests: [['pear apple banana', 'apple banana pear'], ['zebra Ant cat', 'Ant cat zebra'], ['b A a', 'A a b', true]]
  },
  {
    title: 'Selection Sort',
    topic: 'Sorting',
    difficulty: 'Easy',
    prompt: 'Sort the input integers in ascending order using selection sort and print them separated by spaces.',
    starter: 'values = list(map(int, input().split()))\n# Implement selection sort',
    solution: 'values = list(map(int, input().split()))\nfor index in range(len(values)):\n    minimum = index\n    for candidate in range(index + 1, len(values)):\n        if values[candidate] < values[minimum]:\n            minimum = candidate\n    values[index], values[minimum] = values[minimum], values[index]\nprint(*values)',
    tests: [['5 1 4 2', '1 2 4 5'], ['3 3 -1', '-1 3 3'], ['9', '9', true]]
  },
  {
    title: 'Merge Sorted Lists',
    topic: 'Sorting',
    difficulty: 'Medium',
    prompt: 'Read two already-sorted integer lists on separate lines. Merge them into one sorted list and print it.',
    starter: 'first = list(map(int, input().split()))\nsecond = list(map(int, input().split()))\n# Merge the sorted lists',
    solution: 'first = list(map(int, input().split()))\nsecond = list(map(int, input().split()))\ni = j = 0\nmerged = []\nwhile i < len(first) and j < len(second):\n    if first[i] <= second[j]:\n        merged.append(first[i])\n        i += 1\n    else:\n        merged.append(second[j])\n        j += 1\nmerged.extend(first[i:])\nmerged.extend(second[j:])\nprint(*merged)',
    tests: [['1 4 7\n2 3 8', '1 2 3 4 7 8'], ['\n1 2', '1 2'], ['\n-3 0 5', '-3 0 5', true]]
  },
  {
    title: 'Recursive Sum',
    topic: 'Recursion',
    difficulty: 'Easy',
    prompt: 'Read a non-negative integer n and print the sum of all integers from 1 through n using recursion.',
    starter: 'n = int(input())\n# Define and call a recursive sum function',
    solution: 'def recursive_sum(n):\n    if n <= 0:\n        return 0\n    return n + recursive_sum(n - 1)\nprint(recursive_sum(int(input())))',
    tests: [['5', '15'], ['0', '0'], ['10', '55', true]]
  },
  {
    title: 'Recursive Digit Sum',
    topic: 'Recursion',
    difficulty: 'Easy',
    prompt: 'Read a non-negative integer and print the sum of its digits using a recursive function.',
    starter: 'n = int(input())\n# Recursively add the digits',
    solution: 'def digit_sum(n):\n    if n < 10:\n        return n\n    return n % 10 + digit_sum(n // 10)\nprint(digit_sum(int(input())))',
    tests: [['1234', '10'], ['7', '7'], ['0', '0', true]]
  },
  {
    title: 'Recursive Fibonacci',
    topic: 'Recursion',
    difficulty: 'Medium',
    prompt: 'Read n and print the nth Fibonacci number, using F(0)=0 and F(1)=1. Assume 0 <= n <= 30.',
    starter: 'n = int(input())\n# Calculate the nth Fibonacci number recursively',
    solution: 'def fibonacci(n):\n    if n < 2:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)\nprint(fibonacci(int(input())))',
    tests: [['0', '0'], ['7', '13'], ['10', '55', true]]
  },
  {
    title: 'Safe Integer Parser',
    topic: 'Exception Handling',
    difficulty: 'Easy',
    prompt: 'Read one line. Print its integer value if it is a valid integer; otherwise print INVALID.',
    starter: 'text = input()\n# Convert safely and handle invalid input',
    solution: 'text = input().strip()\ntry:\n    print(int(text))\nexcept ValueError:\n    print("INVALID")',
    tests: [['-42', '-42'], ['hello', 'INVALID'], ['  007  ', '7', true]]
  },
  {
    title: 'Safe Division',
    topic: 'Exception Handling',
    difficulty: 'Easy',
    prompt: 'Read two numbers a and b. Print a divided by b to two decimal places, or DIVISION BY ZERO if b is zero.',
    starter: 'a, b = map(float, input().split())\n# Handle division safely',
    solution: 'a, b = map(float, input().split())\nif b == 0:\n    print("DIVISION BY ZERO")\nelse:\n    print(f"{a / b:.2f}")',
    tests: [['7 2', '3.50'], ['5 0', 'DIVISION BY ZERO'], ['-3 2', '-1.50', true]]
  },
  {
    title: 'Balanced Brackets',
    topic: 'Stacks and Queues',
    difficulty: 'Easy',
    prompt: 'Read a string containing brackets (), [], and {}. Print YES if they are correctly balanced and nested, otherwise print NO.',
    starter: 'text = input()\nstack = []\n# Check bracket pairs with a stack',
    solution: 'text = input()\npairs = {")": "(", "]": "[", "}": "{"}\nstack = []\nvalid = True\nfor character in text:\n    if character in "([{":\n        stack.append(character)\n    elif character in pairs:\n        if not stack or stack.pop() != pairs[character]:\n            valid = False\n            break\nprint("YES" if valid and not stack else "NO")',
    tests: [['([]{})', 'YES'], ['([)]', 'NO'], ['(((', 'NO', true]]
  },
  {
    title: 'Queue Commands',
    topic: 'Stacks and Queues',
    difficulty: 'Medium',
    prompt: 'Process commands, one per line, until END. ENQUEUE x adds x; DEQUEUE removes and prints the front, or EMPTY if the queue is empty.',
    starter: 'from collections import deque\nqueue = deque()\n# Process commands until END',
    solution: 'from collections import deque\nimport sys\nqueue = deque()\noutputs = []\nfor line in sys.stdin.read().splitlines():\n    parts = line.split()\n    if not parts or parts[0] == "END":\n        break\n    if parts[0] == "ENQUEUE":\n        queue.append(parts[1])\n    elif parts[0] == "DEQUEUE":\n        outputs.append(queue.popleft() if queue else "EMPTY")\nprint("\\n".join(outputs))',
    tests: [['ENQUEUE 4\nENQUEUE 7\nDEQUEUE\nDEQUEUE\nEND', '4\n7'], ['DEQUEUE\nEND', 'EMPTY'], ['ENQUEUE x\nDEQUEUE\nDEQUEUE\nEND', 'x\nEMPTY', true]]
  },
  {
    title: 'Postfix Expression Evaluator',
    topic: 'Stacks and Queues',
    difficulty: 'Medium',
    prompt: 'Evaluate a valid space-separated postfix expression using non-negative integers and the operators +, -, and *. Print the integer result.',
    starter: 'tokens = input().split()\nstack = []\n# Evaluate the postfix expression using a stack',
    solution: 'tokens = input().split()\nstack = []\nfor token in tokens:\n    if token in {"+", "-", "*"}:\n        right = stack.pop()\n        left = stack.pop()\n        stack.append(left + right if token == "+" else left - right if token == "-" else left * right)\n    else:\n        stack.append(int(token))\nprint(stack[-1])',
    tests: [['2 3 +', '5'], ['5 1 2 + 4 * + 3 -', '14'], ['8 2 - 3 *', '18', true]]
  },
  {
    title: 'Connected Components',
    topic: 'Graphs',
    difficulty: 'Medium',
    prompt: 'Read n and m, followed by m undirected edges (one-based vertices). Print the number of connected components, including isolated vertices.',
    starter: 'n, m = map(int, input().split())\n# Build adjacency lists and count components',
    solution: 'n, m = map(int, input().split())\nadjacency = [[] for _ in range(n)]\nfor _ in range(m):\n    first, second = map(int, input().split())\n    first -= 1\n    second -= 1\n    adjacency[first].append(second)\n    adjacency[second].append(first)\nseen = set()\ncomponents = 0\nfor start in range(n):\n    if start in seen:\n        continue\n    components += 1\n    stack = [start]\n    seen.add(start)\n    while stack:\n        current = stack.pop()\n        for neighbor in adjacency[current]:\n            if neighbor not in seen:\n                seen.add(neighbor)\n                stack.append(neighbor)\nprint(components)',
    tests: [['5 3\n1 2\n2 3\n4 5', '2'], ['4 0', '4'], ['3 2\n1 2\n2 3', '1', true]]
  },
  {
    title: 'Shortest Path Length',
    topic: 'Graphs',
    difficulty: 'Medium',
    prompt: 'Read n, m, then m undirected edges (one-based vertices), followed by source and target. Print the fewest edges in a path, or -1 if unreachable.',
    starter: 'from collections import deque\nn, m = map(int, input().split())\n# Build the graph, then run BFS from source to target',
    solution: 'from collections import deque\nn, m = map(int, input().split())\nadjacency = [[] for _ in range(n)]\nfor _ in range(m):\n    first, second = map(int, input().split())\n    first -= 1\n    second -= 1\n    adjacency[first].append(second)\n    adjacency[second].append(first)\nsource, target = map(int, input().split())\nsource -= 1\ntarget -= 1\ndistance = [-1] * n\ndistance[source] = 0\nqueue = deque([source])\nwhile queue:\n    current = queue.popleft()\n    for neighbor in adjacency[current]:\n        if distance[neighbor] == -1:\n            distance[neighbor] = distance[current] + 1\n            queue.append(neighbor)\nprint(distance[target])',
    tests: [['5 4\n1 2\n2 3\n3 4\n1 5\n1 4', '3'], ['4 2\n1 2\n3 4\n1 4', '-1'], ['3 2\n1 2\n2 3\n2 2', '0', true]]
  }
];

export const ADDITIONAL_PYTHON_PRACTICE_PROBLEMS: PracticeProblem[] = specs.map((spec, index) => {
  const problemNumber = String(index + 1).padStart(2, '0');
  return {
    id: `py-practice-extra-${problemNumber}`,
    title: spec.title,
    duration: spec.difficulty === 'Easy' ? '20 min' : '25 min',
    type: 'problem',
    isPractice: true,
    topic: spec.topic,
    language: 'python',
    content: `<p>${spec.prompt}</p>`,
    problem: {
      difficulty: spec.difficulty,
      points: spec.difficulty === 'Easy' ? 15 : 25,
      constraints: ['Input follows the format described in the problem statement.'],
      testCases: spec.tests.map(([input, expectedOutput, isHidden], testIndex) => ({
        id: `tc-extra-${problemNumber}-${testIndex + 1}`,
        input,
        expectedOutput,
        ...(isHidden ? { isHidden: true } : {})
      })),
      starterTemplates: { python: spec.starter },
      solutionCode: { python: spec.solution }
    }
  };
});
